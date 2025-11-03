# 🚀 Kripto Analiz Asistanı

**v1.1.0** - Modern kripto para trading analizi ve sinyal üretimi için geliştirilmiş profesyonel masaüstü uygulaması.

## ✨ Özellikler

### 📊 Analiz & Trading
- 🚀 **Canlı Kripto Veri Analizi** - Binance API ile gerçek zamanlı fiyat ve hacim verileri
- 📊 **Teknik İndikatörler** - RSI, MA, EMA, MACD, volatilite analizi
- ⚡ **Otomatik Al/Sat Sinyalleri** - Güvenilir giriş/çıkış noktaları ve güven seviyeleri
- 📈 **İnteraktif Grafikler** - Chart.js ile gerçek zamanlı fiyat grafikleri
- 🔍 **CoinGecko Search** - 20,000+ coin arasından arama ve analiz

### 🎯 Yeni Özellikler (v1.1.0)
- 🔗 **URL Parameter Support** - Direkt coin analizi (/analysis?coin=SYMBOL)
- 🎯 **Dual Button System** - "Analiz Et" veya "Takip Listesine Ekle" seçenekleri
- 🔔 **Toast Notifications** - Tüm kullanıcı aksiyonlarında görsel feedback
- ✅ **Smart Watchlist** - Duplicate prevention, "Ekli" badges, disabled states
- 🛡️ **Confirmation Dialogs** - Silme işlemleri için kullanıcı onayı
- 🎨 **Logo Fallback System** - Coin logosu yüklenemediğinde gradient placeholder

### 🌐 Diğer Özellikler
- 📰 **Haber Akışı** - Sentiment analizi ile kripto piyasa haberleri (Türkçe çeviri)
- 🔔 **WebSocket Entegrasyonu** - Canlı veri akışı
- 🎨 **Modern UI/UX** - Responsive ve hareketli arayüz (Framer Motion)
- ⚙️ **Kapsamlı Ayarlar** - Kişiselleştirilebilir analiz parametreleri
- 🖥️ **Cross-Platform** - Windows, macOS, Linux desteği

## Teknoloji Stack

- **Electron** - Cross-platform masaüstü uygulama framework'ü
- **React** - Modern kullanıcı arayüzü kütüphanesi
- **TypeScript** - Tip güvenli JavaScript
- **Tailwind CSS** - Utility-first CSS framework
- **Framer Motion** - Animasyon kütüphanesi
- **Chart.js** - Grafik görselleştirme
- **Zustand** - State management
- **Axios** - HTTP client

## Kurulum

### Gereksinimler

- Node.js 18+ 
- npm veya yarn
- Git

### Proje Kurulumu

```bash
# Projeyi klonlayın
git clone <repository-url>
cd kripto-trading-app

# Bağımlılıkları yükleyin
npm install

# Geliştirme modunda çalıştırın
npm run dev
```

## Geliştirme

```bash
# React geliştirme sunucusunu başlat
npm run dev:react

# Electron uygulamasını başlat
npm run dev:electron

# Her ikisini birden çalıştır
npm run dev
```

## Build ve Paketleme

```bash
# Production build
npm run build

# Platform spesifik paketleme
npm run package:win    # Windows
npm run package:mac    # macOS
npm run package:linux  # Linux

# Tüm platformlar
npm run package
```

## Proje Yapısı

```
kripto-trading-app/
├── src/
│   ├── main/           # Electron main process
│   │   ├── main.ts     # Ana Electron dosyası
│   │   ├── preload.ts  # Preload script
│   │   └── utils.ts    # Yardımcı fonksiyonlar
│   └── renderer/       # React uygulaması
│       └── src/
│           ├── components/  # UI bileşenleri
│           ├── pages/      # Sayfa bileşenleri
│           ├── App.tsx     # Ana uygulama
│           └── main.tsx    # React entry point
├── dist/               # Build çıktıları
├── release/           # Paketlenmiş uygulamalar
└── assets/           # Statik dosyalar
```

## API Entegrasyonları

- **Binance API** - Canlı kripto verileri
- **WebSocket** - Gerçek zamanlı veri akışı
- **CoinMarketCap** - Haber akışı (opsiyonel)

## 🎯 Tamamlanan Özellikler

- ✅ **Binance API Entegrasyonu** - Canlı kripto verileri
- ✅ **Teknik Analiz Motoru** - RSI, MA, EMA, MACD hesaplamaları
- ✅ **Otomatik Sinyal Üretimi** - Güven seviyeli trading sinyalleri
- ✅ **İnteraktif Dashboard** - Portföy istatistikleri ve coin listesi
- ✅ **Gerçek Zamanlı Grafikler** - Chart.js ile fiyat görselleştirme
- ✅ **Haber Sistemi** - Sentiment analizi ile haber akışı (Türkçe çeviri)
- ✅ **Kapsamlı Ayarlar** - Bildirimler, trading, görünüm ve analiz ayarları
- ✅ **Modern UI/UX** - Framer Motion animasyonları ve responsive tasarım
- ✅ **CoinGecko Search** - 20,000+ coin arama ve analiz
- ✅ **Smart Watchlist** - Duplicate prevention, toast notifications
- ✅ **URL Parameter Support** - Direct coin loading (/analysis?coin=SYMBOL)

## 🆕 v1.1.0 Güncellemeleri (3 Kasım 2025)

### Yeni Özellikler:
- 🔍 **CoinGecko Search Integration** - Modal'da gerçek zamanlı coin arama (500ms debounce)
- 🎯 **Dual Button System** - "Analiz Et" (mavi) + "Takip Listesine Ekle" (yeşil) butonları
- 🔗 **URL Parameter Support** - `/analysis?coin=SYMBOL` ile direkt coin yükleme
- 🔔 **Toast Notification System** - Success/error/warning feedback (react-hot-toast)
- ✅ **Smart Duplicate Prevention** - Watchlist'e aynı coin'i tekrar eklemeyi engelleme
- 🛡️ **Confirmation Dialogs** - Silme işlemleri için kullanıcı onayı (window.confirm)
- 🎨 **Logo Fallback System** - Coin logosu yüklenemediğinde gradient placeholder

### Teknik İyileştirmeler:
- react-hot-toast entegrasyonu (portfolioStore + components)
- Watchlist state management ile senkronize UI
- Disabled button states ve visual feedback ("Ekli" badges)
- Error handling ve graceful API error recovery
- Performance optimizasyonu (debounced search)

## 🚀 Gelecek Özellikler

- [ ] WebSocket canlı veri akışı (hazır, aktif edilecek)
- [ ] Portfolio takibi ve P&L hesaplama
- [ ] Fiyat alarm sistemi
- [ ] Özel strateji oluşturucu
- [ ] Backtest modülü
- [ ] Desktop bildirimleri
- [ ] Çoklu borsa desteği (Binance, Coinbase, etc.)
- [ ] API key entegrasyonu (gerçek trading için)

## Lisans

MIT License

## Katkıda Bulunma

1. Fork edin
2. Feature branch oluşturun (`git checkout -b feature/yeni-ozellik`)
3. Değişikliklerinizi commit edin (`git commit -am 'Yeni özellik eklendi'`)
4. Branch'i push edin (`git push origin feature/yeni-ozellik`)
5. Pull Request oluşturun

## Destek

Sorularınız için [GitHub Issues](https://github.com/username/kripto-trading-app/issues) kullanabilirsiniz.

---

⚠️ **Uyarı**: Bu uygulama yalnızca bilgilendirme amaçlıdır. Finansal tavsiye değildir. Trading yaparken riskleri göz önünde bulundurun.

---

**⭐ Projeyi beğendiyseniz yıldızlamayı unutmayın!**

```
🔴 Canlı Veriler  📊 Teknik Analiz  🎯 Otomatik Sinyal  🤖 Trading Bot
```