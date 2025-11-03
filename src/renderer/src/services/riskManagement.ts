interface PositionRisk {
  symbol: string;
  size: number;
  stopLoss: number;
  takeProfit: number;
  riskAmount: number;
  riskPercent: number;
}

// Gelecekte kullanılmak üzere
// interface PortfolioRisk {
//   totalRisk: number;
//   maxDrawdown: number;
//   correlation: number;
//   diversification: number;
//   sharpeRatio: number;
// }

export class RiskManagement {
  private static readonly MAX_POSITION_RISK = 0.02; // %2 max risk per position
  // private static readonly MAX_PORTFOLIO_RISK = 0.06; // %6 max total risk - gelecekte kullanılacak

  // Kelly Criterion position sizing
  static calculateKellyPosition(
    winRate: number,
    avgWin: number,
    avgLoss: number,
    portfolioValue: number
  ): number {
    if (avgLoss <= 0) return 0;
    
    const winLossRatio = avgWin / avgLoss;
    const kellyPercent = (winRate * winLossRatio - (1 - winRate)) / winLossRatio;
    
    // Kelly'yi güvenlik için %25'i ile sınırla
    const safeKelly = Math.max(0, Math.min(kellyPercent * 0.25, this.MAX_POSITION_RISK));
    
    return portfolioValue * safeKelly;
  }

  // Optimal position size hesaplama
  static calculateOptimalPosition(
    price: number,
    stopLoss: number,
    portfolioValue: number,
    riskPercent: number = 0.02
  ): number {
    const riskAmount = portfolioValue * riskPercent;
    const priceRisk = Math.abs(price - stopLoss);
    
    if (priceRisk <= 0) return 0;
    
    return riskAmount / priceRisk;
  }

  // Risk/Reward oranı hesaplama
  static calculateRiskReward(
    entryPrice: number,
    stopLoss: number,
    takeProfit: number
  ): number {
    const risk = Math.abs(entryPrice - stopLoss);
    const reward = Math.abs(takeProfit - entryPrice);
    
    return risk > 0 ? reward / risk : 0;
  }

  // Portfolio heat hesaplama (tüm pozisyonların risk toplamı)
  static calculatePortfolioHeat(positions: PositionRisk[]): number {
    return positions.reduce((total, pos) => total + pos.riskPercent, 0);
  }

  // Maximum Drawdown hesaplama
  static calculateMaxDrawdown(portfolioValues: number[]): number {
    let maxDrawdown = 0;
    let peak = portfolioValues[0];
    
    for (const value of portfolioValues) {
      if (value > peak) {
        peak = value;
      }
      
      const drawdown = (peak - value) / peak;
      maxDrawdown = Math.max(maxDrawdown, drawdown);
    }
    
    return maxDrawdown;
  }

  // Sharpe Ratio hesaplama
  static calculateSharpeRatio(returns: number[], riskFreeRate: number = 0.02): number {
    if (returns.length < 2) return 0;
    
    const avgReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
    const variance = returns.reduce((acc, ret) => acc + Math.pow(ret - avgReturn, 2), 0) / returns.length;
    const stdDev = Math.sqrt(variance);
    
    return stdDev > 0 ? (avgReturn - riskFreeRate / 252) / stdDev : 0; // 252 trading days
  }

  // Position correlation hesaplama (basitleştirilmiş)
  static calculateCorrelation(returns1: number[], returns2: number[]): number {
    if (returns1.length !== returns2.length || returns1.length < 2) return 0;
    
    const n = returns1.length;
    const mean1 = returns1.reduce((a, b) => a + b, 0) / n;
    const mean2 = returns2.reduce((a, b) => a + b, 0) / n;
    
    let numerator = 0;
    let sumSq1 = 0;
    let sumSq2 = 0;
    
    for (let i = 0; i < n; i++) {
      const diff1 = returns1[i] - mean1;
      const diff2 = returns2[i] - mean2;
      numerator += diff1 * diff2;
      sumSq1 += diff1 * diff1;
      sumSq2 += diff2 * diff2;
    }
    
    const denominator = Math.sqrt(sumSq1 * sumSq2);
    return denominator > 0 ? numerator / denominator : 0;
  }

  // Risk uyarıları
  static getRiskWarnings(position: PositionRisk): string[] {
    const warnings: string[] = [];
    
    if (position.riskPercent > this.MAX_POSITION_RISK) {
      warnings.push(`Pozisyon riski çok yüksek: %${(position.riskPercent * 100).toFixed(1)}`);
    }
    
    const riskReward = this.calculateRiskReward(
      position.size, 
      position.stopLoss, 
      position.takeProfit
    );
    
    if (riskReward < 1.5) {
      warnings.push(`Risk/Ödül oranı düşük: ${riskReward.toFixed(2)}`);
    }
    
    return warnings;
  }
}