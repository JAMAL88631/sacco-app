import React, { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

export default function BalanceCard({ balance = 45250.50, userName = "John Doe" }) {
  const [showBalance, setShowBalance] = useState(true);

  return (
    <div className="px-4 py-6">
      <div className="relative bg-gradient-to-br from-green-600 to-green-700 rounded-2xl p-8 shadow-lg overflow-hidden">
        {/* Decorative background elements */}
        <div className="absolute top-0 right-0 w-40 h-40 bg-green-500 rounded-full opacity-10 -mr-20 -mt-20"></div>
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-green-400 rounded-full opacity-10 -ml-16 -mb-16"></div>

        {/* Card Content */}
        <div className="relative z-10 space-y-6">
          {/* Header with Eye Icon */}
          <div className="flex justify-between items-start">
            <div>
              <p className="text-green-100 text-sm font-medium">Current Balance</p>
            </div>
            <button
              onClick={() => setShowBalance(!showBalance)}
              className="p-2 hover:bg-green-500 rounded-lg transition-colors duration-200"
              aria-label="Toggle balance visibility"
            >
              {showBalance ? (
                <Eye className="w-5 h-5 text-white" />
              ) : (
                <EyeOff className="w-5 h-5 text-white" />
              )}
            </button>
          </div>

          {/* Balance Amount */}
          <div>
            <p className="text-white text-4xl font-bold tracking-tight">
              {showBalance ? `KSh ${balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '****'}
            </p>
          </div>

          {/* User Info */}
          <div className="pt-4 border-t border-green-500">
            <p className="text-green-100 text-sm font-medium">{userName}</p>
            <p className="text-green-200 text-xs mt-1">Member Account</p>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-3 gap-3 mt-6">
        <div className="bg-white border border-slate-200 rounded-xl p-4 text-center shadow-sm">
          <p className="text-slate-600 text-xs font-medium">Total Savings</p>
          <p className="text-slate-900 text-lg font-bold mt-2">KSh 125,500</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4 text-center shadow-sm">
          <p className="text-slate-600 text-xs font-medium">Active Loans</p>
          <p className="text-slate-900 text-lg font-bold mt-2">1</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4 text-center shadow-sm">
          <p className="text-slate-600 text-xs font-medium">Next Interest</p>
          <p className="text-slate-900 text-lg font-bold mt-2">KSh 456</p>
        </div>
      </div>
    </div>
  );
}
