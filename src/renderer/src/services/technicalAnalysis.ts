import { TechnicalIndicators, TradingSignal } from '../types';

interface BollingerBands {
  upper: number[];
  middle: number[];
  lower: number[];
  squeeze: boolean[];
}

interface IchimokuCloud {
  tenkanSen: number[];
  kijunSen: number[];
  senkouSpanA: number[];
  senkouSpanB: number[];
  chikouSpan: number[];
}

interface VolumeProfile {
  levels: { price: number; volume: number }[];
  pointOfControl: number;
  valueAreaHigh: number;
  valueAreaLow: number;
}

export class TechnicalAnalysis {
  // Multi-timeframe sinyal gücü
  static calculateSignalStrength(signals: { timeframe: string; strength: number }[]): number {
    const weights: { [key: string]: number } = { '1m': 0.1, '5m': 0.15, '1h': 0.25, '4h': 0.3, '1d': 0.2 };
    let totalWeight = 0;
    let weightedSum = 0;
    
    signals.forEach(signal => {
      const weight = weights[signal.timeframe] || 0.1;
      weightedSum += signal.strength * weight;
      totalWeight += weight;
    });
    
    return totalWeight > 0 ? weightedSum / totalWeight : 50;
  }

  // Divergence tespit etme
  static detectDivergence(prices: number[], indicator: number[], periods: number = 5): 'bullish' | 'bearish' | 'none' {
    if (prices.length < periods * 2 || indicator.length < periods * 2) return 'none';
    
    const recentPrices = prices.slice(-periods);
    const recentIndicator = indicator.slice(-periods);
    const prevPrices = prices.slice(-periods * 2, -periods);
    const prevIndicator = indicator.slice(-periods * 2, -periods);
    
    const priceHighRecent = Math.max(...recentPrices);
    const priceHighPrev = Math.max(...prevPrices);
    const indicatorHighRecent = Math.max(...recentIndicator);
    const indicatorHighPrev = Math.max(...prevIndicator);
    
    // Bearish divergence: Fiyat yeni yüksek yaparken indikatör yapmıyor
    if (priceHighRecent > priceHighPrev && indicatorHighRecent < indicatorHighPrev) {
      return 'bearish';
    }
    
    const priceLowRecent = Math.min(...recentPrices);
    const priceLowPrev = Math.min(...prevPrices);
    const indicatorLowRecent = Math.min(...recentIndicator);
    const indicatorLowPrev = Math.min(...prevIndicator);
    
    // Bullish divergence: Fiyat yeni düşük yaparken indikatör yapmıyor
    if (priceLowRecent < priceLowPrev && indicatorLowRecent > indicatorLowPrev) {
      return 'bullish';
    }
    
    return 'none';
  }

  // RSI hesaplama (single value)
  static calculateRSI(prices: number[], period: number = 14): number {
    if (prices.length < period + 1) return 50;

    const gains: number[] = [];
    const losses: number[] = [];

    for (let i = 1; i < prices.length; i++) {
      const change = prices[i] - prices[i - 1];
      gains.push(change > 0 ? change : 0);
      losses.push(change < 0 ? Math.abs(change) : 0);
    }

    const avgGain = gains.slice(-period).reduce((a, b) => a + b, 0) / period;
    const avgLoss = losses.slice(-period).reduce((a, b) => a + b, 0) / period;

    if (avgLoss === 0) return 100;
    
    const rs = avgGain / avgLoss;
    return 100 - (100 / (1 + rs));
  }

  // RSI Array version
  static calculateRSIArray(prices: number[], period: number = 14): number[] {
    if (prices.length < period + 1) return [50];

    const result: number[] = [];
    
    for (let i = period; i < prices.length; i++) {
      const slice = prices.slice(i - period, i + 1);
      const gains: number[] = [];
      const losses: number[] = [];

      for (let j = 1; j < slice.length; j++) {
        const change = slice[j] - slice[j - 1];
        gains.push(change > 0 ? change : 0);
        losses.push(change < 0 ? Math.abs(change) : 0);
      }

      const avgGain = gains.reduce((a, b) => a + b, 0) / period;
      const avgLoss = losses.reduce((a, b) => a + b, 0) / period;

      if (avgLoss === 0) {
        result.push(100);
      } else {
        const rs = avgGain / avgLoss;
        result.push(100 - (100 / (1 + rs)));
      }
    }

    return result;
  }

  // Basit Hareketli Ortalama
  static calculateSMA(prices: number[], period: number): number {
    if (prices.length < period) return prices[prices.length - 1] || 0;
    
    const recentPrices = prices.slice(-period);
    return recentPrices.reduce((a, b) => a + b, 0) / period;
  }

  // Moving Average (array döndüren versiyon)
  static calculateMovingAverage(prices: number[], period: number): number[] {
    const result: number[] = [];
    
    for (let i = period - 1; i < prices.length; i++) {
      const slice = prices.slice(i - period + 1, i + 1);
      const avg = slice.reduce((sum, price) => sum + price, 0) / period;
      result.push(avg);
    }
    
    return result;
  }

  // Üstel Hareketli Ortalama (single value)
  static calculateEMA(prices: number[], period: number): number {
    if (prices.length === 0) return 0;
    if (prices.length === 1) return prices[0];

    const multiplier = 2 / (period + 1);
    let ema = prices[0];

    for (let i = 1; i < prices.length; i++) {
      ema = (prices[i] * multiplier) + (ema * (1 - multiplier));
    }

    return ema;
  }

  // EMA Array version (for multi-timeframe analysis)
  static calculateEMAArray(prices: number[], period: number): number[] {
    if (prices.length === 0) return [];
    
    const result: number[] = [];
    const multiplier = 2 / (period + 1);
    let ema = prices[0];
    result.push(ema);

    for (let i = 1; i < prices.length; i++) {
      ema = (prices[i] * multiplier) + (ema * (1 - multiplier));
      result.push(ema);
    }

    return result;
  }

  // MACD hesaplama
  static calculateMACD(prices: number[]): { macd: number; signal: number; histogram: number } {
    const ema12 = this.calculateEMA(prices, 12);
    const ema26 = this.calculateEMA(prices, 26);
    const macd = ema12 - ema26;

    // Signal line için MACD'nin 9 günlük EMA'sı (basitleştirilmiş)
    const signal = macd * 0.8; // Gerçek uygulamada MACD değerlerinin EMA'sı alınır
    const histogram = macd - signal;

    return { macd, signal, histogram };
  }

  // Volatilite hesaplama (standart sapma)
  static calculateVolatility(prices: number[], period: number = 20): number {
    if (prices.length < period) return 0;

    const recentPrices = prices.slice(-period);
    const mean = recentPrices.reduce((a, b) => a + b, 0) / period;
    
    const variance = recentPrices.reduce((acc, price) => {
      return acc + Math.pow(price - mean, 2);
    }, 0) / period;

    return Math.sqrt(variance);
  }

  // Tüm indikatörleri hesapla
  static calculateIndicators(prices: number[]): TechnicalIndicators {
    const rsi = this.calculateRSI(prices);
    const ma50 = this.calculateSMA(prices, 50);
    const ma200 = this.calculateSMA(prices, 200);
    const ema12 = this.calculateEMA(prices, 12);
    const ema26 = this.calculateEMA(prices, 26);
    const { macd } = this.calculateMACD(prices);
    const volatility = this.calculateVolatility(prices);

    return {
      rsi,
      ma50,
      ma200,
      ema12,
      ema26,
      macd,
      volatility
    };
  }

  // Trading sinyali üret
  static generateSignal(prices: number[], symbol: string): TradingSignal {
    const indicators = this.calculateIndicators(prices);
    const currentPrice = prices[prices.length - 1];
    
    let type: 'BUY' | 'SELL' | 'HOLD' = 'HOLD';
    let confidence = 50;
    let reason = 'Nötr piyasa koşulları';

    // RSI bazlı sinyal
    if (indicators.rsi < 30) {
      type = 'BUY';
      confidence += 20;
      reason = 'RSI aşırı satım bölgesinde';
    } else if (indicators.rsi > 70) {
      type = 'SELL';
      confidence += 20;
      reason = 'RSI aşırı alım bölgesinde';
    }

    // MA crossover
    if (currentPrice > indicators.ma50 && indicators.ma50 > indicators.ma200) {
      if (type === 'BUY') confidence += 15;
      else if (type === 'HOLD') {
        type = 'BUY';
        confidence += 10;
        reason = 'Boğa trendi - MA50 > MA200';
      }
    } else if (currentPrice < indicators.ma50 && indicators.ma50 < indicators.ma200) {
      if (type === 'SELL') confidence += 15;
      else if (type === 'HOLD') {
        type = 'SELL';
        confidence += 10;
        reason = 'Ayı trendi - MA50 < MA200';
      }
    }

    // MACD sinyali
    if (indicators.macd > 0) {
      if (type === 'BUY') confidence += 10;
    } else {
      if (type === 'SELL') confidence += 10;
    }

    // Volatilite kontrolü
    if (indicators.volatility > currentPrice * 0.05) {
      confidence -= 10; // Yüksek volatilite güveni azaltır
    }

    // Hedef fiyat ve stop loss
    const targetPrice = type === 'BUY' ? currentPrice * 1.05 : currentPrice * 0.95;
    const stopLoss = type === 'BUY' ? currentPrice * 0.95 : currentPrice * 1.05;

    return {
      coin: symbol,
      type,
      price: currentPrice,
      confidence: Math.min(Math.max(confidence, 0), 100),
      timestamp: new Date(),
      reason,
      targetPrice,
      stopLoss
    };
  }

  // 📊 BOLLINGER BANDS
  static calculateBollingerBands(prices: number[], period: number = 20, stdDev: number = 2): BollingerBands {
    if (prices.length < period) {
      return { upper: [], middle: [], lower: [], squeeze: [] };
    }

    const middle: number[] = [];
    const upper: number[] = [];
    const lower: number[] = [];
    const squeeze: boolean[] = [];

    for (let i = period - 1; i < prices.length; i++) {
      const slice = prices.slice(i - period + 1, i + 1);
      const sma = slice.reduce((sum, price) => sum + price, 0) / period;
      
      // Standard deviation calculation
      const variance = slice.reduce((sum, price) => sum + Math.pow(price - sma, 2), 0) / period;
      const standardDeviation = Math.sqrt(variance);
      
      middle.push(sma);
      upper.push(sma + (standardDeviation * stdDev));
      lower.push(sma - (standardDeviation * stdDev));
      
      // Squeeze detection: bands are narrow
      const bandWidth = (upper[upper.length - 1] - lower[lower.length - 1]) / sma;
      squeeze.push(bandWidth < 0.1); // 10% threshold for squeeze
    }

    return { upper, middle, lower, squeeze };
  }

  // ☁️ ICHIMOKU CLOUD
  static calculateIchimoku(high: number[], low: number[], close: number[]): IchimokuCloud {
    const tenkanSen: number[] = [];
    const kijunSen: number[] = [];
    const senkouSpanA: number[] = [];
    const senkouSpanB: number[] = [];
    const chikouSpan: number[] = [];

    for (let i = 0; i < close.length; i++) {
      // Tenkan-sen (Conversion Line): (9-period high + 9-period low) / 2
      if (i >= 8) {
        const tenkanHigh = Math.max(...high.slice(i - 8, i + 1));
        const tenkanLow = Math.min(...low.slice(i - 8, i + 1));
        tenkanSen.push((tenkanHigh + tenkanLow) / 2);
      } else {
        tenkanSen.push(close[i]);
      }

      // Kijun-sen (Base Line): (26-period high + 26-period low) / 2
      if (i >= 25) {
        const kijunHigh = Math.max(...high.slice(i - 25, i + 1));
        const kijunLow = Math.min(...low.slice(i - 25, i + 1));
        kijunSen.push((kijunHigh + kijunLow) / 2);
      } else {
        kijunSen.push(close[i]);
      }

      // Senkou Span A: (Tenkan-sen + Kijun-sen) / 2, plotted 26 periods ahead
      if (tenkanSen.length > 0 && kijunSen.length > 0) {
        senkouSpanA.push((tenkanSen[tenkanSen.length - 1] + kijunSen[kijunSen.length - 1]) / 2);
      } else {
        senkouSpanA.push(close[i]);
      }

      // Senkou Span B: (52-period high + 52-period low) / 2, plotted 26 periods ahead
      if (i >= 51) {
        const spanBHigh = Math.max(...high.slice(i - 51, i + 1));
        const spanBLow = Math.min(...low.slice(i - 51, i + 1));
        senkouSpanB.push((spanBHigh + spanBLow) / 2);
      } else {
        senkouSpanB.push(close[i]);
      }

      // Chikou Span: Close plotted 26 periods behind
      chikouSpan.push(close[i]);
    }

    return { tenkanSen, kijunSen, senkouSpanA, senkouSpanB, chikouSpan };
  }

  // 📊 VOLUME PROFILE
  static calculateVolumeProfile(prices: number[], volumes: number[], bins: number = 50): VolumeProfile {
    if (prices.length !== volumes.length || prices.length === 0) {
      return { levels: [], pointOfControl: 0, valueAreaHigh: 0, valueAreaLow: 0 };
    }

    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const priceRange = maxPrice - minPrice;
    const binSize = priceRange / bins;

    // Initialize bins
    const volumeBins: { price: number; volume: number }[] = [];
    for (let i = 0; i < bins; i++) {
      volumeBins.push({
        price: minPrice + (i * binSize) + (binSize / 2),
        volume: 0
      });
    }

    // Distribute volume into bins
    for (let i = 0; i < prices.length; i++) {
      const binIndex = Math.min(Math.floor((prices[i] - minPrice) / binSize), bins - 1);
      volumeBins[binIndex].volume += volumes[i];
    }

    // Find Point of Control (highest volume level)
    const pointOfControl = volumeBins.reduce((max, bin) => 
      bin.volume > max.volume ? bin : max
    ).price;

    // Calculate Value Area (70% of total volume)
    const totalVolume = volumeBins.reduce((sum, bin) => sum + bin.volume, 0);
    const valueAreaVolume = totalVolume * 0.7;
    
    // Sort bins by volume to find value area
    const sortedBins = [...volumeBins].sort((a, b) => b.volume - a.volume);
    let accumulatedVolume = 0;
    const valueAreaBins: typeof volumeBins = [];
    
    for (const bin of sortedBins) {
      if (accumulatedVolume < valueAreaVolume) {
        valueAreaBins.push(bin);
        accumulatedVolume += bin.volume;
      } else {
        break;
      }
    }

    const valueAreaPrices = valueAreaBins.map(bin => bin.price).sort((a, b) => a - b);
    const valueAreaHigh = valueAreaPrices[valueAreaPrices.length - 1] || maxPrice;
    const valueAreaLow = valueAreaPrices[0] || minPrice;

    return {
      levels: volumeBins.sort((a, b) => a.price - b.price),
      pointOfControl,
      valueAreaHigh,
      valueAreaLow
    };
  }

  // 📈 FIBONACCI RETRACEMENTS
  static calculateFibonacci(high: number, low: number): { level: number; price: number; label: string }[] {
    const range = high - low;
    const levels = [
      { level: 0, label: '0%' },
      { level: 0.236, label: '23.6%' },
      { level: 0.382, label: '38.2%' },
      { level: 0.5, label: '50%' },
      { level: 0.618, label: '61.8%' },
      { level: 0.786, label: '78.6%' },
      { level: 1, label: '100%' }
    ];

    return levels.map(level => ({
      level: level.level,
      price: high - (range * level.level),
      label: level.label
    }));
  }

  // 🎯 SUPPORT & RESISTANCE LEVELS
  static findSupportResistance(prices: number[], strength: number = 3): { supports: number[]; resistances: number[] } {
    if (prices.length < strength * 2 + 1) {
      return { supports: [], resistances: [] };
    }

    const supports: number[] = [];
    const resistances: number[] = [];

    for (let i = strength; i < prices.length - strength; i++) {
      const current = prices[i];
      let isSupport = true;
      let isResistance = true;

      // Check if it's a local minimum (support)
      for (let j = i - strength; j <= i + strength; j++) {
        if (j !== i && prices[j] <= current) {
          isSupport = false;
          break;
        }
      }

      // Check if it's a local maximum (resistance)
      for (let j = i - strength; j <= i + strength; j++) {
        if (j !== i && prices[j] >= current) {
          isResistance = false;
          break;
        }
      }

      if (isSupport) supports.push(current);
      if (isResistance) resistances.push(current);
    }

    // Remove duplicate levels (within 1% of each other)
    const cleanLevels = (levels: number[]) => {
      const cleaned: number[] = [];
      const sorted = levels.sort((a, b) => a - b);
      
      for (const level of sorted) {
        const isDuplicate = cleaned.some(existing => 
          Math.abs(level - existing) / existing < 0.01
        );
        if (!isDuplicate) {
          cleaned.push(level);
        }
      }
      return cleaned;
    };

    return {
      supports: cleanLevels(supports),
      resistances: cleanLevels(resistances)
    };
  }
}