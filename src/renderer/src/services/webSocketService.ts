import { useTradingStore } from '../store/tradingStore';

export class WebSocketService {
  private static instance: WebSocketService;
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectInterval = 5000;

  public static getInstance(): WebSocketService {
    if (!WebSocketService.instance) {
      WebSocketService.instance = new WebSocketService();
    }
    return WebSocketService.instance;
  }

  connect(url?: string, callback?: (data: any) => void) {
    try {
      // Binance WebSocket ticker stream
      this.ws = new WebSocket(url || 'wss://stream.binance.com:9443/ws/!ticker@arr');
      
      this.ws.onopen = () => {
        console.log('🟢 WebSocket connected to Binance!');
        this.reconnectAttempts = 0;
        // Store'u güncelle - zaten bağlı olarak ayarlandı
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('📊 WebSocket data received:', Array.isArray(data) ? `${data.length} tickers` : 'data');
          if (callback) {
            callback(data);
          } else {
            this.handleTickerUpdate(data);
          }
        } catch (error) {
          console.error('WebSocket message parsing error:', error);
        }
      };

      this.ws.onclose = () => {
        console.log('WebSocket disconnected');
        const store = useTradingStore.getState();
        store.disconnectWebSocket();
        this.attemptReconnect();
      };

      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error);
      };

    } catch (error) {
      console.error('WebSocket connection error:', error);
      this.attemptReconnect();
    }
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  private async handleTickerUpdate(tickers: any[]) {
    const store = useTradingStore.getState();
    
    // Store'u güncelle
    if (Array.isArray(tickers) && tickers.length > 0) {
      store.updateCoinPrices(tickers);
      console.log('💰 Coin prices updated:', tickers.length, 'tickers');
      
      // Watchlist ve favorite coins'i de güncelle
      const { usePortfolioStore } = await import('../store/portfolioStore');
      const portfolioStore = usePortfolioStore.getState();
      
      portfolioStore.updateWatchlistPrices(tickers);
      portfolioStore.updateFavoriteCoinPrices(tickers);
    }
  }



  private attemptReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      console.log(`Attempting to reconnect... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
      
      setTimeout(() => {
        this.connect();
      }, this.reconnectInterval);
    } else {
      console.log('Max reconnection attempts reached');
    }
  }
}

export const webSocketService = WebSocketService.getInstance();