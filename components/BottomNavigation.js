import React, { useState } from 'react';
import { Home, Send, Wallet, Settings, MoreVertical } from 'lucide-react';

export default function BottomNavigation({ activeTab = 'home', onTabChange }) {
  const [showMore, setShowMore] = useState(false);

  const navItems = [
    {
      id: 'home',
      label: 'Home',
      icon: Home,
      onClick: () => onTabChange?.('home')
    },
    {
      id: 'send',
      label: 'Send',
      icon: Send,
      onClick: () => onTabChange?.('send')
    },
    {
      id: 'savings',
      label: 'Savings',
      icon: Wallet,
      onClick: () => onTabChange?.('savings')
    },
    {
      id: 'settings',
      label: 'Settings',
      icon: Settings,
      onClick: () => onTabChange?.('settings')
    }
  ];

  return (
    <>
      {/* Fixed Bottom Navigation Bar */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 shadow-2xl z-40">
        <div className="max-w-md mx-auto px-4 py-3">
          <div className="flex items-center justify-around">
            {navItems.map((item) => {
              const IconComponent = item.icon;
              const isActive = activeTab === item.id;

              return (
                <button
                  key={item.id}
                  onClick={item.onClick}
                  className={`flex flex-col items-center justify-center py-2 px-3 rounded-lg transition-all duration-300 group relative`}
                >
                  {/* Background for active state */}
                  {isActive && (
                    <div className="absolute inset-0 bg-green-50 rounded-lg"></div>
                  )}

                  {/* Icon and Label */}
                  <div className="relative z-10 flex flex-col items-center">
                    <div
                      className={`${
                        isActive
                          ? 'text-green-600'
                          : 'text-slate-600 group-hover:text-slate-900'
                      } transition-colors duration-300`}
                    >
                      <IconComponent className="w-6 h-6" />
                    </div>
                    <span
                      className={`text-xs font-medium mt-1 ${
                        isActive
                          ? 'text-green-600'
                          : 'text-slate-600 group-hover:text-slate-900'
                      } transition-colors duration-300`}
                    >
                      {item.label}
                    </span>
                  </div>

                  {/* Active indicator dot */}
                  {isActive && (
                    <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-green-600 rounded-full"></div>
                  )}
                </button>
              );
            })}

            {/* More Button */}
            <div className="relative">
              <button
                onClick={() => setShowMore(!showMore)}
                className="flex flex-col items-center justify-center py-2 px-3 rounded-lg transition-all duration-300 group"
              >
                <div className="text-slate-600 group-hover:text-slate-900 transition-colors duration-300">
                  <MoreVertical className="w-6 h-6" />
                </div>
              </button>

              {/* More Menu Dropdown */}
              {showMore && (
                <div className="absolute bottom-full right-0 mb-2 bg-white border border-slate-200 rounded-lg shadow-lg p-2 min-w-max">
                  <button className="flex items-center space-x-3 px-4 py-2 hover:bg-slate-50 rounded-md transition-colors duration-300 text-sm font-medium text-slate-700 w-full text-left">
                    <Wallet className="w-4 h-4" />
                    <span>Loans</span>
                  </button>
                  <button className="flex items-center space-x-3 px-4 py-2 hover:bg-slate-50 rounded-md transition-colors duration-300 text-sm font-medium text-slate-700 w-full text-left">
                    <Send className="w-4 h-4" />
                    <span>History</span>
                  </button>
                  <button className="flex items-center space-x-3 px-4 py-2 hover:bg-slate-50 rounded-md transition-colors duration-300 text-sm font-medium text-slate-700 w-full text-left">
                    <Home className="w-4 h-4" />
                    <span>Support</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Spacer to prevent content from being hidden behind fixed nav */}
      <div className="h-20"></div>

      {/* Overlay when dropdown is open */}
      {showMore && (
        <div
          className="fixed inset-0 z-30"
          onClick={() => setShowMore(false)}
        ></div>
      )}
    </>
  );
}
