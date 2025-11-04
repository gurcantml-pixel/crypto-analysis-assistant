/**
 * AI Opinion Modal - Second Opinion from AI
 * 
 * Kullanıcı deterministik karardan emin değilse,
 * AI'dan ikinci görüş alabilir (opsiyonel, maliyetli).
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  XMarkIcon,
  SparklesIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
  NewspaperIcon,
} from '@heroicons/react/24/outline';
import { DecisionResult, AIOpinionResult } from '../types';
import * as aiAnalysisService from '../services/aiAnalysisService';

interface AIOpinionModalProps {
  isOpen: boolean;
  onClose: () => void;
  primaryDecision: DecisionResult;
  symbol: string;
  allData: any; // Full analysis data
}

const AIOpinionModal: React.FC<AIOpinionModalProps> = ({
  isOpen,
  onClose,
  primaryDecision,
  symbol,
  allData
}) => {
  const [includeNews, setIncludeNews] = useState(false);
  const [aiOpinion, setAIOpinion] = useState<AIOpinionResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAnalyze = async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await aiAnalysisService.getSecondOpinion({
        primaryDecision,
        symbol,
        allData,
        includeNews
      });

      setAIOpinion(result);
    } catch (err: any) {
      console.error('AI opinion error:', err);
      setError(err.message || 'AI servisi şu anda kullanılamıyor. Lütfen daha sonra tekrar deneyin.');
    } finally {
      setLoading(false);
    }
  };

  const getAgreementIcon = (agreement: string) => {
    switch (agreement) {
      case 'AGREE':
        return <CheckCircleIcon className="h-8 w-8 text-green-400" />;
      case 'DISAGREE':
        return <XCircleIcon className="h-8 w-8 text-red-400" />;
      case 'PARTIAL':
      default:
        return <ExclamationTriangleIcon className="h-8 w-8 text-yellow-400" />;
    }
  };

  const getAgreementBg = (agreement: string) => {
    switch (agreement) {
      case 'AGREE':
        return 'bg-green-900/30 border-green-600/30';
      case 'DISAGREE':
        return 'bg-red-900/30 border-red-600/30';
      case 'PARTIAL':
      default:
        return 'bg-yellow-900/30 border-yellow-600/30';
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-dark-900 rounded-2xl border border-primary-600/30 shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
              {/* Header */}
              <div className="sticky top-0 bg-dark-900 border-b border-gray-700 p-6 flex items-center justify-between z-10">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl flex items-center justify-center">
                    <SparklesIcon className="h-7 w-7 text-white" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-white">🤖 AI Karar Motoru</h2>
                    <p className="text-gray-400 text-sm">İkinci görüş için yapay zeka analizi</p>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
                  title="Kapat"
                >
                  <XMarkIcon className="h-6 w-6 text-gray-400" />
                </button>
              </div>

              {/* Content */}
              <div className="p-6 space-y-6">
                {/* Primary Decision Summary */}
                <div className="bg-dark-800 rounded-xl p-5 border border-gray-700">
                  <h3 className="text-white font-bold mb-3 flex items-center">
                    <span className="mr-2">📊</span> Deterministik Karar Özeti
                  </h3>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <p className="text-gray-400 text-xs mb-1">Sinyal</p>
                      <p className={`text-xl font-bold ${
                        primaryDecision.verdict === 'BUY' ? 'text-green-400' :
                        primaryDecision.verdict === 'SELL' ? 'text-red-400' :
                        'text-gray-400'
                      }`}>
                        {primaryDecision.verdict}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-400 text-xs mb-1">Güven</p>
                      <p className="text-white text-xl font-bold">
                        {(primaryDecision.confidence * 100).toFixed(0)}%
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-400 text-xs mb-1">Skor</p>
                      <p className="text-white text-xl font-bold">
                        {primaryDecision.score.toFixed(0)}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Options */}
                {!aiOpinion && !loading && (
                  <div className="space-y-4">
                    <label className="flex items-center space-x-3 p-4 bg-dark-800 rounded-xl border border-gray-700 cursor-pointer hover:border-primary-600/50 transition-colors">
                      <input
                        type="checkbox"
                        checked={includeNews}
                        onChange={(e) => setIncludeNews(e.target.checked)}
                        className="w-5 h-5 rounded border-gray-600 text-primary-600 focus:ring-2 focus:ring-primary-500"
                      />
                      <NewspaperIcon className="h-6 w-6 text-primary-400" />
                      <div className="flex-1">
                        <p className="text-white font-medium">Haberleri de Araştır</p>
                        <p className="text-gray-400 text-sm">
                          Son haber başlıklarını da analize dahil et (ek token maliyeti)
                        </p>
                      </div>
                    </label>

                    <button
                      onClick={handleAnalyze}
                      disabled={loading}
                      className="w-full py-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 disabled:from-gray-600 disabled:to-gray-700 text-white font-bold rounded-xl transition-all duration-200 flex items-center justify-center space-x-2"
                    >
                      <SparklesIcon className="h-5 w-5" />
                      <span>{loading ? 'Analiz Ediliyor...' : 'AI ile Analiz Et'}</span>
                    </button>

                    <div className="text-center text-xs text-gray-500">
                      <p>💰 Tahmini maliyet: ~$0.02 (GPT-4o-mini)</p>
                      <p className="mt-1">Bu analiz OpenAI API'yi kullanır ve token tüketir</p>
                    </div>
                  </div>
                )}

                {/* Loading State */}
                {loading && (
                  <div className="text-center py-16">
                    <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-purple-500 mx-auto mb-6"></div>
                    <p className="text-white text-lg font-medium mb-2">AI Analiz Ediyor...</p>
                    <p className="text-gray-400 text-sm">
                      {includeNews 
                        ? 'Teknik göstergeler ve haber akışı değerlendiriliyor...'
                        : 'Teknik göstergeler değerlendiriliyor...'
                      }
                    </p>
                  </div>
                )}

                {/* Error State */}
                {error && (
                  <div className="bg-red-900/20 border border-red-600/30 rounded-xl p-6">
                    <div className="flex items-center space-x-3 mb-3">
                      <XCircleIcon className="h-8 w-8 text-red-400" />
                      <h3 className="text-red-400 font-bold text-lg">Hata Oluştu</h3>
                    </div>
                    <p className="text-gray-300">{error}</p>
                    <button
                      onClick={() => setError(null)}
                      className="mt-4 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
                    >
                      Tekrar Dene
                    </button>
                  </div>
                )}

                {/* AI Result */}
                {aiOpinion && !loading && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-6"
                  >
                    {/* Agreement Status */}
                    <div className={`rounded-xl p-6 border-2 ${getAgreementBg(aiOpinion.agreement)}`}>
                      <div className="flex items-center space-x-4 mb-4">
                        {getAgreementIcon(aiOpinion.agreement)}
                        <div className="flex-1">
                          <h3 className="text-white text-xl font-bold">
                            {aiOpinion.agreement === 'AGREE' && '✅ Karar Motoruyla Hemfikir'}
                            {aiOpinion.agreement === 'DISAGREE' && '⚠️ Farklı Görüş'}
                            {aiOpinion.agreement === 'PARTIAL' && '🤔 Kısmen Katılıyor'}
                          </h3>
                          <p className="text-gray-400 text-sm mt-1">
                            {new Date(aiOpinion.timestamp).toLocaleString('tr-TR')}
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-gray-400 text-sm mb-1">AI Önerisi</p>
                          <p className={`text-2xl font-bold ${
                            aiOpinion.verdict === 'BUY' ? 'text-green-400' :
                            aiOpinion.verdict === 'SELL' ? 'text-red-400' :
                            'text-gray-400'
                          }`}>
                            {aiOpinion.verdict}
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-400 text-sm mb-1">AI Güven</p>
                          <p className="text-white text-2xl font-bold">
                            {(aiOpinion.confidence * 100).toFixed(0)}%
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Detailed Explanation */}
                    <div className="bg-dark-800 rounded-xl p-6 border border-gray-700">
                      <h4 className="text-white font-bold text-lg mb-4 flex items-center">
                        <span className="mr-2">💡</span> Detaylı Açıklama
                      </h4>
                      <p className="text-gray-300 leading-relaxed whitespace-pre-line">
                        {aiOpinion.explanation}
                      </p>
                    </div>

                    {/* News Impact */}
                    {aiOpinion.newsImpact && (
                      <div className="bg-blue-900/20 border border-blue-600/30 rounded-xl p-6">
                        <h4 className="text-blue-400 font-bold text-lg mb-4 flex items-center">
                          <NewspaperIcon className="h-6 w-6 mr-2" />
                          Haber Etkisi
                        </h4>
                        <p className="text-gray-300 leading-relaxed">
                          {aiOpinion.newsImpact}
                        </p>
                      </div>
                    )}

                    {/* Alternative Scenarios */}
                    {aiOpinion.scenarios.length > 0 && (
                      <div className="bg-dark-800 rounded-xl p-6 border border-gray-700">
                        <h4 className="text-white font-bold text-lg mb-4 flex items-center">
                          <span className="mr-2">🔮</span> Alternatif Senaryolar
                        </h4>
                        <ul className="space-y-3">
                          {aiOpinion.scenarios.map((scenario, idx) => (
                            <li key={idx} className="flex items-start space-x-3">
                              <span className="text-primary-400 font-bold">{idx + 1}.</span>
                              <p className="text-gray-300 flex-1">{scenario}</p>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex space-x-3">
                      <button
                        onClick={() => {
                          setAIOpinion(null);
                          setError(null);
                        }}
                        className="flex-1 py-3 bg-gray-700 hover:bg-gray-600 text-white font-medium rounded-xl transition-colors"
                      >
                        Yeni Analiz
                      </button>
                      <button
                        onClick={onClose}
                        className="flex-1 py-3 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-xl transition-colors"
                      >
                        Kapat
                      </button>
                    </div>
                  </motion.div>
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default AIOpinionModal;
