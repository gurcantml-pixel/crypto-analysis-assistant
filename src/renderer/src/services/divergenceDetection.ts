/**
 * Divergence Detection Service
 * 
 * Detects price and indicator divergences for trading signals:
 * - Regular Bullish/Bearish Divergence
 * - Hidden Bullish/Bearish Divergence
 * - Multi-timeframe divergence scanning
 * 
 * @version 1.2.0
 * @author Kripto Analiz Asistanı
 */

export interface DivergencePoint {
  index: number;
  price: number;
  indicatorValue: number;
  time: Date;
}

export interface Divergence {
  type: 'bullish' | 'bearish' | 'hidden-bullish' | 'hidden-bearish';
  indicator: 'RSI' | 'MACD';
  timeframe: string;
  strength: number; // 0-100
  startPoint: DivergencePoint;
  endPoint: DivergencePoint;
  description: string;
  confidence: number; // 0-100
}

export class DivergenceDetector {
  private readonly MIN_DIVERGENCE_STRENGTH = 50;

  /**
   * Detect all types of divergences
   */
  public detectDivergences(
    prices: number[],
    indicator: number[],
    indicatorType: 'RSI' | 'MACD',
    timeframe: string = '1h'
  ): Divergence[] {
    const divergences: Divergence[] = [];

    // Find price pivots (local highs and lows)
    const priceHighs = this.findPivotHighs(prices);
    const priceLows = this.findPivotLows(prices);

    // Find indicator pivots
    const indicatorHighs = this.findPivotHighs(indicator);
    const indicatorLows = this.findPivotLows(indicator);

    // Detect Regular Bullish Divergence
    const regularBullish = this.detectRegularBullish(
      prices,
      indicator,
      priceLows,
      indicatorLows,
      indicatorType,
      timeframe
    );
    divergences.push(...regularBullish);

    // Detect Regular Bearish Divergence
    const regularBearish = this.detectRegularBearish(
      prices,
      indicator,
      priceHighs,
      indicatorHighs,
      indicatorType,
      timeframe
    );
    divergences.push(...regularBearish);

    // Detect Hidden Bullish Divergence
    const hiddenBullish = this.detectHiddenBullish(
      prices,
      indicator,
      priceLows,
      indicatorLows,
      indicatorType,
      timeframe
    );
    divergences.push(...hiddenBullish);

    // Detect Hidden Bearish Divergence
    const hiddenBearish = this.detectHiddenBearish(
      prices,
      indicator,
      priceHighs,
      indicatorHighs,
      indicatorType,
      timeframe
    );
    divergences.push(...hiddenBearish);

    // Sort by strength and filter weak signals
    return divergences
      .filter(d => d.strength >= this.MIN_DIVERGENCE_STRENGTH)
      .sort((a, b) => b.strength - a.strength);
  }

  /**
   * Regular Bullish Divergence:
   * Price makes lower low, indicator makes higher low
   */
  private detectRegularBullish(
    prices: number[],
    indicator: number[],
    priceLows: number[],
    indicatorLows: number[],
    indicatorType: 'RSI' | 'MACD',
    timeframe: string
  ): Divergence[] {
    const divergences: Divergence[] = [];

    for (let i = 1; i < priceLows.length; i++) {
      const idx1 = priceLows[i - 1];
      const idx2 = priceLows[i];

      // Check if indices are within indicator bounds
      if (idx1 >= indicatorLows.length || idx2 >= indicatorLows.length) continue;

      const price1 = prices[idx1];
      const price2 = prices[idx2];
      const ind1 = indicator[indicatorLows[i - 1]];
      const ind2 = indicator[indicatorLows[i]];

      // Price makes lower low, indicator makes higher low
      if (price2 < price1 && ind2 > ind1) {
        const strength = this.calculateDivergenceStrength(
          price1, price2, ind1, ind2, 'bullish'
        );

        divergences.push({
          type: 'bullish',
          indicator: indicatorType,
          timeframe,
          strength,
          startPoint: {
            index: idx1,
            price: price1,
            indicatorValue: ind1,
            time: new Date(Date.now() - (prices.length - idx1) * 3600000)
          },
          endPoint: {
            index: idx2,
            price: price2,
            indicatorValue: ind2,
            time: new Date(Date.now() - (prices.length - idx2) * 3600000)
          },
          description: `Regular Bullish Divergence: Price down ${((price2 - price1) / price1 * 100).toFixed(2)}%, ${indicatorType} up ${((ind2 - ind1) / ind1 * 100).toFixed(2)}%`,
          confidence: Math.min(strength + 10, 100)
        });
      }
    }

    return divergences;
  }

  /**
   * Regular Bearish Divergence:
   * Price makes higher high, indicator makes lower high
   */
  private detectRegularBearish(
    prices: number[],
    indicator: number[],
    priceHighs: number[],
    indicatorHighs: number[],
    indicatorType: 'RSI' | 'MACD',
    timeframe: string
  ): Divergence[] {
    const divergences: Divergence[] = [];

    for (let i = 1; i < priceHighs.length; i++) {
      const idx1 = priceHighs[i - 1];
      const idx2 = priceHighs[i];

      if (idx1 >= indicatorHighs.length || idx2 >= indicatorHighs.length) continue;

      const price1 = prices[idx1];
      const price2 = prices[idx2];
      const ind1 = indicator[indicatorHighs[i - 1]];
      const ind2 = indicator[indicatorHighs[i]];

      // Price makes higher high, indicator makes lower high
      if (price2 > price1 && ind2 < ind1) {
        const strength = this.calculateDivergenceStrength(
          price1, price2, ind1, ind2, 'bearish'
        );

        divergences.push({
          type: 'bearish',
          indicator: indicatorType,
          timeframe,
          strength,
          startPoint: {
            index: idx1,
            price: price1,
            indicatorValue: ind1,
            time: new Date(Date.now() - (prices.length - idx1) * 3600000)
          },
          endPoint: {
            index: idx2,
            price: price2,
            indicatorValue: ind2,
            time: new Date(Date.now() - (prices.length - idx2) * 3600000)
          },
          description: `Regular Bearish Divergence: Price up ${((price2 - price1) / price1 * 100).toFixed(2)}%, ${indicatorType} down ${((ind1 - ind2) / ind1 * 100).toFixed(2)}%`,
          confidence: Math.min(strength + 10, 100)
        });
      }
    }

    return divergences;
  }

  /**
   * Hidden Bullish Divergence:
   * Price makes higher low, indicator makes lower low
   * Indicates trend continuation (bullish)
   */
  private detectHiddenBullish(
    prices: number[],
    indicator: number[],
    priceLows: number[],
    indicatorLows: number[],
    indicatorType: 'RSI' | 'MACD',
    timeframe: string
  ): Divergence[] {
    const divergences: Divergence[] = [];

    for (let i = 1; i < priceLows.length; i++) {
      const idx1 = priceLows[i - 1];
      const idx2 = priceLows[i];

      if (idx1 >= indicatorLows.length || idx2 >= indicatorLows.length) continue;

      const price1 = prices[idx1];
      const price2 = prices[idx2];
      const ind1 = indicator[indicatorLows[i - 1]];
      const ind2 = indicator[indicatorLows[i]];

      // Price makes higher low, indicator makes lower low
      if (price2 > price1 && ind2 < ind1) {
        const strength = this.calculateDivergenceStrength(
          price1, price2, ind1, ind2, 'hidden-bullish'
        );

        divergences.push({
          type: 'hidden-bullish',
          indicator: indicatorType,
          timeframe,
          strength: strength * 0.8, // Hidden divergences slightly weaker
          startPoint: {
            index: idx1,
            price: price1,
            indicatorValue: ind1,
            time: new Date(Date.now() - (prices.length - idx1) * 3600000)
          },
          endPoint: {
            index: idx2,
            price: price2,
            indicatorValue: ind2,
            time: new Date(Date.now() - (prices.length - idx2) * 3600000)
          },
          description: `Hidden Bullish Divergence: Trend continuation signal`,
          confidence: Math.min(strength * 0.8 + 5, 100)
        });
      }
    }

    return divergences;
  }

  /**
   * Hidden Bearish Divergence:
   * Price makes lower high, indicator makes higher high
   * Indicates trend continuation (bearish)
   */
  private detectHiddenBearish(
    prices: number[],
    indicator: number[],
    priceHighs: number[],
    indicatorHighs: number[],
    indicatorType: 'RSI' | 'MACD',
    timeframe: string
  ): Divergence[] {
    const divergences: Divergence[] = [];

    for (let i = 1; i < priceHighs.length; i++) {
      const idx1 = priceHighs[i - 1];
      const idx2 = priceHighs[i];

      if (idx1 >= indicatorHighs.length || idx2 >= indicatorHighs.length) continue;

      const price1 = prices[idx1];
      const price2 = prices[idx2];
      const ind1 = indicator[indicatorHighs[i - 1]];
      const ind2 = indicator[indicatorHighs[i]];

      // Price makes lower high, indicator makes higher high
      if (price2 < price1 && ind2 > ind1) {
        const strength = this.calculateDivergenceStrength(
          price1, price2, ind1, ind2, 'hidden-bearish'
        );

        divergences.push({
          type: 'hidden-bearish',
          indicator: indicatorType,
          timeframe,
          strength: strength * 0.8,
          startPoint: {
            index: idx1,
            price: price1,
            indicatorValue: ind1,
            time: new Date(Date.now() - (prices.length - idx1) * 3600000)
          },
          endPoint: {
            index: idx2,
            price: price2,
            indicatorValue: ind2,
            time: new Date(Date.now() - (prices.length - idx2) * 3600000)
          },
          description: `Hidden Bearish Divergence: Trend continuation signal`,
          confidence: Math.min(strength * 0.8 + 5, 100)
        });
      }
    }

    return divergences;
  }

  /**
   * Calculate divergence strength (0-100)
   */
  private calculateDivergenceStrength(
    price1: number,
    price2: number,
    ind1: number,
    ind2: number,
    type: 'bullish' | 'bearish' | 'hidden-bullish' | 'hidden-bearish'
  ): number {
    const priceChange = Math.abs((price2 - price1) / price1);
    const indChange = Math.abs((ind2 - ind1) / ind1);

    // Divergence strength increases with larger divergence
    const divergenceRatio = Math.abs(priceChange - indChange);
    let strength = Math.min(divergenceRatio * 500, 100);

    // Boost strength for certain conditions
    if (type === 'bullish' || type === 'bearish') {
      strength *= 1.2; // Regular divergences stronger
    }

    return Math.min(Math.round(strength), 100);
  }

  /**
   * Find pivot highs (local maxima)
   */
  private findPivotHighs(data: number[], window: number = 5): number[] {
    const pivots: number[] = [];

    for (let i = window; i < data.length - window; i++) {
      let isHigh = true;

      // Check if current point is higher than surrounding points
      for (let j = i - window; j <= i + window; j++) {
        if (j !== i && data[j] >= data[i]) {
          isHigh = false;
          break;
        }
      }

      if (isHigh) {
        pivots.push(i);
      }
    }

    return pivots;
  }

  /**
   * Find pivot lows (local minima)
   */
  private findPivotLows(data: number[], window: number = 5): number[] {
    const pivots: number[] = [];

    for (let i = window; i < data.length - window; i++) {
      let isLow = true;

      // Check if current point is lower than surrounding points
      for (let j = i - window; j <= i + window; j++) {
        if (j !== i && data[j] <= data[i]) {
          isLow = false;
          break;
        }
      }

      if (isLow) {
        pivots.push(i);
      }
    }

    return pivots;
  }

  /**
   * Multi-timeframe divergence scan
   */
  public scanMultiTimeframe(
    symbol: string,
    timeframes: string[] = ['5m', '15m', '1h', '4h', '1d']
  ): Promise<Map<string, Divergence[]>> {
    // This would fetch data for each timeframe and detect divergences
    // Implementation depends on your data fetching setup
    console.log(`Scanning ${symbol} across timeframes:`, timeframes);
    
    return Promise.resolve(new Map());
  }
}

// Export singleton instance
export const divergenceDetector = new DivergenceDetector();
