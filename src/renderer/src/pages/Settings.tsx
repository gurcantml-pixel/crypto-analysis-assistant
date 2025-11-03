import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Cog6ToothIcon,
  BellIcon,
  ChartBarIcon,
  CurrencyDollarIcon,
  ShieldCheckIcon,
  PaintBrushIcon,
  KeyIcon,
  LinkIcon,
} from '@heroicons/react/24/outline';
import { usePortfolioStore, APIConfig } from '../store/portfolioStore';

const Settings: React.FC = () => {
    const { 
    apiConfig, 
    isConnected, 
    connectionError,
    setAPIConfig,
    deleteSavedAPIConfig
  } = usePortfolioStore();
  
  const [apiForm, setApiForm] = useState<APIConfig>({
    exchange: 'okx',
    apiKey: apiConfig?.apiKey || '',
    apiSecret: apiConfig?.apiSecret || '',
    testnet: apiConfig?.testnet || true,
    passphrase: apiConfig?.passphrase || '',
  });

  // Clear API config function
  const clearAPIConfig = async () => {
    if (confirm('API yapılandırmasını silmek istediğinizden emin misiniz?')) {
      const success = await deleteSavedAPIConfig();
      if (success) {
        setApiForm({
          exchange: 'binance',
          apiKey: '',
          apiSecret: '',
          testnet: false,
        });
      }
    }
  };
  
  const [settings, setSettings] = useState({
    notifications: {
      priceAlerts: true,
      tradingSignals: true,
      news: false,
      soundEnabled: true,
    },
    trading: {
      autoRefresh: true,
      refreshInterval: 5,
      defaultCoin: 'BTCUSDT',
      riskLevel: 'medium',
    },
    display: {
      theme: 'dark',
      language: 'tr',
      currency: 'USD',
      compactMode: false,
    },
    analysis: {
      rsiPeriod: 14,
      maPeriods: [50, 200],
      emaPeriods: [12, 26],
      macdSettings: [12, 26, 9],
    }
  });

  const updateSetting = (category: string, key: string, value: any) => {
    setSettings(prev => ({
      ...prev,
      [category]: {
        ...prev[category as keyof typeof prev],
        [key]: value
      }
    }));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Ayarlar</h1>
        <div className="flex items-center space-x-2">
          <Cog6ToothIcon className="h-6 w-6 text-primary-400" />
          <span className="text-gray-400">Uygulama Yapılandırması</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* API Yapılandırması */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="card lg:col-span-2"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <KeyIcon className="h-5 w-5 text-primary-400" />
              <h2 className="text-lg font-semibold text-white">API Yapılandırması</h2>
            </div>
            <div className="flex items-center space-x-2">
              <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
              <span className="text-sm text-gray-400">
                {isConnected ? 'Bağlı' : 'Bağlantısız'}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <label className="block text-gray-400 text-sm mb-2">Borsa Seçimi</label>
                <select
                  value={apiForm.exchange}
                  onChange={(e) => setApiForm({...apiForm, exchange: e.target.value as any})}
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-primary-500"
                  title="Borsa Seçimi"
                >
                  <option value="okx">OKX (Türkiye)</option>
                  <option value="binance">Binance</option>
                  <option value="coinbase">Coinbase Pro (Yakında)</option>
                  <option value="kraken">Kraken (Yakında)</option>
                </select>
              </div>

              <div>
                <label className="block text-gray-400 text-sm mb-2">API Key</label>
                <input
                  type="password"
                  value={apiForm.apiKey}
                  onChange={(e) => setApiForm({...apiForm, apiKey: e.target.value})}
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-primary-500"
                  placeholder="API anahtarınızı girin..."
                  title="API Key"
                />
              </div>

              <div>
                <label className="block text-gray-400 text-sm mb-2">API Secret</label>
                <input
                  type="password"
                  value={apiForm.apiSecret}
                  onChange={(e) => setApiForm({...apiForm, apiSecret: e.target.value})}
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-primary-500"
                  placeholder="API secret'ınızı girin..."
                  title="API Secret"
                />
              </div>

              {apiForm.exchange === 'okx' && (
                <div>
                  <label className="block text-gray-400 text-sm mb-2">Passphrase</label>
                  <input
                    type="password"
                    value={apiForm.passphrase || ''}
                    onChange={(e) => setApiForm({...apiForm, passphrase: e.target.value})}
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-primary-500"
                    placeholder="OKX passphrase'inizi girin..."
                    title="OKX Passphrase"
                  />
                  <p className="text-gray-500 text-xs mt-1">OKX API oluştururken belirlediğiniz passphrase</p>
                </div>
              )}

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="testnet"
                  checked={apiForm.testnet}
                  onChange={(e) => setApiForm({...apiForm, testnet: e.target.checked})}
                  className="w-4 h-4 text-primary-600 bg-gray-700 border-gray-600 rounded focus:ring-primary-500"
                />
                <label htmlFor="testnet" className="text-gray-400 text-sm">
                  Testnet kullan (Güvenli test ortamı)
                </label>
              </div>
            </div>

            <div className="space-y-4">
              <div className="bg-blue-600/10 border border-blue-600/20 rounded-lg p-4">
                <h3 className="text-blue-400 font-medium mb-2">🔒 Güvenlik Uyarısı</h3>
                <ul className="text-blue-300 text-sm space-y-1">
                  <li>• Sadece <strong>okuma yetkisi</strong> olan API anahtarı kullanın</li>
                  <li>• Asla trade yetkisi vermeyin</li>
                  <li>• API bilgileri cihazınızda güvenle saklanır</li>
                  <li>• Testnet ile güvenle deneme yapabilirsiniz</li>
                </ul>
              </div>

              <div className="bg-yellow-600/10 border border-yellow-600/20 rounded-lg p-4">
                <h3 className="text-yellow-400 font-medium mb-2">📋 API Key Nasıl Alınır?</h3>
                <div className="text-yellow-300 text-sm space-y-2">
                  {apiForm.exchange === 'okx' ? (
                    <>
                      <p className="font-medium">OKX için:</p>
                      <ol className="list-decimal list-inside space-y-1 ml-2">
                        <li>OKX → Profile → API Management</li>
                        <li>Create V5 API Key</li>
                        <li>Sadece <strong>"Read"</strong> yetkisi verin</li>
                        <li>Passphrase belirleyin (güçlü şifre)</li>
                        <li>IP whitelist ekleyin (önerilir)</li>
                      </ol>
                    </>
                  ) : (
                    <>
                      <p className="font-medium">Binance için:</p>
                      <ol className="list-decimal list-inside space-y-1 ml-2">
                        <li>Binance → API Management</li>
                        <li>Create API → Sadece "Enable Reading" seçin</li>
                        <li>IP kısıtlaması ekleyin (önerilir)</li>
                      </ol>
                    </>
                  )}
                </div>
              </div>

              {connectionError && (
                <div className="bg-red-600/10 border border-red-600/20 rounded-lg p-4">
                  <h3 className="text-red-400 font-medium mb-2">❌ Bağlantı Hatası</h3>
                  <p className="text-red-300 text-sm">{connectionError}</p>
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-wrap gap-3 mt-6 pt-6 border-t border-gray-700">
            <button
              onClick={() => setAPIConfig(apiForm)}
              className="bg-primary-600 hover:bg-primary-700 text-white px-6 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={
                !apiForm.apiKey || 
                !apiForm.apiSecret || 
                (apiForm.exchange === 'okx' && !apiForm.passphrase)
              }
            >
              <LinkIcon className="h-4 w-4 inline mr-2" />
              Kaydet ve Test Et
            </button>
            
            {apiConfig && (
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-green-400 text-sm">Kayıtlı yapılandırma mevcut</span>
              </div>
            )}

            <button
              onClick={clearAPIConfig}
              className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-lg font-medium transition-colors"
            >
              <KeyIcon className="h-4 w-4 inline mr-2" />
              API Bilgilerini Sil
            </button>
          </div>
        </motion.div>

        {/* Bildirimler */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="card"
        >
          <div className="flex items-center space-x-2 mb-4">
            <BellIcon className="h-5 w-5 text-primary-400" />
            <h2 className="text-lg font-semibold text-white">Bildirimler</h2>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white font-medium">Fiyat Uyarıları</p>
                <p className="text-gray-400 text-sm">Hedef fiyatlara ulaşıldığında bildir</p>
              </div>
              <button
                onClick={() => updateSetting('notifications', 'priceAlerts', !settings.notifications.priceAlerts)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  settings.notifications.priceAlerts ? 'bg-primary-600' : 'bg-gray-600'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    settings.notifications.priceAlerts ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="text-white font-medium">Trading Sinyalleri</p>
                <p className="text-gray-400 text-sm">Yeni sinyal oluştuğunda bildir</p>
              </div>
              <button
                onClick={() => updateSetting('notifications', 'tradingSignals', !settings.notifications.tradingSignals)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  settings.notifications.tradingSignals ? 'bg-primary-600' : 'bg-gray-600'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    settings.notifications.tradingSignals ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="text-white font-medium">Haber Bildirimleri</p>
                <p className="text-gray-400 text-sm">Önemli haberler için bildirim</p>
              </div>
              <button
                onClick={() => updateSetting('notifications', 'news', !settings.notifications.news)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  settings.notifications.news ? 'bg-primary-600' : 'bg-gray-600'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    settings.notifications.news ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="text-white font-medium">Ses Bildirimleri</p>
                <p className="text-gray-400 text-sm">Bildirimler için ses çal</p>
              </div>
              <button
                onClick={() => updateSetting('notifications', 'soundEnabled', !settings.notifications.soundEnabled)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  settings.notifications.soundEnabled ? 'bg-primary-600' : 'bg-gray-600'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    settings.notifications.soundEnabled ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>
        </motion.div>

        {/* Trading Ayarları */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="card"
        >
          <div className="flex items-center space-x-2 mb-4">
            <CurrencyDollarIcon className="h-5 w-5 text-primary-400" />
            <h2 className="text-lg font-semibold text-white">Trading</h2>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-white font-medium mb-2">Varsayılan Coin</label>
              <select
                value={settings.trading.defaultCoin}
                onChange={(e) => updateSetting('trading', 'defaultCoin', e.target.value)}
                className="w-full bg-dark-700 text-white border border-gray-600 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="BTCUSDT">Bitcoin (BTC)</option>
                <option value="ETHUSDT">Ethereum (ETH)</option>
                <option value="BNBUSDT">BNB</option>
                <option value="ADAUSDT">Cardano (ADA)</option>
              </select>
            </div>

            <div>
              <label className="block text-white font-medium mb-2">
                Yenileme Aralığı: {settings.trading.refreshInterval} saniye
              </label>
              <input
                type="range"
                min="1"
                max="30"
                value={settings.trading.refreshInterval}
                onChange={(e) => updateSetting('trading', 'refreshInterval', parseInt(e.target.value))}
                className="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer slider"
                title="Yenileme aralığı ayarı"
              />
            </div>

            <div>
              <label className="block text-white font-medium mb-2">Risk Seviyesi</label>
              <div className="grid grid-cols-3 gap-2">
                {['low', 'medium', 'high'].map((level) => (
                  <button
                    key={level}
                    onClick={() => updateSetting('trading', 'riskLevel', level)}
                    className={`p-2 rounded-lg text-sm font-medium transition-colors ${
                      settings.trading.riskLevel === level
                        ? 'bg-primary-600 text-white'
                        : 'bg-dark-700 text-gray-300 hover:bg-dark-600'
                    }`}
                  >
                    {level === 'low' ? 'Düşük' : level === 'medium' ? 'Orta' : 'Yüksek'}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </motion.div>

        {/* Görünüm Ayarları */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="card"
        >
          <div className="flex items-center space-x-2 mb-4">
            <PaintBrushIcon className="h-5 w-5 text-primary-400" />
            <h2 className="text-lg font-semibold text-white">Görünüm</h2>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-white font-medium mb-2">Tema</label>
              <div className="grid grid-cols-2 gap-2">
                {['dark', 'light'].map((theme) => (
                  <button
                    key={theme}
                    onClick={() => updateSetting('display', 'theme', theme)}
                    className={`p-2 rounded-lg text-sm font-medium transition-colors ${
                      settings.display.theme === theme
                        ? 'bg-primary-600 text-white'
                        : 'bg-dark-700 text-gray-300 hover:bg-dark-600'
                    }`}
                  >
                    {theme === 'dark' ? 'Karanlık' : 'Aydınlık'}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-white font-medium mb-2">Dil</label>
              <select
                value={settings.display.language}
                onChange={(e) => updateSetting('display', 'language', e.target.value)}
                className="w-full bg-dark-700 text-white border border-gray-600 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                title="Dil seçimi"
              >
                <option value="tr">Türkçe</option>
                <option value="en">English</option>
              </select>
            </div>

            <div>
              <label className="block text-white font-medium mb-2">Para Birimi</label>
              <select
                value={settings.display.currency}
                onChange={(e) => updateSetting('display', 'currency', e.target.value)}
                className="w-full bg-dark-700 text-white border border-gray-600 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                title="Para birimi seçimi"
              >
                <option value="USD">USD ($)</option>
                <option value="EUR">EUR (€)</option>
                <option value="TRY">TRY (₺)</option>
              </select>
            </div>
          </div>
        </motion.div>

        {/* Analiz Ayarları */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="card"
        >
          <div className="flex items-center space-x-2 mb-4">
            <ChartBarIcon className="h-5 w-5 text-primary-400" />
            <h2 className="text-lg font-semibold text-white">Teknik Analiz</h2>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-white font-medium mb-2">
                RSI Periyodu: {settings.analysis.rsiPeriod}
              </label>
              <input
                type="range"
                min="7"
                max="28"
                value={settings.analysis.rsiPeriod}
                onChange={(e) => updateSetting('analysis', 'rsiPeriod', parseInt(e.target.value))}
                className="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer"
                title="RSI periyot ayarı"
              />
            </div>

            <div>
              <label className="block text-white font-medium mb-2">MA Periyotları</label>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="number"
                  value={settings.analysis.maPeriods[0]}
                  onChange={(e) => {
                    const newPeriods = [...settings.analysis.maPeriods];
                    newPeriods[0] = parseInt(e.target.value);
                    updateSetting('analysis', 'maPeriods', newPeriods);
                  }}
                  className="bg-dark-700 text-white border border-gray-600 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="MA 1"
                />
                <input
                  type="number"
                  value={settings.analysis.maPeriods[1]}
                  onChange={(e) => {
                    const newPeriods = [...settings.analysis.maPeriods];
                    newPeriods[1] = parseInt(e.target.value);
                    updateSetting('analysis', 'maPeriods', newPeriods);
                  }}
                  className="bg-dark-700 text-white border border-gray-600 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="MA 2"
                />
              </div>
            </div>

            <div>
              <label className="block text-white font-medium mb-2">EMA Periyotları</label>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="number"
                  value={settings.analysis.emaPeriods[0]}
                  onChange={(e) => {
                    const newPeriods = [...settings.analysis.emaPeriods];
                    newPeriods[0] = parseInt(e.target.value);
                    updateSetting('analysis', 'emaPeriods', newPeriods);
                  }}
                  className="bg-dark-700 text-white border border-gray-600 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="EMA 1"
                />
                <input
                  type="number"
                  value={settings.analysis.emaPeriods[1]}
                  onChange={(e) => {
                    const newPeriods = [...settings.analysis.emaPeriods];
                    newPeriods[1] = parseInt(e.target.value);
                    updateSetting('analysis', 'emaPeriods', newPeriods);
                  }}
                  className="bg-dark-700 text-white border border-gray-600 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="EMA 2"
                />
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Kaydet Butonu */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="card"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <ShieldCheckIcon className="h-5 w-5 text-success-400" />
            <p className="text-gray-400">Ayarlar otomatik olarak kaydedilir</p>
          </div>
          <button className="btn-primary">
            Ayarları Dışa Aktar
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default Settings;