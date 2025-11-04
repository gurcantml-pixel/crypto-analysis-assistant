/**
 * Decision Engine - Deterministic Trading Decision System
 * 
 * PRENSIP: HATA YAPMAMALI
 * - Tüm edge case'ler handle edilir
 * - Veri kalite kontrolleri mutlaka yapılır
 * - Düşük kalite/confidence = HOLD (güvenli mod)
 * - Açıklanabilir: her karar için minimum 3 somut neden
 * - Conservative scoring: eşik değerleri başlangıçta yüksek
 */

import { 
  DecisionResult, 
  DataQuality, 
  EntryExitLevels, 
  WaitCondition,
  TechnicalIndicators,
  VolumeAnalysisResult
} from '../types';
import { Divergence } from './divergenceDetection';

// CONFIGURATION - Conservative başlangıç değerleri
const CONFIG = {
  // Scoring thresholds
  BUY_THRESHOLD: 70,      // Minimum score for BUY signal
  SELL_THRESHOLD: -70,    // Maximum score for SELL signal
  
  // Data quality thresholds
  MIN_DATA_QUALITY: 0.60,  // Below this = reject analysis
  MIN_LIQUIDITY: 100000,   // Min 24h volume ($100k)
  MAX_SPREAD_PERCENT: 0.5, // Max 0.5% spread
  MAX_MISSING_CANDLES: 0.10, // Max 10% missing data
  
  // Risk management multipliers
  ATR_STOP_MULTIPLIER: 1.5,    // Stop loss = 1.5x ATR
  RISK_REWARD_RATIOS: [1.0, 2.0, 3.5], // T1, T2, T3
  
  // Confidence modifiers
  HIGH_VOLATILITY_PENALTY: 0.7,  // Reduce confidence by 30% if volatile
  LOW_VOLUME_PENALTY: 0.8,        // Reduce confidence by 20% if low volume
};

interface DecisionInput {
  symbol: string;
  timeframe: string;
  price: number;
  indicators: TechnicalIndicators;
  divergences: Divergence[];
  volumeAnalysis: VolumeAnalysisResult | null;
  orderbook?: {
    spread: number;
    spreadPercent: number;
    bidDepth: number;
    askDepth: number;
  };
  volume24h: number;
  candles: any[]; // For ATR calculation
}

/**
 * Main decision engine function
 */
export function analyzeAndDecide(input: DecisionInput): DecisionResult {
  console.log(`🤖 Decision Engine: Analyzing ${input.symbol} on ${input.timeframe}`);
  
  // STEP 1: Data Quality Check (CRITICAL - reject bad data)
  const dataQuality = checkDataQuality(input);
  
  if (!dataQuality.isValid || dataQuality.confidence < CONFIG.MIN_DATA_QUALITY) {
    console.warn(`⚠️ Data quality insufficient: ${dataQuality.confidence.toFixed(2)}`);
    return createHoldDecision(
      input,
      dataQuality,
      ['Veri kalitesi yetersiz - güvenilir analiz yapılamıyor'],
      dataQuality.warnings,
      [{
        condition: 'DATA_QUALITY',
        description: 'Daha yüksek likidite veya daha az spread bekleyin',
        priority: 'high'
      }]
    );
  }
  
  // STEP 2: Calculate Decision Score
  const { score, reasons, risks } = calculateScore(input);
  
  console.log(`📊 Decision score: ${score} (thresholds: BUY>${CONFIG.BUY_THRESHOLD}, SELL<${CONFIG.SELL_THRESHOLD})`);
  
  // STEP 3: Determine Verdict
  if (score >= CONFIG.BUY_THRESHOLD) {
    return createBuyDecision(input, score, reasons, risks, dataQuality);
  } else if (score <= CONFIG.SELL_THRESHOLD) {
    return createSellDecision(input, score, reasons, risks, dataQuality);
  } else {
    return createHoldDecision(
      input,
      dataQuality,
      reasons,
      risks,
      generateWaitConditions(input, score)
    );
  }
}

/**
 * Data quality check - PREVENTS bad decisions
 */
function checkDataQuality(input: DecisionInput): DataQuality {
  const warnings: string[] = [];
  let liquidityScore = 1.0;
  let volumeReliability = 1.0;
  let priceStability = 1.0;
  let dataCompleteness = 1.0;
  
  // 1. Liquidity check
  if (input.volume24h < CONFIG.MIN_LIQUIDITY) {
    liquidityScore = input.volume24h / CONFIG.MIN_LIQUIDITY;
    warnings.push(`Düşük likidite: $${(input.volume24h / 1000).toFixed(0)}k (min: $${CONFIG.MIN_LIQUIDITY / 1000}k)`);
  }
  
  // 2. Spread check
  if (input.orderbook && input.orderbook.spreadPercent > CONFIG.MAX_SPREAD_PERCENT) {
    liquidityScore *= 0.7;
    warnings.push(`Yüksek spread: ${input.orderbook.spreadPercent.toFixed(3)}% (max: ${CONFIG.MAX_SPREAD_PERCENT}%)`);
  }
  
  // 3. Volatility check (extreme = manipulation risk)
  const volatilityPercent = (input.indicators.volatility / input.price) * 100;
  if (volatilityPercent > 10) {
    priceStability = Math.max(0.3, 1 - (volatilityPercent - 10) / 20);
    warnings.push(`Aşırı volatilite: ${volatilityPercent.toFixed(1)}%`);
  }
  
  // 4. Data completeness (missing candles)
  const expectedCandles = 200;
  const actualCandles = input.candles.length;
  dataCompleteness = actualCandles / expectedCandles;
  if (dataCompleteness < (1 - CONFIG.MAX_MISSING_CANDLES)) {
    warnings.push(`Eksik veri: ${actualCandles}/${expectedCandles} mum (${(dataCompleteness * 100).toFixed(0)}%)`);
  }
  
  // 5. Volume reliability (compare recent vs historical)
  // NOTE: This requires historical volume data - simplified for now
  volumeReliability = 1.0; // Placeholder
  
  // Calculate overall confidence
  const confidence = (liquidityScore + volumeReliability + priceStability + dataCompleteness) / 4;
  
  // Determine validity
  const isValid = confidence >= CONFIG.MIN_DATA_QUALITY && warnings.length < 3;
  
  return {
    isValid,
    confidence,
    warnings,
    metrics: {
      liquidityScore,
      volumeReliability,
      priceStability,
      dataCompleteness
    }
  };
}

/**
 * Calculate decision score (-100 to +100)
 * Positive = bullish, Negative = bearish
 */
function calculateScore(input: DecisionInput): { 
  score: number; 
  reasons: string[]; 
  risks: string[] 
} {
  let score = 0;
  const reasons: string[] = [];
  const risks: string[] = [];
  
  const { price, indicators, divergences, volumeAnalysis } = input;
  
  // 1. RSI Analysis (weight: 25)
  if (indicators.rsi < 30) {
    const strength = Math.max(0, 30 - indicators.rsi);
    score += strength;
    reasons.push(`RSI aşırı satım (${indicators.rsi.toFixed(1)}) - güçlü alım fırsatı`);
  } else if (indicators.rsi > 70) {
    const strength = Math.max(0, indicators.rsi - 70);
    score -= strength;
    reasons.push(`RSI aşırı alım (${indicators.rsi.toFixed(1)}) - düzeltme riski`);
    risks.push('Kısa vadeli kar realizasyonu bekleniyor');
  } else if (indicators.rsi >= 50 && indicators.rsi <= 60) {
    score += 10;
    reasons.push(`RSI sağlıklı bölgede (${indicators.rsi.toFixed(1)}) - momentum pozitif`);
  }
  
  // 2. Moving Average Trend (weight: 30)
  const priceAboveMA50 = price > indicators.ma50;
  const ma50AboveMA200 = indicators.ma50 > indicators.ma200;
  
  if (priceAboveMA50 && ma50AboveMA200) {
    score += 30;
    reasons.push('Golden Cross - fiyat 50 ve 200 MA üstünde (güçlü yükseliş trendi)');
  } else if (!priceAboveMA50 && !ma50AboveMA200) {
    score -= 30;
    reasons.push('Death Cross - fiyat 50 ve 200 MA altında (güçlü düşüş trendi)');
    risks.push('Düşüş trendi devam edebilir');
  } else if (priceAboveMA50 && !ma50AboveMA200) {
    score += 10;
    reasons.push('Fiyat 50 MA üstünde ama 200 MA altında (karışık trend)');
    risks.push('Uzun vadeli trend henüz oluşmadı');
  }
  
  // 3. MACD Momentum (weight: 15)
  if (indicators.macd > 0 && indicators.rsi < 70) {
    score += 15;
    reasons.push('MACD pozitif momentum gösteriyor');
  } else if (indicators.macd < 0 && indicators.rsi > 30) {
    score -= 15;
    reasons.push('MACD negatif momentum gösteriyor');
  }
  
  // 4. EMA Crossover (weight: 15)
  if (indicators.ema12 > indicators.ema26) {
    const distance = ((indicators.ema12 - indicators.ema26) / indicators.ema26) * 100;
    if (distance > 0.5) {
      score += 15;
      reasons.push(`EMA12 > EMA26 (${distance.toFixed(2)}% fark) - güçlü yükseliş`);
    } else {
      score += 5;
      reasons.push('EMA12 yeni EMA26 üstüne geçti');
    }
  } else {
    const distance = ((indicators.ema26 - indicators.ema12) / indicators.ema12) * 100;
    if (distance > 0.5) {
      score -= 15;
      reasons.push(`EMA12 < EMA26 (${distance.toFixed(2)}% fark) - düşüş baskısı`);
    }
  }
  
  // 5. Divergence Detection (weight: up to 30 based on strength/confidence)
  if (divergences && divergences.length > 0) {
    const strongestDiv = divergences[0]; // Already sorted by strength
    const divWeight = (strongestDiv.strength / 100) * (strongestDiv.confidence / 100) * 30;
    
    if (strongestDiv.type === 'bullish' || strongestDiv.type === 'hidden-bullish') {
      score += divWeight;
      reasons.push(`${strongestDiv.type} divergence tespit edildi (güç: ${strongestDiv.strength}, güven: ${strongestDiv.confidence}%)`);
    } else if (strongestDiv.type === 'bearish' || strongestDiv.type === 'hidden-bearish') {
      score -= divWeight;
      reasons.push(`${strongestDiv.type} divergence tespit edildi (güç: ${strongestDiv.strength}, güven: ${strongestDiv.confidence}%)`);
      risks.push('Divergence sinyali trend dönüşü gösteriyor');
    }
  }
  
  // 6. Volume Analysis (weight: up to 25)
  if (volumeAnalysis) {
    const volConfidence = volumeAnalysis.recommendation.confidence;
    const volSignal = volumeAnalysis.recommendation.signal;
    const volWeight = (volConfidence / 100) * 25;
    
    if (volSignal === 'BUY') {
      score += volWeight;
      reasons.push(`Hacim analizi AL sinyali (güven: ${volConfidence.toFixed(0)}%)`);
      
      // Additional reasons from volume analysis
      volumeAnalysis.recommendation.reasons.slice(0, 2).forEach(r => {
        reasons.push(`  └─ ${r}`);
      });
    } else if (volSignal === 'SELL') {
      score -= volWeight;
      reasons.push(`Hacim analizi SAT sinyali (güven: ${volConfidence.toFixed(0)}%)`);
      risks.push('Hacim dağılımı olumsuz');
    }
    
    // POC distance check
    const pocDistance = ((price - volumeAnalysis.profile.poc) / price) * 100;
    if (Math.abs(pocDistance) < 2) {
      score += 10;
      reasons.push(`Fiyat yüksek hacim bölgesinde (POC: $${volumeAnalysis.profile.poc.toFixed(2)})`);
    }
    
    // Buy/Sell pressure
    if (volumeAnalysis.pressure.signal === 'BUY') {
      score += (volumeAnalysis.pressure.confidence / 100) * 10;
      reasons.push(`Alım baskısı dominant (MFI: ${volumeAnalysis.pressure.mfi.toFixed(0)})`);
    } else if (volumeAnalysis.pressure.signal === 'SELL') {
      score -= (volumeAnalysis.pressure.confidence / 100) * 10;
      risks.push(`Satım baskısı yüksek (MFI: ${volumeAnalysis.pressure.mfi.toFixed(0)})`);
    }
  }
  
  // 7. Volatility Risk Adjustment
  const volatilityPercent = (indicators.volatility / price) * 100;
  if (volatilityPercent > 5) {
    risks.push(`Yüksek volatilite (${volatilityPercent.toFixed(1)}%) - dikkatli pozisyon alın`);
  }
  
  return { score, reasons, risks };
}

/**
 * Calculate ATR for stop-loss/target calculations
 */
function calculateATR(candles: any[], period: number = 14): number {
  if (candles.length < period) return 0;
  
  const trueRanges: number[] = [];
  for (let i = 1; i < candles.length; i++) {
    const high = parseFloat(candles[i][2]);
    const low = parseFloat(candles[i][3]);
    const prevClose = parseFloat(candles[i - 1][4]);
    
    const tr = Math.max(
      high - low,
      Math.abs(high - prevClose),
      Math.abs(low - prevClose)
    );
    trueRanges.push(tr);
  }
  
  const recentTR = trueRanges.slice(-period);
  return recentTR.reduce((sum, tr) => sum + tr, 0) / recentTR.length;
}

/**
 * Calculate entry/exit levels
 */
function calculateLevels(input: DecisionInput, isBuy: boolean): EntryExitLevels {
  const atr = calculateATR(input.candles, 14);
  const { price } = input;
  
  if (atr === 0) {
    // Fallback to percentage-based
    const stopPercent = 0.03; // 3%
    const stopLoss = isBuy ? price * (1 - stopPercent) : price * (1 + stopPercent);
    const targets = isBuy 
      ? [price * 1.03, price * 1.06, price * 1.10]
      : [price * 0.97, price * 0.94, price * 0.90];
    
    return {
      entryPrice: price * (isBuy ? 0.998 : 1.002), // 0.2% slippage
      stopLoss,
      targets,
      riskRewardRatio: 2.0
    };
  }
  
  const stopLoss = isBuy 
    ? price - (atr * CONFIG.ATR_STOP_MULTIPLIER)
    : price + (atr * CONFIG.ATR_STOP_MULTIPLIER);
  
  const targets = CONFIG.RISK_REWARD_RATIOS.map(ratio => {
    const targetDistance = atr * CONFIG.ATR_STOP_MULTIPLIER * ratio;
    return isBuy ? price + targetDistance : price - targetDistance;
  });
  
  const riskRewardRatio = CONFIG.RISK_REWARD_RATIOS[1]; // Use T2 as primary
  
  return {
    entryPrice: price * (isBuy ? 0.998 : 1.002),
    stopLoss,
    targets,
    riskRewardRatio
  };
}

/**
 * Create BUY decision
 */
function createBuyDecision(
  input: DecisionInput,
  score: number,
  reasons: string[],
  risks: string[],
  dataQuality: DataQuality
): DecisionResult {
  let confidence = Math.min(score / 100, 0.95); // Max 95%
  
  // Apply penalties
  const volatilityPercent = (input.indicators.volatility / input.price) * 100;
  if (volatilityPercent > 5) {
    confidence *= CONFIG.HIGH_VOLATILITY_PENALTY;
  }
  
  if (input.volume24h < CONFIG.MIN_LIQUIDITY * 2) {
    confidence *= CONFIG.LOW_VOLUME_PENALTY;
  }
  
  const levels = calculateLevels(input, true);
  
  console.log(`✅ BUY signal: score=${score}, confidence=${(confidence * 100).toFixed(0)}%`);
  
  return {
    verdict: 'BUY',
    confidence,
    score,
    levels,
    reasons,
    risks,
    dataQuality,
    timestamp: Date.now(),
    timeframe: input.timeframe
  };
}

/**
 * Create SELL decision
 */
function createSellDecision(
  input: DecisionInput,
  score: number,
  reasons: string[],
  risks: string[],
  dataQuality: DataQuality
): DecisionResult {
  let confidence = Math.min(Math.abs(score) / 100, 0.95);
  
  const volatilityPercent = (input.indicators.volatility / input.price) * 100;
  if (volatilityPercent > 5) {
    confidence *= CONFIG.HIGH_VOLATILITY_PENALTY;
  }
  
  const levels = calculateLevels(input, false);
  
  console.log(`🔴 SELL signal: score=${score}, confidence=${(confidence * 100).toFixed(0)}%`);
  
  return {
    verdict: 'SELL',
    confidence,
    score,
    levels,
    reasons,
    risks,
    dataQuality,
    timestamp: Date.now(),
    timeframe: input.timeframe
  };
}

/**
 * Create HOLD decision with wait conditions
 */
function createHoldDecision(
  input: DecisionInput,
  dataQuality: DataQuality,
  reasons: string[],
  risks: string[],
  waitConditions: WaitCondition[]
): DecisionResult {
  console.log(`🟡 HOLD: ${waitConditions.length} wait conditions`);
  
  return {
    verdict: 'HOLD',
    confidence: 0.5,
    score: 0,
    waitFor: waitConditions,
    reasons,
    risks,
    dataQuality,
    timestamp: Date.now(),
    timeframe: input.timeframe
  };
}

/**
 * Generate wait conditions for HOLD
 */
function generateWaitConditions(input: DecisionInput, score: number): WaitCondition[] {
  const conditions: WaitCondition[] = [];
  const { indicators, volumeAnalysis, price } = input;
  
  // RSI conditions
  if (indicators.rsi > 50 && indicators.rsi < 70) {
    conditions.push({
      condition: `RSI < 30`,
      description: 'RSI aşırı satım bölgesine insin (güçlü alım fırsatı)',
      priority: 'high'
    });
  } else if (indicators.rsi > 70) {
    conditions.push({
      condition: `RSI < 60`,
      description: 'RSI düzelsin (aşırı alım bölgesinden çıksın)',
      priority: 'medium'
    });
  }
  
  // POC condition
  if (volumeAnalysis) {
    const pocDistance = Math.abs((price - volumeAnalysis.profile.poc) / price) * 100;
    if (pocDistance > 3) {
      conditions.push({
        condition: `Fiyat POC'a yaklaşsın`,
        description: `POC seviyesi: $${volumeAnalysis.profile.poc.toFixed(2)} (şu an ${pocDistance.toFixed(1)}% uzakta)`,
        priority: 'medium'
      });
    }
  }
  
  // MA alignment condition
  if (indicators.ma50 < indicators.ma200 && price > indicators.ma50) {
    conditions.push({
      condition: 'MA50 > MA200',
      description: 'Golden Cross oluşsun (50 MA, 200 MA üstüne geçsin)',
      priority: 'high'
    });
  }
  
  // Generic score condition
  if (Math.abs(score) < 30) {
    conditions.push({
      condition: 'Daha güçlü sinyal',
      description: `Mevcut skor: ${score.toFixed(0)} (eşik: ±70). Daha net bir trend bekleyin`,
      priority: 'low'
    });
  }
  
  return conditions;
}

export default {
  analyzeAndDecide,
  CONFIG
};
