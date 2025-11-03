/**
 * 📊 Volume Analysis Service
 * 
 * Advanced volume analysis for crypto trading:
 * - Volume Profile (POC, VAH, VAL)
 * - Volume Spike Detection
 * - Buy/Sell Pressure Analysis
 * - Accumulation/Distribution Zones
 * 
 * @author Kripto Analiz Asistanı
 * @version 1.2.0
 */

export interface VolumeProfileLevel {
  price: number;
  volume: number;
  percentage: number; // % of total volume at this price
}

export interface VolumeProfile {
  poc: number; // Point of Control (highest volume price)
  vah: number; // Value Area High (top 70% volume)
  val: number; // Value Area Low (bottom 70% volume)
  levels: VolumeProfileLevel[];
  totalVolume: number;
}

export interface VolumeSpike {
  timestamp: Date;
  volume: number;
  avgVolume: number;
  multiplier: number; // How many times above average
  priceChange: number; // Price change % during spike
  type: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  strength: number; // 0-100
}

export interface BuySellPressure {
  cumulativeDelta: number; // Sum of (volume * direction)
  buyPressure: number; // 0-100
  sellPressure: number; // 0-100
  dominantSide: 'BUYERS' | 'SELLERS' | 'BALANCED';
  mfi: number; // Money Flow Index (0-100)
  signal: 'BUY' | 'SELL' | 'HOLD';
  confidence: number; // 0-100
}

export interface AccumulationZone {
  priceRange: { low: number; high: number };
  volume: number;
  duration: number; // Number of candles
  type: 'ACCUMULATION' | 'DISTRIBUTION';
  strength: number; // 0-100
  obv: number; // On-Balance Volume
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

/**
 * Calculate Volume Profile with POC, VAH, VAL
 */
export function calculateVolumeProfile(
  prices: number[],
  volumes: number[],
  priceResolution: number = 100 // Number of price levels
): VolumeProfile {
  if (prices.length === 0 || volumes.length === 0) {
    throw new Error('Empty price or volume data');
  }

  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const priceRange = maxPrice - minPrice;
  const binSize = priceRange / priceResolution;

  // Create volume profile bins
  const bins: { [key: string]: number } = {};
  
  for (let i = 0; i < prices.length; i++) {
    const binIndex = Math.floor((prices[i] - minPrice) / binSize);
    const binKey = (minPrice + binIndex * binSize).toFixed(4);
    bins[binKey] = (bins[binKey] || 0) + volumes[i];
  }

  // Convert to VolumeProfileLevel array
  const levels: VolumeProfileLevel[] = Object.entries(bins).map(([price, volume]) => ({
    price: parseFloat(price),
    volume,
    percentage: 0 // Will calculate later
  })).sort((a, b) => b.volume - a.volume);

  const totalVolume = levels.reduce((sum, level) => sum + level.volume, 0);

  // Calculate percentages
  levels.forEach(level => {
    level.percentage = (level.volume / totalVolume) * 100;
  });

  // Find POC (highest volume)
  const poc = levels[0].price;

  // Calculate VAH and VAL (70% value area)
  const sortedByPrice = [...levels].sort((a, b) => a.price - b.price);
  let cumulativeVolume = 0;
  const targetVolume = totalVolume * 0.7;
  
  // Find value area around POC
  const pocIndex = sortedByPrice.findIndex(l => l.price === poc);
  let lowerIndex = pocIndex;
  let upperIndex = pocIndex;
  
  while (cumulativeVolume < targetVolume && (lowerIndex > 0 || upperIndex < sortedByPrice.length - 1)) {
    const lowerVolume = lowerIndex > 0 ? sortedByPrice[lowerIndex - 1].volume : 0;
    const upperVolume = upperIndex < sortedByPrice.length - 1 ? sortedByPrice[upperIndex + 1].volume : 0;
    
    if (lowerVolume >= upperVolume && lowerIndex > 0) {
      lowerIndex--;
      cumulativeVolume += lowerVolume;
    } else if (upperIndex < sortedByPrice.length - 1) {
      upperIndex++;
      cumulativeVolume += upperVolume;
    } else {
      break;
    }
  }
  
  const val = sortedByPrice[lowerIndex].price;
  const vah = sortedByPrice[upperIndex].price;

  return {
    poc,
    vah,
    val,
    levels: levels.slice(0, 50), // Top 50 levels for performance
    totalVolume
  };
}

/**
 * Detect volume spikes (2x+ average)
 */
export function detectVolumeSpikes(
  volumes: number[],
  prices: number[],
  timestamps: Date[],
  lookbackPeriod: number = 20
): VolumeSpike[] {
  const spikes: VolumeSpike[] = [];
  
  for (let i = lookbackPeriod; i < volumes.length; i++) {
    const recentVolumes = volumes.slice(i - lookbackPeriod, i);
    const avgVolume = recentVolumes.reduce((sum, v) => sum + v, 0) / lookbackPeriod;
    const currentVolume = volumes[i];
    
    if (currentVolume > avgVolume * 2) {
      const priceChange = ((prices[i] - prices[i - 1]) / prices[i - 1]) * 100;
      const multiplier = currentVolume / avgVolume;
      
      let type: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
      if (priceChange > 1) type = 'BULLISH';
      else if (priceChange < -1) type = 'BEARISH';
      else type = 'NEUTRAL';
      
      const strength = Math.min(multiplier * 20, 100);
      
      spikes.push({
        timestamp: timestamps[i],
        volume: currentVolume,
        avgVolume,
        multiplier,
        priceChange,
        type,
        strength
      });
    }
  }
  
  return spikes.slice(-10); // Last 10 spikes
}

/**
 * Calculate Buy/Sell Pressure with Cumulative Delta and MFI
 */
export function calculateBuySellPressure(
  prices: number[],
  volumes: number[],
  highs: number[],
  lows: number[]
): BuySellPressure {
  let cumulativeDelta = 0;
  let buyVolume = 0;
  let sellVolume = 0;
  
  // Cumulative Delta: estimate buy/sell volume from price action
  for (let i = 1; i < prices.length; i++) {
    const priceChange = prices[i] - prices[i - 1];
    const volume = volumes[i];
    
    if (priceChange > 0) {
      buyVolume += volume;
      cumulativeDelta += volume;
    } else if (priceChange < 0) {
      sellVolume += volume;
      cumulativeDelta -= volume;
    } else {
      // Neutral candle, split volume
      buyVolume += volume * 0.5;
      sellVolume += volume * 0.5;
    }
  }
  
  const totalVolume = buyVolume + sellVolume;
  const buyPressure = (buyVolume / totalVolume) * 100;
  const sellPressure = (sellVolume / totalVolume) * 100;
  
  let dominantSide: 'BUYERS' | 'SELLERS' | 'BALANCED';
  if (buyPressure > 55) dominantSide = 'BUYERS';
  else if (sellPressure > 55) dominantSide = 'SELLERS';
  else dominantSide = 'BALANCED';
  
  // Money Flow Index (MFI)
  const mfi = calculateMFI(prices, volumes, highs, lows);
  
  // Generate signal
  let signal: 'BUY' | 'SELL' | 'HOLD';
  let confidence = 0;
  
  if (buyPressure > 60 && mfi > 50) {
    signal = 'BUY';
    confidence = Math.min(buyPressure + (mfi - 50), 100);
  } else if (sellPressure > 60 && mfi < 50) {
    signal = 'SELL';
    confidence = Math.min(sellPressure + (50 - mfi), 100);
  } else {
    signal = 'HOLD';
    confidence = 50;
  }
  
  return {
    cumulativeDelta,
    buyPressure,
    sellPressure,
    dominantSide,
    mfi,
    signal,
    confidence
  };
}

/**
 * Money Flow Index calculation
 */
function calculateMFI(
  prices: number[],
  volumes: number[],
  highs: number[],
  lows: number[],
  period: number = 14
): number {
  if (prices.length < period + 1) return 50;
  
  const typicalPrices = prices.map((p, i) => (highs[i] + lows[i] + p) / 3);
  const moneyFlows = typicalPrices.map((tp, i) => tp * volumes[i]);
  
  let positiveFlow = 0;
  let negativeFlow = 0;
  
  for (let i = prices.length - period; i < prices.length; i++) {
    if (typicalPrices[i] > typicalPrices[i - 1]) {
      positiveFlow += moneyFlows[i];
    } else {
      negativeFlow += moneyFlows[i];
    }
  }
  
  if (negativeFlow === 0) return 100;
  
  const moneyRatio = positiveFlow / negativeFlow;
  const mfi = 100 - (100 / (1 + moneyRatio));
  
  return mfi;
}

/**
 * Detect Accumulation/Distribution Zones
 */
export function detectAccumulationZones(
  prices: number[],
  volumes: number[],
  highs: number[],
  lows: number[],
  minZoneDuration: number = 5
): AccumulationZone[] {
  const zones: AccumulationZone[] = [];
  
  // Calculate OBV
  const obv: number[] = [volumes[0]];
  for (let i = 1; i < prices.length; i++) {
    if (prices[i] > prices[i - 1]) {
      obv.push(obv[i - 1] + volumes[i]);
    } else if (prices[i] < prices[i - 1]) {
      obv.push(obv[i - 1] - volumes[i]);
    } else {
      obv.push(obv[i - 1]);
    }
  }
  
  // Detect consolidation zones with volume
  for (let i = minZoneDuration; i < prices.length; i++) {
    const recentPrices = prices.slice(i - minZoneDuration, i);
    const priceRange = Math.max(...recentPrices) - Math.min(...recentPrices);
    const avgPrice = recentPrices.reduce((sum, p) => sum + p, 0) / minZoneDuration;
    const rangePercent = (priceRange / avgPrice) * 100;
    
    // Tight range = potential accumulation/distribution
    if (rangePercent < 3) {
      const zoneVolume = volumes.slice(i - minZoneDuration, i).reduce((sum, v) => sum + v, 0);
      const avgVolume = zoneVolume / minZoneDuration;
      const recentOBV = obv.slice(i - minZoneDuration, i);
      const obvChange = recentOBV[recentOBV.length - 1] - recentOBV[0];
      
      let type: 'ACCUMULATION' | 'DISTRIBUTION';
      let signal: 'BUY' | 'SELL' | 'HOLD';
      
      if (obvChange > 0) {
        type = 'ACCUMULATION';
        signal = 'BUY';
      } else {
        type = 'DISTRIBUTION';
        signal = 'SELL';
      }
      
      const strength = Math.min((avgVolume / 1000000) * 10, 100);
      
      zones.push({
        priceRange: {
          low: Math.min(...recentPrices),
          high: Math.max(...recentPrices)
        },
        volume: zoneVolume,
        duration: minZoneDuration,
        type,
        strength,
        obv: obv[i],
        signal
      });
      
      i += minZoneDuration; // Skip ahead to avoid overlapping zones
    }
  }
  
  return zones.slice(-5); // Last 5 zones
}

/**
 * Complete Volume Analysis
 */
export function analyzeVolume(
  prices: number[],
  volumes: number[],
  highs: number[],
  lows: number[],
  timestamps: Date[]
): VolumeAnalysisResult {
  const profile = calculateVolumeProfile(prices, volumes);
  const spikes = detectVolumeSpikes(volumes, prices, timestamps);
  const pressure = calculateBuySellPressure(prices, volumes, highs, lows);
  const zones = detectAccumulationZones(prices, volumes, highs, lows);
  
  // Generate overall recommendation
  const reasons: string[] = [];
  let signalScore = 0;
  
  // Check pressure
  if (pressure.signal === 'BUY') {
    signalScore += pressure.confidence * 0.3;
    reasons.push(`Güçlü alım baskısı (%${pressure.buyPressure.toFixed(1)})`);
  } else if (pressure.signal === 'SELL') {
    signalScore -= pressure.confidence * 0.3;
    reasons.push(`Güçlü satım baskısı (%${pressure.sellPressure.toFixed(1)})`);
  }
  
  // Check recent spikes
  const recentBullishSpikes = spikes.filter(s => s.type === 'BULLISH').length;
  const recentBearishSpikes = spikes.filter(s => s.type === 'BEARISH').length;
  
  if (recentBullishSpikes > recentBearishSpikes) {
    signalScore += 20;
    reasons.push(`${recentBullishSpikes} yükseliş hacim patlaması`);
  } else if (recentBearishSpikes > recentBullishSpikes) {
    signalScore -= 20;
    reasons.push(`${recentBearishSpikes} düşüş hacim patlaması`);
  }
  
  // Check accumulation zones
  const accumulationZones = zones.filter(z => z.type === 'ACCUMULATION');
  const distributionZones = zones.filter(z => z.type === 'DISTRIBUTION');
  
  if (accumulationZones.length > distributionZones.length) {
    signalScore += 15;
    reasons.push(`${accumulationZones.length} biriktirme bölgesi tespit edildi`);
  } else if (distributionZones.length > accumulationZones.length) {
    signalScore -= 15;
    reasons.push(`${distributionZones.length} dağıtım bölgesi tespit edildi`);
  }
  
  // Check POC position
  const currentPrice = prices[prices.length - 1];
  if (currentPrice < profile.poc) {
    signalScore += 10;
    reasons.push('Fiyat POC seviyesinin altında (destek potansiyeli)');
  } else if (currentPrice > profile.poc) {
    signalScore -= 10;
    reasons.push('Fiyat POC seviyesinin üstünde (direnç potansiyeli)');
  }
  
  let signal: 'BUY' | 'SELL' | 'HOLD';
  const confidence = Math.min(Math.abs(signalScore), 100);
  
  if (signalScore > 30) {
    signal = 'BUY';
  } else if (signalScore < -30) {
    signal = 'SELL';
  } else {
    signal = 'HOLD';
    reasons.push('Karışık sinyaller, bekleme önerilir');
  }
  
  return {
    profile,
    spikes,
    pressure,
    zones,
    recommendation: {
      signal,
      confidence,
      reasons
    }
  };
}

export default {
  calculateVolumeProfile,
  detectVolumeSpikes,
  calculateBuySellPressure,
  detectAccumulationZones,
  analyzeVolume
};
