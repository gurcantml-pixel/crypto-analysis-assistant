/**
 * 📊 TradingView API Service
 * En güvenilir finansal veri kaynağı - Professional Grade
 * Real-time price, volume, market cap ve technical indicators
 */

export interface TradingViewSymbol {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  marketCap: number;
  high24h?: number;
  low24h?: number;
}

export interface TradingViewQuote {
  name: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  marketCap: number;
  timestamp: number;
}

class TradingViewService {
  private readonly baseUrl = 'https://scanner.tradingview.com';
  
  /**
   * 🔥 Gerçek Zamanlı Kripto Fiyatları (En Güncel)
   */
  async getCryptoPrices(symbols: string[]): Promise<TradingViewQuote[]> {
    try {
      console.log('📊 TradingView: Fetching real-time crypto prices...');
      
      // TradingView format: BINANCE:BTCUSDT
      const tradingViewSymbols = symbols.map(symbol => 
        symbol.includes(':') ? symbol : `BINANCE:${symbol}`
      );
      
      const payload = {
        filter: [
          { left: "name", operation: "in_range", right: tradingViewSymbols }
        ],
        columns: [
          "name",           // Symbol
          "close",          // Current Price  
          "change",         // 24h Change (%)
          "change_abs",     // 24h Change (absolute)
          "volume",         // 24h Volume
          "market_cap_basic", // Market Cap
          "high",           // 24h High
          "low",            // 24h Low
          "bid",            // Bid Price
          "ask"             // Ask Price
        ],
        sort: { sortBy: "volume", sortOrder: "desc" },
        range: [0, tradingViewSymbols.length]
      };
      
      const response = await (window as any).electronAPI.apiRequest(`${this.baseUrl}/crypto/scan`, {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      
      if (!response.ok) {
        throw new Error(`TradingView proxy error: ${response.status}`);
      }
      
      const tvData = response.data?.data || [];
      
      if (!Array.isArray(tvData)) {
        throw new Error('Invalid TradingView proxy response format');
      }
      
      console.log(`✅ TradingView Proxy: ${tvData.length} symbols fetched successfully`);
      
      // Normalize data format
      return tvData.map((item: any[]) => ({
        name: item[0]?.replace('BINANCE:', '') || '',
        price: item[1] || 0,
        changePercent: item[2] || 0,
        change: item[3] || 0,
        volume: item[4] || 0,
        marketCap: item[5] || 0,
        high24h: item[6] || 0,
        low24h: item[7] || 0,
        timestamp: Date.now()
      }));
      
    } catch (error) {
      console.error('❌ TradingView API Error:', error);
      throw error;
    }
  }
  
  /**
   * 🎯 Trending Coins (Hacim Bazında Sıralı)
   */
  async getTrendingCoins(limit: number = 20): Promise<TradingViewQuote[]> {
    try {
      console.log('🔥 TradingView: Fetching trending cryptocurrencies...');
      
      const payload = {
        filter: [
          { left: "type", operation: "equal", right: "crypto" },
          { left: "subtype", operation: "equal", right: "spot" },
          { left: "exchange", operation: "equal", right: "BINANCE" }
        ],
        columns: [
          "name",
          "close", 
          "change",
          "change_abs",
          "volume",
          "market_cap_basic",
          "relative_volume_10d_calc"
        ],
        sort: { sortBy: "volume", sortOrder: "desc" },
        range: [0, limit]
      };
      
      const response = await (window as any).electronAPI.apiRequest(`${this.baseUrl}/crypto/scan`, {
        method: 'POST',
        body: JSON.stringify(payload)  
      });
      
      if (!response.ok) {
        throw new Error(`TradingView trending proxy error: ${response.status}`);
      }
      
      const tvData = response.data?.data || [];
      
      console.log(`✅ TradingView Proxy: ${tvData.length} trending coins fetched`);
      
      return tvData.map((item: any[]) => ({
        name: item[0]?.replace('BINANCE:', '') || '',
        price: item[1] || 0,
        changePercent: item[2] || 0, 
        change: item[3] || 0,
        volume: item[4] || 0,
        marketCap: item[5] || 0,
        timestamp: Date.now()
      }));
      
    } catch (error) {
      console.error('❌ TradingView Trending Error:', error);
      return [];
    }
  }
  
  /**
   * 📈 Market Overview (Global Stats)
   */
  async getMarketOverview(): Promise<{
    totalMarketCap: number;
    totalVolume24h: number;
    btcDominance: number;
    activeCoins: number;
  }> {
    try {
      console.log('🌍 TradingView: Fetching market overview...');
      
      // Market cap leaders için scan
      const payload = {
        filter: [
          { left: "type", operation: "equal", right: "crypto" },
          { left: "subtype", operation: "equal", right: "spot" }
        ],
        columns: [
          "market_cap_basic",
          "volume"
        ],
        sort: { sortBy: "market_cap_basic", sortOrder: "desc" },
        range: [0, 100] // Top 100 for calculation
      };
      
      const response = await (window as any).electronAPI.apiRequest(`${this.baseUrl}/crypto/scan`, {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      
      if (!response.ok) {
        throw new Error(`Market overview proxy error: ${response.status}`);
      }
      
      const tvData = response.data?.data || [];
      
      // Calculate totals
      const totalMarketCap = tvData
        .reduce((sum: number, item: any[]) => sum + (item[0] || 0), 0);
        
      const totalVolume24h = tvData
        .reduce((sum: number, item: any[]) => sum + (item[1] || 0), 0);
      
      // BTC dominance (approximate)
      const btcMarketCap = tvData?.[0]?.[0] || 0;
      const btcDominance = totalMarketCap > 0 ? (btcMarketCap / totalMarketCap) * 100 : 0;
      
      console.log('✅ TradingView Proxy: Market overview calculated');
      
      return {
        totalMarketCap,
        totalVolume24h,
        btcDominance,
        activeCoins: tvData.length
      };
      
    } catch (error) {
      console.error('❌ TradingView Market Overview Error:', error);
      return {
        totalMarketCap: 0,
        totalVolume24h: 0,
        btcDominance: 0,
        activeCoins: 0
      };
    }
  }
}

export const tradingViewService = new TradingViewService();
export default tradingViewService;