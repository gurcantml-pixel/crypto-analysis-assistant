import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  NewspaperIcon,
  ClockIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  ExclamationTriangleIcon,
  FunnelIcon,
  MagnifyingGlassIcon,
  BoltIcon,
  FireIcon,
  ChartBarIcon,
  TagIcon,
  EyeIcon,
  CalendarIcon
} from '@heroicons/react/24/outline';
import { useTradingStore } from '../store/tradingStore';
import { NewsItem } from '../types';
import NewsDetailModal from '../components/NewsDetailModal';

const News: React.FC = () => {
  const { news, loading, fetchNews } = useTradingStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedSentiment, setSelectedSentiment] = useState<string>('all');
  const [selectedImpact, setSelectedImpact] = useState<string>('all');
  const [selectedNews, setSelectedNews] = useState<NewsItem | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleReadNews = (newsItem: NewsItem) => {
    setSelectedNews(newsItem);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedNews(null);
  };

  useEffect(() => {
    fetchNews();
  }, [fetchNews]);

  // Filter news based on current filters
  const filteredNews = news.filter(item => {
    // Search query filter
    if (searchQuery && !item.title.toLowerCase().includes(searchQuery.toLowerCase()) && 
        !item.summary.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    
    // Category filter
    if (selectedCategory !== 'all' && item.category !== selectedCategory) {
      return false;
    }
    
    // Sentiment filter
    if (selectedSentiment !== 'all' && item.sentiment !== selectedSentiment) {
      return false;
    }
    
    // Market impact filter
    if (selectedImpact !== 'all' && item.marketImpact !== selectedImpact) {
      return false;
    }
    
    return true;
  });

  // Categories with counts
  const categories = [
    { id: 'all', name: 'Tümü', count: news.length },
    { id: 'bitcoin', name: 'Bitcoin', count: news.filter(n => n.category === 'bitcoin').length },
    { id: 'ethereum', name: 'Ethereum', count: news.filter(n => n.category === 'ethereum').length },
    { id: 'defi', name: 'DeFi', count: news.filter(n => n.category === 'defi').length },
    { id: 'nft', name: 'NFT', count: news.filter(n => n.category === 'nft').length },
    { id: 'regulation', name: 'Regülasyon', count: news.filter(n => n.category === 'regulation').length },
    { id: 'market', name: 'Piyasa', count: news.filter(n => n.category === 'market').length },
    { id: 'technology', name: 'Teknoloji', count: news.filter(n => n.category === 'technology').length }
  ];

  const getSentimentIcon = (sentiment: string) => {
    switch (sentiment) {
      case 'positive':
        return { icon: ArrowTrendingUpIcon, color: 'text-success-400' };
      case 'negative':
        return { icon: ArrowTrendingDownIcon, color: 'text-danger-400' };
      default:
        return { icon: ExclamationTriangleIcon, color: 'text-gray-400' };
    }
  };

  const getSentimentBg = (sentiment: string) => {
    switch (sentiment) {
      case 'positive':
        return 'bg-success-900/20 border-success-600';
      case 'negative':
        return 'bg-danger-900/20 border-danger-600';
      default:
        return 'bg-gray-900/20 border-gray-600';
    }
  };

  const formatTimeAgo = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMins = Math.floor(diffMs / (1000 * 60));

    if (diffHours > 0) {
      return `${diffHours} saat önce`;
    } else if (diffMins > 0) {
      return `${diffMins} dakika önce`;
    } else {
      return 'Az önce';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header with Stats */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <h1 className="text-2xl font-bold text-white">📰 Kripto Haberleri</h1>
          <div className="flex items-center space-x-2 px-3 py-1 bg-primary-500/20 rounded-full">
            <BoltIcon className="h-4 w-4 text-primary-400" />
            <span className="text-primary-400 text-sm font-medium">
              {news.filter(n => n.isBreaking).length} Breaking News
            </span>
          </div>
        </div>
        <div className="flex items-center space-x-4">
          <div className="text-gray-400 text-sm">
            Son güncelleme: {new Date().toLocaleTimeString('tr-TR')}
          </div>
          <button
            onClick={fetchNews}
            className="px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-lg transition-colors"
          >
            🔄 Yenile
          </button>
        </div>
      </div>

      {/* Advanced Search & Filters */}
      <div className="card">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Search Bar */}
          <div className="flex-1 relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Haberlerde ara... (başlık, özet)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-dark-700 border border-dark-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-primary-500"
            />
          </div>
          
          {/* Filters */}
          <div className="flex gap-3">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-3 py-2 bg-dark-700 border border-dark-600 rounded-lg text-white focus:outline-none focus:border-primary-500"
              title="Kategori Filtresi"
            >
              {categories.map(cat => (
                <option key={cat.id} value={cat.id}>
                  {cat.name} ({cat.count})
                </option>
              ))}
            </select>
            
            <select
              value={selectedSentiment}
              onChange={(e) => setSelectedSentiment(e.target.value)}
              className="px-3 py-2 bg-dark-700 border border-dark-600 rounded-lg text-white focus:outline-none focus:border-primary-500"
              title="Sentiment Filtresi"
            >
              <option value="all">Tüm Sentimentler</option>
              <option value="positive">Pozitif</option>
              <option value="negative">Negatif</option>
              <option value="neutral">Nötr</option>
            </select>
            
            <select
              value={selectedImpact}
              onChange={(e) => setSelectedImpact(e.target.value)}
              className="px-3 py-2 bg-dark-700 border border-dark-600 rounded-lg text-white focus:outline-none focus:border-primary-500"
              title="Market Etkisi Filtresi"
            >
              <option value="all">Tüm Etkiler</option>
              <option value="high">Yüksek Etki</option>
              <option value="medium">Orta Etki</option>
              <option value="low">Düşük Etki</option>
            </select>
          </div>
        </div>
        
        {/* Filter Summary */}
        <div className="mt-4 flex items-center justify-between text-sm text-gray-400">
          <span>
            {filteredNews.length} haber gösteriliyor
            {searchQuery && ` "${searchQuery}" için`}
          </span>
          <div className="flex items-center space-x-4">
            <span className="flex items-center space-x-1">
              <FireIcon className="h-4 w-4 text-red-400" />
              <span>{news.filter(n => n.marketImpact === 'high').length} Yüksek Etki</span>
            </span>
            <span className="flex items-center space-x-1">
              <ArrowTrendingUpIcon className="h-4 w-4 text-green-400" />
              <span>{news.filter(n => n.sentiment === 'positive').length} Pozitif</span>
            </span>
            <span className="flex items-center space-x-1">
              <ArrowTrendingDownIcon className="h-4 w-4 text-red-400" />
              <span>{news.filter(n => n.sentiment === 'negative').length} Negatif</span>
            </span>
          </div>
        </div>
      </div>

      {loading.news ? (
        <div className="card">
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto mb-4"></div>
            <p className="text-gray-400">📰 Haberler yükleniyor...</p>
            <p className="text-gray-500 text-sm mt-2">Multiple sources'dan veri çekiliyor</p>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredNews.map((item, index) => {
            const sentimentInfo = getSentimentIcon(item.sentiment);
            const SentimentIcon = sentimentInfo.icon;

            return (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className={`card border ${getSentimentBg(item.sentiment)} hover:shadow-xl transition-all duration-300 cursor-pointer group`}
              >
                <div className="flex items-start space-x-4">
                  {/* News Image */}
                  {item.imageUrl && (
                    <div className="hidden md:block w-24 h-24 rounded-lg overflow-hidden flex-shrink-0">
                      <img
                        src={item.imageUrl}
                        alt={item.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                    </div>
                  )}

                  <div className="flex-1 min-w-0">
                    {/* Header with Breaking News Badge */}
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          {item.isBreaking && (
                            <span className="px-2 py-1 bg-red-500 text-white text-xs font-bold rounded-full animate-pulse">
                              🔴 BREAKING
                            </span>
                          )}
                          {item.category && (
                            <span className="px-2 py-1 bg-primary-500/20 text-primary-400 text-xs rounded-full">
                              {item.category.toUpperCase()}
                            </span>
                          )}
                          {item.marketImpact === 'high' && (
                            <span className="px-2 py-1 bg-red-500/20 text-red-400 text-xs rounded-full">
                              🔥 HIGH IMPACT
                            </span>
                          )}
                        </div>
                        <h3 className="text-lg font-semibold text-white line-clamp-2 group-hover:text-primary-400 transition-colors">
                          {item.title}
                        </h3>
                      </div>
                    </div>

                    {/* Summary */}
                    <p className="text-gray-300 mb-3 line-clamp-2 text-sm">
                      {item.summary}
                    </p>

                    {/* Metadata Row */}
                    <div className="flex items-center justify-between text-xs text-gray-400 mb-3">
                      <div className="flex items-center space-x-4">
                        <div className="flex items-center space-x-1">
                          <ClockIcon className="h-3 w-3" />
                          <span>{formatTimeAgo(item.publishedAt)}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <NewspaperIcon className="h-3 w-3" />
                          <span className="text-primary-400 font-medium">{item.source}</span>
                        </div>
                        {item.author && (
                          <div className="flex items-center space-x-1">
                            <span>by {item.author}</span>
                          </div>
                        )}
                        {item.readTime && (
                          <div className="flex items-center space-x-1">
                            <EyeIcon className="h-3 w-3" />
                            <span>{item.readTime} dk okuma</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Coins and Tags */}
                    {(item.coins && item.coins.length > 0) || (item.tags && item.tags.length > 0) ? (
                      <div className="flex items-center justify-between mb-3">
                        {item.coins && item.coins.length > 0 && (
                          <div className="flex items-center space-x-2">
                            <span className="text-xs text-gray-400">İlgili Coinler:</span>
                            <div className="flex space-x-1">
                              {item.coins.slice(0, 4).map((coin) => (
                                <span
                                  key={coin}
                                  className="px-2 py-1 bg-dark-700 text-primary-400 text-xs rounded-full hover:bg-primary-500/20 transition-colors"
                                >
                                  {coin.replace('USDT', '')}
                                </span>
                              ))}
                              {item.coins.length > 4 && (
                                <span className="px-2 py-1 bg-dark-600 text-gray-400 text-xs rounded-full">
                                  +{item.coins.length - 4}
                                </span>
                              )}
                            </div>
                          </div>
                        )}
                        
                        {item.tags && item.tags.length > 0 && (
                          <div className="flex items-center space-x-1">
                            <TagIcon className="h-3 w-3 text-gray-400" />
                            {item.tags.slice(0, 2).map((tag) => (
                              <span
                                key={tag}
                                className="px-2 py-1 bg-gray-700/50 text-gray-400 text-xs rounded-full"
                              >
                                #{tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    ) : null}

                    {/* Footer with Sentiment and Actions */}
                    <div className="pt-3 border-t border-dark-700 flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className={`flex items-center space-x-1 ${sentimentInfo.color}`}>
                          <SentimentIcon className="h-4 w-4" />
                          <span className="text-sm font-medium">
                            {item.sentiment === 'positive' ? 'Pozitif' : 
                             item.sentiment === 'negative' ? 'Negatif' : 'Nötr'}
                          </span>
                          {item.sentimentScore && (
                            <span className="text-xs text-gray-400">
                              ({(item.sentimentScore > 0 ? '+' : '')}{(item.sentimentScore * 100).toFixed(0)}%)
                            </span>
                          )}
                        </div>
                        
                        {item.priceImpact && item.priceImpact.length > 0 && (
                          <div className="flex items-center space-x-1">
                            <ChartBarIcon className="h-4 w-4 text-blue-400" />
                            <span className="text-xs text-blue-400">
                              Fiyat Etkisi: 
                              {item.priceImpact[0].priceChangeAfter1h && 
                                ` ${item.priceImpact[0].priceChangeAfter1h > 0 ? '+' : ''}${item.priceImpact[0].priceChangeAfter1h.toFixed(1)}%`
                              }
                            </span>
                          </div>
                        )}
                      </div>

                      <button 
                        onClick={() => handleReadNews(item)}
                        className="text-primary-400 hover:text-primary-300 text-sm font-medium transition-colors group-hover:translate-x-1 transform duration-200"
                      >
                        Haberi Oku →
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}

          {filteredNews.length === 0 && news.length > 0 && (
            <div className="card text-center py-12">
              <FunnelIcon className="h-16 w-16 text-gray-600 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-white mb-2">Filtre Sonucu Haber Bulunamadı</h3>
              <p className="text-gray-400">Filtreleri temizleyip tekrar deneyin.</p>
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSelectedCategory('all');
                  setSelectedSentiment('all');
                  setSelectedImpact('all');
                }}
                className="mt-4 px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-lg transition-colors"
              >
                Filtreleri Temizle
              </button>
            </div>
          )}

          {news.length === 0 && (
            <div className="card text-center py-12">
              <NewspaperIcon className="h-16 w-16 text-gray-600 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-white mb-2">Henüz Haber Yok</h3>
              <p className="text-gray-400">Yeni haberler geldiğinde burada görünecek.</p>
              <button
                onClick={fetchNews}
                className="mt-4 px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-lg transition-colors"
              >
                Haberleri Yükle
              </button>
            </div>
          )}
        </div>
      )}

      {/* Advanced Analytics & Quick Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* News Categories with Real Counts */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white">📊 Kategori Dağılımı</h2>
            <CalendarIcon className="h-5 w-5 text-gray-400" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            {categories.filter(cat => cat.id !== 'all').map((category) => (
              <button
                key={category.id}
                onClick={() => setSelectedCategory(category.id)}
                className={`p-3 rounded-lg transition-all text-left ${
                  selectedCategory === category.id
                    ? 'bg-primary-500/20 border border-primary-500'
                    : 'bg-dark-700 hover:bg-dark-600 border border-transparent'
                }`}
              >
                <div className="flex justify-between items-center">
                  <span className="text-white font-medium">{category.name}</span>
                  <div className="flex items-center space-x-1">
                    <span className="text-primary-400 text-sm font-bold">{category.count}</span>
                    {category.count > 0 && (
                      <div className={`w-2 h-2 rounded-full ${
                        category.count > 5 ? 'bg-green-400' : 
                        category.count > 2 ? 'bg-yellow-400' : 'bg-gray-400'
                      }`} />
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Market Sentiment Overview */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white">💭 Sentiment Analizi</h2>
            <ChartBarIcon className="h-5 w-5 text-gray-400" />
          </div>
          <div className="space-y-4">
            {[
              { 
                sentiment: 'positive', 
                label: 'Pozitif Haberler', 
                count: news.filter(n => n.sentiment === 'positive').length,
                color: 'text-green-400',
                bgColor: 'bg-green-400/20',
                icon: ArrowTrendingUpIcon
              },
              { 
                sentiment: 'negative', 
                label: 'Negatif Haberler', 
                count: news.filter(n => n.sentiment === 'negative').length,
                color: 'text-red-400',
                bgColor: 'bg-red-400/20',
                icon: ArrowTrendingDownIcon
              },
              { 
                sentiment: 'neutral', 
                label: 'Nötr Haberler', 
                count: news.filter(n => n.sentiment === 'neutral').length,
                color: 'text-gray-400',
                bgColor: 'bg-gray-400/20',
                icon: ExclamationTriangleIcon
              }
            ].map(({ sentiment, label, count, color, bgColor, icon: Icon }) => {
              const percentage = news.length > 0 ? (count / news.length * 100).toFixed(0) : 0;
              return (
                <button
                  key={sentiment}
                  onClick={() => setSelectedSentiment(sentiment)}
                  className={`w-full p-3 rounded-lg transition-all text-left ${
                    selectedSentiment === sentiment
                      ? `${bgColor} border border-current`
                      : 'bg-dark-700 hover:bg-dark-600'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <Icon className={`h-5 w-5 ${color}`} />
                      <span className={`font-medium ${selectedSentiment === sentiment ? color : 'text-white'}`}>
                        {label}
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className={`text-sm font-bold ${color}`}>{count}</span>
                      <span className="text-xs text-gray-400">({percentage}%)</span>
                    </div>
                  </div>
                  {/* Progress bar */}
                  <div className="mt-2 w-full bg-dark-600 rounded-full h-1">
                    <div 
                      className={`h-1 rounded-full ${bgColor.replace('/20', '')}`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Trending Topics & Quick Actions */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white">🔥 Trending & Quick Actions</h2>
          <div className="text-sm text-gray-400">Son 24 saat</div>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Breaking News', count: news.filter(n => n.isBreaking).length, icon: '🚨', color: 'text-red-400' },
            { label: 'High Impact', count: news.filter(n => n.marketImpact === 'high').length, icon: '🔥', color: 'text-orange-400' },
            { label: 'Bitcoin News', count: news.filter(n => n.coins?.includes('BTC')).length, icon: '₿', color: 'text-yellow-400' },
            { label: 'Ethereum News', count: news.filter(n => n.coins?.includes('ETH')).length, icon: 'Ξ', color: 'text-blue-400' }
          ].map((stat) => (
            <div key={stat.label} className="p-4 bg-dark-700 rounded-lg">
              <div className="flex items-center space-x-2 mb-2">
                <span className="text-lg">{stat.icon}</span>
                <span className="text-sm text-gray-400">{stat.label}</span>
              </div>
              <div className={`text-2xl font-bold ${stat.color}`}>{stat.count}</div>
            </div>
          ))}
        </div>
      </div>
      
      {/* News Detail Modal */}
      {selectedNews && (
        <NewsDetailModal
          news={selectedNews}
          isOpen={isModalOpen}
          onClose={handleCloseModal}
        />
      )}
    </div>
  );
};

export default News;