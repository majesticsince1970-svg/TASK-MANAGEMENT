import { NavLink, useNavigate } from 'react-router-dom';
import { Home, CheckSquare, Plus, Bell, User } from 'lucide-react';
import { cn } from '@/lib/utils';

const TABS = [
  { to: '/', icon: Home, label: 'Home' },
  { to: '/tasks', icon: CheckSquare, label: 'Tasks' },
  { to: '/tasks/new', icon: Plus, label: 'New', special: true },
  { to: '/notifications', icon: Bell, label: 'Inbox' },
  { to: '/me', icon: User, label: 'Me' },
];

export function MobileNav() {
  const navigate = useNavigate();

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-[#E5DDD3] z-50">
      <div className="flex items-center justify-around h-16 px-2">
        {TABS.map((tab) => {
          const Icon = tab.icon;

          if (tab.special) {
            return (
              <button
                key={tab.to}
                onClick={() => navigate(tab.to)}
                className="w-12 h-12 -mt-4 bg-[var(--color-maroon)] rounded-full flex items-center justify-center shadow-lg active:scale-95 transition-transform"
              >
                <Icon className="w-6 h-6 text-white" />
              </button>
            );
          }

          return (
            <NavLink
              key={tab.to}
              to={tab.to}
              end={tab.to === '/'}
              className={({ isActive }) =>
                cn(
                  'flex flex-col items-center gap-0.5 py-1 px-3 rounded-lg transition-colors min-w-[48px]',
                  isActive ? 'text-[var(--color-maroon)]' : 'text-[var(--color-ink)]/40'
                )
              }
            >
              <Icon className="w-5 h-5" />
              <span className="text-[10px] font-medium">{tab.label}</span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}

