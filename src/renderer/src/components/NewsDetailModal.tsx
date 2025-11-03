/**
 * 📰 News Detail Modal Component
 * Haberi Oku butonu ile açılan detaylı haber görüntüleme
 * Türkçe çeviri desteği ile
 */

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  XMarkIcon,
  ClockIcon,
  NewspaperIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  ExclamationTriangleIcon,
  LinkIcon,
  TagIcon,
  ChartBarIcon,

  EyeIcon,
  ShareIcon,
  BookmarkIcon,
  LanguageIcon
} from '@heroicons/react/24/outline';
import { NewsItem } from '../types';
import { turkishTranslationService, TranslationResult } from '../services/turkishTranslationService';

interface NewsDetailModalProps {
  news: NewsItem;
  isOpen: boolean;
  onClose: () => void;
}

const NewsDetailModal: React.FC<NewsDetailModalProps> = ({ news, isOpen, onClose }) => {
  const [translatedNews, setTranslatedNews] = useState<TranslationResult | null>(null);
  const [isTranslating, setIsTranslating] = useState(false);
  const [showOriginal, setShowOriginal] = useState(false);

  useEffect(() => {
    if (isOpen && news) {
      translateNewsContent();
    }
  }, [isOpen, news]);

  const translateNewsContent = async () => {
    setIsTranslating(true);
    try {
      const translated = await turkishTranslationService.translateNews(news);
      setTranslatedNews(translated);
    } catch (error) {
      console.error('Translation error:', error);
      setTranslatedNews({
        title: news.title,
        summary: news.summary,
        isTranslated: false,
        originalLanguage: 'unknown'
      });
    } finally {
      setIsTranslating(false);
    }
  };

  const getSentimentIcon = (sentiment: string) => {
    switch (sentiment) {
      case 'positive':
        return { icon: ArrowTrendingUpIcon, color: 'text-success-400', bg: 'bg-success-900/20' };
      case 'negative':
        return { icon: ArrowTrendingDownIcon, color: 'text-danger-400', bg: 'bg-danger-900/20' };
      default:
        return { icon: ExclamationTriangleIcon, color: 'text-gray-400', bg: 'bg-gray-900/20' };
    }
  };

  const getMarketImpactColor = (impact?: string) => {
    switch (impact) {
      case 'high': return 'text-red-400 bg-red-400/20';
      case 'medium': return 'text-yellow-400 bg-yellow-400/20';
      case 'low': return 'text-green-400 bg-green-400/20';
      default: return 'text-gray-400 bg-gray-400/20';
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

  const displayNews = showOriginal ? {
    title: news.title,
    summary: news.summary,
    content: news.content || news.summary
  } : {
    title: translatedNews?.title || news.title,
    summary: translatedNews?.summary || news.summary,
    content: translatedNews?.content || translatedNews?.summary || news.summary
  };

  const sentimentInfo = getSentimentIcon(news.sentiment);
  const SentimentIcon = sentimentInfo.icon;

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/70 backdrop-blur-sm"
          onClick={onClose}
        />

        {/* Modal */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className="relative bg-dark-800 rounded-xl shadow-2xl border border-dark-700 max-w-4xl w-full max-h-[90vh] overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-dark-700">
            <div className="flex items-center space-x-3">
              <div className={`p-2 rounded-lg ${sentimentInfo.bg}`}>
                <SentimentIcon className={`h-5 w-5 ${sentimentInfo.color}`} />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-white">Haber Detayı</h2>
                <p className="text-sm text-gray-400">{news.source}</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              {/* Translation toggle */}
              {translatedNews?.isTranslated && (
                <button
                  onClick={() => setShowOriginal(!showOriginal)}
                  className={`p-2 rounded-lg transition-colors ${
                    showOriginal ? 'bg-gray-600 text-white' : 'bg-primary-500 text-white hover:bg-primary-600'
                  }`}
                  title={showOriginal ? 'Türkçe Göster' : 'Orijinal Göster'}
                >
                  <LanguageIcon className="h-4 w-4" />
                </button>
              )}
              
              <button
                onClick={onClose}
                className="p-2 hover:bg-dark-700 rounded-lg transition-colors"
                title="Kapat"
              >
                <XMarkIcon className="h-5 w-5 text-gray-400" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="overflow-y-auto max-h-[calc(90vh-100px)]">
            <div className="p-6 space-y-6">
              {/* Loading state */}
              {isTranslating && (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500 mr-3"></div>
                  <span className="text-gray-400">Türkçe'ye çevriliyor...</span>
                </div>
              )}

              {/* Title */}
              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  <h1 className="text-2xl font-bold text-white leading-tight">
                    {displayNews.title}
                  </h1>
                  
                  {translatedNews?.isTranslated && !showOriginal && (
                    <span className="px-2 py-1 bg-blue-500/20 text-blue-400 text-xs rounded-full ml-4 flex-shrink-0">
                      🌐 Çevrildi
                    </span>
                  )}
                </div>

                {/* Breaking news & category badges */}
                <div className="flex items-center space-x-2">
                  {news.isBreaking && (
                    <span className="px-3 py-1 bg-red-500 text-white text-sm font-bold rounded-full animate-pulse">
                      🔴 SON DAKİKA
                    </span>
                  )}
                  {news.category && (
                    <span className="px-3 py-1 bg-primary-500/20 text-primary-400 text-sm rounded-full">
                      {news.category.toUpperCase()}
                    </span>
                  )}
                  {news.marketImpact && (
                    <span className={`px-3 py-1 text-sm rounded-full ${getMarketImpactColor(news.marketImpact)}`}>
                      {news.marketImpact === 'high' ? '🔥 YÜKSEK ETKİ' :
                       news.marketImpact === 'medium' ? '⚡ ORTA ETKİ' : '📊 DÜŞÜK ETKİ'}
                    </span>
                  )}
                </div>
              </div>

              {/* Metadata */}
              <div className="flex flex-wrap items-center gap-4 text-sm text-gray-400 border-b border-dark-700 pb-4">
                <div className="flex items-center space-x-1">
                  <ClockIcon className="h-4 w-4" />
                  <span>{formatTimeAgo(news.publishedAt)}</span>
                </div>
                <div className="flex items-center space-x-1">
                  <NewspaperIcon className="h-4 w-4" />
                  <span>{news.source}</span>
                </div>
                {news.author && (
                  <div className="flex items-center space-x-1">
                    <span>Yazar: {news.author}</span>
                  </div>
                )}
                {news.readTime && (
                  <div className="flex items-center space-x-1">
                    <EyeIcon className="h-4 w-4" />
                    <span>{news.readTime} dk okuma</span>
                  </div>
                )}
              </div>

              {/* Main image */}
              {news.imageUrl && (
                <div className="rounded-lg overflow-hidden">
                  <img
                    src={news.imageUrl}
                    alt={displayNews.title}
                    className="w-full h-64 object-cover"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                </div>
              )}

              {/* Content */}
              <div className="prose prose-invert max-w-none">
                <p className="text-lg text-gray-300 leading-relaxed">
                  {displayNews.content}
                </p>
              </div>

              {/* Coins */}
              {news.coins && news.coins.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold text-gray-400">İlgili Kripto Paralar:</h3>
                  <div className="flex flex-wrap gap-2">
                    {news.coins.map((coin) => (
                      <span
                        key={coin}
                        className="px-3 py-1 bg-dark-700 text-primary-400 text-sm rounded-full hover:bg-primary-500/20 transition-colors cursor-pointer"
                      >
                        {coin.replace('USDT', '')}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Price Impact */}
              {news.priceImpact && news.priceImpact.length > 0 && (
                <div className="space-y-3 bg-dark-700/50 p-4 rounded-lg">
                  <h3 className="text-sm font-semibold text-gray-400 flex items-center space-x-2">
                    <ChartBarIcon className="h-4 w-4" />
                    <span>Fiyat Etkisi Analizi:</span>
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {news.priceImpact.map((impact, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-dark-800 rounded-lg">
                        <span className="text-white font-medium">{impact.symbol}</span>
                        <div className="text-right">
                          {impact.priceChangeAfter1h && (
                            <div className={`text-sm ${impact.priceChangeAfter1h > 0 ? 'text-green-400' : 'text-red-400'}`}>
                              1h: {impact.priceChangeAfter1h > 0 ? '+' : ''}{impact.priceChangeAfter1h.toFixed(2)}%
                            </div>
                          )}
                          {impact.priceChangeAfter24h && (
                            <div className={`text-sm ${impact.priceChangeAfter24h > 0 ? 'text-green-400' : 'text-red-400'}`}>
                              24h: {impact.priceChangeAfter24h > 0 ? '+' : ''}{impact.priceChangeAfter24h.toFixed(2)}%
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Tags */}
              {news.tags && news.tags.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold text-gray-400">Etiketler:</h3>
                  <div className="flex flex-wrap gap-2">
                    {news.tags.map((tag) => (
                      <span
                        key={tag}
                        className="px-2 py-1 bg-gray-700/50 text-gray-400 text-xs rounded-full flex items-center space-x-1"
                      >
                        <TagIcon className="h-3 w-3" />
                        <span>#{tag}</span>
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Sentiment Analysis */}
              <div className="bg-dark-700/50 p-4 rounded-lg">
                <h3 className="text-sm font-semibold text-gray-400 mb-2">Sentiment Analizi:</h3>
                <div className="flex items-center justify-between">
                  <div className={`flex items-center space-x-2 ${sentimentInfo.color}`}>
                    <SentimentIcon className="h-5 w-5" />
                    <span className="font-medium">
                      {news.sentiment === 'positive' ? 'Pozitif' : 
                       news.sentiment === 'negative' ? 'Negatif' : 'Nötr'}
                    </span>
                    {news.sentimentScore && (
                      <span className="text-sm text-gray-400">
                        ({(news.sentimentScore > 0 ? '+' : '')}{(news.sentimentScore * 100).toFixed(0)}%)
                      </span>
                    )}
                  </div>
                  
                  <div className="text-right text-sm text-gray-400">
                    Piyasa Etkisi: <span className={`font-medium ${
                      news.marketImpact === 'high' ? 'text-red-400' :
                      news.marketImpact === 'medium' ? 'text-yellow-400' : 'text-green-400'
                    }`}>
                      {news.marketImpact === 'high' ? 'Yüksek' :
                       news.marketImpact === 'medium' ? 'Orta' : 'Düşük'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="border-t border-dark-700 p-4 bg-dark-800/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <button className="flex items-center space-x-2 px-3 py-2 bg-dark-700 hover:bg-dark-600 rounded-lg transition-colors">
                  <BookmarkIcon className="h-4 w-4" />
                  <span className="text-sm">Kaydet</span>
                </button>
                <button className="flex items-center space-x-2 px-3 py-2 bg-dark-700 hover:bg-dark-600 rounded-lg transition-colors">
                  <ShareIcon className="h-4 w-4" />
                  <span className="text-sm">Paylaş</span>
                </button>
              </div>
              
              {news.url && news.url !== '#' && (
                <button
                  onClick={() => window.open(news.url, '_blank')}
                  className="flex items-center space-x-2 px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-lg transition-colors"
                >
                  <LinkIcon className="h-4 w-4" />
                  <span>Orijinal Haberi Aç</span>
                </button>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default NewsDetailModal;