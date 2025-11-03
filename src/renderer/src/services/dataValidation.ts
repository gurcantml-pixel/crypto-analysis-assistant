interface ValidatedData {
  value: number;
  confidence: number;
  validated: boolean;
  sources: string[];
  timestamp: number;
}

// Gelecekte kullanılmak üzere hazırlanmış interface
// interface PriceComparison {
//   symbol: string;
//   binancePrice: number;
//   okxPrice: number;
//   deviation: number;
//   isValid: boolean;
// }

export class DataValidation {
  private static readonly MAX_DEVIATION = 0.005; // %0.5 max sapma
  private static readonly HIGH_CONFIDENCE_THRESHOLD = 0.001; // %0.1 yüksek güven

  // Çoklu kaynak fiyat doğrulaması
  static async validatePrice(_symbol: string, binancePrice: number, okxPrice?: number): Promise<ValidatedData> {
    const timestamp = Date.now();
    const sources = ['binance'];
    
    if (!okxPrice) {
      return {
        value: binancePrice,
        confidence: 70, // Tek kaynak düşük güven
        validated: false,
        sources,
        timestamp
      };
    }

    sources.push('okx');
    const avgPrice = (binancePrice + okxPrice) / 2;
    const deviation = Math.abs(binancePrice - okxPrice) / binancePrice;
    
    const isValid = deviation < this.MAX_DEVIATION;
    const confidence = this.calculateConfidence(deviation);

    return {
      value: isValid ? avgPrice : binancePrice,
      confidence,
      validated: isValid,
      sources,
      timestamp
    };
  }

  // Güven skoru hesaplama
  private static calculateConfidence(deviation: number): number {
    if (deviation < this.HIGH_CONFIDENCE_THRESHOLD) return 95;
    if (deviation < this.MAX_DEVIATION) return 85 - (deviation * 10000); // Linear decrease
    return 50; // Düşük güven
  }

  // Teknik indikatör tutarlılık kontrolü
  static validateIndicators(rsi: number, macd: number, price: number, ma50: number): boolean {
    // RSI aşırı değerlerde MACD ile uyumlu mu?
    if (rsi > 70 && macd > 0) return false; // Çelişkili sinyal
    if (rsi < 30 && macd < 0) return false; // Çelişkili sinyal
    
    // Fiyat MA50'nin üzerindeyken RSI çok düşük olmamalı
    if (price > ma50 && rsi < 25) return false;
    if (price < ma50 && rsi > 75) return false;
    
    return true;
  }

  // Volume doğrulama
  static validateVolume(current: number, average: number): boolean {
    const ratio = current / average;
    return ratio > 0.1 && ratio < 50; // Anormal volume filtreleme
  }

  // Zaman damgası doğrulama
  static isDataFresh(timestamp: number, maxAgeMinutes: number = 5): boolean {
    const age = (Date.now() - timestamp) / (1000 * 60);
    return age <= maxAgeMinutes;
  }
}