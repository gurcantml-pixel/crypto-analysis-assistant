export interface CoinData {
  symbol: string;
  name: string;
  price: number;
  change24h: number;
  volume24h: string;
  high24h: number;
  low24h: number;
  marketCap?: number;
  logoUrl?: string;
}

export interface TradingSignal {
  coin: string;
  type: 'BUY' | 'SELL' | 'HOLD';
  price: number;
  confidence: number;
  timestamp: Date;
  reason: string;
  targetPrice?: number;
  stopLoss?: number;
  // Enhanced signal properties
  timeframe?: string;
  signalStrength?: number;
  riskReward?: number;
  confluenceScore?: number;
  divergence?: 'bullish' | 'bearish' | 'none';
}

export interface MultiTimeframeAnalysis {
  symbol: string;
  timeframes: {
    [key: string]: {
      trend: 'bullish' | 'bearish' | 'sideways';
      signal: TradingSignal;
      indicators: TechnicalIndicators;
      strength: number;
    };
  };
  overallSignal: TradingSignal;
  confluenceScore: number;
}

export interface TechnicalIndicators {
  rsi: number;
  ma50: number;
  ma200: number;
  ema12: number;
  ema26: number;
  macd: number;
  volatility: number;
  // Advanced indicators
  bollingerBands?: {
    upper: number;
    middle: number;
    lower: number;
    squeeze: boolean;
  };
  ichimoku?: {
    tenkanSen: number;
    kijunSen: number;
    senkouSpanA: number;
    senkouSpanB: number;
    signal: 'bullish' | 'bearish' | 'neutral';
  };
  fibonacci?: {
    level: number;
    price: number;
    label: string;
  }[];
  supportResistance?: {
    supports: number[];
    resistances: number[];
    nearestSupport?: number;
    nearestResistance?: number;
  };
}

export interface NewsItem {
  id: string;
  title: string;
  summary: string;
  content?: string;
  url: string;
  publishedAt: Date;
  source: string;
  sentiment: 'positive' | 'negative' | 'neutral';
  coins?: string[];
  // Enhanced properties
  imageUrl?: string;
  author?: string;
  category?: 'bitcoin' | 'ethereum' | 'defi' | 'nft' | 'regulation' | 'mining' | 'altcoins' | 'technology' | 'market' | 'other';
  marketImpact?: 'high' | 'medium' | 'low';
  readTime?: number;
  isBreaking?: boolean;
  sentimentScore?: number;
  tags?: string[];
  priceImpact?: {
    symbol: string;
    priceChangeAfter1h?: number;
    priceChangeAfter24h?: number;
  }[];
}