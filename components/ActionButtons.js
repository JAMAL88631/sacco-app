import React from 'react';
import { Send, LogOut, Plus, FileText } from 'lucide-react';

export default function ActionButtons({ onActionClick }) {
  const actions = [
    {
      id: 'send',
      label: 'Send Money',
      icon: Send,
      color: 'bg-blue-500',
      description: 'Transfer funds',
      onClick: () => onActionClick?.('send')
    },
    {
      id: 'withdraw',
      label: 'Withdraw',
      icon: LogOut,
      color: 'bg-orange-500',
      description: 'Cash out',
      onClick: () => onActionClick?.('withdraw')
    },
    {
      id: 'deposit',
      label: 'Deposit',
      icon: Plus,
      color: 'bg-green-500',
      description: 'Add funds',
      onClick: () => onActionClick?.('deposit')
    },
    {
      id: 'pay',
      label: 'Pay Bill',
      icon: FileText,
      color: 'bg-purple-500',
      description: 'Pay bills',
      onClick: () => onActionClick?.('pay')
    }
  ];

  return (
    <div className="px-4 py-6">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-slate-900">Quick Actions</h2>
        <p className="text-slate-600 text-sm">What would you like to do today?</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {actions.map((action) => {
          const IconComponent = action.icon;
          return (
            <button
              key={action.id}
              onClick={action.onClick}
              className="group relative overflow-hidden bg-white border-2 border-slate-200 rounded-2xl p-6 transition-all duration-300 hover:border-slate-300 hover:shadow-md active:scale-95 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
            >
              {/* Background gradient on hover */}
              <div className="absolute inset-0 bg-gradient-to-br from-slate-50 to-slate-100 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>

              {/* Content */}
              <div className="relative z-10 flex flex-col items-center justify-center space-y-3">
                {/* Icon Circle */}
                <div className={`${action.color} p-3 rounded-full transition-all duration-300 group-hover:scale-110 shadow-md`}>
                  <IconComponent className="w-6 h-6 text-white" />
                </div>

                {/* Label */}
                <div>
                  <p className="font-bold text-slate-900 text-sm leading-tight">{action.label}</p>
                  <p className="text-slate-500 text-xs mt-1">{action.description}</p>
                </div>
              </div>

              {/* Hover border glow effect */}
              <div className="absolute inset-0 border-2 border-transparent group-hover:border-green-200 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            </button>
          );
        })}
      </div>

      {/* Recent Transaction Preview */}
      <div className="mt-8 bg-slate-50 rounded-xl p-4 border border-slate-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
              <LogOut className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-900">Withdrawal Pending</p>
              <p className="text-xs text-slate-600">KSh 5,000 • Today</p>
            </div>
          </div>
          <p className="text-sm font-bold text-orange-600">-KSh 5,000</p>
        </div>
      </div>
    </div>
  );
}
