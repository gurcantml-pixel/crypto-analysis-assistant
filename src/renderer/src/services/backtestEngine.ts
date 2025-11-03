interface BacktestResult {
  totalReturn: number;
  sharpeRatio: number;
  maxDrawdown: number;
  winRate: number;
  totalTrades: number;
  profitFactor: number;
  avgWin: number;
  avgLoss: number;
  tradingDays: number;
  annualizedReturn: number;
}

interface Trade {
  symbol: string;
  entryDate: Date;
  exitDate: Date;
  entryPrice: number;
  exitPrice: number;
  quantity: number;
  type: 'BUY' | 'SELL';
  pnl: number;
  pnlPercent: number;
  reason: string;
}

interface TradingStrategy {
  name: string;
  rules: {
    entry: (indicators: any) => boolean;
    exit: (indicators: any, position: any) => boolean;
    positionSize: (price: number, risk: number) => number;
  };
}

export class BacktestEngine {
  private trades: Trade[] = [];
  private portfolio: { value: number; cash: number; positions: any[] } = {
    value: 10000,
    cash: 10000,
    positions: []
  };

  // Ana backtest çalıştırma fonksiyonu
  async runBacktest(
    strategy: TradingStrategy,
    symbol: string,
    startDate: Date,
    endDate: Date,
    initialCapital: number = 10000
  ): Promise<BacktestResult> {
    console.log(`🔄 Running backtest for ${strategy.name} on ${symbol}`);
    
    this.resetPortfolio(initialCapital);
    const historicalData = await this.getHistoricalData(symbol, startDate, endDate);
    
    for (let i = 50; i < historicalData.length; i++) { // 50 günlük warm-up
      const currentData = historicalData.slice(0, i + 1);
      const indicators = this.calculateIndicators(currentData);
      const currentPrice = historicalData[i].close;
      const currentDate = new Date(historicalData[i].timestamp);
      
      // Pozisyon varsa çıkış kontrolü
      const activePosition = this.getActivePosition(symbol);
      if (activePosition && strategy.rules.exit(indicators, activePosition)) {
        this.closePosition(activePosition, currentPrice, currentDate, 'Strategy Exit');
      }
      
      // Yeni pozisyon giriş kontrolü
      if (!activePosition && strategy.rules.entry(indicators)) {
        const positionSize = strategy.rules.positionSize(currentPrice, 0.02); // %2 risk
        this.openPosition(symbol, currentPrice, positionSize, currentDate, 'Strategy Entry');
      }
      
      // Portfolio değerini güncelle
      this.updatePortfolioValue(currentPrice);
    }
    
    // Açık pozisyonları kapat
    this.closeAllPositions(historicalData[historicalData.length - 1].close, endDate);
    
    return this.calculateResults();
  }

  // Tarihsel veri simülasyonu (gerçek uygulamada API'den gelecek)
  private async getHistoricalData(_symbol: string, startDate: Date, endDate: Date): Promise<any[]> {
    // Mock data - gerçek uygulamada Binance API kullanılacak
    const data = [];
    const days = Math.floor((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    let price = 50000; // BTC starting price
    
    for (let i = 0; i < days; i++) {
      const timestamp = new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000);
      price += (Math.random() - 0.5) * price * 0.05; // ±2.5% günlük değişim
      
      data.push({
        timestamp: timestamp.getTime(),
        open: price * (0.99 + Math.random() * 0.02),
        high: price * (1.00 + Math.random() * 0.03),
        low: price * (0.97 + Math.random() * 0.02),
        close: price,
        volume: 1000 + Math.random() * 5000
      });
    }
    
    return data;
  }

  // Teknik indikatör hesaplama
  private calculateIndicators(data: any[]): any {
    const prices = data.map(d => d.close);
    const rsi = this.calculateRSI(prices);
    const ma20 = this.calculateSMA(prices, 20);
    const ma50 = this.calculateSMA(prices, 50);
    
    return {
      rsi,
      ma20,
      ma50,
      price: prices[prices.length - 1],
      volume: data[data.length - 1].volume
    };
  }

  // RSI hesaplama
  private calculateRSI(prices: number[], period: number = 14): number {
    if (prices.length < period + 1) return 50;
    
    const gains = [];
    const losses = [];
    
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

  // Basit hareketli ortalama
  private calculateSMA(prices: number[], period: number): number {
    if (prices.length < period) return prices[prices.length - 1];
    return prices.slice(-period).reduce((a, b) => a + b, 0) / period;
  }

  // Portfolio yönetimi
  private resetPortfolio(capital: number): void {
    this.portfolio = { value: capital, cash: capital, positions: [] };
    this.trades = [];
  }

  private openPosition(symbol: string, price: number, size: number, date: Date, reason: string): void {
    const cost = price * size;
    if (cost > this.portfolio.cash) return; // Yetersiz bakiye
    
    this.portfolio.cash -= cost;
    this.portfolio.positions.push({ symbol, price, size, date });
    
    console.log(`📈 BUY ${size.toFixed(4)} ${symbol} at $${price.toFixed(2)} - ${reason}`);
  }

  private closePosition(position: any, price: number, date: Date, reason: string): void {
    const revenue = position.size * price;
    this.portfolio.cash += revenue;
    
    const pnl = revenue - (position.price * position.size);
    const pnlPercent = (pnl / (position.price * position.size)) * 100;
    
    this.trades.push({
      symbol: position.symbol,
      entryDate: position.date,
      exitDate: date,
      entryPrice: position.price,
      exitPrice: price,
      quantity: position.size,
      type: 'BUY',
      pnl,
      pnlPercent,
      reason
    });
    
    // Pozisyonu portfolyodan çıkar
    this.portfolio.positions = this.portfolio.positions.filter(p => p !== position);
    
    console.log(`📉 SELL ${position.size.toFixed(4)} ${position.symbol} at $${price.toFixed(2)} - PnL: ${pnl > 0 ? '+' : ''}$${pnl.toFixed(2)} (${pnlPercent.toFixed(2)}%) - ${reason}`);
  }

  private getActivePosition(symbol: string): any {
    return this.portfolio.positions.find(p => p.symbol === symbol);
  }

  private updatePortfolioValue(currentPrice: number): void {
    const positionValue = this.portfolio.positions.reduce((total, pos) => 
      total + (pos.size * currentPrice), 0);
    this.portfolio.value = this.portfolio.cash + positionValue;
  }

  private closeAllPositions(price: number, date: Date): void {
    this.portfolio.positions.forEach(position => {
      this.closePosition(position, price, date, 'Backtest End');
    });
  }

  // Sonuçları hesapla
  private calculateResults(): BacktestResult {
    const wins = this.trades.filter(t => t.pnl > 0);
    const losses = this.trades.filter(t => t.pnl < 0);
    
    const totalReturn = ((this.portfolio.value - 10000) / 10000) * 100;
    const winRate = (wins.length / this.trades.length) * 100;
    const avgWin = wins.length > 0 ? wins.reduce((sum, t) => sum + t.pnl, 0) / wins.length : 0;
    const avgLoss = losses.length > 0 ? Math.abs(losses.reduce((sum, t) => sum + t.pnl, 0) / losses.length) : 0;
    const profitFactor = avgLoss > 0 ? (avgWin * wins.length) / (avgLoss * losses.length) : 0;
    
    // Drawdown hesaplama (basitleştirilmiş)
    let maxDrawdown = 0;
    let peak = 10000;
    this.trades.forEach(trade => {
      const portfolioValue = 10000 + this.trades.slice(0, this.trades.indexOf(trade) + 1)
        .reduce((sum, t) => sum + t.pnl, 0);
      
      if (portfolioValue > peak) peak = portfolioValue;
      const drawdown = (peak - portfolioValue) / peak * 100;
      if (drawdown > maxDrawdown) maxDrawdown = drawdown;
    });
    
    // Sharpe Ratio (basitleştirilmiş)
    const returns = this.trades.map(t => t.pnlPercent);
    const avgReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length;
    const stdDev = Math.sqrt(returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length);
    const sharpeRatio = stdDev > 0 ? avgReturn / stdDev : 0;
    
    return {
      totalReturn,
      sharpeRatio,
      maxDrawdown,
      winRate,
      totalTrades: this.trades.length,
      profitFactor,
      avgWin,
      avgLoss,
      tradingDays: 252, // Mock
      annualizedReturn: totalReturn * (252 / this.trades.length) // Basitleştirilmiş
    };
  }

  // Raporlama
  generateReport(result: BacktestResult): string {
    return `
🚀 BACKTEST RAPORU 🚀
═══════════════════════════════════════

📊 GENEL PERFORMANS:
• Toplam Getiri: ${result.totalReturn.toFixed(2)}%
• Yıllık Getiri: ${result.annualizedReturn.toFixed(2)}%
• Sharpe Ratio: ${result.sharpeRatio.toFixed(2)}
• Max Drawdown: ${result.maxDrawdown.toFixed(2)}%

📈 İŞLEM STATİSTİKLERİ:
• Toplam İşlem: ${result.totalTrades}
• Kazanan İşlem: ${((result.winRate / 100) * result.totalTrades).toFixed(0)}
• Başarı Oranı: ${result.winRate.toFixed(2)}%
• Profit Factor: ${result.profitFactor.toFixed(2)}

💰 KAZANÇ/KAYIP:
• Ortalama Kazanç: $${result.avgWin.toFixed(2)}
• Ortalama Kayıp: $${result.avgLoss.toFixed(2)}
• Risk/Ödül Oranı: 1:${(result.avgWin / result.avgLoss).toFixed(2)}

═══════════════════════════════════════
    `;
  }
}