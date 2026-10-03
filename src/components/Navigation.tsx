import React from 'react';
import { Compass, Zap, Trophy, BarChart3, Users } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface NavigationProps {
  currentTab: 'boulders' | 'beta' | 'comp' | 'stats' | 'settings';
  onSelectTab: (tab: 'boulders' | 'beta' | 'comp' | 'stats' | 'settings') => void;
  unreadCommentsCount?: number;
}

interface TabItem {
  id: 'boulders' | 'beta' | 'comp' | 'stats' | 'settings';
  label: string;
  icon: typeof Compass;
  hash: string;
  badge?: number;
}

export const Navigation: React.FC<NavigationProps> = ({
  currentTab,
  onSelectTab,
  unreadCommentsCount = 0
}) => {
  const { currentUser } = useAuth();
  const activeColor = currentUser?.accent_color || '#F59E0B';

  const tabs: TabItem[] = [
    { id: 'boulders', label: 'Boulders', icon: Compass, hash: '#/boulders' },
    { id: 'beta', label: 'Activity', icon: Zap, hash: '#/feed', badge: unreadCommentsCount },
    { id: 'comp', label: 'Comp', icon: Trophy, hash: '#/comp' },
    { id: 'stats', label: 'Analytics', icon: BarChart3, hash: '#/stats' },
    { id: 'settings', label: 'Crew', icon: Users, hash: '#/settings' },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-carbon/92 backdrop-blur-2xl border-t border-white/[0.07] px-2 sm:px-3 pt-2 pb-safe shadow-[0_-8px_32px_rgba(0,0,0,0.65)]">
      <div className="max-w-lg mx-auto grid grid-cols-5 gap-0.5 sm:gap-1">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = currentTab === tab.id;

          return (
            <a
              key={tab.id}
              href={tab.hash}
              onClick={(e) => {
                e.preventDefault();
                window.location.hash = tab.hash;
                onSelectTab(tab.id);
              }}
              className="group flex flex-col items-center justify-center py-1 transition-all active-press select-none"
            >
              {/* Tonal Indicator Pill */}
              <div
                className={`relative px-2.5 sm:px-4 py-1.5 rounded-full transition-all duration-200 flex items-center justify-center border ${
                  isActive
                    ? 'bg-surface-elevated/90 border-white/[0.12] shadow-xs'
                    : 'bg-transparent border-transparent'
                }`}
              >
                <Icon
                  className={`w-5 h-5 transition-transform duration-200 ${
                    isActive ? 'stroke-[2.5] scale-105' : 'stroke-[1.8] text-slate-400 group-hover:text-slate-200'
                  }`}
                  style={isActive ? { color: activeColor } : undefined}
                />
                {Boolean(tab.badge && tab.badge > 0) && (
                  <span
                    className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 text-slate-950 text-[10px] font-mono font-black rounded-full flex items-center justify-center shadow-md animate-pulse"
                    style={{ backgroundColor: activeColor }}
                  >
                    {tab.badge}
                  </span>
                )}
              </div>
              <span
                className={`text-[10px] mt-1 tracking-tight font-heading transition-colors duration-150 uppercase ${
                  isActive ? 'font-bold text-white' : 'font-medium text-slate-400 group-hover:text-slate-300'
                }`}
                style={isActive ? { color: activeColor } : undefined}
              >
                {tab.label}
              </span>
            </a>
          );
        })}
      </div>
    </nav>
  );
};
