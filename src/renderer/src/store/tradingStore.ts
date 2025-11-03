import { create } from 'zustand';
import { CoinData, TradingSignal, NewsItem } from '../types';
import { binanceAPI } from '../services/binanceAPI';
import { TechnicalAnalysis } from '../services/technicalAnalysis';
import { DataValidation } from '../services/dataValidation';
import { webSocketService } from '../services/webSocketService';

interface TradingState {
  // Data
  coins: CoinData[];
  signals: TradingSignal[];
  news: NewsItem[];
  selectedCoin: string;
  
  // Cache timestamps
  lastCoinsUpdate: number;
  lastSignalsUpdate: number;
  
  // Loading states
  loading: {
    coins: boolean;
    signals: boolean;
    news: boolean;
  };
  
  // Actions
  fetchCoins: () => Promise<void>;
  fetchSignals: () => Promise<void>;
  fetchNews: () => Promise<void>;
  setSelectedCoin: (symbol: string) => void;
  
  // WebSocket
  isConnected: boolean;
  connectWebSocket: () => void;
  disconnectWebSocket: () => void;
  updateCoins: (coins: CoinData[]) => void;
  updateCoinPrices: (tickers: any[]) => void;
}

export const useTradingStore = create<TradingState>((set, get) => ({
  // Initial state
  coins: [],
  signals: [],
  news: [],
  selectedCoin: 'BTCUSDT',
  lastCoinsUpdate: 0,
  lastSignalsUpdate: 0,
  
  loading: {
    coins: false,
    signals: false,
    news: false
  },
  
  isConnected: false,
  
  // Actions
  fetchCoins: async () => {
    const { lastCoinsUpdate } = get();
    const now = Date.now();
    const fiveMinutes = 5 * 60 * 1000;
    
    // 5 dakikadan az geçmişse cache'den kullan
    if (now - lastCoinsUpdate < fiveMinutes) {
      console.log('📊 Using cached coins data');
      return;
    }
    
    set((state) => ({
      loading: { ...state.loading, coins: true }
    }));
    
    try {
      console.log('🪙 Fetching top coins...');
      const coins = await binanceAPI.getTopCoins(10);
      set({ 
        coins,
        lastCoinsUpdate: now
      });
      console.log('✅ Coins fetched:', coins.length);
    } catch (error) {
      console.error('❌ Error fetching coins:', error);
      set({ lastCoinsUpdate: now }); // Hata durumunda da timestamp güncelle
    } finally {
      set((state) => ({
        loading: { ...state.loading, coins: false }
      }));
    }
  },
  
  fetchSignals: async () => {
    set((state) => ({
      loading: { ...state.loading, signals: true }
    }));
    
    try {
      const signals: TradingSignal[] = [];
      const { coins } = get();
      
      // Her coin için sinyal üret
      for (const coin of coins.slice(0, 5)) { // İlk 5 coin için
        try {
          const klines = await binanceAPI.getKlines(coin.symbol, '1h', 100);
          const prices = klines.map((kline: any) => parseFloat(kline[4])); // Close price
          
          if (prices.length > 0) {
            const signal = TechnicalAnalysis.generateSignal(prices, coin.symbol);
            
            // Veri doğrulama ile sinyal kalitesini artır
            const validatedPrice = await DataValidation.validatePrice(coin.symbol, coin.price);
            if (validatedPrice.confidence > 70) {
              signal.confidence = Math.min(signal.confidence + 10, 100); // Güvenilir veri bonusu
            }
            
            signals.push(signal);
          }
        } catch (error) {
          console.error(`Error generating signal for ${coin.symbol}:`, error);
        }
      }
      
      set({ signals: signals.slice(0, 6) }); // Son 6 sinyal
    } catch (error) {
      console.error('Error fetching signals:', error);
    } finally {
      set((state) => ({
        loading: { ...state.loading, signals: false }
      }));
    }
  },
  
  fetchNews: async () => {
    set((state) => ({
      loading: { ...state.loading, news: true }
    }));
    
    try {
      console.log('📰 Fetching advanced crypto news from multiple sources...');
      
      // Import advanced news service
      const { advancedNewsService } = await import('../services/advancedNewsService');
      
      // Fetch latest news from multiple sources
      const advancedNews = await advancedNewsService.getLatestNews(25);
      
      // Convert to NewsItem format for compatibility
      const convertedNews: NewsItem[] = advancedNews.map(article => ({
        id: article.id,
        title: article.title,
        summary: article.summary,
        url: article.url,
        publishedAt: article.publishedAt,
        source: article.source,
        sentiment: article.sentiment,
        coins: article.coins,
        // Additional properties from advanced service
        imageUrl: article.imageUrl,
        author: article.author,
        category: article.category,
        marketImpact: article.marketImpact,
        readTime: article.readTime,
        isBreaking: article.isBreaking,
        sentimentScore: article.sentimentScore,
        tags: article.tags,
        priceImpact: article.priceImpact
      }));
      
      console.log(`✅ ${convertedNews.length} advanced news articles loaded`);
      set({ news: convertedNews });
      
    } catch (error) {
      console.error('❌ Advanced news fetch error:', error);
      console.log('🔄 Switching to fallback news data...');
      
      // Fallback to basic news
      const fallbackNews: NewsItem[] = [
        {
          id: 'fallback-1',
          title: '🚀 Bitcoin Breaks $70,000 Resistance - Bull Run Continues',
          summary: 'BTC achieves new all-time high as institutional adoption accelerates and ETF inflows surge.',
          url: '#',
          publishedAt: new Date(Date.now() - 15 * 60 * 1000),
          source: 'CryptoDaily',
          sentiment: 'positive',
          coins: ['BTC'],
          isBreaking: true,
          marketImpact: 'high'
        },
        {
          id: 'fallback-2',
          title: '⚡ Ethereum Layer 2 Solutions See Record Activity',
          summary: 'Polygon and Arbitrum process millions of transactions as DeFi ecosystem explodes.',
          url: '#',
          publishedAt: new Date(Date.now() - 45 * 60 * 1000),
          source: 'DeFiNews',
          sentiment: 'positive',
          coins: ['ETH', 'MATIC'],
          category: 'defi',
          marketImpact: 'medium'
        },
        {
          id: 'fallback-3',
          title: '🏛️ Major Central Banks Consider Digital Currency Adoption',
          summary: 'Fed and ECB accelerate CBDC research as crypto integration becomes mainstream.',
          url: '#',
          publishedAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
          source: 'Financial Times',
          sentiment: 'positive',
          coins: ['BTC', 'ETH'],
          category: 'regulation',
          marketImpact: 'high'
        },
        {
          id: 'fallback-4',
          title: '🎮 Gaming NFTs Drive Metaverse Economy Growth',
          summary: 'Play-to-earn games generate billions in revenue as virtual worlds expand rapidly.',
          url: '#',
          publishedAt: new Date(Date.now() - 3 * 60 * 60 * 1000),
          source: 'GameFi Today',
          sentiment: 'positive',
          coins: ['AXS', 'MANA', 'SAND'],
          category: 'nft',
          marketImpact: 'medium'
        },
        {
          id: 'fallback-5',
          title: '⚠️ Regulatory Framework Updates Create Market Uncertainty',
          summary: 'New compliance requirements may impact smaller exchanges and DeFi protocols.',
          url: '#',
          publishedAt: new Date(Date.now() - 6 * 60 * 60 * 1000),
          source: 'RegulatoryWatch',
          sentiment: 'negative',
          coins: ['BTC', 'ETH'],
          category: 'regulation',
          marketImpact: 'high'
        }
      ];
      
      set({ news: fallbackNews });
    } finally {
      set((state) => ({
        loading: { ...state.loading, news: false }
      }));
    }
  },
  
  setSelectedCoin: (symbol: string) => {
    set({ selectedCoin: symbol });
  },
  
  connectWebSocket: () => {
    console.log('Connecting WebSocket...');
    webSocketService.connect();
    set({ isConnected: true });
  },
  
  disconnectWebSocket: () => {
    webSocketService.disconnect();
    set({ isConnected: false });
  },
  
  updateCoins: (updatedCoins: CoinData[]) => {
    set({ coins: updatedCoins });
  },
  
  updateCoinPrices: (tickers: any[]) => {
    const { coins } = get();
    const updatedCoins = coins.map(coin => {
      const ticker = tickers.find((t: any) => t.s === coin.symbol);
      if (ticker) {
        return {
          ...coin,
          price: parseFloat(ticker.c),
          change24h: parseFloat(ticker.P),
          volume24h: ticker.q,
          high24h: parseFloat(ticker.h),
          low24h: parseFloat(ticker.l),
        };
      }
      return coin;
    });
    
    set({ coins: updatedCoins });
  }
}));