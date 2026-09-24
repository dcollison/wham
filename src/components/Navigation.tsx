import React from 'react';
import { Compass, Zap, BarChart2, Users } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface NavigationProps {
  currentTab: 'boulders' | 'beta' | 'stats' | 'settings';
  onSelectTab: (tab: 'boulders' | 'beta' | 'stats' | 'settings') => void;
  unreadCommentsCount?: number;
}

interface TabItem {
  id: 'boulders' | 'beta' | 'stats' | 'settings';
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
  const activeColor = currentUser?.accent_color || '#3B82F6';

  const tabs: TabItem[] = [
    { id: 'boulders', label: 'Boulders', icon: Compass, hash: '#/boulders' },
    { id: 'beta', label: 'Crew Feed', icon: Zap, hash: '#/feed', badge: unreadCommentsCount },
    { id: 'stats', label: 'Analytics', icon: BarChart2, hash: '#/stats' },
    { id: 'settings', label: 'The Circle', icon: Users, hash: '#/settings' },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-slate-950/90 backdrop-blur-xl border-t border-white/[0.06] px-3 pt-2 pb-safe shadow-[0_-4px_24px_rgba(0,0,0,0.35)]">
      <div className="max-w-md mx-auto grid grid-cols-4 gap-1">
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
              {/* Material You Pill Indicator for Icon */}
              <div
                className={`relative px-4 sm:px-5 py-1.5 rounded-full transition-all duration-200 flex items-center justify-center ${
                  isActive ? 'shadow-xs' : 'bg-transparent'
                }`}
                style={isActive ? { backgroundColor: `${activeColor}22` } : undefined}
              >
                <Icon
                  className={`w-5 h-5 transition-transform duration-200 ${
                    isActive ? 'stroke-[2.5] scale-105' : 'stroke-[1.8] text-slate-400 group-hover:text-slate-200'
                  }`}
                  style={isActive ? { color: activeColor } : undefined}
                />
                {Boolean(tab.badge && tab.badge > 0) && (
                  <span
                    className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 text-slate-950 text-[10px] font-black rounded-full flex items-center justify-center shadow-md animate-pulse"
                    style={{ backgroundColor: activeColor }}
                  >
                    {tab.badge}
                  </span>
                )}
              </div>
              <span
                className={`text-[11px] mt-1 tracking-tight transition-colors duration-150 ${
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
