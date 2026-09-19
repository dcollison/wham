import React from 'react';
import { Compass, MessageSquare, BarChart2, Users } from 'lucide-react';

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
  const tabs: TabItem[] = [
    { id: 'boulders', label: 'Boulders', icon: Compass, hash: '#/boulders' },
    { id: 'beta', label: 'Beta Feed', icon: MessageSquare, hash: '#/beta', badge: unreadCommentsCount },
    { id: 'stats', label: 'Analytics', icon: BarChart2, hash: '#/stats' },
    { id: 'settings', label: 'The Circle', icon: Users, hash: '#/settings' },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-slate-950/95 backdrop-blur-lg border-t border-slate-800/80 px-4 py-2">
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
              className={`flex flex-col items-center justify-center py-1 rounded-xl transition-all active-press relative ${
                isActive
                  ? 'text-amber-400 font-bold'
                  : 'text-slate-400 hover:text-slate-200 font-medium'
              }`}
            >
              <div className="relative">
                <Icon className={`w-5 h-5 ${isActive ? 'stroke-[2.5]' : 'stroke-2'}`} />
                {Boolean(tab.badge && tab.badge > 0) && (
                  <span className="absolute -top-1 -right-1.5 w-3.5 h-3.5 bg-amber-500 text-black text-[9px] font-black rounded-full flex items-center justify-center">
                    {tab.badge}
                  </span>
                )}
              </div>
              <span className="text-[11px] mt-1">{tab.label}</span>
            </a>
          );
        })}
      </div>
    </nav>
  );
};
