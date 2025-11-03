import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  ChartBarIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  CurrencyDollarIcon,
  ArrowPathIcon,
  PlusIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { useTradingStore } from '../store/tradingStore';
import { usePortfolioStore } from '../store/portfolioStore';
import TradingBot from '../components/TradingBot';
import AddCoinModal from '../components/AddCoinModal';

const Dashboard: React.FC = () => {
  const { 
    fetchCoins, 
    fetchSignals, 
    connectWebSocket 
  } = useTradingStore();
  
  const { 
    portfolioStats, 
    favoriteCoins,
    activePositions,
    marketStats,
    successRate,
    apiConfig, 
    isConnected: portfolioConnected,
    updateFavoriteCoinPrices,
    watchlist,
    removeFromWatchlist
  } = usePortfolioStore();
  
  const [isAddCoinModalOpen, setIsAddCoinModalOpen] = useState(false);

  useEffect(() => {
    // Global uygulama başlangıcı (sadece bir kez çalışır)
    const { initializeApp } = usePortfolioStore.getState();
    initializeApp();
    
    // Trading store verilerini yükle
    fetchCoins();
    fetchSignals();
    connectWebSocket();
  }, []); // Empty dependency array - sadece mount'ta çalışır

  // Market stats'ı periyodik olarak güncelle
  useEffect(() => {
    const { fetchMarketStats } = usePortfolioStore.getState();
    
    console.log('🔄 Dashboard mounted - checking market stats');
    
    // İlk yükleme (cache-aware - rate limit korumalı)
    fetchMarketStats();
    
    // Her 10 dakikada bir güncelle (cache korumalı)
    const interval = setInterval(() => {
      console.log('⏰ Periodic market stats check');
      fetchMarketStats();
    }, 10 * 60 * 1000); // 10 dakika
    
    return () => clearInterval(interval);
  }, []);

  // WebSocket'ten gelen verileri portfolioStore'a aktar (gerçek zamanlı güncelleme)
  useEffect(() => {
    let lastUpdate = 0;
    const updateInterval = 1000; // 1 saniyede bir güncelle (throttle)
    
    const unsubscribe = useTradingStore.subscribe((state) => {
      const now = Date.now();
      
      // Throttle: Çok sık güncelleme yapma
      if (now - lastUpdate < updateInterval) {
        return;
      }
      
      lastUpdate = now;
      
      // Trading store'daki coin güncellemelerini portfolioStore'a aktar
      if (state.coins && state.coins.length > 0) {
        // Coins verilerini ticker formatına çevir
        const tickers = state.coins.map((coin: any) => ({
          s: coin.symbol, // Symbol (BTCUSDT)
          c: coin.price?.toString(), // Current price
          P: coin.change24h?.toString(), // 24h change %
          q: coin.volume24h?.toString(), // Volume
          h: coin.high24h?.toString(), // 24h high
          l: coin.low24h?.toString(), // 24h low
        }));
        
        updateFavoriteCoinPrices(tickers);
      }
    });
    
    return () => unsubscribe();
  }, [updateFavoriteCoinPrices]);

  // Portfolio değerleri - API varsa gerçek, yoksa mock
  const portfolioValue = apiConfig ? portfolioStats.totalValue : 12450;
  const dailyPL = apiConfig ? portfolioStats.dayChange : 324.50;
  const activePositionsCount = apiConfig ? activePositions.length : 7;
  const currentSuccessRate = apiConfig ? successRate : 73;

  return (
    <div className="space-y-6">
      {/* Market Overview Banner - Responsive */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-dark-800 border border-gray-700 rounded-xl p-4 mb-6 overflow-x-auto"
      >
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 min-w-max lg:min-w-0">
          <div className="flex items-center space-x-4 md:space-x-6">
            <div className="text-center">
              <p className="text-gray-400 text-xs">BTC Dominansı</p>
              <p className={`font-bold ${marketStats.btcDominance > 0 ? 'text-white' : 'text-yellow-400'}`}>
                {marketStats.btcDominance > 0 ? marketStats.btcDominance.toFixed(1) : 'Yükleniyor...'}%
              </p>
            </div>
            <div className="text-center">
              <p className="text-gray-400 text-xs">Toplam Market Cap</p>
              <p className="text-white font-bold">${(marketStats.totalMarketCap / 1e12).toFixed(2)}T</p>
            </div>
            <div className="text-center">
              <p className="text-gray-400 text-xs">24h Hacim</p>
              <p className="text-white font-bold">${(marketStats.totalVolume24h / 1e9).toFixed(0)}B</p>
            </div>
            <div className="text-center">
              <p className="text-gray-400 text-xs">24h Değişim</p>
              <p className={`font-bold ${marketStats.marketCapChange24h >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {marketStats.marketCapChange24h >= 0 ? '+' : ''}{marketStats.marketCapChange24h.toFixed(2)}%
              </p>
            </div>
          </div>
          <div className="text-left lg:text-right">
            <p className="text-gray-400 text-xs">Son Güncelleme</p>
            <p className="text-white text-sm">{new Date().toLocaleTimeString('tr-TR')}</p>
          </div>
        </div>
      </motion.div>

      {/* Welcome Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-r from-primary-600 to-primary-800 rounded-xl p-6 text-white"
      >
        <h1 className="text-2xl font-bold mb-2">Kripto Analiz Asistanı</h1>
        <p className="text-primary-100">
          Profesyonel analiz araçları ile kripto piyasalarında başarılı kararlar alın.
        </p>
      </motion.div>

      {/* Stats Grid - Responsive & Optimized */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
          className="card"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">
                Toplam Portföy {!apiConfig && <span className="text-xs">(Demo)</span>}
              </p>
              <p className="text-2xl font-bold text-white">${portfolioValue.toLocaleString()}</p>
              <p className={`text-sm ${dailyPL >= 0 ? 'text-success-400' : 'text-error-400'}`}>
                {dailyPL >= 0 ? '+' : ''}${dailyPL.toFixed(2)} bugün
              </p>
            </div>
            <div className="bg-success-600/20 p-3 rounded-lg">
              <CurrencyDollarIcon className="h-6 w-6 text-success-400" />
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
          className="card"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">
                API Durumu {portfolioConnected && <span className="text-xs">(Bağlı)</span>}
              </p>
              <p className={`text-2xl font-bold ${portfolioConnected ? 'text-success-400' : 'text-gray-400'}`}>
                {portfolioConnected ? 'ACTIVE' : apiConfig ? 'CONNECTING...' : 'DEMO MODE'}
              </p>
              <p className="text-gray-400 text-sm">
                {apiConfig ? `${apiConfig.exchange.toUpperCase()} API` : 'Mock veriler'}
              </p>
            </div>
            <div className="bg-success-600/20 p-3 rounded-lg">
              <ArrowTrendingUpIcon className="h-6 w-6 text-success-400" />
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3 }}
          className="card"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Aktif Pozisyonlar</p>
              <p className="text-2xl font-bold text-white">{activePositionsCount}</p>
              <p className="text-gray-400 text-sm">Açık işlemler</p>
            </div>
            <div className="bg-primary-600/20 p-3 rounded-lg">
              <ChartBarIcon className="h-6 w-6 text-primary-400" />
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.4 }}
          className="card"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Başarı Oranı</p>
              <p className="text-2xl font-bold text-white">{currentSuccessRate}%</p>
              <p className="text-gray-400 text-sm">Son 30 gün</p>
            </div>
            <div className="bg-success-600/20 p-3 rounded-lg">
              <ArrowTrendingUpIcon className="h-6 w-6 text-success-400" />
            </div>
          </div>
        </motion.div>
      </div>

      {/* Takip Listem - Manuel Watchlist */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="card"
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white flex items-center space-x-2">
            <span>📌</span>
            <span>Takip Listem</span>
            <span className="text-xs text-gray-400 font-normal">({watchlist.length} coin)</span>
          </h2>
          <button
            onClick={() => setIsAddCoinModalOpen(true)}
            className="px-3 py-1.5 rounded-lg bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium transition-colors flex items-center space-x-1"
            title="Coin ekle"
          >
            <PlusIcon className="h-4 w-4" />
            <span>Coin Ekle</span>
          </button>
        </div>

        <p className="text-gray-400 text-xs mb-4">Manuel olarak ekleyip takip ettiğiniz coinler</p>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {watchlist.length === 0 ? (
            <div className="col-span-2 md:col-span-4 text-center py-8">
              <p className="text-gray-400 mb-2">Henüz takip edilen coin yok</p>
              <button
                onClick={() => setIsAddCoinModalOpen(true)}
                className="text-primary-400 hover:text-primary-300 text-sm underline"
              >
                İlk coin'inizi ekleyin
              </button>
            </div>
          ) : (
            watchlist.map((coin) => (
              <div
                key={coin.symbol}
                className="relative group p-4 rounded-lg bg-gradient-to-br from-gray-800 to-gray-900 border border-gray-700 hover:border-primary-500/50 transition-all duration-200"
              >
                {/* Remove Button */}
                <button
                  onClick={() => {
                    if (window.confirm(`${coin.symbol} takip listesinden çıkarılsın mı?`)) {
                      removeFromWatchlist(coin.symbol);
                    }
                  }}
                  className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 p-1 rounded bg-red-600 hover:bg-red-700 transition-all"
                  title="Listeden çıkar"
                >
                  <XMarkIcon className="h-3 w-3 text-white" />
                </button>

                {/* Coin Logo & Name */}
                <div className="flex flex-col items-center mb-3">
                  {coin.image ? (
                    <img
                      src={coin.image}
                      alt={coin.name}
                      className="w-12 h-12 rounded-full mb-2"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  ) : (
                    <div className="w-12 h-12 bg-gradient-to-r from-primary-400 to-primary-600 rounded-full flex items-center justify-center mb-2">
                      <span className="text-white text-sm font-bold">
                        {coin.symbol.slice(0, 2).toUpperCase()}
                      </span>
                    </div>
                  )}
                  <p className="text-white font-bold text-sm">{coin.symbol}</p>
                  <p className="text-gray-400 text-xs truncate max-w-full">{coin.name}</p>
                </div>

                {/* Price & Change */}
                {coin.price !== undefined && (
                  <div className="text-center">
                    <p className="text-white font-semibold text-base">
                      ${coin.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                    {coin.change24h !== undefined && (
                      <div
                        className={`flex items-center justify-center space-x-1 mt-1 ${
                          coin.change24h >= 0 ? 'text-success-400' : 'text-danger-400'
                        }`}
                      >
                        {coin.change24h >= 0 ? (
                          <ArrowTrendingUpIcon className="h-3 w-3" />
                        ) : (
                          <ArrowTrendingDownIcon className="h-3 w-3" />
                        )}
                        <span className="text-xs font-medium">
                          {coin.change24h >= 0 ? '+' : ''}
                          {coin.change24h.toFixed(2)}%
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {coin.price === undefined && (
                  <div className="text-center">
                    <div className="animate-pulse">
                      <div className="h-4 bg-gray-700 rounded mb-2"></div>
                      <div className="h-3 bg-gray-700 rounded w-2/3 mx-auto"></div>
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </motion.div>

      {/* Add Coin Modal */}
      <AddCoinModal
        isOpen={isAddCoinModalOpen}
        onClose={() => setIsAddCoinModalOpen(false)}
      />

      {/* Favorite Coins Analysis Section - Sadece API Favori Coinleri */}
      {apiConfig?.exchange === 'okx' && favoriteCoins.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.8 }}
          className="bg-gray-800 rounded-lg p-6 border border-gray-700"
        >
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <div className="bg-gradient-to-r from-yellow-500 to-orange-500 p-2 rounded-lg">
                <ChartBarIcon className="h-5 w-5 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Canlı Sinyal Takibi</h2>
                <p className="text-gray-400 text-sm">API Favori Coinlerin, gerçek zamanlı sinyal analizi</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              {/* Canlı Durum Göstergesi */}
              <div className="flex items-center space-x-2 bg-green-900/30 px-3 py-1.5 rounded-lg border border-green-700/50">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                <span className="text-green-400 text-sm font-medium">⏱️ Canlı (3s)</span>
              </div>
              
              {/* Dinamik Sinyal Sayacı */}
              <div className="flex items-center space-x-2">
                {(() => {
                  const buySignals = favoriteCoins.filter(coin => coin.signal === 'BUY').length;
                  const sellSignals = favoriteCoins.filter(coin => coin.signal === 'SELL').length;
                  
                  return (
                    <>
                      {buySignals > 0 && (
                        <div className="flex items-center space-x-1 bg-green-900/30 px-2 py-1 rounded border border-green-700/50">
                          <span className="text-green-400 text-sm font-medium">📈 {buySignals} AL</span>
                        </div>
                      )}
                      {sellSignals > 0 && (
                        <div className="flex items-center space-x-1 bg-red-900/30 px-2 py-1 rounded border border-red-700/50">
                          <span className="text-red-400 text-sm font-medium">📉 {sellSignals} SAT</span>
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>
              
              {/* Yenile Butonu */}
              <button 
                onClick={() => {
                  console.log('🔄 Manual analysis triggered');
                  const { fetchFavoriteCoins } = usePortfolioStore.getState();
                  fetchFavoriteCoins();
                }}
                className="text-blue-400 hover:text-blue-300 text-sm px-3 py-1.5 border border-blue-600 rounded-lg transition-colors flex items-center space-x-1"
                title="Sinyalleri yeniden hesapla"
              >
                <ArrowPathIcon className="h-4 w-4" />
                <span>Yenile</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {favoriteCoins.slice(0, 12).map((coin) => (
              <motion.div
                key={coin.symbol}
                whileHover={{ scale: 1.02 }}
                className={`bg-gray-900 rounded-lg p-4 border-2 transition-all ${
                  coin.signalStrength && coin.signalStrength > 70 ? 'border-yellow-500 shadow-lg shadow-yellow-500/20' :
                  coin.signal === 'BUY' ? 'border-green-600' :
                  coin.signal === 'SELL' ? 'border-red-600' :
                  'border-gray-600'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    {coin.logoUrl && (
                      <img 
                        src={coin.logoUrl} 
                        alt={coin.symbol}
                        className="w-6 h-6 rounded-full"
                        onError={(e) => {
                          // Fallback to gradient background if logo fails to load
                          const target = e.target as HTMLImageElement;
                          target.style.display = 'none';
                        }}
                      />
                    )}
                    <h3 className="text-white font-semibold">{coin.symbol}</h3>
                    {coin.signalStrength && coin.signalStrength > 70 && (
                      <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse"></div>
                    )}
                  </div>
                  <div className="flex items-center space-x-2">
                    {coin.signalStrength && (
                      <span className="text-xs text-gray-400">
                        {coin.signalStrength.toFixed(0)}%
                      </span>
                    )}
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      coin.signal === 'BUY' ? 'bg-green-900 text-green-300' :
                      coin.signal === 'SELL' ? 'bg-red-900 text-red-300' :
                      'bg-gray-700 text-gray-300'
                    }`}>
                      {coin.signal}
                    </span>
                  </div>
                </div>
                
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Fiyat:</span>
                    <span className="text-white font-medium">${coin.price.toFixed(4)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">24h Değişim:</span>
                    <span className={`font-medium ${coin.change24h >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {coin.change24h >= 0 ? '+' : ''}{coin.change24h.toFixed(2)}%
                    </span>
                  </div>
                  {coin.rsi && (
                    <div className="flex justify-between">
                      <span className="text-gray-400">RSI:</span>
                      <span className={`font-medium ${
                        coin.rsi > 70 ? 'text-red-400' : 
                        coin.rsi < 30 ? 'text-green-400' : 
                        'text-yellow-400'
                      }`}>
                        {coin.rsi.toFixed(1)}
                      </span>
                    </div>
                  )}
                  {coin.pricePosition && (
                    <div className="flex justify-between">
                      <span className="text-gray-400">Pozisyon:</span>
                      <span className={`text-xs ${
                        coin.pricePosition > 80 ? 'text-red-400' :
                        coin.pricePosition < 20 ? 'text-green-400' :
                        'text-gray-300'
                      }`}>
                        {coin.pricePosition > 80 ? 'Üst seviye' :
                         coin.pricePosition < 20 ? 'Alt seviye' :
                         'Orta seviye'} ({coin.pricePosition.toFixed(0)}%)
                      </span>
                    </div>
                  )}
                  {coin.volumeStrength && (
                    <div className="flex justify-between">
                      <span className="text-gray-400">Hacim:</span>
                      <span className={`text-xs ${
                        coin.volumeStrength > 1.5 ? 'text-green-400' :
                        coin.volumeStrength < 0.5 ? 'text-red-400' :
                        'text-gray-300'
                      }`}>
                        {coin.volumeStrength > 1.5 ? '🔥 Yüksek' :
                         coin.volumeStrength < 0.5 ? '📉 Düşük' :
                         '📊 Normal'} (x{coin.volumeStrength.toFixed(1)})
                      </span>
                    </div>
                  )}
                  {coin.trendDirection && (
                    <div className="flex justify-between">
                      <span className="text-gray-400">Trend:</span>
                      <span className={`text-xs flex items-center space-x-1 ${
                        coin.trendDirection === 'UP' ? 'text-green-400' :
                        coin.trendDirection === 'DOWN' ? 'text-red-400' :
                        'text-gray-300'
                      }`}>
                        <span>
                          {coin.trendDirection === 'UP' ? '🚀 Yükseliş' :
                           coin.trendDirection === 'DOWN' ? '📉 Düşüş' :
                           '➡️ Yatay'}
                        </span>
                      </span>
                    </div>
                  )}
                </div>
                
                {/* Sinyal Gücü Progress Bar */}
                {coin.signalStrength && coin.signalStrength > 0 && (
                  <div className="mt-3">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-xs text-gray-400">Sinyal Gücü</span>
                      <span className="text-xs text-gray-300">{coin.signalStrength.toFixed(0)}%</span>
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-1.5">
                      <div
                        className={`h-1.5 rounded-full transition-all duration-500 ${
                          coin.signalStrength > 70 ? 'bg-yellow-400' :
                          coin.signal === 'BUY' ? 'bg-green-500' :
                          coin.signal === 'SELL' ? 'bg-red-500' :
                          'bg-gray-500'
                        } ${
                          coin.signalStrength > 90 ? 'w-full' :
                          coin.signalStrength > 80 ? 'w-5/6' :
                          coin.signalStrength > 70 ? 'w-4/5' :
                          coin.signalStrength > 60 ? 'w-3/5' :
                          coin.signalStrength > 50 ? 'w-1/2' :
                          coin.signalStrength > 40 ? 'w-2/5' :
                          coin.signalStrength > 30 ? 'w-1/3' :
                          coin.signalStrength > 20 ? 'w-1/4' :
                          'w-1/5'
                        }`}
                      ></div>
                    </div>
                  </div>
                )}
                
                <div className="mt-3 flex items-center justify-between">
                  <div className="text-xs text-gray-500">
                    {new Date(coin.lastAnalysis).toLocaleTimeString('tr-TR', { 
                      hour: '2-digit', 
                      minute: '2-digit' 
                    })}
                  </div>
                  {coin.signalStrength && coin.signalStrength > 50 && (
                    <div className="text-xs text-yellow-400 font-medium">
                      🎯 Güçlü Sinyal
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Trading Bot Section */}
      <TradingBot onToggle={(isActive) => console.log('Bot status:', isActive)} />
    </div>
  );
};

export default Dashboard;