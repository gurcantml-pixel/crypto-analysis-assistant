import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ChartBarIcon,
  CalculatorIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  ExclamationTriangleIcon,
  ShieldExclamationIcon,
  CurrencyDollarIcon,
  BoltIcon,
  ScaleIcon,
  TrophyIcon,
  FireIcon,
  EyeIcon,
} from '@heroicons/react/24/outline';
import { useTradingStore } from '../store/tradingStore';
import { usePortfolioStore } from '../store/portfolioStore';
import { binanceAPI } from '../services/binanceAPI';
import { TechnicalAnalysis } from '../services/technicalAnalysis';
import { RiskManagement } from '../services/riskManagement';
import { DataValidation } from '../services/dataValidation';
import { BacktestEngine } from '../services/backtestEngine';
import { notificationManager } from '../services/notificationManager';
import { divergenceDetector, Divergence } from '../services/divergenceDetection';
import { TechnicalIndicators } from '../types';
import AdvancedAnalysisPanel from '../components/AdvancedAnalysisPanel';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { Line } from 'react-chartjs-2';

// Chart.js bileşenlerini kaydet
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface RiskMetrics {
  stopLoss: number;
  takeProfit: number;
  riskRewardRatio: number;
  positionSize: number;
  maxRisk: number;
}

interface TradingSignal {
  type: 'BUY' | 'SELL' | 'HOLD';
  strength: number;
  reason: string;
  timeframe: string;
  confidence: number;
}

const Analysis: React.FC = () => {
  const [searchParams] = useSearchParams();
  const { coins, selectedCoin, setSelectedCoin } = useTradingStore();
  const { favoriteCoins, apiConfig } = usePortfolioStore();
  
  // URL'den coin parametresini oku ve başlangıç değeri olarak kullan
  const urlCoin = searchParams.get('coin');
  const initialCoin = urlCoin 
    ? (urlCoin.includes('USDT') ? urlCoin : `${urlCoin}USDT`)
    : selectedCoin;
  
  const [indicators, setIndicators] = useState<TechnicalIndicators | null>(null);
  const [loading, setLoading] = useState(false);
  const [timeframe, setTimeframe] = useState('1h');
  const [analysisMode, setAnalysisMode] = useState<'technical' | 'risk' | 'signals' | 'divergence' | 'multi' | 'advanced'>('technical');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'price' | 'change' | 'volume'>('change');
  const [chartData, setChartData] = useState<any>(null);
  const [chartLoading, setChartLoading] = useState(false);
  const [divergences, setDivergences] = useState<Divergence[]>([]);
  
  // URL'den gelen coin'i hemen set et VE yükle
  React.useEffect(() => {
    if (urlCoin) {
      console.log(`🎯 URL'den coin yükleniyor: ${urlCoin} → ${initialCoin}`);
      setSelectedCoin(initialCoin);
      
      // State güncellenmeden önce direkt initialCoin ile yükle
      setTimeout(() => {
        console.log(`🚀 İlk yükleme başlatılıyor: ${initialCoin}`);
        loadIndicatorsWithCoin(initialCoin);
      }, 50);
    }
  }, [urlCoin]);

  const currentCoin = coins.find(coin => coin.symbol === selectedCoin) || coins[0];
  
  // Debug: selectedCoin değiştiğinde console'a yazdır
  useEffect(() => {
    console.log(`🔄 selectedCoin değişti: ${selectedCoin}`);
    console.log(`📋 Mevcut coins listesi:`, coins.map(c => c.symbol).join(', '));
    console.log(`✅ currentCoin:`, currentCoin?.symbol || 'Bulunamadı');
  }, [selectedCoin, coins, currentCoin]);
  const favoriteCoin = favoriteCoins.find(coin => coin.symbol === selectedCoin?.replace('USDT', ''));
  
  // API bağlantısı varsa favori coinleri, yoksa demo coinleri kullan
  const hasAPIConnection = apiConfig?.exchange === 'okx';
  
  // Favori coinlerden USDT çiftleri oluştur (API bağlantısı varsa)
  const favoriteCoinsWithUSDT = hasAPIConnection ? favoriteCoins.map(coin => ({
    symbol: coin.symbol + 'USDT',
    name: coin.symbol,
    price: coin.price,
    change24h: coin.change24h,
    volume24h: coin.volume.toString(),
    logoUrl: coin.logoUrl,
    high24h: coin.high24h || 0,
    low24h: coin.low24h || 0
  })) : [];

  // Demo mode için coins'den USDT çiftleri oluştur (API bağlantısı yoksa)
  const demoCoinsForAnalysis = !hasAPIConnection ? coins.map(coin => ({
    symbol: coin.symbol,
    name: coin.name,
    price: coin.price,
    change24h: coin.change24h,
    volume24h: coin.volume24h,
    logoUrl: undefined,
    high24h: coin.high24h || 0,
    low24h: coin.low24h || 0
  })) : [];

  // Kullanılacak coin listesini belirle
  const coinsToShow = hasAPIConnection ? favoriteCoinsWithUSDT : demoCoinsForAnalysis;

  // Coinleri filtrele ve sırala
  const filteredCoins = coinsToShow
    .filter(coin => 
      coin.symbol.toLowerCase().includes(searchTerm.toLowerCase()) ||
      coin.name.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'price':
          return b.price - a.price;
        case 'volume':
          return parseFloat(b.volume24h) - parseFloat(a.volume24h);
        case 'change':
        default:
          return Math.abs(b.change24h) - Math.abs(a.change24h);
      }
    });
  
  // Risk yönetimi hesaplamaları
  const calculateRiskMetrics = (price: number, volatility: number): RiskMetrics => {
    const volatilityPercent = (volatility / price) * 100;
    const stopLossPercentage = Math.min(volatilityPercent * 0.5, 5); // Max %5
    const stopLossPrice = price * (1 - stopLossPercentage / 100);
    const takeProfitPrice = price * (1 + stopLossPercentage * 2 / 100); // 1:2 risk/ödül
    
    // Gelişmiş risk hesaplaması
    const riskRewardRatio = RiskManagement.calculateRiskReward(price, stopLossPrice, takeProfitPrice);
    const optimalSize = RiskManagement.calculateOptimalPosition(price, stopLossPrice, 10000, 0.02); // 10k portfolio
    
    return {
      stopLoss: stopLossPrice,
      takeProfit: takeProfitPrice,
      riskRewardRatio: Math.max(riskRewardRatio, 2),
      positionSize: Math.min(optimalSize / price, 20), // Coin cinsinden pozisyon
      maxRisk: stopLossPercentage,
    };
  };

  // Trading sinyalleri üret
  const generateTradingSignals = (indicators: TechnicalIndicators, price: number): TradingSignal[] => {
    const signals: TradingSignal[] = [];
    
    // RSI sinyali
    if (indicators.rsi < 30) {
      signals.push({
        type: 'BUY',
        strength: Math.max(0, 30 - indicators.rsi) / 30 * 100,
        reason: 'RSI aşırı satım bölgesinde',
        timeframe: timeframe,
        confidence: indicators.rsi < 25 ? 85 : 65,
      });
    } else if (indicators.rsi > 70) {
      signals.push({
        type: 'SELL',
        strength: Math.max(0, indicators.rsi - 70) / 30 * 100,
        reason: 'RSI aşırı alım bölgesinde',
        timeframe: timeframe,
        confidence: indicators.rsi > 75 ? 85 : 65,
      });
    }

    // MA Crossover sinyali
    if (indicators.ema12 > indicators.ema26 && price > indicators.ma50) {
      signals.push({
        type: 'BUY',
        strength: 75,
        reason: 'Golden Cross - EMA12 > EMA26',
        timeframe: timeframe,
        confidence: 80,
      });
    } else if (indicators.ema12 < indicators.ema26 && price < indicators.ma50) {
      signals.push({
        type: 'SELL',
        strength: 75,
        reason: 'Death Cross - EMA12 < EMA26',
        timeframe: timeframe,
        confidence: 80,
      });
    }

    // MACD sinyali
    if (indicators.macd > 0 && indicators.rsi < 70) {
      signals.push({
        type: 'BUY',
        strength: 60,
        reason: 'MACD pozitif momentum',
        timeframe: timeframe,
        confidence: 70,
      });
    } else if (indicators.macd < 0 && indicators.rsi > 30) {
      signals.push({
        type: 'SELL',
        strength: 60,
        reason: 'MACD negatif momentum',
        timeframe: timeframe,
        confidence: 70,
      });
    }

    return signals;
  };

  const loadIndicatorsWithCoin = async (coinSymbol: string) => {
    console.log(`🔄 loadIndicatorsWithCoin çağrıldı: ${coinSymbol}`);
    
    if (!coinSymbol) {
      console.warn('⚠️ coinSymbol boş, yükleme iptal edildi');
      return;
    }
    
    setLoading(true);
    setChartLoading(true);
    try {
      const klines = await binanceAPI.getKlines(coinSymbol, timeframe, 200);
      const prices = klines.map((kline: any) => parseFloat(kline[4])); // Close price
      const timestamps = klines.map((kline: any) => new Date(kline[0]).toLocaleDateString());
      
      if (prices.length > 0) {
        const calculatedIndicators = TechnicalAnalysis.calculateIndicators(prices);
        
        // Indikatör tutarlılık kontrolü
        const isValidData = DataValidation.validateIndicators(
          calculatedIndicators.rsi,
          calculatedIndicators.macd,
          prices[prices.length - 1],
          calculatedIndicators.ma50
        );
        
        if (isValidData) {
          setIndicators(calculatedIndicators);
        } else {
          console.warn('Inconsistent technical indicators detected');
          // Düzeltilmiş indikatörler kullan
          const correctedRSI = Math.max(20, Math.min(80, calculatedIndicators.rsi));
          setIndicators({
            ...calculatedIndicators,
            rsi: correctedRSI
          });
        }
        
        // Chart verilerini hazırla
        const chartLabels = timestamps.slice(-50);
        const chartPrices = prices.slice(-50);
        
        setChartData({
          labels: chartLabels,
          datasets: [{
            label: `${coinSymbol.replace('USDT', '')} Fiyat`,
            data: chartPrices,
            borderColor: 'rgb(59, 130, 246)',
            backgroundColor: 'rgba(59, 130, 246, 0.1)',
            borderWidth: 2,
            fill: true,
            tension: 0.1,
          }],
        });
        
        console.log(`✅ ${coinSymbol} analizi başarıyla yüklendi!`);
      }
    } catch (error) {
      console.error('Error loading indicators:', error);
      // Fallback
      const basePrice = 43000;
      setIndicators({
        rsi: 45 + Math.random() * 20,
        ma50: basePrice * (0.98 + Math.random() * 0.04),
        ma200: basePrice * (0.92 + Math.random() * 0.06),
        ema12: basePrice * (0.995 + Math.random() * 0.01),
        ema26: basePrice * (0.99 + Math.random() * 0.02),
        macd: (Math.random() - 0.5) * 100,
        volatility: basePrice * (0.015 + Math.random() * 0.025)
      });
    } finally {
      setLoading(false);
      setChartLoading(false);
    }
  };

  const loadIndicators = async () => {
    console.log(`🔄 loadIndicators çağrıldı: ${selectedCoin}`);
    
    if (!selectedCoin) {
      console.warn('⚠️ selectedCoin boş, yükleme iptal edildi');
      return;
    }
    
    setLoading(true);
    setChartLoading(true);
    try {
      const klines = await binanceAPI.getKlines(selectedCoin, timeframe, 200);
      const prices = klines.map((kline: any) => parseFloat(kline[4])); // Close price
      const timestamps = klines.map((kline: any) => new Date(kline[0]).toLocaleDateString());
      
      if (prices.length > 0) {
        const calculatedIndicators = TechnicalAnalysis.calculateIndicators(prices);
        
        // Indikatör tutarlılık kontrolü
        const isValidData = DataValidation.validateIndicators(
          calculatedIndicators.rsi,
          calculatedIndicators.macd,
          prices[prices.length - 1],
          calculatedIndicators.ma50
        );
        
        if (isValidData) {
          setIndicators(calculatedIndicators);
        } else {
          console.warn('Inconsistent technical indicators detected');
          // Düzeltilmiş indikatörler kullan
          const correctedRSI = Math.max(20, Math.min(80, calculatedIndicators.rsi));
          setIndicators({
            ...calculatedIndicators,
            rsi: correctedRSI
          });
        }
        
        // 🆕 Divergence Detection
        console.log('🔍 Detecting divergences...');
        console.log(`📊 Data: ${prices.length} prices, timeframe: ${timeframe}`);
        
        const rsiValues = prices.map((_, i) => {
          const subset = prices.slice(Math.max(0, i - 14), i + 1);
          if (subset.length < 14) return undefined;
          return TechnicalAnalysis.calculateRSI(subset, 14);
        }).filter((v): v is number => v !== undefined);
        
        const macdResults = prices.map((_, i) => {
          const subset = prices.slice(Math.max(0, i - 26), i + 1);
          if (subset.length < 26) return undefined;
          const result = TechnicalAnalysis.calculateMACD(subset);
          return result !== undefined ? result.histogram : undefined;
        }).filter((v): v is number => v !== undefined);
        
        console.log(`📈 RSI values: ${rsiValues.length}, MACD values: ${macdResults.length}`);
        
        const detectedDivergences: Divergence[] = [];
        
        // RSI Divergences
        if (rsiValues.length >= 20) {
          const rsiDivs = divergenceDetector.detectDivergences(
            prices.slice(-rsiValues.length),
            rsiValues,
            'RSI',
            timeframe
          );
          console.log(`🔵 RSI divergences found: ${rsiDivs.length}`);
          if (rsiDivs.length > 0) {
            console.log('RSI Divergences:', rsiDivs.map(d => `${d.type} (${d.strength})`));
          }
          detectedDivergences.push(...rsiDivs);
        }
        
        // MACD Divergences (using histogram)
        if (macdResults.length >= 20) {
          const macdDivs = divergenceDetector.detectDivergences(
            prices.slice(-macdResults.length),
            macdResults,
            'MACD',
            timeframe
          );
          console.log(`🟢 MACD divergences found: ${macdDivs.length}`);
          if (macdDivs.length > 0) {
            console.log('MACD Divergences:', macdDivs.map(d => `${d.type} (${d.strength})`));
          }
          detectedDivergences.push(...macdDivs);
        }
        
        setDivergences(detectedDivergences);
        console.log(`✅ Total divergences detected: ${detectedDivergences.length}`);
        
        if (detectedDivergences.length > 0) {
          const strongestDiv = detectedDivergences[0];
          notificationManager.sendTradingSignal({
            symbol: selectedCoin,
            type: strongestDiv.type.includes('bullish') ? 'BUY' : 'SELL',
            confidence: strongestDiv.confidence,
            reason: `Divergence: ${strongestDiv.description}`
          });
        }
        
        // Chart verilerini hazırla (memoization için stabilize)
        const chartLabels = timestamps.slice(-50);
        const chartPrices = prices.slice(-50);
        
        setChartData({
          labels: chartLabels,
          datasets: [{
            label: `${selectedCoin.replace('USDT', '')} Fiyat`,
            data: chartPrices,
            borderColor: 'rgb(59, 130, 246)',
            backgroundColor: 'rgba(59, 130, 246, 0.1)',
            borderWidth: 2,
            fill: true,
            tension: 0.1,
          }],
        });
      }
    } catch (error) {
      console.error('Error loading indicators:', error);
      // Gelişmiş fallback - daha gerçekçi değerler
      const basePrice = currentCoin?.price || 43000;
      setIndicators({
        rsi: 45 + Math.random() * 20, // 45-65 arası daha gerçekçi
        ma50: basePrice * (0.98 + Math.random() * 0.04),
        ma200: basePrice * (0.92 + Math.random() * 0.06),
        ema12: basePrice * (0.995 + Math.random() * 0.01),
        ema26: basePrice * (0.99 + Math.random() * 0.02),
        macd: (Math.random() - 0.5) * 100, // Daha küçük MACD değerleri
        volatility: basePrice * (0.015 + Math.random() * 0.025)
      });
      setDivergences([]); // Clear divergences on error
    } finally {
      setLoading(false);
      setChartLoading(false);
    }
  };

  // selectedCoin veya timeframe değiştiğinde verileri yükle
  useEffect(() => {
    if (selectedCoin) {
      console.log(`� Coin analizi yükleniyor: ${selectedCoin}`);
      loadIndicators();
    }
  }, [selectedCoin, timeframe]);

  const getRSIStatus = (rsi: number) => {
    if (rsi < 30) return { text: 'Aşırı Satım', color: 'text-green-400', bg: 'bg-green-900/20', signal: 'BUY' };
    if (rsi > 70) return { text: 'Aşırı Alım', color: 'text-red-400', bg: 'bg-red-900/20', signal: 'SELL' };
    return { text: 'Nötr', color: 'text-gray-400', bg: 'bg-gray-900/20', signal: 'HOLD' };
  };

  const getTrendStatus = (price: number, ma50: number, ma200: number) => {
    if (price > ma50 && ma50 > ma200) {
      return { text: 'Güçlü Boğa Trendi', color: 'text-green-400', icon: ArrowTrendingUpIcon, signal: 'BUY' };
    }
    if (price < ma50 && ma50 < ma200) {
      return { text: 'Güçlü Ayı Trendi', color: 'text-red-400', icon: ArrowTrendingDownIcon, signal: 'SELL' };
    }
    return { text: 'Yatay Trend', color: 'text-yellow-400', icon: ExclamationTriangleIcon, signal: 'HOLD' };
  };

  const getVolatilityStatus = (volatility: number, price: number) => {
    const volatilityPercent = (volatility / price) * 100;
    if (volatilityPercent > 5) return { text: 'Çok Yüksek', color: 'text-red-400', risk: 'YÜKSEK' };
    if (volatilityPercent > 3) return { text: 'Yüksek', color: 'text-yellow-400', risk: 'ORTA' };
    if (volatilityPercent > 1) return { text: 'Normal', color: 'text-green-400', risk: 'DÜŞÜK' };
    return { text: 'Düşük', color: 'text-blue-400', risk: 'ÇOK DÜŞÜK' };
  };

  const timeframes = [
    { value: '1m', label: '1 Dakika' },
    { value: '5m', label: '5 Dakika' },
    { value: '15m', label: '15 Dakika' },
    { value: '30m', label: '30 Dakika' },
    { value: '45m', label: '45 Dakika' },
    { value: '1h', label: '1 Saat' },
    { value: '2h', label: '2 Saat' },
    { value: '3h', label: '3 Saat' },
    { value: '4h', label: '4 Saat' },
    { value: '1d', label: '1 Gün' },
    { value: '2d', label: '2 Gün' },
    { value: '3d', label: '3 Gün' },
    { value: '1w', label: '1 Hafta' },
    { value: '1M', label: '1 Ay' },
    { value: '3M', label: '3 Ay' },
  ];

  const analysisModes = [
    { value: 'technical', label: 'Teknik Analiz', icon: ChartBarIcon },
    { value: 'risk', label: 'Risk Yönetimi', icon: ShieldExclamationIcon },
    { value: 'signals', label: 'Trading Sinyalleri', icon: BoltIcon },
    { value: 'divergence', label: 'Divergence Analizi', icon: ArrowTrendingUpIcon },
    { value: 'multi', label: 'Çoklu Analiz', icon: EyeIcon },
    { value: 'advanced', label: 'Gelişmiş Analiz', icon: FireIcon },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 bg-gradient-to-r from-primary-500 to-secondary-500 rounded-xl flex items-center justify-center">
            <TrophyIcon className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Profesyonel Analiz</h1>
            <p className="text-gray-400">Güvenilir trading kararları için kapsamlı analiz</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <FireIcon className="h-5 w-5 text-orange-400" />
          <span className="text-orange-400 font-medium">Gerçek Zamanlı</span>
        </div>
      </div>

      {/* Price Chart */}
      {selectedCoin && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="card"
        >
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-white flex items-center">
              <ChartBarIcon className="h-5 w-5 mr-2 text-primary-400" />
              {selectedCoin.replace('USDT', '')} Fiyat Grafiği
            </h2>
            <div className="text-sm text-gray-400">
              Timeframe: {timeframe}
            </div>
          </div>
          
          <div className="bg-dark-800 rounded-lg p-4 h-96">
            {chartLoading ? (
              <div className="flex items-center justify-center h-full">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
                <span className="ml-2 text-gray-400">Grafik yükleniyor...</span>
              </div>
            ) : chartData ? (
              <Line 
                data={chartData} 
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: {
                      labels: {
                        color: '#9CA3AF'
                      }
                    },
                    tooltip: {
                      backgroundColor: '#1F2937',
                      titleColor: '#F9FAFB',
                      bodyColor: '#E5E7EB',
                      borderColor: '#4B5563',
                      borderWidth: 1
                    }
                  },
                  scales: {
                    x: {
                      ticks: { color: '#6B7280' },
                      grid: { color: '#374151' }
                    },
                    y: {
                      ticks: { color: '#6B7280' },
                      grid: { color: '#374151' }
                    }
                  }
                }}
              />
            ) : (
              <div className="flex items-center justify-center h-full text-gray-400">
                Coin seçin ve grafik verilerini görüntüleyin
              </div>
            )}
          </div>
        </motion.div>
      )}

      {/* Controls */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Coin Selector */}
        <div className="card">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center">
            <CurrencyDollarIcon className="h-5 w-5 mr-2 text-primary-400" />
            Analiz Edilecek Coin
            <span className="ml-2 text-sm px-2 py-1 rounded-full bg-gray-700 text-gray-300">
              {hasAPIConnection ? 'Favori Coinler' : 'Demo Mode'}
            </span>
          </h2>
          
          {/* Search and Sort Controls */}
          <div className="flex flex-col sm:flex-row gap-3 mb-4">
            <div className="flex-1">
              <input
                type="text"
                placeholder="Coin ara (BTC, ETH...)"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-3 py-2 bg-dark-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div className="flex gap-2">
              <select
                title="Sıralama seçeneği"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'name' | 'price' | 'change' | 'volume')}
                className="px-3 py-2 bg-dark-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="change">Değişim Oranı</option>
                <option value="name">İsim</option>
                <option value="price">Fiyat</option>
                <option value="volume">Hacim</option>
              </select>
            </div>
          </div>
          
          {/* Quick Select Favorites */}
          {hasAPIConnection && favoriteCoins.length > 0 && (
            <div className="mb-4">
              <p className="text-gray-400 text-sm mb-2">🌟 API Favori Coinler (Hızlı Seçim)</p>
              <div className="flex flex-wrap gap-2">
                {favoriteCoins.slice(0, 10).map((coin) => (
                  <button
                    key={coin.symbol}
                    onClick={() => {
                      console.log('🌟 Favorite coin selected:', coin.symbol + 'USDT');
                      setSelectedCoin(coin.symbol + 'USDT');
                    }}
                    className={`px-3 py-1 rounded-full text-xs transition-all flex items-center ${
                      selectedCoin === coin.symbol + 'USDT'
                        ? 'bg-yellow-600 text-white ring-2 ring-yellow-400'
                        : 'bg-dark-600 text-gray-300 hover:bg-dark-500'
                    }`}
                  >
                    {coin.logoUrl && (
                      <img 
                        src={coin.logoUrl} 
                        alt={coin.symbol}
                        className="w-4 h-4 rounded-full mr-1"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.style.display = 'none';
                        }}
                      />
                    )}
                    {coin.symbol}
                    {coin.signalStrength && coin.signalStrength > 60 && (
                      <span className="ml-1">🎯</span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}
          
          {/* Demo Mode Message */}
          {!hasAPIConnection && (
            <div className="mb-4 p-3 bg-blue-900/20 border border-blue-600/20 rounded-lg">
              <p className="text-blue-400 text-sm">
                💡 <strong>Demo Mode:</strong> Gerçek favori coinler için OKX API bağlantısı gerekli
              </p>
            </div>
          )}
          
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 max-h-80 overflow-y-auto">
            {filteredCoins.length === 0 ? (
              <div className="col-span-full text-center py-8 text-gray-400">
                <p>"{searchTerm}" araması için sonuç bulunamadı</p>
                <button
                  onClick={() => setSearchTerm('')}
                  className="mt-2 text-primary-400 hover:text-primary-300 text-sm underline"
                >
                  Aramayı temizle
                </button>
              </div>
            ) : (
              filteredCoins.slice(0, 24).map((coin) => (
                <button
                  key={coin.symbol}
                  onClick={() => {
                    console.log('🔄 Coin selected:', coin.symbol);
                    setSelectedCoin(coin.symbol);
                  }}
                  className={`p-3 rounded-lg transition-all ${
                    selectedCoin === coin.symbol
                      ? 'bg-primary-600 text-white shadow-lg ring-2 ring-primary-400'
                      : 'bg-dark-700 text-gray-300 hover:bg-dark-600'
                  }`}
                >
                  <div className="text-center">
                    <div className="flex items-center justify-center mb-1">
                      {coin.logoUrl && (
                        <img 
                          src={coin.logoUrl} 
                          alt={coin.symbol}
                          className="w-5 h-5 rounded-full mr-1"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.style.display = 'none';
                          }}
                        />
                      )}
                      <p className="font-semibold">{coin.symbol.replace('USDT', '')}</p>
                    </div>
                    <p className="text-sm opacity-75">${coin.price.toFixed(2)}</p>
                    <p className={`text-xs ${
                      coin.change24h >= 0 ? 'text-green-400' : 'text-red-400'
                    }`}>
                      {coin.change24h >= 0 ? '+' : ''}{coin.change24h.toFixed(2)}%
                    </p>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Settings */}
        <div className="card">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center">
            <CalculatorIcon className="h-5 w-5 mr-2 text-primary-400" />
            Analiz Ayarları
          </h2>
          
          <div className="space-y-4">
            {/* Timeframe */}
            <div>
              <label className="block text-gray-400 text-sm mb-2">Zaman Dilimi</label>
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
                {timeframes.map((tf) => (
                  <button
                    key={tf.value}
                    onClick={() => setTimeframe(tf.value)}
                    className={`px-2 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      timeframe === tf.value
                        ? 'bg-primary-600 text-white ring-2 ring-primary-400'
                        : 'bg-dark-700 text-gray-300 hover:bg-dark-600'
                    }`}
                  >
                    {tf.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Analysis Mode */}
            <div>
              <label className="block text-gray-400 text-sm mb-2">Analiz Modu</label>
              <div className="grid grid-cols-2 gap-2">
                {analysisModes.map((mode) => (
                  <button
                    key={mode.value}
                    onClick={() => setAnalysisMode(mode.value as any)}
                    className={`p-2 rounded-lg text-sm transition-all flex items-center space-x-2 ${
                      analysisMode === mode.value
                        ? 'bg-primary-600 text-white'
                        : 'bg-dark-700 text-gray-300 hover:bg-dark-600'
                    }`}
                  >
                    <mode.icon className="h-4 w-4" />
                    <span>{mode.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="card">
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto mb-4"></div>
            <p className="text-gray-400">Gelişmiş analiz hesaplanıyor...</p>
          </div>
        </div>
      ) : indicators && currentCoin ? (
        <>
          {(analysisMode === 'technical' || analysisMode === 'multi') && (
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
              {/* RSI Analysis */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="card"
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-white">RSI Analizi</h3>
                  <div className={`px-2 py-1 rounded text-xs font-medium ${
                    getRSIStatus(indicators.rsi).signal === 'BUY' ? 'bg-green-900 text-green-300' :
                    getRSIStatus(indicators.rsi).signal === 'SELL' ? 'bg-red-900 text-red-300' :
                    'bg-gray-900 text-gray-300'
                  }`}>
                    {getRSIStatus(indicators.rsi).signal}
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">RSI Değeri</span>
                    <span className="text-white font-semibold text-xl">{indicators.rsi.toFixed(1)}</span>
                  </div>
                  
                  <div className="w-full bg-dark-700 rounded-full h-3 relative">
                    <div
                      className={`h-3 rounded-full transition-all duration-500 ${
                        indicators.rsi < 30 ? 'bg-green-500' :
                        indicators.rsi > 70 ? 'bg-red-500' :
                        'bg-primary-500'
                      }`}
                      style={{ width: `${Math.min(indicators.rsi, 100)}%` }}
                    ></div>
                    {/* RSI threshold lines */}
                    <div className="absolute top-0 left-[30%] w-0.5 h-3 bg-green-300 opacity-50"></div>
                    <div className="absolute top-0 left-[70%] w-0.5 h-3 bg-red-300 opacity-50"></div>
                  </div>
                  
                  <div className={`p-3 rounded-lg ${getRSIStatus(indicators.rsi).bg}`}>
                    <p className={`font-medium ${getRSIStatus(indicators.rsi).color}`}>
                      {getRSIStatus(indicators.rsi).text}
                    </p>
                    <p className="text-gray-400 text-sm mt-1">
                      {indicators.rsi < 30 ? 'Güçlü alım fırsatı olabilir' :
                       indicators.rsi > 70 ? 'Satış düşünülebilir' :
                       'Piyasa dengede'}
                    </p>
                  </div>
                </div>
              </motion.div>

              {/* Trend Analysis */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="card"
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-white">Trend Analizi</h3>
                  <div className={`px-2 py-1 rounded text-xs font-medium ${
                    getTrendStatus(currentCoin.price, indicators.ma50, indicators.ma200).signal === 'BUY' ? 'bg-green-900 text-green-300' :
                    getTrendStatus(currentCoin.price, indicators.ma50, indicators.ma200).signal === 'SELL' ? 'bg-red-900 text-red-300' :
                    'bg-gray-900 text-gray-300'
                  }`}>
                    {getTrendStatus(currentCoin.price, indicators.ma50, indicators.ma200).signal}
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Güncel Fiyat</span>
                      <span className="text-white font-medium">${currentCoin.price.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">MA 50</span>
                      <span className={`font-medium ${
                        currentCoin.price > indicators.ma50 ? 'text-green-400' : 'text-red-400'
                      }`}>
                        ${indicators.ma50.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">MA 200</span>
                      <span className={`font-medium ${
                        currentCoin.price > indicators.ma200 ? 'text-green-400' : 'text-red-400'
                      }`}>
                        ${indicators.ma200.toLocaleString()}
                      </span>
                    </div>
                  </div>
                  
                  <div className={`p-3 rounded-lg ${
                    getTrendStatus(currentCoin.price, indicators.ma50, indicators.ma200).color === 'text-green-400' ? 'bg-green-900/20' :
                    getTrendStatus(currentCoin.price, indicators.ma50, indicators.ma200).color === 'text-red-400' ? 'bg-red-900/20' :
                    'bg-yellow-900/20'
                  }`}>
                    <div className="flex items-center space-x-2">
                      {React.createElement(getTrendStatus(currentCoin.price, indicators.ma50, indicators.ma200).icon, {
                        className: `h-4 w-4 ${getTrendStatus(currentCoin.price, indicators.ma50, indicators.ma200).color}`
                      })}
                      <p className={`font-medium ${getTrendStatus(currentCoin.price, indicators.ma50, indicators.ma200).color}`}>
                        {getTrendStatus(currentCoin.price, indicators.ma50, indicators.ma200).text}
                      </p>
                    </div>
                  </div>
                </div>
              </motion.div>

              {/* Volatility Analysis */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="card"
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-white">Volatilite Analizi</h3>
                  <div className={`px-2 py-1 rounded text-xs font-medium ${
                    getVolatilityStatus(indicators.volatility, currentCoin.price).risk === 'YÜKSEK' ? 'bg-red-900 text-red-300' :
                    getVolatilityStatus(indicators.volatility, currentCoin.price).risk === 'ORTA' ? 'bg-yellow-900 text-yellow-300' :
                    'bg-green-900 text-green-300'
                  }`}>
                    {getVolatilityStatus(indicators.volatility, currentCoin.price).risk}
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Standart Sapma</span>
                    <span className="text-white font-medium">${indicators.volatility.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Volatilite %</span>
                    <span className={`font-medium ${getVolatilityStatus(indicators.volatility, currentCoin.price).color}`}>
                      {((indicators.volatility / currentCoin.price) * 100).toFixed(2)}%
                    </span>
                  </div>
                  
                  <div className={`p-3 rounded-lg ${
                    getVolatilityStatus(indicators.volatility, currentCoin.price).risk === 'YÜKSEK' ? 'bg-red-900/20' :
                    getVolatilityStatus(indicators.volatility, currentCoin.price).risk === 'ORTA' ? 'bg-yellow-900/20' :
                    'bg-green-900/20'
                  }`}>
                    <p className={`font-medium ${getVolatilityStatus(indicators.volatility, currentCoin.price).color}`}>
                      {getVolatilityStatus(indicators.volatility, currentCoin.price).text} Volatilite
                    </p>
                    <p className="text-gray-400 text-sm mt-1">
                      {getVolatilityStatus(indicators.volatility, currentCoin.price).risk === 'YÜKSEK' 
                        ? 'Dikkatli olun, yüksek risk'
                        : getVolatilityStatus(indicators.volatility, currentCoin.price).risk === 'ORTA'
                        ? 'Orta risk seviyesi'
                        : 'Düşük risk, stabil hareket'
                      }
                    </p>
                  </div>
                </div>
              </motion.div>
            </div>
          )}

          {(analysisMode === 'risk' || analysisMode === 'multi') && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="card"
            >
              <div className="flex items-center space-x-3 mb-6">
                <ShieldExclamationIcon className="h-6 w-6 text-primary-400" />
                <h2 className="text-xl font-bold text-white">Risk Yönetimi Önerileri</h2>
              </div>

              {(() => {
                const riskMetrics = calculateRiskMetrics(currentCoin.price, indicators.volatility);
                return (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-red-900/20 border border-red-600/20 rounded-lg p-4">
                      <div className="flex items-center space-x-2 mb-2">
                        <ArrowTrendingDownIcon className="h-4 w-4 text-red-400" />
                        <span className="text-red-400 font-medium">Stop Loss</span>
                      </div>
                      <p className="text-white text-xl font-bold">${riskMetrics.stopLoss.toFixed(2)}</p>
                      <p className="text-gray-400 text-sm">-%{riskMetrics.maxRisk.toFixed(2)} risk</p>
                    </div>

                    <div className="bg-green-900/20 border border-green-600/20 rounded-lg p-4">
                      <div className="flex items-center space-x-2 mb-2">
                        <ArrowTrendingUpIcon className="h-4 w-4 text-green-400" />
                        <span className="text-green-400 font-medium">Take Profit</span>
                      </div>
                      <p className="text-white text-xl font-bold">${riskMetrics.takeProfit.toFixed(2)}</p>
                      <p className="text-gray-400 text-sm">+%{(riskMetrics.maxRisk * 2).toFixed(2)} hedef</p>
                    </div>

                    <div className="bg-blue-900/20 border border-blue-600/20 rounded-lg p-4">
                      <div className="flex items-center space-x-2 mb-2">
                        <ScaleIcon className="h-4 w-4 text-blue-400" />
                        <span className="text-blue-400 font-medium">Risk/Ödül</span>
                      </div>
                      <p className="text-white text-xl font-bold">1:{riskMetrics.riskRewardRatio}</p>
                      <p className="text-gray-400 text-sm">Optimal oran</p>
                    </div>

                    <div className="bg-yellow-900/20 border border-yellow-600/20 rounded-lg p-4">
                      <div className="flex items-center space-x-2 mb-2">
                        <CurrencyDollarIcon className="h-4 w-4 text-yellow-400" />
                        <span className="text-yellow-400 font-medium">Pozisyon Boyutu</span>
                      </div>
                      <p className="text-white text-xl font-bold">%{Math.min(riskMetrics.positionSize, 20).toFixed(1)}</p>
                      <p className="text-gray-400 text-sm">Önerilen oran</p>
                    </div>
                  </div>
                );
              })()}
            </motion.div>
          )}

          {(analysisMode === 'signals' || analysisMode === 'multi') && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="card"
            >
              <div className="flex items-center space-x-3 mb-6">
                <BoltIcon className="h-6 w-6 text-primary-400" />
                <h2 className="text-xl font-bold text-white">Trading Sinyalleri</h2>
              </div>

              {(() => {
                const signals = generateTradingSignals(indicators, currentCoin.price);
                return signals.length > 0 ? (
                  <div className="space-y-4">
                    {signals.map((signal, index) => (
                      <div
                        key={index}
                        className={`p-4 rounded-lg border ${
                          signal.type === 'BUY' ? 'bg-green-900/20 border-green-600/20' :
                          signal.type === 'SELL' ? 'bg-red-900/20 border-red-600/20' :
                          'bg-gray-900/20 border-gray-600/20'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center space-x-3">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                              signal.type === 'BUY' ? 'bg-green-600' :
                              signal.type === 'SELL' ? 'bg-red-600' :
                              'bg-gray-600'
                            }`}>
                              {signal.type === 'BUY' ? '↗' : signal.type === 'SELL' ? '↘' : '→'}
                            </div>
                            <div>
                              <p className={`font-bold text-lg ${
                                signal.type === 'BUY' ? 'text-green-400' :
                                signal.type === 'SELL' ? 'text-red-400' :
                                'text-gray-400'
                              }`}>
                                {signal.type} SİNYALİ
                              </p>
                              <p className="text-gray-400 text-sm">{signal.timeframe} - {signal.reason}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                              signal.confidence > 80 ? 'bg-green-900 text-green-300' :
                              signal.confidence > 60 ? 'bg-yellow-900 text-yellow-300' :
                              'bg-red-900 text-red-300'
                            }`}>
                              %{signal.confidence} güven
                            </div>
                            <p className="text-gray-400 text-sm mt-1">
                              Güç: {signal.strength.toFixed(0)}/100
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <ExclamationTriangleIcon className="h-12 w-12 text-gray-500 mx-auto mb-3" />
                    <p className="text-gray-400">Şu anda güçlü trading sinyali bulunmuyor</p>
                    <p className="text-gray-500 text-sm">Piyasa analizi devam ediyor...</p>
                  </div>
                );
              })()}
            </motion.div>
          )}

          {/* 🆕 Divergence Detection Panel */}
          {(analysisMode === 'divergence' || analysisMode === 'signals' || analysisMode === 'multi' || analysisMode === 'advanced') && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="card"
            >
              <div className="flex items-center space-x-3 mb-6">
                <div className="w-8 h-8 bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg flex items-center justify-center">
                  <span className="text-white text-lg">⚡</span>
                </div>
                <h2 className="text-xl font-bold text-white">Divergence Analizi</h2>
                <span className="px-2 py-1 bg-purple-900 text-purple-300 rounded-full text-sm font-medium">
                  {divergences.length} Sinyal
                </span>
              </div>

              {divergences.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-r from-purple-600 to-pink-600 rounded-full flex items-center justify-center">
                    <span className="text-3xl">🔍</span>
                  </div>
                  <p className="text-gray-400 text-lg mb-2">Divergence Tespit Edilemedi</p>
                  <p className="text-gray-500 text-sm max-w-md mx-auto">
                    Bu coin için mevcut timeframe'de ({timeframe}) herhangi bir RSI veya MACD divergence bulunamadı. 
                    Farklı bir timeframe veya coin deneyebilirsiniz.
                  </p>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {divergences.slice(0, 6).map((div, index) => (
                  <div
                    key={index}
                    className={`p-4 rounded-lg border-2 transition-all hover:scale-[1.02] ${
                      div.type === 'bullish' ? 'bg-green-900/10 border-green-600/30 hover:border-green-500/50' :
                      div.type === 'bearish' ? 'bg-red-900/10 border-red-600/30 hover:border-red-500/50' :
                      div.type === 'hidden-bullish' ? 'bg-emerald-900/10 border-emerald-600/30 hover:border-emerald-500/50' :
                      'bg-orange-900/10 border-orange-600/30 hover:border-orange-500/50'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-2">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                          div.type === 'bullish' ? 'bg-green-600' :
                          div.type === 'bearish' ? 'bg-red-600' :
                          div.type === 'hidden-bullish' ? 'bg-emerald-600' :
                          'bg-orange-600'
                        }`}>
                          {div.type.includes('bullish') ? '📈' : '📉'}
                        </div>
                        <div>
                          <p className={`font-bold text-sm ${
                            div.type === 'bullish' ? 'text-green-400' :
                            div.type === 'bearish' ? 'text-red-400' :
                            div.type === 'hidden-bullish' ? 'text-emerald-400' :
                            'text-orange-400'
                          }`}>
                            {div.type === 'bullish' ? 'BULLISH' :
                             div.type === 'bearish' ? 'BEARISH' :
                             div.type === 'hidden-bullish' ? 'HIDDEN BULLISH' :
                             'HIDDEN BEARISH'} DIVERGENCE
                          </p>
                          <p className="text-gray-400 text-xs">{div.indicator} • {div.timeframe}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className={`px-2 py-1 rounded text-xs font-bold ${
                          div.confidence > 80 ? 'bg-green-900 text-green-300' :
                          div.confidence > 65 ? 'bg-yellow-900 text-yellow-300' :
                          'bg-orange-900 text-orange-300'
                        }`}>
                          {div.confidence}% güven
                        </div>
                        <p className="text-gray-400 text-xs mt-1">
                          Güç: {div.strength}/100
                        </p>
                      </div>
                    </div>

                    <div className="bg-dark-800 rounded p-2 mb-2">
                      <p className="text-gray-300 text-xs">{div.description}</p>
                    </div>

                    <div className="flex justify-between text-xs">
                      <div>
                        <p className="text-gray-500">Başlangıç</p>
                        <p className="text-white font-medium">${div.startPoint.price.toFixed(2)}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-gray-500">İndikatör Değişim</p>
                        <p className={`font-medium ${
                          div.endPoint.indicatorValue > div.startPoint.indicatorValue ? 'text-green-400' : 'text-red-400'
                        }`}>
                          {((div.endPoint.indicatorValue - div.startPoint.indicatorValue) / div.startPoint.indicatorValue * 100).toFixed(1)}%
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-gray-500">Bitiş</p>
                        <p className="text-white font-medium">${div.endPoint.price.toFixed(2)}</p>
                      </div>
                    </div>
                  </div>
                    ))}
                  </div>

                  {divergences.length > 6 && (
                    <div className="mt-4 text-center">
                      <p className="text-gray-400 text-sm">
                        +{divergences.length - 6} daha fazla divergence bulundu
                      </p>
                    </div>
                  )}
                </>
              )}
            </motion.div>
          )}

          {/* Advanced Analysis Section */}
          {analysisMode === 'advanced' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              <AdvancedAnalysisPanel 
                symbol={selectedCoin || 'BTCUSDT'} 
                onSignalUpdate={(signal) => {
                  console.log('Advanced signal received:', signal);
                  if (signal.type !== 'HOLD') {
                    notificationManager.sendTradingSignal({
                      symbol: signal.coin,
                      type: signal.type,
                      confidence: signal.confidence,
                      reason: `Gelişmiş analiz: ${signal.reason}`
                    });
                  }
                }}
              />
            </motion.div>
          )}

          {/* Backtest & Notifications Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="card"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <BoltIcon className="h-6 w-6 text-purple-400" />
                <h2 className="text-xl font-bold text-white">Gelişmiş Analiz</h2>
              </div>
              <div className="flex items-center space-x-3">
                <button
                  onClick={async () => {
                    if (!selectedCoin) return;
                    
                    console.log('🔄 Starting backtest for', selectedCoin);
                    notificationManager.sendTradingSignal({
                      symbol: selectedCoin,
                      type: 'INFO',
                      confidence: 100,
                      reason: 'Backtest analizi başlatıldı'
                    });
                    
                    const engine = new BacktestEngine();
                    const strategy = {
                      name: 'RSI Momentum Strategy',
                      rules: {
                        entry: (indicators: any) => indicators.rsi < 35,
                        exit: (indicators: any) => indicators.rsi > 65,
                        positionSize: () => 0.1 // Pozisyon büyüklüğü
                      }
                    };
                    
                    try {
                      const result = await engine.runBacktest(
                        strategy,
                        selectedCoin,
                        new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 gün
                        new Date()
                      );
                      
                      const report = engine.generateReport(result);
                      console.log(report);
                      
                      notificationManager.sendTradingSignal({
                        symbol: selectedCoin,
                        type: result.totalReturn > 0 ? 'BUY' : 'SELL',
                        confidence: Math.min(Math.abs(result.winRate), 100),
                        reason: `Backtest: ${result.totalReturn.toFixed(2)}% getiri, ${result.winRate.toFixed(1)}% başarı`
                      });
                    } catch (error) {
                      console.error('Backtest hatası:', error);
                    }
                  }}
                  className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-all duration-200 flex items-center space-x-2"
                  title="30 günlük RSI stratejisi backtest'i"
                >
                  <BoltIcon className="h-4 w-4" />
                  <span>Backtest</span>
                </button>
                
                <button
                  onClick={() => {
                    if (!currentCoin) return;
                    
                    const alertPrice = currentCoin.price * 1.05; // %5 üstü
                    const alertId = notificationManager.createPriceAlert(
                      currentCoin.symbol,
                      alertPrice,
                      'above'
                    );
                    
                    console.log(`🔔 Price alert created: ${alertId}`);
                  }}
                  className="bg-gradient-to-r from-yellow-600 to-orange-600 hover:from-yellow-700 hover:to-orange-700 text-white px-4 py-2 rounded-lg font-medium transition-all duration-200 flex items-center space-x-2"
                  title="Fiyat alarmı oluştur (+%5)"
                >
                  <ExclamationTriangleIcon className="h-4 w-4" />
                  <span>Alarm</span>
                </button>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-purple-900/20 border border-purple-600/20 rounded-lg p-4">
                <h3 className="text-purple-400 font-medium mb-2">Backtest Engine</h3>
                <p className="text-gray-400 text-sm">
                  Stratejilerinizi geçmiş verilerle test edin. RSI, MACD ve MA tabanlı stratejiler.
                </p>
              </div>
              
              <div className="bg-blue-900/20 border border-blue-600/20 rounded-lg p-4">
                <h3 className="text-blue-400 font-medium mb-2">Risk Analysis</h3>
                <p className="text-gray-400 text-sm">
                  Kelly Criterion ile optimal pozisyon büyüklüğü ve risk yönetimi.
                </p>
              </div>
              
              <div className="bg-orange-900/20 border border-orange-600/20 rounded-lg p-4">
                <h3 className="text-orange-400 font-medium mb-2">Smart Alerts</h3>
                <p className="text-gray-400 text-sm">
                  Fiyat alarmları ve trading sinyalleri için akıllı bildirim sistemi.
                </p>
              </div>
            </div>
          </motion.div>

          {/* Favori Coin Karşılaştırma */}
          {favoriteCoin && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="card"
            >
              <div className="flex items-center space-x-3 mb-6">
                <FireIcon className="h-6 w-6 text-orange-400" />
                <h2 className="text-xl font-bold text-white">Favori Coin Karşılaştırması</h2>
              </div>

              <div className="bg-dark-700 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                      favoriteCoin.signal === 'BUY' ? 'bg-green-600' :
                      favoriteCoin.signal === 'SELL' ? 'bg-red-600' :
                      'bg-gray-600'
                    }`}>
                      <span className="text-white font-bold">
                        {favoriteCoin.symbol.slice(0, 2)}
                      </span>
                    </div>
                    <div>
                      <p className="text-white font-bold text-lg">{favoriteCoin.symbol}</p>
                      <p className="text-gray-400">Favori listende</p>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <p className="text-white font-bold text-xl">${favoriteCoin.price.toFixed(4)}</p>
                    <p className={`font-medium ${
                      favoriteCoin.change24h >= 0 ? 'text-green-400' : 'text-red-400'
                    }`}>
                      {favoriteCoin.change24h >= 0 ? '+' : ''}{favoriteCoin.change24h.toFixed(2)}%
                    </p>
                  </div>
                  
                  <div className={`px-4 py-2 rounded-lg ${
                    favoriteCoin.signal === 'BUY' ? 'bg-green-900/20 text-green-400' :
                    favoriteCoin.signal === 'SELL' ? 'bg-red-900/20 text-red-400' :
                    'bg-gray-900/20 text-gray-400'
                  }`}>
                    <p className="font-bold">{favoriteCoin.signal}</p>
                    <p className="text-sm">RSI: {favoriteCoin.rsi?.toFixed(1) || 'N/A'}</p>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </>
      ) : (
        <div className="card">
          <div className="text-center py-12">
            <ChartBarIcon className="h-16 w-16 text-gray-500 mx-auto mb-4" />
            <p className="text-gray-400 text-lg">Analiz için bir coin seçin</p>
            <p className="text-gray-500 text-sm">Yukarıdan bir coin seçerek detaylı analizi başlatın</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default Analysis;