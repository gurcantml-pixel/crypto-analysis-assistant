/**
 * 📊 Advanced Technical Analysis Component
 * Gelişmiş teknik analiz göstergeleri ve çoklu zaman dilimi analizi
 */

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  ChartBarIcon,
  ClockIcon,
  ArrowTrendingUpIcon as TrendingUpIcon,
  ArrowTrendingDownIcon as TrendingDownIcon,
  MinusIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  SignalIcon,
  BoltIcon
} from '@heroicons/react/24/outline';
import { MultiTimeframeAnalysisService } from '../services/multiTimeframeAnalysis';
import { TechnicalAnalysis } from '../services/technicalAnalysis';
import { MultiTimeframeAnalysis, TechnicalIndicators } from '../types';

interface AdvancedAnalysisProps {
  symbol: string;
  onSignalUpdate?: (signal: any) => void;
}

const AdvancedAnalysisPanel: React.FC<AdvancedAnalysisProps> = ({ symbol, onSignalUpdate }) => {
  const [analysis, setAnalysis] = useState<MultiTimeframeAnalysis | null>(null);
  const [indicators, setIndicators] = useState<TechnicalIndicators | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedTimeframe, setSelectedTimeframe] = useState('4h');

  // Demo data generator (gerçek API verisi olana kadar)
  const generateDemoData = () => {
    const timeframes = ['5m', '15m', '1h', '4h', '1d'];
    const priceData: { [key: string]: any[] } = {};
    
    timeframes.forEach(tf => {
      const data = [];
      let price = 45000; // BTC başlangıç fiyatı
      
      for (let i = 0; i < 100; i++) {
        const change = (Math.random() - 0.5) * 1000;
        price += change;
        data.push({
          timestamp: Date.now() - i * 60000,
          open: price,
          high: price * 1.02,
          low: price * 0.98,
          close: price,
          volume: Math.random() * 1000000
        });
      }
      priceData[tf] = data.reverse();
    });
    
    return priceData;
  };

  const fetchAnalysis = async () => {
    setLoading(true);
    try {
      // Demo data kullanarak analiz yap
      const demoData = generateDemoData();
      const mtfAnalysis = await MultiTimeframeAnalysisService.analyzeMultiTimeframe(symbol, demoData);
      
      // Current timeframe indicators
      const prices = demoData[selectedTimeframe]?.map(d => d.close) || [];
      const highs = demoData[selectedTimeframe]?.map(d => d.high) || [];
      const lows = demoData[selectedTimeframe]?.map(d => d.low) || [];
      
      // Bollinger Bands
      const bb = TechnicalAnalysis.calculateBollingerBands(prices, 20, 2);
      
      // Ichimoku
      const ichimoku = TechnicalAnalysis.calculateIchimoku(highs, lows, prices);
      
      // Fibonacci
      const recentPrices = prices.slice(-50);
      const fibonacci = TechnicalAnalysis.calculateFibonacci(Math.max(...recentPrices), Math.min(...recentPrices));
      
      // Support/Resistance
      const supportResistance = TechnicalAnalysis.findSupportResistance(prices.slice(-100), 3);
      
      const currentIndicators: TechnicalIndicators = {
        rsi: TechnicalAnalysis.calculateRSI(prices),
        ma50: TechnicalAnalysis.calculateSMA(prices, 50),
        ma200: TechnicalAnalysis.calculateSMA(prices, 200),
        ema12: TechnicalAnalysis.calculateEMA(prices, 12),
        ema26: TechnicalAnalysis.calculateEMA(prices, 26),
        macd: TechnicalAnalysis.calculateEMA(prices, 12) - TechnicalAnalysis.calculateEMA(prices, 26),
        volatility: TechnicalAnalysis.calculateVolatility(prices),
        bollingerBands: bb.upper.length > 0 ? {
          upper: bb.upper[bb.upper.length - 1],
          middle: bb.middle[bb.middle.length - 1],
          lower: bb.lower[bb.lower.length - 1],
          squeeze: bb.squeeze[bb.squeeze.length - 1]
        } : undefined,
        ichimoku: ichimoku.tenkanSen.length > 0 ? {
          tenkanSen: ichimoku.tenkanSen[ichimoku.tenkanSen.length - 1],
          kijunSen: ichimoku.kijunSen[ichimoku.kijunSen.length - 1],
          senkouSpanA: ichimoku.senkouSpanA[ichimoku.senkouSpanA.length - 1],
          senkouSpanB: ichimoku.senkouSpanB[ichimoku.senkouSpanB.length - 1],
          signal: 'neutral'
        } : undefined,
        fibonacci,
        supportResistance: {
          supports: supportResistance.supports,
          resistances: supportResistance.resistances,
          nearestSupport: supportResistance.supports.length > 0 ? supportResistance.supports[supportResistance.supports.length - 1] : undefined,
          nearestResistance: supportResistance.resistances.length > 0 ? supportResistance.resistances[0] : undefined
        }
      };
      
      setAnalysis(mtfAnalysis);
      setIndicators(currentIndicators);
      
      if (onSignalUpdate) {
        onSignalUpdate(mtfAnalysis.overallSignal);
      }
      
    } catch (error) {
      console.error('Advanced analysis error:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalysis();
  }, [symbol, selectedTimeframe]);

  const getSignalColor = (signal: string) => {
    switch (signal) {
      case 'BUY': return 'text-green-400 bg-green-400/20';
      case 'SELL': return 'text-red-400 bg-red-400/20';
      default: return 'text-gray-400 bg-gray-400/20';
    }
  };

  const getSignalIcon = (signal: string) => {
    switch (signal) {
      case 'BUY': return TrendingUpIcon;
      case 'SELL': return TrendingDownIcon;
      default: return MinusIcon;
    }
  };

  if (loading) {
    return (
      <div className="card">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500 mr-3"></div>
          <span className="text-gray-400">Gelişmiş analiz hesaplanıyor...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Multi-Timeframe Overview */}
      <div className="card">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <ChartBarIcon className="h-6 w-6 text-primary-400" />
            <h2 className="text-xl font-bold">Çoklu Zaman Dilimi Analizi</h2>
          </div>
          
          {/* Timeframe Selector */}
          <div className="flex space-x-2">
            {['5m', '15m', '1h', '4h', '1d'].map((tf) => (
              <button
                key={tf}
                onClick={() => setSelectedTimeframe(tf)}
                className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                  selectedTimeframe === tf
                    ? 'bg-primary-500 text-white'
                    : 'bg-dark-700 text-gray-400 hover:bg-dark-600'
                }`}
              >
                {tf}
              </button>
            ))}
          </div>
        </div>

        {/* Overall Signal */}
        {analysis && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6"
          >
            <div className="flex items-center justify-between p-4 bg-dark-700/50 rounded-lg">
              <div className="flex items-center space-x-4">
                <div className={`p-3 rounded-lg ${getSignalColor(analysis.overallSignal.type)}`}>
                  {React.createElement(getSignalIcon(analysis.overallSignal.type), { className: 'h-6 w-6' })}
                </div>
                <div>
                  <h3 className="text-lg font-semibold">{analysis.overallSignal.type} Signal</h3>
                  <p className="text-sm text-gray-400">Confluence Score: {analysis.confluenceScore.toFixed(1)}%</p>
                </div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold">{analysis.overallSignal.confidence}%</div>
                <div className="text-sm text-gray-400">Güven</div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Timeframe Grid */}
        {analysis && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {Object.entries(analysis.timeframes).map(([timeframe, data]) => {
              const SignalIcon = getSignalIcon(data.signal.type);
              return (
                <motion.div
                  key={timeframe}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className={`p-4 rounded-lg border ${
                    timeframe === selectedTimeframe ? 'border-primary-500 bg-primary-500/10' : 'border-dark-600 bg-dark-700/30'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-300">{timeframe}</span>
                    <SignalIcon className={`h-4 w-4 ${getSignalColor(data.signal.type).split(' ')[0]}`} />
                  </div>
                  <div className="text-xs text-gray-400 mb-1">Trend: {data.trend}</div>
                  <div className="text-sm font-semibold">{data.strength.toFixed(0)}% Güç</div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* Advanced Indicators */}
      {indicators && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Bollinger Bands */}
          {indicators.bollingerBands && (
            <div className="card">
              <div className="flex items-center space-x-3 mb-4">
                <BoltIcon className="h-5 w-5 text-blue-400" />
                <h3 className="text-lg font-semibold">Bollinger Bantları</h3>
                {indicators.bollingerBands.squeeze && (
                  <span className="px-2 py-1 bg-yellow-500/20 text-yellow-400 text-xs rounded-full">
                    SQUEEZE
                  </span>
                )}
              </div>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-400">Üst Bant:</span>
                  <span className="text-red-400">${indicators.bollingerBands.upper.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Orta Bant (SMA20):</span>
                  <span className="text-blue-400">${indicators.bollingerBands.middle.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Alt Bant:</span>
                  <span className="text-green-400">${indicators.bollingerBands.lower.toLocaleString()}</span>
                </div>
              </div>
            </div>
          )}

          {/* Ichimoku Cloud */}
          {indicators.ichimoku && (
            <div className="card">
              <div className="flex items-center space-x-3 mb-4">
                <SignalIcon className="h-5 w-5 text-purple-400" />
                <h3 className="text-lg font-semibold">Ichimoku Bulutu</h3>
                <span className={`px-2 py-1 text-xs rounded-full ${
                  indicators.ichimoku.signal === 'bullish' ? 'bg-green-500/20 text-green-400' :
                  indicators.ichimoku.signal === 'bearish' ? 'bg-red-500/20 text-red-400' :
                  'bg-gray-500/20 text-gray-400'
                }`}>
                  {indicators.ichimoku.signal.toUpperCase()}
                </span>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-400">Tenkan-sen:</span>
                  <span className="text-orange-400">${indicators.ichimoku.tenkanSen.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Kijun-sen:</span>
                  <span className="text-cyan-400">${indicators.ichimoku.kijunSen.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Senkou Span A:</span>
                  <span className="text-green-400">${indicators.ichimoku.senkouSpanA.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Senkou Span B:</span>
                  <span className="text-red-400">${indicators.ichimoku.senkouSpanB.toLocaleString()}</span>
                </div>
              </div>
            </div>
          )}

          {/* Support & Resistance */}
          {indicators.supportResistance && (
            <div className="card">
              <div className="flex items-center space-x-3 mb-4">
                <ArrowTrendingUpIcon className="h-5 w-5 text-yellow-400" />
                <h3 className="text-lg font-semibold">Destek & Direnç</h3>
              </div>
              <div className="space-y-4">
                <div>
                  <h4 className="text-sm font-medium text-gray-400 mb-2">Direnç Seviyeleri:</h4>
                  <div className="space-y-1">
                    {indicators.supportResistance.resistances.slice(0, 3).map((level, index) => (
                      <div key={index} className="flex justify-between text-sm">
                        <span className="text-gray-400">R{index + 1}:</span>
                        <span className="text-red-400">${level.toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-400 mb-2">Destek Seviyeleri:</h4>
                  <div className="space-y-1">
                    {indicators.supportResistance.supports.slice(-3).reverse().map((level, index) => (
                      <div key={index} className="flex justify-between text-sm">
                        <span className="text-gray-400">S{index + 1}:</span>
                        <span className="text-green-400">${level.toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Fibonacci Levels */}
          {indicators.fibonacci && (
            <div className="card">
              <div className="flex items-center space-x-3 mb-4">
                <ArrowTrendingDownIcon className="h-5 w-5 text-amber-400" />
                <h3 className="text-lg font-semibold">Fibonacci Seviyeleri</h3>
              </div>
              <div className="space-y-2">
                {indicators.fibonacci.slice(0, 5).map((fib, index) => (
                  <div key={index} className="flex justify-between text-sm">
                    <span className="text-gray-400">{fib.label}:</span>
                    <span className="text-amber-400">${fib.price.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Refresh Button */}
      <div className="flex justify-center">
        <button
          onClick={fetchAnalysis}
          disabled={loading}
          className="btn-primary flex items-center space-x-2"
        >
          <ClockIcon className="h-4 w-4" />
          <span>Analizi Yenile</span>
        </button>
      </div>
    </div>
  );
};

export default AdvancedAnalysisPanel;