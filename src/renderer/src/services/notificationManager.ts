interface PriceAlert {
  id: string;
  symbol: string;
  targetPrice: number;
  condition: 'above' | 'below';
  isActive: boolean;
  createdAt: Date;
  triggeredAt?: Date;
}

interface NotificationSettings {
  soundEnabled: boolean;
  desktopNotifications: boolean;
  emailNotifications: boolean;
  telegramEnabled: boolean;
  telegramChatId?: string;
  priceAlertThreshold: number;
}

export class NotificationManager {
  private alerts: Map<string, PriceAlert> = new Map();
  private settings: NotificationSettings;
  private checkInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.settings = {
      soundEnabled: true,
      desktopNotifications: true,
      emailNotifications: false,
      telegramEnabled: false,
      priceAlertThreshold: 1.0 // %1 değişim
    };
    
    this.loadAlertsFromStorage();
    this.initializeNotifications();
    this.startAlertMonitoring();
  }

  // Notification sistemini başlat
  private async initializeNotifications(): Promise<void> {
    if ('Notification' in window && Notification.permission === 'default') {
      try {
        const permission = await Notification.requestPermission();
        console.log(`🔔 Notification permission: ${permission}`);
        
        if (permission === 'granted') {
          // Test bildirimi
          new Notification('Kripto Analiz Asistanı', {
            body: 'Bildirimler aktif edildi!',
            icon: '✅'
          });
        }
      } catch (error) {
        console.warn('Failed to request notification permission:', error);
      }
    }
  }

  // Fiyat alarmı oluştur
  createPriceAlert(symbol: string, targetPrice: number, condition: 'above' | 'below'): string {
    const id = `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const alert: PriceAlert = {
      id,
      symbol,
      targetPrice,
      condition,
      isActive: true,
      createdAt: new Date()
    };
    
    this.alerts.set(id, alert);
    this.saveAlertsToStorage();
    
    console.log(`🔔 Price alert created: ${symbol} ${condition} $${targetPrice}`);
    
    // Desktop notification
    this.showNotification(
      'Alarm Oluşturuldu',
      `${symbol}: ${condition === 'above' ? 'Üstüne' : 'Altına'} $${targetPrice}`,
      'info'
    );
    
    return id;
  }

  // Trading sinyali bildirimi
  sendTradingSignal(signal: { symbol: string; type: string; confidence: number; reason: string }): void {
    const title = `${signal.type} Sinyali - ${signal.symbol}`;
    const message = `Güven: %${signal.confidence.toFixed(0)} - ${signal.reason}`;
    
    console.log(`📊 Trading Signal: ${title} - ${message}`);
    
    // Desktop notification
    this.showNotification(title, message, signal.type === 'BUY' ? 'success' : 'warning');
    
    // Ses uyarısı
    if (this.settings.soundEnabled) {
      this.playNotificationSound(signal.type === 'BUY' ? 'buy' : 'sell');
    }
  }

  // Önemli piyasa hareketleri için anlık bildirim
  sendMarketAlert(symbol: string, changePercent: number, timeframe: string): void {
    if (Math.abs(changePercent) < this.settings.priceAlertThreshold) return;
    
    const direction = changePercent > 0 ? '📈' : '📉';
    const title = `${direction} ${symbol} Hareket`;
    const message = `${timeframe}: ${changePercent > 0 ? '+' : ''}${changePercent.toFixed(2)}%`;
    
    console.log(`🚨 Market Alert: ${title} - ${message}`);
    
    this.showNotification(title, message, Math.abs(changePercent) > 5 ? 'warning' : 'info');
  }

  // Günlük özet raporu
  sendDailyReport(data: {
    portfolioChange: number;
    topGainer: { symbol: string; change: number };
    topLoser: { symbol: string; change: number };
    signalsGenerated: number;
  }): void {
    const title = '📊 Günlük Rapor';
    const message = `
Portfolio: ${data.portfolioChange > 0 ? '+' : ''}${data.portfolioChange.toFixed(2)}%
En İyi: ${data.topGainer.symbol} (+${data.topGainer.change.toFixed(2)}%)
En Kötü: ${data.topLoser.symbol} (${data.topLoser.change.toFixed(2)}%)
Sinyaller: ${data.signalsGenerated}
    `.trim();
    
    console.log(`📈 Daily Report: ${message}`);
    this.showNotification(title, message, 'info');
  }

  // Alarm kontrolü
  private startAlertMonitoring(): void {
    this.checkInterval = setInterval(() => {
      this.checkPriceAlerts();
    }, 5000); // 5 saniyede bir kontrol
  }

  private async checkPriceAlerts(): Promise<void> {
    if (this.alerts.size === 0) return;
    
    // Aktif alarmları kontrol et
    for (const [id, alert] of this.alerts) {
      if (!alert.isActive) continue;
      
      try {
        // Binance API'den güncel fiyat al (mock implementation)
        const currentPrice = await this.getCurrentPrice(alert.symbol);
        
        const shouldTrigger = 
          (alert.condition === 'above' && currentPrice >= alert.targetPrice) ||
          (alert.condition === 'below' && currentPrice <= alert.targetPrice);
        
        if (shouldTrigger) {
          this.triggerAlert(alert, currentPrice);
        }
      } catch (error) {
        console.error(`Error checking alert ${id}:`, error);
      }
    }
  }

  private async getCurrentPrice(symbol: string): Promise<number> {
    // Mock implementation - gerçek uygulamada Binance API kullanılacak
    const mockPrices: { [key: string]: number } = {
      'BTCUSDT': 43000 + (Math.random() - 0.5) * 2000,
      'ETHUSDT': 2600 + (Math.random() - 0.5) * 200,
      'ADAUSDT': 0.5 + (Math.random() - 0.5) * 0.1
    };
    
    return mockPrices[symbol] || 1000;
  }

  private triggerAlert(alert: PriceAlert, currentPrice: number): void {
    alert.isActive = false;
    alert.triggeredAt = new Date();
    
    const title = `🎯 Fiyat Alarmı Tetiklendi!`;
    const message = `${alert.symbol}: $${currentPrice.toFixed(2)} (Hedef: $${alert.targetPrice})`;
    
    console.log(`🔔 Alert Triggered: ${alert.symbol} - ${message}`);
    
    // Güçlü bildirim (ses + desktop)
    this.showNotification(title, message, 'success');
    if (this.settings.soundEnabled) {
      this.playNotificationSound('alert');
    }
    
    this.saveAlertsToStorage();
  }

  // Desktop bildirim göster
  private showNotification(title: string, message: string, type: 'success' | 'warning' | 'info'): void {
    if (!this.settings.desktopNotifications) return;
    
    // Browser notification API kullan
    if ('Notification' in window) {
      if (Notification.permission === 'granted') {
        const notification = new Notification(title, { 
          body: message,
          icon: this.getNotificationIcon(type)
        });
        
        // 5 saniye sonra otomatik kapat
        setTimeout(() => notification.close(), 5000);
      } else if (Notification.permission !== 'denied') {
        // İzin iste
        Notification.requestPermission().then(permission => {
          if (permission === 'granted') {
            new Notification(title, { body: message });
          }
        });
      }
    } else {
      // Fallback: Console log
      console.log(`🔔 ${type.toUpperCase()}: ${title} - ${message}`);
    }
  }

  // Notification ikonları
  private getNotificationIcon(type: 'success' | 'warning' | 'info'): string {
    const icons = {
      success: '✅',
      warning: '⚠️', 
      info: 'ℹ️'
    };
    return icons[type] || 'ℹ️';
  }

  // Ses uyarısı çal
  private playNotificationSound(type: 'buy' | 'sell' | 'alert'): void {
    if (!this.settings.soundEnabled) return;
    
    try {
      // Web Audio API ile basit ses üretimi
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      // Ses tipine göre frekans ayarla
      const frequencies = {
        buy: 800,   // Yüksek ton (pozitif)
        sell: 200,  // Düşük ton (negatif)
        alert: 500  // Orta ton (uyarı)
      };
      
      oscillator.frequency.setValueAtTime(frequencies[type], audioContext.currentTime);
      oscillator.type = 'sine';
      
      // Volume ayarla
      gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
      
      // Ses çal (300ms)
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.3);
      
    } catch (error) {
      console.warn('Sound notification failed:', error);
      // Fallback: Console beep
      console.log(`🔊 ${type.toUpperCase()} SOUND`);
    }
  }

  // Ayarları güncelle
  updateSettings(newSettings: Partial<NotificationSettings>): void {
    this.settings = { ...this.settings, ...newSettings };
    localStorage.setItem('notificationSettings', JSON.stringify(this.settings));
    
    console.log('🔧 Notification settings updated:', this.settings);
  }

  // Alarmları yönet
  removeAlert(id: string): boolean {
    const removed = this.alerts.delete(id);
    if (removed) {
      this.saveAlertsToStorage();
      console.log(`🗑️ Alert removed: ${id}`);
    }
    return removed;
  }

  getAllAlerts(): PriceAlert[] {
    return Array.from(this.alerts.values());
  }

  getActiveAlerts(): PriceAlert[] {
    return Array.from(this.alerts.values()).filter(alert => alert.isActive);
  }

  // Storage management
  private saveAlertsToStorage(): void {
    const alertsData = Array.from(this.alerts.values());
    localStorage.setItem('priceAlerts', JSON.stringify(alertsData));
  }

  private loadAlertsFromStorage(): void {
    try {
      const stored = localStorage.getItem('priceAlerts');
      if (stored) {
        const alertsData: PriceAlert[] = JSON.parse(stored);
        alertsData.forEach(alert => {
          this.alerts.set(alert.id, {
            ...alert,
            createdAt: new Date(alert.createdAt),
            triggeredAt: alert.triggeredAt ? new Date(alert.triggeredAt) : undefined
          });
        });
      }
      
      // Settings yükle
      const settingsStored = localStorage.getItem('notificationSettings');
      if (settingsStored) {
        this.settings = { ...this.settings, ...JSON.parse(settingsStored) };
      }
    } catch (error) {
      console.error('Failed to load alerts from storage:', error);
    }
  }

  // Cleanup
  destroy(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
  }
}

// Global instance
export const notificationManager = new NotificationManager();