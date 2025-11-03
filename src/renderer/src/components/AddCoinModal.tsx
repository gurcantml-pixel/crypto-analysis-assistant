import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { XMarkIcon, MagnifyingGlassIcon, PlusIcon, ChartBarIcon } from '@heroicons/react/24/outline';
import { usePortfolioStore } from '../store/portfolioStore';

interface Coin {
  id: string;
  symbol: string;
  name: string;
  image?: string;
}

interface AddCoinModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// Popular coins listesi (fallback)
const POPULAR_COINS: Coin[] = [
  { id: 'bitcoin', symbol: 'BTC', name: 'Bitcoin', image: 'https://assets.coingecko.com/coins/images/1/small/bitcoin.png' },
  { id: 'ethereum', symbol: 'ETH', name: 'Ethereum', image: 'https://assets.coingecko.com/coins/images/279/small/ethereum.png' },
  { id: 'binancecoin', symbol: 'BNB', name: 'BNB', image: 'https://assets.coingecko.com/coins/images/825/small/bnb-icon2_2x.png' },
  { id: 'solana', symbol: 'SOL', name: 'Solana', image: 'https://assets.coingecko.com/coins/images/4128/small/solana.png' },
  { id: 'ripple', symbol: 'XRP', name: 'XRP', image: 'https://assets.coingecko.com/coins/images/44/small/xrp-symbol-white-128.png' },
  { id: 'cardano', symbol: 'ADA', name: 'Cardano', image: 'https://assets.coingecko.com/coins/images/975/small/cardano.png' },
  { id: 'dogecoin', symbol: 'DOGE', name: 'Dogecoin', image: 'https://assets.coingecko.com/coins/images/5/small/dogecoin.png' },
  { id: 'tron', symbol: 'TRX', name: 'TRON', image: 'https://assets.coingecko.com/coins/images/1094/small/tron-logo.png' },
  { id: 'chainlink', symbol: 'LINK', name: 'Chainlink', image: 'https://assets.coingecko.com/coins/images/877/small/chainlink-new-logo.png' },
  { id: 'polkadot', symbol: 'DOT', name: 'Polkadot', image: 'https://assets.coingecko.com/coins/images/12171/small/polkadot.png' },
  { id: 'avalanche-2', symbol: 'AVAX', name: 'Avalanche', image: 'https://assets.coingecko.com/coins/images/12559/small/coin-round-red.png' },
  { id: 'polygon', symbol: 'MATIC', name: 'Polygon', image: 'https://assets.coingecko.com/coins/images/4713/small/matic-token-icon.png' },
];

export default function AddCoinModal({ isOpen, onClose }: AddCoinModalProps) {
  const navigate = useNavigate();
  const { addToWatchlist, watchlist } = usePortfolioStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredCoins, setFilteredCoins] = useState<Coin[]>(POPULAR_COINS);
  const [isSearching, setIsSearching] = useState(false);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // CoinGecko Search API
  const searchCoins = async (query: string) => {
    if (query.trim().length < 2) {
      setFilteredCoins(POPULAR_COINS);
      return;
    }

    setIsSearching(true);
    
    try {
      const response = await window.electronAPI.apiRequest(
        `https://api.coingecko.com/api/v3/search?query=${encodeURIComponent(query)}`,
        { method: 'GET' }
      );

      if (response.ok && response.data.coins) {
        const coins: Coin[] = response.data.coins.slice(0, 20).map((coin: any) => ({
          id: coin.id,
          symbol: coin.symbol.toUpperCase(),
          name: coin.name,
          image: coin.large || coin.thumb
        }));
        
        setFilteredCoins(coins.length > 0 ? coins : POPULAR_COINS);
        console.log('🔍 CoinGecko Search Results:', coins.length, 'coins found');
      } else {
        console.warn('⚠️ CoinGecko search failed, using popular coins');
        setFilteredCoins(POPULAR_COINS);
      }
    } catch (error) {
      console.error('❌ CoinGecko search error:', error);
      setFilteredCoins(POPULAR_COINS);
    } finally {
      setIsSearching(false);
    }
  };

  // Debounced search
  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    if (searchQuery.trim() === '') {
      setFilteredCoins(POPULAR_COINS);
      setIsSearching(false);
      return;
    }

    debounceTimerRef.current = setTimeout(() => {
      searchCoins(searchQuery);
    }, 500); // 500ms debounce

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [searchQuery]);

  const handleAnalyze = (coin: Coin, e: React.MouseEvent) => {
    e.stopPropagation();
    onClose();
    navigate(`/analysis?coin=${coin.symbol}`);
  };

  const handleAddToWatchlist = (coin: Coin, e: React.MouseEvent) => {
    e.stopPropagation();
    addToWatchlist({
      id: coin.id,
      symbol: coin.symbol,
      name: coin.name,
      price: 0, // Anlık fiyat Dashboard'da güncellenecek
      change24h: 0,
      image: coin.image || ''
    });
    onClose();
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
            onClick={onClose}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
          >
            <div className="bg-gray-800 rounded-xl shadow-2xl border border-gray-700 w-full max-w-md max-h-[80vh] overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-gray-700">
                <h2 className="text-xl font-bold text-white">Coin Ekle</h2>
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
                  title="Kapat"
                >
                  <XMarkIcon className="h-5 w-5 text-gray-400" />
                </button>
              </div>

              {/* Search Box */}
              <div className="p-4 border-b border-gray-700">
                <div className="relative">
                  <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Coin ara (BTC, ETH, Solana...)"
                    className="w-full pl-10 pr-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-primary-500 transition-colors"
                    autoFocus
                  />
                  {isSearching && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500"></div>
                    </div>
                  )}
                </div>
              </div>

              {/* Coin List */}
              <div className="overflow-y-auto max-h-96 p-4">
                {isSearching ? (
                  <div className="text-center py-8 text-gray-400">
                    <div className="animate-pulse">
                      <p>Aranıyor...</p>
                    </div>
                  </div>
                ) : filteredCoins.length === 0 ? (
                  <div className="text-center py-8 text-gray-400">
                    <p>🔍 Coin bulunamadı</p>
                    <p className="text-sm mt-2">Başka bir arama yapın</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {filteredCoins.map((coin) => {
                      const isInWatchlist = watchlist.some(w => w.symbol === coin.symbol);
                      
                      return (
                        <div
                          key={coin.id}
                          className="flex items-center gap-2 p-3 rounded-lg bg-gray-700/50 hover:bg-gray-700/70 transition-all"
                        >
                          {/* Coin Info */}
                          <div className="flex items-center space-x-3 flex-1 min-w-0">
                            {coin.image ? (
                              <img
                                src={coin.image}
                                alt={coin.name}
                                className="w-8 h-8 rounded-full flex-shrink-0"
                                onError={(e) => {
                                  // Fallback: Show coin symbol instead
                                  const parent = e.currentTarget.parentElement;
                                  if (parent) {
                                    e.currentTarget.style.display = 'none';
                                    const fallback = document.createElement('div');
                                    fallback.className = 'w-8 h-8 bg-gradient-to-r from-primary-400 to-primary-600 rounded-full flex items-center justify-center flex-shrink-0';
                                    fallback.innerHTML = `<span class="text-white text-xs font-bold">${coin.symbol.slice(0, 2)}</span>`;
                                    parent.insertBefore(fallback, e.currentTarget);
                                  }
                                }}
                              />
                            ) : (
                              <div className="w-8 h-8 bg-gradient-to-r from-primary-400 to-primary-600 rounded-full flex items-center justify-center flex-shrink-0">
                                <span className="text-white text-xs font-bold">{coin.symbol.slice(0, 2)}</span>
                              </div>
                            )}
                            <div className="text-left min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <p className="text-white font-medium truncate">{coin.symbol}</p>
                                {isInWatchlist && (
                                  <span className="text-xs px-1.5 py-0.5 bg-green-600/20 text-green-400 rounded">
                                    Ekli
                                  </span>
                                )}
                              </div>
                              <p className="text-gray-400 text-sm truncate">{coin.name}</p>
                            </div>
                          </div>

                          {/* Action Buttons */}
                          <div className="flex gap-2 flex-shrink-0">
                            <button
                              onClick={(e) => handleAnalyze(coin, e)}
                              className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors text-sm font-medium text-white"
                              title="Analiz Sayfasına Git"
                            >
                              <ChartBarIcon className="h-4 w-4" />
                              <span className="hidden sm:inline">Analiz</span>
                            </button>
                            <button
                              onClick={(e) => handleAddToWatchlist(coin, e)}
                              disabled={isInWatchlist}
                              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg transition-colors text-sm font-medium text-white ${
                                isInWatchlist
                                  ? 'bg-gray-600 cursor-not-allowed opacity-50'
                                  : 'bg-green-600 hover:bg-green-700'
                              }`}
                              title={isInWatchlist ? 'Zaten Takip Listesinde' : 'Takip Listesine Ekle'}
                            >
                              <PlusIcon className="h-4 w-4" />
                              <span className="hidden sm:inline">{isInWatchlist ? 'Eklendi' : 'Ekle'}</span>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
