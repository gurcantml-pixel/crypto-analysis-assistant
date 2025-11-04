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

// 📊 Volume Analysis Types (Feature 2/5)
export interface VolumeProfileLevel {
  price: number;
  volume: number;
  percentage: number;
}

export interface VolumeProfile {
  poc: number; // Point of Control
  vah: number; // Value Area High
  val: number; // Value Area Low
  levels: VolumeProfileLevel[];
  totalVolume: number;
}

export interface VolumeSpike {
  timestamp: Date;
  volume: number;
  avgVolume: number;
  multiplier: number;
  priceChange: number;
  type: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  strength: number;
}

export interface BuySellPressure {
  cumulativeDelta: number;
  buyPressure: number;
  sellPressure: number;
  dominantSide: 'BUYERS' | 'SELLERS' | 'BALANCED';
  mfi: number;
  signal: 'BUY' | 'SELL' | 'HOLD';
  confidence: number;
}

export interface AccumulationZone {
  priceRange: { low: number; high: number };
  volume: number;
  duration: number;
  type: 'ACCUMULATION' | 'DISTRIBUTION';
  strength: number;
  obv: number;
  signal: 'BUY' | 'SELL' | 'HOLD';
}

export interface VolumeAnalysisResult {
  profile: VolumeProfile;
  spikes: VolumeSpike[];
  pressure: BuySellPressure;
  zones: AccumulationZone[];
  recommendation: {
    signal: 'BUY' | 'SELL' | 'HOLD';
    confidence: number;
    reasons: string[];
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

// AI Sentiment Result (Feature 3/5)
export interface AISentimentItem {
  title: string;
  sentiment: 'positive' | 'neutral' | 'negative' | string;
  score: number; // -1.0 .. +1.0
  short_reason?: string;
}

export interface AISentimentResult {
  timestamp: number;
  items: AISentimentItem[];
  summary?: string;
}

// 📊 Decision Engine Types (Deterministic + AI Second Opinion)
export interface DataQuality {
  isValid: boolean;
  confidence: number; // 0-1
  warnings: string[];
  metrics: {
    liquidityScore: number;       // orderbook depth + spread
    volumeReliability: number;    // 24h volume vs 7d avg
    priceStability: number;       // volatility/ATR check
    dataCompleteness: number;     // missing candles check
  };
}

export interface EntryExitLevels {
  entryPrice: number | null;
  stopLoss: number | null;
  targets: number[];  // Multiple take-profit targets
  riskRewardRatio: number;
}

export interface WaitCondition {
  condition: string;  // "RSI < 30" | "POC breakout" | etc.
  description: string;
  priority: 'high' | 'medium' | 'low';
}

export interface DecisionResult {
  verdict: 'BUY' | 'SELL' | 'HOLD';
  confidence: number; // 0-1
  score: number; // Internal scoring (-100 to +100)
  
  // Entry/Exit info
  levels?: EntryExitLevels;
  
  // Wait conditions (for HOLD)
  waitFor?: WaitCondition[];
  
  // Explainability
  reasons: string[];
  risks: string[];
  
  // Data quality metadata
  dataQuality: DataQuality;
  
  // Timestamp
  timestamp: number;
  timeframe: string;
}

export interface AIOpinionResult {
  agreement: 'AGREE' | 'DISAGREE' | 'PARTIAL';
  verdict: 'BUY' | 'SELL' | 'HOLD';
  confidence: number;
  explanation: string;
  newsImpact?: string;
  scenarios: string[]; // Alternative scenarios
  timestamp: number;
}