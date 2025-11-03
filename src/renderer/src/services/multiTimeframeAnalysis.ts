/**
 * 📊 Multi-Timeframe Technical Analysis Service
 * Çoklu zaman dilimi analizi ve sinyal confluence hesaplama
 */

import { TechnicalAnalysis } from './technicalAnalysis';
import { MultiTimeframeAnalysis, TradingSignal, TechnicalIndicators } from '../types';

interface PriceData {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export class MultiTimeframeAnalysisService {
  // Desteklenen zaman dilimleri
  private static readonly TIMEFRAMES = ['5m', '15m', '1h', '4h', '1d'];
  
  // Timeframe ağırlıkları (confluence hesaplama için)
  private static readonly TIMEFRAME_WEIGHTS: { [key: string]: number } = {
    '5m': 0.1,
    '15m': 0.15,
    '1h': 0.25,
    '4h': 0.3,
    '1d': 0.2
  };

  /**
   * 🎯 Multi-timeframe analiz yapma
   */
  static async analyzeMultiTimeframe(symbol: string, priceData: { [key: string]: PriceData[] }): Promise<MultiTimeframeAnalysis> {
    const analysis: MultiTimeframeAnalysis = {
      symbol,
      timeframes: {},
      overallSignal: this.createDefaultSignal(symbol),
      confluenceScore: 0
    };

    let totalWeightedStrength = 0;
    let totalWeight = 0;
    const signals: TradingSignal[] = [];

    // Her timeframe için analiz yap
    for (const timeframe of this.TIMEFRAMES) {
      if (!priceData[timeframe] || priceData[timeframe].length < 50) continue;

      const data = priceData[timeframe];
      const prices = data.map(d => d.close);
      const highs = data.map(d => d.high);
      const lows = data.map(d => d.low);
      const volumes = data.map(d => d.volume);

      // Technical indicators hesapla
      const indicators = this.calculateIndicators(prices, highs, lows, volumes);
      
      // Trend analizi
      const trend = this.analyzeTrend(prices, indicators);
      
      // Signal üret
      const signal = this.generateSignal(symbol, prices[prices.length - 1], indicators, timeframe);
      
      // Strength hesapla
      const strength = this.calculateTimeframeStrength(indicators, trend);

      analysis.timeframes[timeframe] = {
        trend,
        signal,
        indicators,
        strength
      };

      // Weighted average için topla
      const weight = this.TIMEFRAME_WEIGHTS[timeframe] || 0.1;
      totalWeightedStrength += strength * weight;
      totalWeight += weight;
      signals.push(signal);
    }

    // Overall signal ve confluence score hesapla
    analysis.confluenceScore = totalWeight > 0 ? totalWeightedStrength / totalWeight : 0;
    analysis.overallSignal = this.calculateOverallSignal(signals, symbol);

    return analysis;
  }

  /**
   * 📈 Technical indicators hesaplama
   */
  private static calculateIndicators(prices: number[], highs: number[], lows: number[], _volumes: number[]): TechnicalIndicators {
    const currentPrice = prices[prices.length - 1];
    
    // Basic indicators
    const rsiValue = TechnicalAnalysis.calculateRSI(prices);
    const ma50Array = TechnicalAnalysis.calculateMovingAverage(prices, 50);
    const ma200Array = TechnicalAnalysis.calculateMovingAverage(prices, 200);
    const ema12Array = TechnicalAnalysis.calculateEMAArray(prices, 12);
    const ema26Array = TechnicalAnalysis.calculateEMAArray(prices, 26);
    const macd = ema12Array.length > 0 && ema26Array.length > 0 
      ? ema12Array[ema12Array.length - 1] - ema26Array[ema26Array.length - 1] 
      : 0;
    const volatility = TechnicalAnalysis.calculateVolatility(prices);

    // Advanced indicators
    const bollingerBands = TechnicalAnalysis.calculateBollingerBands(prices, 20, 2);
    const ichimoku = TechnicalAnalysis.calculateIchimoku(highs, lows, prices);
    const fibonacci = TechnicalAnalysis.calculateFibonacci(Math.max(...prices.slice(-50)), Math.min(...prices.slice(-50)));
    const supportResistance = TechnicalAnalysis.findSupportResistance(prices.slice(-100), 3);

    return {
      rsi: rsiValue,
      ma50: ma50Array.length > 0 ? ma50Array[ma50Array.length - 1] : currentPrice,
      ma200: ma200Array.length > 0 ? ma200Array[ma200Array.length - 1] : currentPrice,
      ema12: ema12Array.length > 0 ? ema12Array[ema12Array.length - 1] : currentPrice,
      ema26: ema26Array.length > 0 ? ema26Array[ema26Array.length - 1] : currentPrice,
      macd,
      volatility,
      bollingerBands: bollingerBands.upper.length > 0 ? {
        upper: bollingerBands.upper[bollingerBands.upper.length - 1],
        middle: bollingerBands.middle[bollingerBands.middle.length - 1],
        lower: bollingerBands.lower[bollingerBands.lower.length - 1],
        squeeze: bollingerBands.squeeze[bollingerBands.squeeze.length - 1]
      } : undefined,
      ichimoku: ichimoku.tenkanSen.length > 0 ? {
        tenkanSen: ichimoku.tenkanSen[ichimoku.tenkanSen.length - 1],
        kijunSen: ichimoku.kijunSen[ichimoku.kijunSen.length - 1],
        senkouSpanA: ichimoku.senkouSpanA[ichimoku.senkouSpanA.length - 1],
        senkouSpanB: ichimoku.senkouSpanB[ichimoku.senkouSpanB.length - 1],
        signal: this.getIchimokuSignal(ichimoku, currentPrice)
      } : undefined,
      fibonacci,
      supportResistance: {
        supports: supportResistance.supports,
        resistances: supportResistance.resistances,
        nearestSupport: this.findNearestLevel(currentPrice, supportResistance.supports, 'support'),
        nearestResistance: this.findNearestLevel(currentPrice, supportResistance.resistances, 'resistance')
      }
    };
  }

  /**
   * 📊 Trend analizi
   */
  private static analyzeTrend(prices: number[], indicators: TechnicalIndicators): 'bullish' | 'bearish' | 'sideways' {
    const currentPrice = prices[prices.length - 1];
    let bullishSignals = 0;
    let bearishSignals = 0;

    // Moving average trend
    if (currentPrice > indicators.ma50) bullishSignals++;
    else bearishSignals++;

    if (indicators.ma50 > indicators.ma200) bullishSignals++;
    else bearishSignals++;

    // RSI trend
    if (indicators.rsi > 50) bullishSignals++;
    else bearishSignals++;

    // MACD trend
    if (indicators.macd > 0) bullishSignals++;
    else bearishSignals++;

    // Ichimoku trend
    if (indicators.ichimoku?.signal === 'bullish') bullishSignals++;
    else if (indicators.ichimoku?.signal === 'bearish') bearishSignals++;

    if (bullishSignals > bearishSignals + 1) return 'bullish';
    if (bearishSignals > bullishSignals + 1) return 'bearish';
    return 'sideways';
  }

  /**
   * 🎯 Signal üretme
   */
  private static generateSignal(symbol: string, currentPrice: number, indicators: TechnicalIndicators, timeframe: string): TradingSignal {
    let signalType: 'BUY' | 'SELL' | 'HOLD' = 'HOLD';
    let confidence = 50;
    let reasons: string[] = [];

    // RSI signals
    if (indicators.rsi < 30) {
      signalType = 'BUY';
      confidence += 15;
      reasons.push('RSI oversold');
    } else if (indicators.rsi > 70) {
      signalType = 'SELL';
      confidence += 15;
      reasons.push('RSI overbought');
    }

    // Bollinger Bands signals
    if (indicators.bollingerBands) {
      const bb = indicators.bollingerBands;
      if (currentPrice <= bb.lower) {
        signalType = 'BUY';
        confidence += 10;
        reasons.push('BB lower band bounce');
      } else if (currentPrice >= bb.upper) {
        signalType = 'SELL';
        confidence += 10;
        reasons.push('BB upper band rejection');
      }

      if (bb.squeeze) {
        confidence += 5;
        reasons.push('BB squeeze setup');
      }
    }

    // Ichimoku signals
    if (indicators.ichimoku) {
      if (indicators.ichimoku.signal === 'bullish') {
        if (signalType !== 'SELL') signalType = 'BUY';
        confidence += 10;
        reasons.push('Ichimoku bullish');
      } else if (indicators.ichimoku.signal === 'bearish') {
        if (signalType !== 'BUY') signalType = 'SELL';
        confidence += 10;
        reasons.push('Ichimoku bearish');
      }
    }

    // Support/Resistance signals
    if (indicators.supportResistance) {
      const { nearestSupport, nearestResistance } = indicators.supportResistance;
      if (nearestSupport && Math.abs(currentPrice - nearestSupport) / currentPrice < 0.02) {
        signalType = 'BUY';
        confidence += 10;
        reasons.push('Near support level');
      }
      if (nearestResistance && Math.abs(currentPrice - nearestResistance) / currentPrice < 0.02) {
        signalType = 'SELL';
        confidence += 10;
        reasons.push('Near resistance level');
      }
    }

    // Risk/Reward calculation
    const riskReward = this.calculateRiskReward(currentPrice, indicators, signalType);

    return {
      coin: symbol,
      type: signalType,
      price: currentPrice,
      confidence: Math.min(Math.max(confidence, 0), 100),
      timestamp: new Date(),
      reason: reasons.join(', ') || 'Technical analysis',
      timeframe,
      signalStrength: confidence,
      riskReward,
      confluenceScore: 0, // Will be calculated later
      divergence: 'none' // TODO: Implement divergence detection
    };
  }

  /**
   * 💪 Timeframe strength hesaplama
   */
  private static calculateTimeframeStrength(indicators: TechnicalIndicators, trend: 'bullish' | 'bearish' | 'sideways'): number {
    let strength = 50;

    // Trend strength
    if (trend === 'bullish') strength += 15;
    else if (trend === 'bearish') strength -= 15;

    // RSI strength
    if (indicators.rsi > 50) strength += (indicators.rsi - 50) * 0.3;
    else strength -= (50 - indicators.rsi) * 0.3;

    // MACD strength
    if (indicators.macd > 0) strength += 5;
    else strength -= 5;

    // Volatility adjustment
    if (indicators.volatility > 0.05) strength -= 10;

    return Math.min(Math.max(strength, 0), 100);
  }

  /**
   * 🎯 Overall signal hesaplama
   */
  private static calculateOverallSignal(signals: TradingSignal[], symbol: string): TradingSignal {
    if (signals.length === 0) {
      return this.createDefaultSignal(symbol);
    }

    let buyScore = 0;
    let sellScore = 0;
    let totalWeight = 0;
    let weightedConfidence = 0;

    signals.forEach(signal => {
      const weight = this.TIMEFRAME_WEIGHTS[signal.timeframe!] || 0.1;
      totalWeight += weight;
      weightedConfidence += signal.confidence * weight;

      if (signal.type === 'BUY') {
        buyScore += signal.confidence * weight;
      } else if (signal.type === 'SELL') {
        sellScore += signal.confidence * weight;
      }
    });

    let overallType: 'BUY' | 'SELL' | 'HOLD' = 'HOLD';
    if (buyScore > sellScore + 10) overallType = 'BUY';
    else if (sellScore > buyScore + 10) overallType = 'SELL';

    const avgConfidence = totalWeight > 0 ? weightedConfidence / totalWeight : 50;
    const currentPrice = signals[0]?.price || 0;

    return {
      coin: symbol,
      type: overallType,
      price: currentPrice,
      confidence: Math.round(avgConfidence),
      timestamp: new Date(),
      reason: 'Multi-timeframe confluence',
      timeframe: 'MTF',
      signalStrength: Math.round(avgConfidence),
      riskReward: 1.5,
      confluenceScore: Math.round((buyScore + sellScore) / totalWeight),
      divergence: 'none'
    };
  }

  /**
   * 🔧 Yardımcı metodlar
   */
  private static createDefaultSignal(symbol: string): TradingSignal {
    return {
      coin: symbol,
      type: 'HOLD',
      price: 0,
      confidence: 50,
      timestamp: new Date(),
      reason: 'Insufficient data',
      timeframe: 'MTF',
      signalStrength: 50,
      riskReward: 1,
      confluenceScore: 50,
      divergence: 'none'
    };
  }

  private static getIchimokuSignal(ichimoku: any, currentPrice: number): 'bullish' | 'bearish' | 'neutral' {
    const tenkan = ichimoku.tenkanSen[ichimoku.tenkanSen.length - 1];
    const kijun = ichimoku.kijunSen[ichimoku.kijunSen.length - 1];
    const spanA = ichimoku.senkouSpanA[ichimoku.senkouSpanA.length - 1];
    const spanB = ichimoku.senkouSpanB[ichimoku.senkouSpanB.length - 1];

    // Price above cloud and Tenkan > Kijun
    if (currentPrice > Math.max(spanA, spanB) && tenkan > kijun) {
      return 'bullish';
    }
    // Price below cloud and Tenkan < Kijun
    else if (currentPrice < Math.min(spanA, spanB) && tenkan < kijun) {
      return 'bearish';
    }
    
    return 'neutral';
  }

  private static findNearestLevel(currentPrice: number, levels: number[], type: 'support' | 'resistance'): number | undefined {
    if (levels.length === 0) return undefined;

    const filtered = type === 'support' 
      ? levels.filter(level => level < currentPrice)
      : levels.filter(level => level > currentPrice);

    if (filtered.length === 0) return undefined;

    return type === 'support'
      ? Math.max(...filtered)
      : Math.min(...filtered);
  }

  private static calculateRiskReward(currentPrice: number, indicators: TechnicalIndicators, signalType: 'BUY' | 'SELL' | 'HOLD'): number {
    if (signalType === 'HOLD') return 1;

    const { nearestSupport, nearestResistance } = indicators.supportResistance || {};

    if (signalType === 'BUY' && nearestSupport && nearestResistance) {
      const risk = Math.abs(currentPrice - nearestSupport);
      const reward = Math.abs(nearestResistance - currentPrice);
      return reward > 0 ? reward / risk : 1;
    } else if (signalType === 'SELL' && nearestSupport && nearestResistance) {
      const risk = Math.abs(nearestResistance - currentPrice);
      const reward = Math.abs(currentPrice - nearestSupport);
      return reward > 0 ? reward / risk : 1;
    }

    return 1.5; // Default risk/reward
  }
}