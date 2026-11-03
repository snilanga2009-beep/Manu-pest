import React from 'react';
import { Home, Calendar, Briefcase, User, Clock } from 'lucide-react';

export default function MobileBottomNav({ activeTab, onTabChange, todayJobsCount = 0, currentRole = 'TECHNICIAN' }) {
  const isManager = currentRole === 'MANAGER';

  const navItems = isManager
    ? [
        { id: 'mobile_home', label: 'TODAY', icon: Home, badge: todayJobsCount },
        { id: 'tomorrow_tab', label: 'TOMORROW', icon: Clock },
        { id: 'calendar', label: 'CALENDAR', icon: Calendar },
        { id: 'jobs', label: 'ALL JOBS', icon: Briefcase },
        { id: 'profile', label: 'PROFILE', icon: User }
      ]
    : [
        { id: 'mobile_home', label: 'TODAY JOBS', icon: Home, badge: todayJobsCount },
        { id: 'profile', label: 'PROFILE', icon: User }
      ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-xl border-t border-purple-100 shadow-[0_-8px_28px_rgba(76,29,149,0.12)] pb-[env(safe-area-inset-bottom,0px)] select-none">
      <div className={`max-w-4xl mx-auto grid ${isManager ? 'grid-cols-5' : 'grid-cols-2'} h-16 px-1 sm:px-3`}>
        {navItems.map(item => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onTabChange(item.id)}
              className={`relative flex flex-col items-center justify-center gap-1 transition-all cursor-pointer active:scale-95 ${
                isActive ? 'text-[#5B21B6]' : 'text-slate-400 hover:text-purple-700'
              }`}
            >
              {/* Active top indicator pill */}
              {isActive && (
                <span className="absolute top-0 w-9 h-1 rounded-b-full bg-gradient-to-r from-[#F97316] to-[#FF8A00]" />
              )}

              <div className={`relative p-1.5 rounded-2xl transition-colors ${isActive ? 'bg-purple-100/80 text-[#5B21B6]' : ''}`}>
                <Icon className={`w-5 h-5 ${isActive ? 'stroke-[2.5px]' : 'stroke-[1.75px]'}`} />
                {item.badge > 0 && (
                  <span className="absolute -top-1 -right-1.5 min-w-[17px] h-[17px] px-1 rounded-full bg-gradient-to-r from-[#F97316] to-[#EA580C] text-white text-[9px] font-black flex items-center justify-center shadow-xs">
                    {item.badge}
                  </span>
                )}
              </div>

              <span className={`text-[9px] sm:text-[10px] tracking-tight leading-none ${isActive ? 'font-black text-[#4C1D95]' : 'font-semibold'}`}>
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
