import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  ChartBarIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  ClockIcon,
} from '@heroicons/react/24/outline';
import { useTradingStore } from '../store/tradingStore';
import PriceChart from '../components/Charts/PriceChart';
import { binanceAPI } from '../services/binanceAPI';

const Trading: React.FC = () => {
  const { coins, selectedCoin, setSelectedCoin, signals } = useTradingStore();
  const [chartData, setChartData] = useState<number[]>([]);
  const [chartLabels, setChartLabels] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const currentCoin = coins.find(coin => coin.symbol === selectedCoin) || coins[0];
  const currentSignal = signals.find(signal => signal.coin === selectedCoin);

  useEffect(() => {
    if (selectedCoin) {
      loadChartData();
    }
  }, [selectedCoin]);

  const loadChartData = async () => {
    setLoading(true);
    try {
      const klines = await binanceAPI.getKlines(selectedCoin, '1h', 24);
      const prices = klines.map((kline: any) => parseFloat(kline[4])); // Close price
      const labels = klines.map((kline: any) => {
        const date = new Date(kline[0]);
        return date.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
      });
      
      setChartData(prices);
      setChartLabels(labels);
    } catch (error) {
      console.error('Error loading chart data:', error);
      // Fallback data
      const mockPrices = Array.from({ length: 24 }, (_, i) => 
        43000 + Math.sin(i * 0.5) * 1000 + Math.random() * 500
      );
      const mockLabels = Array.from({ length: 24 }, (_, i) => 
        new Date(Date.now() - (23 - i) * 60 * 60 * 1000).toLocaleTimeString('tr-TR', { 
          hour: '2-digit', 
          minute: '2-digit' 
        })
      );
      setChartData(mockPrices);
      setChartLabels(mockLabels);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Trading</h1>
        <div className="flex items-center space-x-2">
          <ChartBarIcon className="h-6 w-6 text-primary-400" />
          <span className="text-gray-400">Gerçek Zamanlı Analiz</span>
        </div>
      </div>

      {/* Coin Selector - Responsive Grid */}
      <div className="card">
        <h2 className="text-lg font-semibold text-white mb-4">Coin Seçimi</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 md:gap-3">
          {coins.slice(0, 6).map((coin) => (
            <button
              key={coin.symbol}
              onClick={() => setSelectedCoin(coin.symbol)}
              className={`p-3 rounded-lg transition-all ${
                selectedCoin === coin.symbol
                  ? 'bg-primary-600 text-white shadow-lg'
                  : 'bg-dark-700 text-gray-300 hover:bg-dark-600'
              }`}
            >
              <div className="text-center">
                <p className="font-semibold">{coin.name}</p>
                <p className="text-sm opacity-75">${coin.price.toFixed(2)}</p>
                <p className={`text-xs ${
                  coin.change24h >= 0 ? 'text-success-400' : 'text-danger-400'
                }`}>
                  {coin.change24h >= 0 ? '+' : ''}{coin.change24h.toFixed(2)}%
                </p>
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 lg:gap-6">
        {/* Price Chart */}
        <div className="xl:col-span-2 card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white">
              {currentCoin?.name || 'Bitcoin'} Fiyat Grafiği
            </h2>
            <div className="flex items-center space-x-2 text-sm text-gray-400">
              <ClockIcon className="h-4 w-4" />
              <span>Son 24 Saat</span>
            </div>
          </div>
          
          {loading ? (
            <div className="h-64 flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
            </div>
          ) : (
            <PriceChart
              data={chartData}
              labels={chartLabels}
              title=""
              color="#fbbf24"
            />
          )}
        </div>

        {/* Trading Panel */}
        <div className="space-y-6">
          {/* Current Signal */}
          {currentSignal && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="card"
            >
              <h3 className="text-lg font-semibold text-white mb-4">Aktif Sinyal</h3>
              <div className="space-y-3">
                <div className={`p-3 rounded-lg ${
                  currentSignal.type === 'BUY' ? 'bg-success-900/20 border border-success-600' :
                  currentSignal.type === 'SELL' ? 'bg-danger-900/20 border border-danger-600' :
                  'bg-gray-900/20 border border-gray-600'
                }`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className={`px-2 py-1 rounded text-xs font-bold ${
                      currentSignal.type === 'BUY' ? 'bg-success-600 text-white' :
                      currentSignal.type === 'SELL' ? 'bg-danger-600 text-white' :
                      'bg-gray-600 text-white'
                    }`}>
                      {currentSignal.type === 'BUY' ? 'AL' : currentSignal.type === 'SELL' ? 'SAT' : 'BEKLE'}
                    </span>
                    <span className="text-white font-semibold">{currentSignal.confidence}% Güven</span>
                  </div>
                  <p className="text-gray-300 text-sm mb-2">{currentSignal.reason}</p>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-gray-400">Giriş Fiyatı</p>
                      <p className="text-white font-medium">${currentSignal.price.toFixed(2)}</p>
                    </div>
                    {currentSignal.targetPrice && (
                      <div>
                        <p className="text-gray-400">Hedef</p>
                        <p className="text-success-400 font-medium">${currentSignal.targetPrice.toFixed(2)}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* Coin Details */}
          {currentCoin && (
            <div className="card">
              <h3 className="text-lg font-semibold text-white mb-4">Coin Detayları</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-400">Güncel Fiyat</span>
                  <span className="text-white font-semibold">${currentCoin.price.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">24s Değişim</span>
                  <span className={`font-semibold ${
                    currentCoin.change24h >= 0 ? 'text-success-400' : 'text-danger-400'
                  }`}>
                    {currentCoin.change24h >= 0 ? '+' : ''}{currentCoin.change24h.toFixed(2)}%
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">24s Yüksek</span>
                  <span className="text-white">${currentCoin.high24h.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">24s Düşük</span>
                  <span className="text-white">${currentCoin.low24h.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">24s Hacim</span>
                  <span className="text-white">{currentCoin.volume24h}</span>
                </div>
              </div>
            </div>
          )}

          {/* Quick Actions */}
          <div className="card">
            <h3 className="text-lg font-semibold text-white mb-4">Hızlı İşlemler</h3>
            <div className="grid grid-cols-2 gap-3">
              <button className="flex items-center justify-center space-x-2 bg-success-600 hover:bg-success-700 text-white px-4 py-3 rounded-lg font-medium transition-colors">
                <ArrowTrendingUpIcon className="h-4 w-4" />
                <span>Al</span>
              </button>
              <button className="flex items-center justify-center space-x-2 bg-danger-600 hover:bg-danger-700 text-white px-4 py-3 rounded-lg font-medium transition-colors">
                <ArrowTrendingDownIcon className="h-4 w-4" />
                <span>Sat</span>
              </button>
            </div>
            <p className="text-xs text-gray-400 mt-2 text-center">
              * Bu butonlar demo amaçlıdır
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Trading;