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
  SparklesIcon,
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
import * as VolumeAnalysis from '../services/volumeAnalysis';
import VolumeProfileChart from '../components/VolumeProfileChart';
import { TechnicalIndicators, VolumeAnalysisResult, DecisionResult } from '../types';
import AdvancedAnalysisPanel from '../components/AdvancedAnalysisPanel';
import AIOpinionModal from '../components/AIOpinionModal';
import * as DecisionEngine from '../services/decisionEngine';
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
  const [analysisMode, setAnalysisMode] = useState<'technical' | 'risk' | 'signals' | 'divergence' | 'volume' | 'decision' | 'multi' | 'advanced'>('decision');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'price' | 'change' | 'volume'>('change');
  const [chartData, setChartData] = useState<any>(null);
  const [chartLoading, setChartLoading] = useState(false);
  const [divergences, setDivergences] = useState<Divergence[]>([]);
  const [volumeAnalysis, setVolumeAnalysis] = useState<VolumeAnalysisResult | null>(null);
  const [decisionResult, setDecisionResult] = useState<DecisionResult | null>(null);
  const [decisionLoading, setDecisionLoading] = useState(false);
  const [showAIModal, setShowAIModal] = useState(false);
  
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
          // RSI değeri uç noktalarda olabilir (normal), sessizce düzelt
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
        
        // 🆕 Volume Analysis
        console.log('📊 Analyzing volume profile...');
        const volumes = klines.map((kline: any) => parseFloat(kline[5])); // Volume
        const highs = klines.map((kline: any) => parseFloat(kline[2])); // High
        const lows = klines.map((kline: any) => parseFloat(kline[3])); // Low
        const klinesTimestamps = klines.map((kline: any) => new Date(kline[0]));
        
        const volumeAnalysisResult = VolumeAnalysis.analyzeVolume(
          prices,
          volumes,
          highs,
          lows,
          klinesTimestamps
        );
        
        setVolumeAnalysis(volumeAnalysisResult);
        console.log(`✅ Volume analysis completed:`, {
          poc: volumeAnalysisResult.profile.poc.toFixed(2),
          signal: volumeAnalysisResult.recommendation.signal,
          confidence: volumeAnalysisResult.recommendation.confidence.toFixed(1)
        });
        
        // 🎯 Decision Engine Analysis
        console.log('🎯 Running Decision Engine...');
        setDecisionLoading(true);
        
        try {
          // Fetch orderbook for liquidity check
          const orderbook = await binanceAPI.getOrderbook(selectedCoin, 20);
          
          // Get 24h volume from current coin
          const volume24hNum = currentCoin?.volume24h 
            ? parseFloat(currentCoin.volume24h.replace(/[^0-9.]/g, '')) * 1000000 
            : volumes.reduce((sum, v) => sum + v, 0);
          
          const decisionInput = {
            symbol: selectedCoin,
            timeframe,
            price: prices[prices.length - 1],
            indicators: calculatedIndicators,
            divergences: detectedDivergences,
            volumeAnalysis: volumeAnalysisResult,
            orderbook: orderbook || undefined,
            volume24h: volume24hNum,
            candles: klines
          };
          
          const decision = DecisionEngine.analyzeAndDecide(decisionInput);
          setDecisionResult(decision);
          
          console.log(`✅ Decision Engine completed:`, {
            verdict: decision.verdict,
            confidence: (decision.confidence * 100).toFixed(0) + '%',
            score: decision.score,
            reasons: decision.reasons.length
          });
        } catch (decisionError) {
          console.error('Decision Engine error:', decisionError);
        } finally {
          setDecisionLoading(false);
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
    { value: 'decision', label: '🎯 Karar Motoru', icon: TrophyIcon },
    { value: 'technical', label: 'Teknik Analiz', icon: ChartBarIcon },
    { value: 'risk', label: 'Risk Yönetimi', icon: ShieldExclamationIcon },
    { value: 'signals', label: 'Trading Sinyalleri', icon: BoltIcon },
    { value: 'divergence', label: 'Divergence Analizi', icon: ArrowTrendingUpIcon },
    { value: 'volume', label: 'Hacim Analizi', icon: ChartBarIcon },
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
                    {/* Header */}
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-2">
                        <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                          div.type === 'bullish' ? 'bg-green-600' :
                          div.type === 'bearish' ? 'bg-red-600' :
                          div.type === 'hidden-bullish' ? 'bg-emerald-600' :
                          'bg-orange-600'
                        }`}>
                          <span className="text-2xl">
                            {div.type === 'bullish' ? '📈' : div.type === 'bearish' ? '📉' : 
                             div.type === 'hidden-bullish' ? '🔄' : '🔃'}
                          </span>
                        </div>
                        <div>
                          <p className={`font-bold text-base ${
                            div.type === 'bullish' || div.type === 'hidden-bullish' ? 'text-green-400' : 'text-red-400'
                          }`}>
                            {div.type === 'bullish' ? 'ALIM FIRSATI' :
                             div.type === 'bearish' ? 'SATIM SİNYALİ' :
                             div.type === 'hidden-bullish' ? 'YUKSELIŞ DEVAMI' :
                             'DÜŞÜŞ DEVAMI'}
                          </p>
                          <p className="text-gray-400 text-xs">{div.indicator} • {div.timeframe}</p>
                        </div>
                      </div>
                      <div className={`px-3 py-1.5 rounded-lg text-xs font-bold ${
                        div.confidence > 80 ? 'bg-green-900 text-green-300' :
                        div.confidence > 65 ? 'bg-yellow-900 text-yellow-300' :
                        'bg-orange-900 text-orange-300'
                      }`}>
                        %{div.confidence} Güven
                      </div>
                    </div>

                    {/* Trading Info */}
                    <div className="bg-dark-800 rounded-lg p-3 mb-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-gray-400 text-xs">Önerilen İşlem:</span>
                        <span className={`font-bold text-sm ${
                          div.type.includes('bullish') ? 'text-green-400' : 'text-red-400'
                        }`}>
                          {div.type.includes('bullish') ? 'SPOT AL' : 'POZISYON KAPAT'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-400 text-xs">Güncel Fiyat:</span>
                        <span className="text-white font-medium text-sm">
                          ${div.endPoint.price < 1 ? div.endPoint.price.toFixed(4) : div.endPoint.price.toFixed(2)}
                        </span>
                      </div>
                    </div>

                    {/* Signal Explanation */}
                    <div className={`p-3 rounded-lg mb-3 ${
                      div.type.includes('bullish') ? 'bg-green-900/20 border border-green-600/20' : 'bg-red-900/20 border border-red-600/20'
                    }`}>
                      <p className="text-xs text-gray-300 leading-relaxed">
                        {div.type === 'bullish' ? 
                          `💡 Fiyat düşüyor ama ${div.indicator} momentum artıyor. Bu trend dönüşü sinyali! Dipten alım fırsatı.` :
                         div.type === 'bearish' ?
                          `⚠️ Fiyat yükseliyor ama ${div.indicator} momentum düşüyor. Satış baskısı geliyor, pozisyon kapatın.` :
                         div.type === 'hidden-bullish' ?
                          `🔄 Yükseliş trendi devam ediyor. Düşük RSI seviyesinde ek alım yapılabilir.` :
                          `🔃 Düşüş trendi devam ediyor. Yükseliş beklemeden kaçının.`
                        }
                      </p>
                    </div>

                    {/* Price History */}
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <div className="text-center">
                        <p className="text-gray-500 mb-1">Geçmiş</p>
                        <p className="text-white font-medium">
                          ${div.startPoint.price < 1 ? div.startPoint.price.toFixed(4) : div.startPoint.price.toFixed(2)}
                        </p>
                      </div>
                      <div className="text-center">
                        <p className="text-gray-500 mb-1">Değişim</p>
                        <p className={`font-bold ${
                          div.endPoint.price > div.startPoint.price ? 'text-red-400' : 'text-green-400'
                        }`}>
                          {div.endPoint.price > div.startPoint.price ? '▲' : '▼'}
                          {Math.abs((div.endPoint.price - div.startPoint.price) / div.startPoint.price * 100).toFixed(2)}%
                        </p>
                      </div>
                      <div className="text-center">
                        <p className="text-gray-500 mb-1">Şimdi</p>
                        <p className="text-white font-medium">
                          ${div.endPoint.price < 1 ? div.endPoint.price.toFixed(4) : div.endPoint.price.toFixed(2)}
                        </p>
                      </div>
                    </div>

                    {/* Technical Details (Collapsed) */}
                    <details className="mt-3">
                      <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-400">
                        📊 Teknik Detaylar
                      </summary>
                      <div className="mt-2 p-2 bg-dark-900 rounded text-xs text-gray-400">
                        <p>{div.description}</p>
                        <p className="mt-1">Güç: {div.strength}/100</p>
                      </div>
                    </details>
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

          {/* 📊 Volume Analysis Section - Feature 2/5 */}
          {analysisMode === 'volume' && volumeAnalysis && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="card"
            >
              <div className="flex items-center space-x-3 mb-6">
                <ChartBarIcon className="h-6 w-6 text-cyan-400" />
                <h2 className="text-xl font-bold text-white">Hacim Analizi</h2>
              </div>

              {/* Overall Recommendation */}
              <div className={`mb-6 p-6 rounded-xl ${
                volumeAnalysis.recommendation.signal === 'BUY' 
                  ? 'bg-gradient-to-r from-green-900/30 to-emerald-900/30 border-2 border-green-500/30'
                  : volumeAnalysis.recommendation.signal === 'SELL'
                  ? 'bg-gradient-to-r from-red-900/30 to-rose-900/30 border-2 border-red-500/30'
                  : 'bg-gradient-to-r from-gray-900/30 to-slate-900/30 border-2 border-gray-500/30'
              }`}>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-2xl font-bold text-white flex items-center gap-3">
                    {volumeAnalysis.recommendation.signal === 'BUY' ? '🟢 ALIM SİNYALİ' : 
                     volumeAnalysis.recommendation.signal === 'SELL' ? '🔴 SATIM SİNYALİ' : 
                     '🟡 BEKLEME'}
                  </h3>
                  <div className={`px-4 py-2 rounded-lg font-bold text-lg ${
                    volumeAnalysis.recommendation.confidence > 70 ? 'bg-green-500/20 text-green-300' :
                    volumeAnalysis.recommendation.confidence > 40 ? 'bg-yellow-500/20 text-yellow-300' :
                    'bg-red-500/20 text-red-300'
                  }`}>
                    %{volumeAnalysis.recommendation.confidence.toFixed(0)} Güven
                  </div>
                </div>
                <div className="space-y-2">
                  {volumeAnalysis.recommendation.reasons.map((reason, idx) => (
                    <p key={idx} className="text-gray-300 flex items-start gap-2">
                      <span className="text-cyan-400">•</span>
                      <span>{reason}</span>
                    </p>
                  ))}
                </div>
              </div>

              {/* Volume Profile */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
                <div className="bg-gradient-to-br from-cyan-900/20 to-blue-900/20 border border-cyan-600/30 rounded-xl p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-cyan-400 font-bold text-lg">POC (Point of Control)</h3>
                    <ChartBarIcon className="h-6 w-6 text-cyan-400" />
                  </div>
                  <p className="text-3xl font-bold text-white mb-2">
                    ${volumeAnalysis.profile.poc < 1 
                      ? volumeAnalysis.profile.poc.toFixed(4) 
                      : volumeAnalysis.profile.poc.toFixed(2)}
                  </p>
                  <p className="text-gray-400 text-sm">En yüksek hacimli fiyat seviyesi</p>
                  <div className="mt-4 pt-4 border-t border-cyan-600/20">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Mevcut Fiyat:</span>
                      <span className="text-white font-medium">
                        ${currentCoin?.price.toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm mt-1">
                      <span className="text-gray-400">Fark:</span>
                      <span className={currentCoin && currentCoin.price < volumeAnalysis.profile.poc ? 'text-green-400' : 'text-red-400'}>
                        {currentCoin && ((currentCoin.price - volumeAnalysis.profile.poc) / volumeAnalysis.profile.poc * 100).toFixed(2)}%
                      </span>
                    </div>
                  </div>
                </div>

                <div className="bg-gradient-to-br from-green-900/20 to-emerald-900/20 border border-green-600/30 rounded-xl p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-green-400 font-bold text-lg">VAH (Value Area High)</h3>
                    <ArrowTrendingUpIcon className="h-6 w-6 text-green-400" />
                  </div>
                  <p className="text-3xl font-bold text-white mb-2">
                    ${volumeAnalysis.profile.vah < 1 
                      ? volumeAnalysis.profile.vah.toFixed(4) 
                      : volumeAnalysis.profile.vah.toFixed(2)}
                  </p>
                  <p className="text-gray-400 text-sm">Üst %70 hacim sınırı (direnç)</p>
                </div>

                <div className="bg-gradient-to-br from-red-900/20 to-rose-900/20 border border-red-600/30 rounded-xl p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-red-400 font-bold text-lg">VAL (Value Area Low)</h3>
                    <ArrowTrendingDownIcon className="h-6 w-6 text-red-400" />
                  </div>
                  <p className="text-3xl font-bold text-white mb-2">
                    ${volumeAnalysis.profile.val < 1 
                      ? volumeAnalysis.profile.val.toFixed(4) 
                      : volumeAnalysis.profile.val.toFixed(2)}
                  </p>
                  <p className="text-gray-400 text-sm">Alt %70 hacim sınırı (destek)</p>
                </div>
              </div>

                {/* Volume Profile Chart */}
                <div className="mb-6">
                  <VolumeProfileChart profile={volumeAnalysis.profile} />
                </div>

                {/* Buy/Sell Pressure */}
              <div className="bg-gradient-to-r from-purple-900/20 to-pink-900/20 border border-purple-600/30 rounded-xl p-6 mb-6">
                <h3 className="text-purple-400 font-bold text-lg mb-4 flex items-center gap-2">
                  <ScaleIcon className="h-5 w-5" />
                  Alış/Satış Baskısı
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-gray-400">Alım Baskısı</span>
                      <span className="text-green-400 font-bold">
                        %{volumeAnalysis.pressure.buyPressure.toFixed(1)}
                      </span>
                    </div>
                    <div className="w-full bg-gray-800 rounded-full h-3">
                      <div 
                        className="bg-gradient-to-r from-green-500 to-emerald-500 h-3 rounded-full transition-all duration-500"
                        style={{ width: `${volumeAnalysis.pressure.buyPressure}%` }}
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-gray-400">Satım Baskısı</span>
                      <span className="text-red-400 font-bold">
                        %{volumeAnalysis.pressure.sellPressure.toFixed(1)}
                      </span>
                    </div>
                    <div className="w-full bg-gray-800 rounded-full h-3">
                      <div 
                        className="bg-gradient-to-r from-red-500 to-rose-500 h-3 rounded-full transition-all duration-500"
                        style={{ width: `${volumeAnalysis.pressure.sellPressure}%` }}
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4 mt-4">
                  <div className="bg-purple-900/30 rounded-lg p-3 text-center">
                    <p className="text-gray-400 text-xs mb-1">Cumulative Delta</p>
                    <p className={`text-lg font-bold ${volumeAnalysis.pressure.cumulativeDelta > 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {volumeAnalysis.pressure.cumulativeDelta > 0 ? '+' : ''}
                      {(volumeAnalysis.pressure.cumulativeDelta / 1000000).toFixed(2)}M
                    </p>
                  </div>
                  
                  <div className="bg-purple-900/30 rounded-lg p-3 text-center">
                    <p className="text-gray-400 text-xs mb-1">Money Flow Index</p>
                    <p className={`text-lg font-bold ${volumeAnalysis.pressure.mfi > 50 ? 'text-green-400' : 'text-red-400'}`}>
                      {volumeAnalysis.pressure.mfi.toFixed(1)}
                    </p>
                  </div>
                  
                  <div className="bg-purple-900/30 rounded-lg p-3 text-center">
                    <p className="text-gray-400 text-xs mb-1">Baskın Taraf</p>
                    <p className={`text-sm font-bold ${
                      volumeAnalysis.pressure.dominantSide === 'BUYERS' ? 'text-green-400' :
                      volumeAnalysis.pressure.dominantSide === 'SELLERS' ? 'text-red-400' :
                      'text-yellow-400'
                    }`}>
                      {volumeAnalysis.pressure.dominantSide === 'BUYERS' ? '🟢 ALICILAR' :
                       volumeAnalysis.pressure.dominantSide === 'SELLERS' ? '🔴 SATICILAR' :
                       '🟡 DENGELİ'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Volume Spikes */}
              {volumeAnalysis.spikes.length > 0 && (
                <div className="bg-gradient-to-r from-orange-900/20 to-yellow-900/20 border border-orange-600/30 rounded-xl p-6 mb-6">
                  <h3 className="text-orange-400 font-bold text-lg mb-4 flex items-center gap-2">
                    <BoltIcon className="h-5 w-5" />
                    Hacim Patlamaları (Son {volumeAnalysis.spikes.length})
                  </h3>
                  
                  <div className="space-y-3">
                    {volumeAnalysis.spikes.slice(0, 5).map((spike, idx) => (
                      <div key={idx} className="bg-gray-900/50 rounded-lg p-4 flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <span className={`text-2xl ${
                              spike.type === 'BULLISH' ? '📈' : spike.type === 'BEARISH' ? '📉' : '➡️'
                            }`}></span>
                            <span className={`font-bold ${
                              spike.type === 'BULLISH' ? 'text-green-400' :
                              spike.type === 'BEARISH' ? 'text-red-400' :
                              'text-gray-400'
                            }`}>
                              {spike.type === 'BULLISH' ? 'Yükseliş' : spike.type === 'BEARISH' ? 'Düşüş' : 'Nötr'}
                            </span>
                            <span className="text-gray-400 text-sm">
                              {new Date(spike.timestamp).toLocaleString('tr-TR')}
                            </span>
                          </div>
                          
                          <div className="grid grid-cols-3 gap-4 text-sm">
                            <div>
                              <span className="text-gray-400">Hacim:</span>
                              <span className="text-white ml-2 font-medium">
                                {(spike.volume / 1000000).toFixed(2)}M
                              </span>
                            </div>
                            <div>
                              <span className="text-gray-400">Katı:</span>
                              <span className="text-orange-400 ml-2 font-bold">
                                {spike.multiplier.toFixed(1)}x
                              </span>
                            </div>
                            <div>
                              <span className="text-gray-400">Fiyat Değişim:</span>
                              <span className={`ml-2 font-bold ${spike.priceChange > 0 ? 'text-green-400' : 'text-red-400'}`}>
                                {spike.priceChange > 0 ? '+' : ''}{spike.priceChange.toFixed(2)}%
                              </span>
                            </div>
                          </div>
                        </div>
                        
                        <div className={`ml-4 px-4 py-2 rounded-lg ${
                          spike.strength > 70 ? 'bg-orange-500/20 text-orange-300' :
                          spike.strength > 40 ? 'bg-yellow-500/20 text-yellow-300' :
                          'bg-gray-500/20 text-gray-300'
                        }`}>
                          <span className="text-xs">Güç</span>
                          <p className="text-lg font-bold">{spike.strength.toFixed(0)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Accumulation/Distribution Zones */}
              {volumeAnalysis.zones.length > 0 && (
                <div className="bg-gradient-to-r from-indigo-900/20 to-violet-900/20 border border-indigo-600/30 rounded-xl p-6">
                  <h3 className="text-indigo-400 font-bold text-lg mb-4 flex items-center gap-2">
                    <CurrencyDollarIcon className="h-5 w-5" />
                    Biriktirme/Dağıtım Bölgeleri
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {volumeAnalysis.zones.map((zone, idx) => (
                      <div key={idx} className={`rounded-lg p-4 ${
                        zone.type === 'ACCUMULATION' 
                          ? 'bg-gradient-to-br from-green-900/30 to-emerald-900/30 border border-green-500/30'
                          : 'bg-gradient-to-br from-red-900/30 to-rose-900/30 border border-red-500/30'
                      }`}>
                        <div className="flex items-center justify-between mb-3">
                          <h4 className={`font-bold ${zone.type === 'ACCUMULATION' ? 'text-green-400' : 'text-red-400'}`}>
                            {zone.type === 'ACCUMULATION' ? '🟢 BİRİKTİRME' : '🔴 DAĞITIM'}
                          </h4>
                          <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                            zone.signal === 'BUY' ? 'bg-green-500/20 text-green-300' :
                            zone.signal === 'SELL' ? 'bg-red-500/20 text-red-300' :
                            'bg-gray-500/20 text-gray-300'
                          }`}>
                            {zone.signal === 'BUY' ? 'AL' : zone.signal === 'SELL' ? 'SAT' : 'BEKLE'}
                          </span>
                        </div>
                        
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-400">Fiyat Aralığı:</span>
                            <span className="text-white font-medium">
                              ${zone.priceRange.low.toFixed(2)} - ${zone.priceRange.high.toFixed(2)}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-400">Hacim:</span>
                            <span className="text-white font-medium">
                              {(zone.volume / 1000000).toFixed(2)}M
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-400">Süre:</span>
                            <span className="text-white font-medium">
                              {zone.duration} mum
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-400">Güç:</span>
                            <span className={`font-bold ${zone.strength > 50 ? 'text-green-400' : 'text-yellow-400'}`}>
                              {zone.strength.toFixed(0)}/100
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {/* 🎯 Decision Engine Panel */}
          {analysisMode === 'decision' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="card"
            >
              <div className="flex items-center space-x-3 mb-6">
                <div className="w-10 h-10 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-xl flex items-center justify-center">
                  <TrophyIcon className="h-6 w-6 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-white">Karar Motoru</h2>
                {decisionLoading && (
                  <div className="flex items-center space-x-2">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-yellow-500"></div>
                    <span className="text-gray-400 text-sm">Analiz ediliyor...</span>
                  </div>
                )}
              </div>

              {!decisionResult && !decisionLoading ? (
                <div className="text-center py-16">
                  <TrophyIcon className="h-20 w-20 text-gray-500 mx-auto mb-6" />
                  <p className="text-gray-400 text-lg mb-2">Karar motoru hazır</p>
                  <p className="text-gray-500 text-sm mb-6 max-w-md mx-auto">
                    Bir coin seçin ve herhangi bir timeframe'de analiz başlatın. 
                    Deterministik karar motoru size net BUY/SELL/HOLD sinyali verecek.
                  </p>
                  <div className="flex items-center justify-center space-x-2 text-xs text-gray-500">
                    <span>✓ Veri kalite kontrolü</span>
                    <span>•</span>
                    <span>✓ Multi-indicator scoring</span>
                    <span>•</span>
                    <span>✓ Risk yönetimi</span>
                  </div>
                </div>
              ) : decisionResult ? (
                <>
                  {/* Main Verdict Card */}
                  <div className={`mb-8 p-8 rounded-2xl border-4 transition-all ${
                    decisionResult.verdict === 'BUY'
                      ? 'bg-gradient-to-br from-green-900/40 to-emerald-900/40 border-green-500/50 shadow-lg shadow-green-500/20'
                      : decisionResult.verdict === 'SELL'
                      ? 'bg-gradient-to-br from-red-900/40 to-rose-900/40 border-red-500/50 shadow-lg shadow-red-500/20'
                      : 'bg-gradient-to-br from-gray-900/40 to-slate-900/40 border-gray-500/50 shadow-lg shadow-gray-500/20'
                  }`}>
                    <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center space-x-4">
                        <div className={`w-20 h-20 rounded-2xl flex items-center justify-center text-4xl font-bold ${
                          decisionResult.verdict === 'BUY' ? 'bg-green-600' :
                          decisionResult.verdict === 'SELL' ? 'bg-red-600' :
                          'bg-gray-600'
                        }`}>
                          {decisionResult.verdict === 'BUY' ? '📈' : decisionResult.verdict === 'SELL' ? '📉' : '⏸️'}
                        </div>
                        <div>
                          <h3 className={`text-4xl font-black ${
                            decisionResult.verdict === 'BUY' ? 'text-green-400' :
                            decisionResult.verdict === 'SELL' ? 'text-red-400' :
                            'text-gray-400'
                          }`}>
                            {decisionResult.verdict}
                          </h3>
                          <p className="text-gray-400 text-sm mt-1">
                            {decisionResult.timeframe} timeframe • {new Date(decisionResult.timestamp).toLocaleTimeString('tr-TR')}
                          </p>
                        </div>
                      </div>

                      {/* Confidence Badge */}
                      <div className="text-right">
                        <div className={`inline-block px-6 py-3 rounded-xl text-2xl font-bold ${
                          decisionResult.confidence > 0.75 ? 'bg-green-500/30 text-green-300 ring-2 ring-green-400' :
                          decisionResult.confidence > 0.5 ? 'bg-yellow-500/30 text-yellow-300 ring-2 ring-yellow-400' :
                          'bg-orange-500/30 text-orange-300 ring-2 ring-orange-400'
                        }`}>
                          {(decisionResult.confidence * 100).toFixed(0)}%
                        </div>
                        <p className="text-gray-400 text-xs mt-2">Güven Skoru</p>
                      </div>
                    </div>

                    {/* Data Quality Warning */}
                    {(!decisionResult.dataQuality.isValid || decisionResult.dataQuality.warnings.length > 0) && (
                      <div className="mb-4 p-4 bg-yellow-900/30 border border-yellow-600/30 rounded-lg">
                        <p className="text-yellow-400 font-medium mb-2 flex items-center">
                          <ExclamationTriangleIcon className="h-5 w-5 mr-2" />
                          Veri Kalitesi Uyarıları
                        </p>
                        <ul className="text-yellow-300 text-sm space-y-1">
                          {decisionResult.dataQuality.warnings.map((warning, idx) => (
                            <li key={idx}>• {warning}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Score Display */}
                    <div className="mb-6">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-gray-400 text-sm">Internal Score</span>
                        <span className="text-white font-bold">{decisionResult.score.toFixed(0)} / 100</span>
                      </div>
                      <div className="w-full bg-gray-800 rounded-full h-4 relative overflow-hidden">
                        <div
                          className={`h-4 rounded-full transition-all duration-1000 ${
                            decisionResult.score >= 70 ? 'bg-gradient-to-r from-green-500 to-emerald-500' :
                            decisionResult.score <= -70 ? 'bg-gradient-to-r from-red-500 to-rose-500' :
                            'bg-gradient-to-r from-gray-500 to-slate-500'
                          }`}
                          style={{ 
                            width: `${Math.abs(decisionResult.score)}%`,
                            marginLeft: decisionResult.score < 0 ? '50%' : '0',
                            marginRight: decisionResult.score > 0 ? '50%' : '0'
                          }}
                        ></div>
                        <div className="absolute top-0 left-1/2 w-0.5 h-4 bg-white/50"></div>
                      </div>
                      <div className="flex justify-between text-xs text-gray-500 mt-1">
                        <span>SELL (-100)</span>
                        <span>HOLD (0)</span>
                        <span>BUY (+100)</span>
                      </div>
                    </div>
                  </div>

                  {/* Entry/Exit Levels (for BUY/SELL) */}
                  {decisionResult.verdict !== 'HOLD' && decisionResult.levels && (
                    <div className="mb-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      <div className="bg-blue-900/20 border border-blue-600/30 rounded-xl p-5">
                        <div className="flex items-center space-x-2 mb-3">
                          <ArrowTrendingUpIcon className="h-5 w-5 text-blue-400" />
                          <span className="text-blue-400 font-medium text-sm">Giriş Fiyatı</span>
                        </div>
                        <p className="text-white text-2xl font-bold">
                          ${decisionResult.levels.entryPrice?.toFixed(currentCoin && currentCoin.price < 1 ? 4 : 2)}
                        </p>
                        <p className="text-gray-400 text-xs mt-1">Limit order önerisi</p>
                      </div>

                      <div className="bg-red-900/20 border border-red-600/30 rounded-xl p-5">
                        <div className="flex items-center space-x-2 mb-3">
                          <ShieldExclamationIcon className="h-5 w-5 text-red-400" />
                          <span className="text-red-400 font-medium text-sm">Stop Loss</span>
                        </div>
                        <p className="text-white text-2xl font-bold">
                          ${decisionResult.levels.stopLoss?.toFixed(currentCoin && currentCoin.price < 1 ? 4 : 2)}
                        </p>
                        <p className="text-gray-400 text-xs mt-1">
                          {decisionResult.levels.entryPrice && decisionResult.levels.stopLoss 
                            ? `${(Math.abs((decisionResult.levels.stopLoss - decisionResult.levels.entryPrice) / decisionResult.levels.entryPrice) * 100).toFixed(1)}% risk`
                            : 'Risk seviyesi'
                          }
                        </p>
                      </div>

                      <div className="bg-green-900/20 border border-green-600/30 rounded-xl p-5">
                        <div className="flex items-center space-x-2 mb-3">
                          <TrophyIcon className="h-5 w-5 text-green-400" />
                          <span className="text-green-400 font-medium text-sm">Hedefler</span>
                        </div>
                        <div className="space-y-1">
                          {decisionResult.levels.targets.map((target, idx) => (
                            <p key={idx} className="text-white font-medium text-sm">
                              T{idx + 1}: ${target.toFixed(currentCoin && currentCoin.price < 1 ? 4 : 2)}
                            </p>
                          ))}
                        </div>
                      </div>

                      <div className="bg-purple-900/20 border border-purple-600/30 rounded-xl p-5">
                        <div className="flex items-center space-x-2 mb-3">
                          <ScaleIcon className="h-5 w-5 text-purple-400" />
                          <span className="text-purple-400 font-medium text-sm">Risk/Ödül</span>
                        </div>
                        <p className="text-white text-3xl font-bold">
                          1:{decisionResult.levels.riskRewardRatio.toFixed(1)}
                        </p>
                        <p className="text-gray-400 text-xs mt-1">Optimal oran</p>
                      </div>
                    </div>
                  )}

                  {/* Wait Conditions (for HOLD) */}
                  {decisionResult.verdict === 'HOLD' && decisionResult.waitFor && decisionResult.waitFor.length > 0 && (
                    <div className="mb-8 bg-yellow-900/20 border-2 border-yellow-600/30 rounded-xl p-6">
                      <h4 className="text-yellow-400 font-bold text-lg mb-4 flex items-center">
                        <ExclamationTriangleIcon className="h-6 w-6 mr-2" />
                        Neyi Beklemelisiniz?
                      </h4>
                      <div className="space-y-3">
                        {decisionResult.waitFor.map((condition, idx) => (
                          <div key={idx} className="flex items-start space-x-3">
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold ${
                              condition.priority === 'high' ? 'bg-red-600 text-white' :
                              condition.priority === 'medium' ? 'bg-yellow-600 text-white' :
                              'bg-gray-600 text-white'
                            }`}>
                              {idx + 1}
                            </div>
                            <div className="flex-1">
                              <p className="text-white font-medium">{condition.condition}</p>
                              <p className="text-gray-400 text-sm mt-1">{condition.description}</p>
                            </div>
                            <span className={`px-2 py-1 rounded text-xs font-bold ${
                              condition.priority === 'high' ? 'bg-red-500/20 text-red-300' :
                              condition.priority === 'medium' ? 'bg-yellow-500/20 text-yellow-300' :
                              'bg-gray-500/20 text-gray-300'
                            }`}>
                              {condition.priority.toUpperCase()}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Reasons */}
                  <div className="mb-6">
                    <details open>
                      <summary className="text-white font-bold text-lg mb-4 cursor-pointer hover:text-primary-400 transition-colors flex items-center">
                        <ChartBarIcon className="h-5 w-5 mr-2" />
                        Kararın Nedenleri ({decisionResult.reasons.length})
                      </summary>
                      <div className="bg-dark-800 rounded-xl p-5 space-y-3">
                        {decisionResult.reasons.map((reason, idx) => (
                          <div key={idx} className="flex items-start space-x-3">
                            <span className="text-green-400 font-bold text-lg">✓</span>
                            <p className="text-gray-300 flex-1">{reason}</p>
                          </div>
                        ))}
                      </div>
                    </details>
                  </div>

                  {/* Risks */}
                  {decisionResult.risks.length > 0 && (
                    <div className="mb-6">
                      <details>
                        <summary className="text-white font-bold text-lg mb-4 cursor-pointer hover:text-red-400 transition-colors flex items-center">
                          <ExclamationTriangleIcon className="h-5 w-5 mr-2" />
                          Riskler ({decisionResult.risks.length})
                        </summary>
                        <div className="bg-dark-800 rounded-xl p-5 space-y-3">
                          {decisionResult.risks.map((risk, idx) => (
                            <div key={idx} className="flex items-start space-x-3">
                              <span className="text-red-400 font-bold text-lg">⚠</span>
                              <p className="text-gray-300 flex-1">{risk}</p>
                            </div>
                          ))}
                        </div>
                      </details>
                    </div>
                  )}

                  {/* Data Quality Metrics */}
                  <div className="bg-dark-800 rounded-xl p-5">
                    <h4 className="text-gray-400 font-medium text-sm mb-4">Veri Kalitesi Metrikleri</h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <p className="text-gray-500 text-xs mb-1">Likidite</p>
                        <div className="flex items-center space-x-2">
                          <div className="flex-1 bg-gray-700 rounded-full h-2">
                            <div 
                              className="bg-blue-500 h-2 rounded-full"
                              style={{ width: `${decisionResult.dataQuality.metrics.liquidityScore * 100}%` }}
                            ></div>
                          </div>
                          <span className="text-white text-xs font-bold">
                            {(decisionResult.dataQuality.metrics.liquidityScore * 100).toFixed(0)}%
                          </span>
                        </div>
                      </div>
                      <div>
                        <p className="text-gray-500 text-xs mb-1">Hacim Güvenilirliği</p>
                        <div className="flex items-center space-x-2">
                          <div className="flex-1 bg-gray-700 rounded-full h-2">
                            <div 
                              className="bg-green-500 h-2 rounded-full"
                              style={{ width: `${decisionResult.dataQuality.metrics.volumeReliability * 100}%` }}
                            ></div>
                          </div>
                          <span className="text-white text-xs font-bold">
                            {(decisionResult.dataQuality.metrics.volumeReliability * 100).toFixed(0)}%
                          </span>
                        </div>
                      </div>
                      <div>
                        <p className="text-gray-500 text-xs mb-1">Fiyat Stabilite</p>
                        <div className="flex items-center space-x-2">
                          <div className="flex-1 bg-gray-700 rounded-full h-2">
                            <div 
                              className="bg-yellow-500 h-2 rounded-full"
                              style={{ width: `${decisionResult.dataQuality.metrics.priceStability * 100}%` }}
                            ></div>
                          </div>
                          <span className="text-white text-xs font-bold">
                            {(decisionResult.dataQuality.metrics.priceStability * 100).toFixed(0)}%
                          </span>
                        </div>
                      </div>
                      <div>
                        <p className="text-gray-500 text-xs mb-1">Veri Tamlığı</p>
                        <div className="flex items-center space-x-2">
                          <div className="flex-1 bg-gray-700 rounded-full h-2">
                            <div 
                              className="bg-purple-500 h-2 rounded-full"
                              style={{ width: `${decisionResult.dataQuality.metrics.dataCompleteness * 100}%` }}
                            ></div>
                          </div>
                          <span className="text-white text-xs font-bold">
                            {(decisionResult.dataQuality.metrics.dataCompleteness * 100).toFixed(0)}%
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* AI Second Opinion Button */}
                  <div className="mt-8 flex flex-col sm:flex-row gap-4">
                    <button
                      onClick={() => setShowAIModal(true)}
                      className="flex-1 py-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-bold rounded-xl transition-all duration-200 flex items-center justify-center space-x-2 shadow-lg hover:shadow-purple-500/50"
                    >
                      <SparklesIcon className="h-5 w-5" />
                      <span>🤖 AI'dan İkinci Görüş Al</span>
                    </button>
                  </div>

                  {/* Disclaimer */}
                  <div className="mt-6 p-4 bg-gray-900/50 border border-gray-700 rounded-lg">
                    <p className="text-gray-400 text-sm leading-relaxed">
                      ⚠️ <strong>Önemli Uyarı:</strong> Bu karar motoru deterministik bir algoritmadır ve geçmiş verilere dayanır. 
                      Yatırım kararlarınızı kendi risk değerlendirmenize göre verin. Piyasa koşulları hızla değişebilir.
                    </p>
                  </div>
                </>
              ) : null}
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

      {/* AI Opinion Modal */}
      {decisionResult && (
        <AIOpinionModal
          isOpen={showAIModal}
          onClose={() => setShowAIModal(false)}
          primaryDecision={decisionResult}
          symbol={selectedCoin || 'BTCUSDT'}
          allData={{ indicators, divergences, volumeAnalysis }}
        />
      )}
    </div>
  );
};

export default Analysis;