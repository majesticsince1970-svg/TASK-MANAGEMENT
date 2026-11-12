import { NavLink, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/lib/auth';
import { cn } from '@/lib/utils';
import { useState, useEffect } from 'react';
import {
  Home, CheckSquare, ClipboardCheck, RotateCcw, FileText,
  FolderKanban, Brain, Radio, Users, MessageSquare,
  BarChart3, Settings, ChevronLeft, ChevronRight, LogOut,
  Gem, Bell, Clock,
} from 'lucide-react';

interface NavItem {
  to: string;
  icon: React.ElementType;
  labelKey: string;
  roles?: string[];
  badge?: number;
}

const NAV_GROUPS: { label: string; items: NavItem[] }[] = [
  {
    label: 'MAIN',
    items: [
      { to: '/', icon: Home, labelKey: 'nav.home' },
      { to: '/tasks', icon: CheckSquare, labelKey: 'nav.tasks' },
      { to: '/approvals', icon: ClipboardCheck, labelKey: 'nav.approvals', roles: ['owner', 'director', 'dept_head'] },
    ],
  },
  {
    label: 'MANAGE',
    items: [
      { to: '/routines', icon: RotateCcw, labelKey: 'nav.routines', roles: ['owner', 'dept_head'] },
      { to: '/templates', icon: FileText, labelKey: 'nav.templates', roles: ['owner', 'dept_head'] },
      { to: '/projects', icon: FolderKanban, labelKey: 'nav.projects' },
    ],
  },
  {
    label: 'INTELLIGENCE',
    items: [
      { to: '/ai', icon: Brain, labelKey: 'nav.ai', roles: ['owner', 'director', 'dept_head'] },
      { to: '/live', icon: Radio, labelKey: 'nav.live', roles: ['owner', 'director', 'dept_head'] },
    ],
  },
  {
    label: 'COMMUNICATION',
    items: [
      { to: '/messages', icon: MessageSquare, labelKey: 'nav.messages' },
      { to: '/notifications', icon: Bell, labelKey: 'nav.notifications' },
      { to: '/eod', icon: Clock, labelKey: 'nav.eod' },
    ],
  },
  {
    label: 'ADMIN',
    items: [
      { to: '/people', icon: Users, labelKey: 'nav.people', roles: ['owner', 'director', 'dept_head'] },
      { to: '/reports', icon: BarChart3, labelKey: 'nav.reports', roles: ['owner', 'director', 'dept_head'] },
      { to: '/settings', icon: Settings, labelKey: 'nav.settings', roles: ['owner'] },
    ],
  },
];

export function Sidebar() {
  const { t } = useTranslation();
  const { profile, signOut } = useAuth();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(() => {
    return localStorage.getItem('sidebar-collapsed') === 'true';
  });

  useEffect(() => {
    localStorage.setItem('sidebar-collapsed', String(collapsed));
  }, [collapsed]);

  const userRole = profile?.role || 'staff';

  return (
    <aside
      className={cn(
        'hidden md:flex flex-col border-r border-[#E5DDD3] bg-white transition-all duration-200 relative',
        collapsed ? 'w-[68px]' : 'w-[240px]'
      )}
    >
      {/* Brand */}
      <div className="flex items-center gap-3 p-4 border-b border-[#E5DDD3]">
        <div className="w-9 h-9 rounded-lg bg-[var(--color-maroon)] flex items-center justify-center shrink-0">
          <Gem className="w-5 h-5 text-[var(--color-gold)]" />
        </div>
        {!collapsed && (
          <span className="font-semibold text-[var(--color-ink)] text-sm tracking-tight">
            Majestic Ops
          </span>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-2 px-2 space-y-4">
        {NAV_GROUPS.map((group) => {
          const visibleItems = group.items.filter(
            (item) => !item.roles || item.roles.includes(userRole)
          );
          if (visibleItems.length === 0) return null;

          return (
            <div key={group.label}>
              {!collapsed && (
                <p className="px-3 pb-1 text-[10px] font-semibold text-[var(--color-ink)]/40 tracking-widest">
                  {group.label}
                </p>
              )}
              {visibleItems.map((item) => {
                const Icon = item.icon;
                const isActive = item.to === '/'
                  ? location.pathname === '/'
                  : location.pathname.startsWith(item.to);

                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    className={cn(
                      'flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors mb-0.5',
                      isActive
                        ? 'bg-[var(--color-maroon)] text-white'
                        : 'text-[var(--color-ink)]/70 hover:bg-[var(--color-ivory)]'
                    )}
                    title={collapsed ? t(item.labelKey) : undefined}
                  >
                    <Icon className="w-[18px] h-[18px] shrink-0" />
                    {!collapsed && <span>{t(item.labelKey)}</span>}
                    {!collapsed && item.badge && (
                      <span className="ml-auto bg-[var(--color-urgent)] text-white text-[10px] font-bold rounded-full px-1.5 py-0.5 min-w-[18px] text-center">
                        {item.badge}
                      </span>
                    )}
                  </NavLink>
                );
              })}
            </div>
          );
        })}
      </nav>

      {/* User section */}
      <div className="border-t border-[#E5DDD3] p-3">
        {!collapsed && profile && (
          <div className="flex items-center gap-2 mb-2 px-1">
            <div className="w-8 h-8 rounded-full bg-[var(--color-maroon)]/10 flex items-center justify-center text-xs font-semibold text-[var(--color-maroon)]">
              {profile.full_name.split(' ').map(n => n[0]).join('').slice(0, 2)}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium truncate">{profile.full_name}</p>
              <p className="text-[11px] text-[var(--color-ink)]/50 capitalize">{profile.role.replace('_', ' ')}</p>
            </div>
          </div>
        )}
        <button
          onClick={() => signOut()}
          className={cn(
            'flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-[var(--color-ink)]/60 hover:bg-[var(--color-urgent)]/5 hover:text-[var(--color-urgent)] transition-colors w-full',
          )}
          title={collapsed ? t('auth.logout') : undefined}
        >
          <LogOut className="w-[18px] h-[18px]" />
          {!collapsed && <span>{t('auth.logout')}</span>}
        </button>
      </div>

      {/* Collapse toggle */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-3 top-20 w-6 h-6 rounded-full border border-[#E5DDD3] bg-white flex items-center justify-center hover:bg-[var(--color-ivory)] transition-colors z-10"
      >
        {collapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronLeft className="w-3 h-3" />}
      </button>
    </aside>
  );
}

