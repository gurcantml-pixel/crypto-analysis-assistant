import axios from 'axios';
import { CoinData } from '../types';

const BINANCE_API_BASE = 'https://api.binance.com/api/v3';

export class BinanceAPI {
  private static instance: BinanceAPI;

  public static getInstance(): BinanceAPI {
    if (!BinanceAPI.instance) {
      BinanceAPI.instance = new BinanceAPI();
    }
    return BinanceAPI.instance;
  }

  async getTicker24hr(symbol?: string): Promise<any[]> {
    try {
      const url = symbol 
        ? `${BINANCE_API_BASE}/ticker/24hr?symbol=${symbol}`
        : `${BINANCE_API_BASE}/ticker/24hr`;
      
      const response = await axios.get(url);
      return Array.isArray(response.data) ? response.data : [response.data];
    } catch (error) {
      console.error('Binance API Error:', error);
      throw error;
    }
  }

  async getTopCoins(limit: number = 10): Promise<CoinData[]> {
    try {
      const tickers = await this.getTicker24hr();
      
      // USDT çiftlerini filtrele ve hacme göre sırala
      const usdtPairs = tickers
        .filter(ticker => ticker.symbol.endsWith('USDT'))
        .map(ticker => {
          const coinSymbol = ticker.symbol.replace('USDT', '');
          return {
            symbol: ticker.symbol,
            name: coinSymbol,
            price: parseFloat(ticker.lastPrice),
            change24h: parseFloat(ticker.priceChangePercent),
            volume24h: this.formatVolume(parseFloat(ticker.volume) * parseFloat(ticker.lastPrice)),
            high24h: parseFloat(ticker.highPrice),
            low24h: parseFloat(ticker.lowPrice),
            logoUrl: this.getCoinLogo(coinSymbol),
          };
        })
        .sort((a, b) => parseFloat(b.volume24h.replace(/[^0-9.]/g, '')) - parseFloat(a.volume24h.replace(/[^0-9.]/g, '')))
        .slice(0, limit);

      return usdtPairs;
    } catch (error) {
      console.error('Error fetching top coins:', error);
      return this.getFallbackData();
    }
  }

  async getCoinPrice(symbol: string): Promise<number> {
    try {
      const response = await axios.get(`${BINANCE_API_BASE}/ticker/price?symbol=${symbol}`);
      return parseFloat(response.data.price);
    } catch (error) {
      console.error(`Error fetching price for ${symbol}:`, error);
      return 0;
    }
  }

  async getKlines(symbol: string, interval: string = '1d', limit: number = 100): Promise<any[]> {
    try {
      const response = await axios.get(
        `${BINANCE_API_BASE}/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`
      );
      return response.data;
    } catch (error) {
      console.error(`Error fetching klines for ${symbol}:`, error);
      return [];
    }
  }

  private formatVolume(volume: number): string {
    if (volume >= 1e9) {
      return `${(volume / 1e9).toFixed(1)}B`;
    } else if (volume >= 1e6) {
      return `${(volume / 1e6).toFixed(1)}M`;
    } else if (volume >= 1e3) {
      return `${(volume / 1e3).toFixed(1)}K`;
    }
    return volume.toFixed(2);
  }

  private getCoinLogo(symbol: string): string {
    const symbolUpper = symbol.toUpperCase();
    const logoMap: { [key: string]: string } = {
      'BTC': 'https://assets.coingecko.com/coins/images/1/small/bitcoin.png',
      'ETH': 'https://assets.coingecko.com/coins/images/279/small/ethereum.png',
      'BNB': 'https://assets.coingecko.com/coins/images/825/small/bnb-icon2_2x.png',
      'XRP': 'https://assets.coingecko.com/coins/images/44/small/xrp-symbol-white-128.png',
      'ADA': 'https://assets.coingecko.com/coins/images/975/small/cardano.png',
      'SOL': 'https://assets.coingecko.com/coins/images/4128/small/solana.png',
      'DOGE': 'https://assets.coingecko.com/coins/images/5/small/dogecoin.png',
      'TRX': 'https://assets.coingecko.com/coins/images/1094/small/tron-logo.png',
      'MATIC': 'https://assets.coingecko.com/coins/images/4713/small/matic-token-icon.png',
      'LTC': 'https://assets.coingecko.com/coins/images/2/small/litecoin.png',
      'AVAX': 'https://assets.coingecko.com/coins/images/12559/small/Avalanche_Circle_RedWhite_Trans.png',
      'ATOM': 'https://assets.coingecko.com/coins/images/1481/small/cosmos_hub.png',
      'LINK': 'https://assets.coingecko.com/coins/images/877/small/chainlink-new-logo.png',
      'UNI': 'https://assets.coingecko.com/coins/images/12504/small/uniswap-uni.png',
      'DOT': 'https://assets.coingecko.com/coins/images/12171/small/polkadot.png',
      'SUI': 'https://assets.coingecko.com/coins/images/26375/small/sui_asset.jpeg',
      'LDO': 'https://assets.coingecko.com/coins/images/13573/small/Lido_DAO.png',
      'APT': 'https://assets.coingecko.com/coins/images/26455/small/aptos_round.png',
      'ARB': 'https://assets.coingecko.com/coins/images/16547/small/photo_2023-03-29_21.47.00.jpeg',
      'OP': 'https://assets.coingecko.com/coins/images/25244/small/Optimism.png'
    };
    
    return logoMap[symbolUpper] || `https://assets.coingecko.com/coins/images/1/small/bitcoin.png`;
  }

  private getFallbackData(): CoinData[] {
    return [
      { symbol: 'BTCUSDT', name: 'Bitcoin', price: 43250.30, change24h: 2.34, volume24h: '28.5B', high24h: 44000, low24h: 42000, logoUrl: this.getCoinLogo('BTC') },
      { symbol: 'ETHUSDT', name: 'Ethereum', price: 2680.15, change24h: -1.23, volume24h: '18.2B', high24h: 2750, low24h: 2600, logoUrl: this.getCoinLogo('ETH') },
      { symbol: 'BNBUSDT', name: 'BNB', price: 315.78, change24h: 4.56, volume24h: '2.8B', high24h: 320, low24h: 310, logoUrl: this.getCoinLogo('BNB') },
      { symbol: 'ADAUSDT', name: 'Cardano', price: 0.4523, change24h: -2.15, volume24h: '1.2B', high24h: 0.47, low24h: 0.44, logoUrl: this.getCoinLogo('ADA') },
    ];
  }
}

export const binanceAPI = BinanceAPI.getInstance();