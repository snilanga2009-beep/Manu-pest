import React from 'react';
import { Home, Clock, Calendar, Briefcase, User } from 'lucide-react';

export default function MobileBottomNav({ activeTab, onTabChange, todayJobsCount = 0 }) {
  const tabs = [
    { id: 'mobile_home', label: 'TODAY', icon: Home, badge: todayJobsCount },
    { id: 'tomorrow_tab', label: 'TOMORROW', icon: Clock },
    { id: 'calendar', label: 'CALENDAR', icon: Calendar },
    { id: 'jobs', label: 'ALL JOBS', icon: Briefcase },
    { id: 'profile', label: 'PROFILE', icon: User }
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-purple-100 z-40 px-2 pt-2 pb-[calc(env(safe-area-inset-bottom,0px)+0.5rem)] flex items-center justify-around shadow-[0_-8px_30px_rgba(76,29,149,0.12)] safe-area-bottom">
      <div className="w-full max-w-3xl mx-auto flex items-center justify-around">
        {tabs.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onTabChange(tab.id)}
              className={`flex flex-col items-center justify-center flex-1 py-1 px-1 transition relative cursor-pointer ${
                isActive ? 'text-[#5B21B6]' : 'text-slate-400 hover:text-slate-700'
              }`}
            >
              <div className={`relative p-1.5 rounded-2xl transition-all ${
                isActive
                  ? 'bg-gradient-to-tr from-[#5B21B6] to-[#F97316] text-white shadow-md shadow-purple-500/25 -translate-y-0.5'
                  : 'text-slate-400'
              }`}>
                <Icon className="w-5 h-5 sm:w-5 sm:h-5 stroke-[2.25px]" />
                {tab.badge !== undefined && tab.badge > 0 && (
                  <span className="absolute -top-1 -right-1.5 bg-[#F97316] text-white text-[9px] font-black min-w-[16px] h-4 px-1 rounded-full flex items-center justify-center shadow-xs border border-white">
                    {tab.badge}
                  </span>
                )}
              </div>
              <span className={`text-[9px] sm:text-[10px] tracking-wide mt-0.5 font-black ${
                isActive ? 'text-[#4C1D95]' : 'text-slate-500'
              }`}>
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
