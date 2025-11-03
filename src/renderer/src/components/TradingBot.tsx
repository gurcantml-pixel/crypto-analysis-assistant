import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  PlayIcon,
  PauseIcon,
  ChartBarIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';

interface TradingBotProps {
  onToggle: (isActive: boolean) => void;
}

const TradingBot: React.FC<TradingBotProps> = ({ onToggle }) => {
  const [isActive, setIsActive] = useState(false);
  const [settings, setSettings] = useState({
    maxRisk: 2.0,
    stopLoss: 3.0,
    takeProfit: 6.0,
    tradingPairs: ['BTCUSDT', 'ETHUSDT', 'BNBUSDT']
  });

  const handleToggle = () => {
    const newState = !isActive;
    setIsActive(newState);
    onToggle(newState);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="card"
    >
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className={`p-2 rounded-lg ${isActive ? 'bg-success-600/20' : 'bg-gray-600/20'}`}>
            <ChartBarIcon className={`h-6 w-6 ${isActive ? 'text-success-400' : 'text-gray-400'}`} />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">Otomatik Trading Bot</h3>
            <p className="text-gray-400 text-sm">
              {isActive ? 'Aktif - Sinyalleri takip ediyor' : 'Pasif - Beklemede'}
            </p>
          </div>
        </div>

        <button
          onClick={handleToggle}
          className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-all ${
            isActive 
              ? 'bg-error-600 hover:bg-error-700 text-white' 
              : 'bg-success-600 hover:bg-success-700 text-white'
          }`}
        >
          {isActive ? (
            <>
              <PauseIcon className="h-4 w-4" />
              <span>Durdur</span>
            </>
          ) : (
            <>
              <PlayIcon className="h-4 w-4" />
              <span>Başlat</span>
            </>
          )}
        </button>
      </div>

      {isActive && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="space-y-4"
        >
          <div className="bg-warning-600/10 border border-warning-600/20 rounded-lg p-4">
            <div className="flex items-center space-x-2">
              <ExclamationTriangleIcon className="h-5 w-5 text-warning-400" />
              <span className="text-warning-400 font-medium">Dikkat!</span>
            </div>
            <p className="text-gray-300 text-sm mt-2">
              Bot aktif durumda. Tüm işlemler otomatik olarak gerçekleştirilecek.
              Risk ayarlarınızı kontrol ettiğinizden emin olun.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-gray-400 text-sm">Maksimum Risk (%)</label>
              <div className="flex items-center space-x-2">
                <input
                  type="range"
                  min="0.5"
                  max="5"
                  step="0.1"
                  value={settings.maxRisk}
                  onChange={(e) => setSettings({...settings, maxRisk: parseFloat(e.target.value)})}
                  className="flex-1"
                  title="Maksimum Risk Oranı"
                />
                <span className="text-white font-medium w-12 text-right">{settings.maxRisk}%</span>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-gray-400 text-sm">Stop Loss (%)</label>
              <div className="flex items-center space-x-2">
                <input
                  type="range"
                  min="1"
                  max="10"
                  step="0.1"
                  value={settings.stopLoss}
                  onChange={(e) => setSettings({...settings, stopLoss: parseFloat(e.target.value)})}
                  className="flex-1"
                  title="Stop Loss Oranı"
                />
                <span className="text-white font-medium w-12 text-right">{settings.stopLoss}%</span>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-gray-700">
            <h4 className="text-white font-medium mb-2">Son İşlemler</h4>
            <div className="space-y-2">
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-400">BTCUSDT - BUY</span>
                <span className="text-success-400">+2.3%</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-400">ETHUSDT - SELL</span>
                <span className="text-success-400">+1.8%</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-400">BNBUSDT - BUY</span>
                <span className="text-error-400">-0.5%</span>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
};

export default TradingBot;