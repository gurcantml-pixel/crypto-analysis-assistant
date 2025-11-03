import React from 'react';
import { BellIcon, UserCircleIcon } from '@heroicons/react/24/outline';
import { usePortfolioStore } from '../../store/portfolioStore';

const Header: React.FC = () => {
  const { isConnected } = usePortfolioStore();

  return (
    <header className="bg-dark-800 border-b border-dark-700 px-4 md:px-6 py-3 md:py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2 md:space-x-4">
          <h1 className="text-lg md:text-xl font-semibold text-white truncate">
            Kripto Analiz Asistanı
          </h1>
          <div className="hidden lg:flex items-center space-x-2">
            <div className="flex items-center space-x-1 bg-success-900/20 px-3 py-1 rounded-full">
              <div className="w-2 h-2 bg-success-400 rounded-full animate-pulse"></div>
              <span className="text-success-400 text-sm font-medium">
                {isConnected ? 'Canlı Veriler' : 'Demo Mode'}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2 md:space-x-4">
          {/* Market verileri artık sadece Dashboard'da gösterilecek - Header'da duplicated data kaldırıldı */}

          <div className="flex items-center space-x-2 md:space-x-3">
            <button className="p-2 text-gray-400 hover:text-white hover:bg-dark-700 rounded-lg transition-colors relative">
              <BellIcon className="h-5 w-5" />
              <span className="absolute -top-1 -right-1 bg-primary-500 text-white text-xs rounded-full h-4 w-4 flex items-center justify-center">
                3
              </span>
            </button>

            <button title="Kullanıcı Profili" className="p-2 text-gray-400 hover:text-white hover:bg-dark-700 rounded-lg transition-colors">
              <UserCircleIcon className="h-6 w-6" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;