import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
  HomeIcon,
  ChartBarIcon,
  CurrencyDollarIcon,
  NewspaperIcon,
  Cog6ToothIcon,
  ChevronDoubleLeftIcon,
  ChevronDoubleRightIcon,
} from '@heroicons/react/24/outline';

const Sidebar: React.FC = () => {
  const [isCollapsed, setIsCollapsed] = useState(false);

  const navigation = [
    { name: 'Dashboard', href: '/', icon: HomeIcon },
    { name: 'Trading', href: '/trading', icon: CurrencyDollarIcon },
    { name: 'Analiz', href: '/analysis', icon: ChartBarIcon },
    { name: 'Haberler', href: '/news', icon: NewspaperIcon },
    { name: 'Ayarlar', href: '/settings', icon: Cog6ToothIcon },
  ];

  return (
    <div className={`bg-dark-800 border-r border-dark-700 transition-all duration-300 flex-shrink-0 ${
      isCollapsed ? 'w-16' : 'w-48 md:w-64'
    }`}>
      <div className="flex items-center justify-between p-3 md:p-4">
        {!isCollapsed && (
          <div className="flex items-center space-x-2">
            <div className="w-7 h-7 md:w-8 md:h-8 bg-gradient-to-r from-primary-400 to-primary-600 rounded-lg flex items-center justify-center">
              <CurrencyDollarIcon className="h-4 w-4 md:h-5 md:w-5 text-white" />
            </div>
            <span className="text-white font-bold text-base md:text-lg">Trading</span>
          </div>
        )}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="p-1.5 rounded-lg hover:bg-dark-700 text-gray-400 hover:text-white transition-colors"
          title={isCollapsed ? 'Menüyü Genişlet' : 'Menüyü Daralt'}
        >
          {isCollapsed ? (
            <ChevronDoubleRightIcon className="h-5 w-5" />
          ) : (
            <ChevronDoubleLeftIcon className="h-5 w-5" />
          )}
        </button>
      </div>

      <nav className="mt-6 md:mt-8 px-2 md:px-4">
        <ul className="space-y-1 md:space-y-2">
          {navigation.map((item) => (
            <li key={item.name}>
              <NavLink
                to={item.href}
                className={({ isActive }) =>
                  `flex items-center px-2 md:px-3 py-2.5 md:py-3 rounded-lg text-xs md:text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-primary-600 text-white shadow-lg'
                      : 'text-gray-300 hover:bg-dark-700 hover:text-white'
                  }`
                }
                title={item.name}
              >
                <item.icon className={`${isCollapsed ? 'h-6 w-6' : 'h-5 w-5'} ${isCollapsed ? '' : 'mr-3'}`} />
                {!isCollapsed && item.name}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      {!isCollapsed && (
        <div className="mt-auto p-4 border-t border-dark-700">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gradient-to-r from-success-400 to-success-600 rounded-full flex items-center justify-center">
              <span className="text-white text-sm font-bold">U</span>
            </div>
            <div>
              <p className="text-white text-sm font-medium">Kullanıcı</p>
              <p className="text-gray-400 text-xs">Trading Asistanı</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Sidebar;