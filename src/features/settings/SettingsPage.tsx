import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useTranslation } from 'react-i18next';
import {
  Store, Building, Users, Calendar, Clock, Bell,
  Brain, Mic, Shield, Save, Plus, Trash2, Edit
} from 'lucide-react';

const TABS = [
  { key: 'shop', label: 'Shop', icon: Store },
  { key: 'departments', label: 'Departments', icon: Building },
  { key: 'users', label: 'Users & Roles', icon: Users },
  { key: 'holidays', label: 'Holidays', icon: Calendar },
  { key: 'shifts', label: 'Shifts', icon: Clock },
  { key: 'reminders', label: 'Reminders', icon: Bell },
  { key: 'ai', label: 'AI Manager', icon: Brain },
  { key: 'voice', label: 'Voice', icon: Mic },
  { key: 'privacy', label: 'Privacy', icon: Shield },
];

const DEPARTMENTS = [
  { id: '1', name: 'Management', color: '#795548', head: 'Hadi Muhammad' },
  { id: '2', name: 'Accounts', color: '#4CAF50', head: 'James Sheary' },
  { id: '3', name: 'Social Media & Creative', color: '#FF9800', head: null },
  { id: '4', name: 'HR & Administration', color: '#9C27B0', head: null },
  { id: '5', name: 'Sales Floor', color: '#2196F3', head: null },
  { id: '6', name: 'Billing', color: '#00BCD4', head: null },
  { id: '7', name: 'Stock & Old Gold', color: '#F44336', head: null },
  { id: '8', name: 'Security & Maintenance', color: '#607D8B', head: null },
];

const DEMO_USERS = [
  { id: '1', name: 'Hadi Muhammad', role: 'owner', dept: 'Management', active: true },
  { id: '2', name: 'Abdul Latif', role: 'director', dept: 'Management', active: true },
  { id: '3', name: 'Ahmed', role: 'director', dept: 'Management', active: true },
  { id: '4', name: 'James Sheary', role: 'dept_head', dept: 'Accounts', active: true },
  { id: '5', name: 'Jelisha', role: 'staff', dept: 'Creative', active: true },
  { id: '6', name: 'Adil', role: 'staff', dept: 'Creative', active: true },
];

const HOLIDAYS = [
  { id: '1', date: '2026-11-01', name: 'Diwali' },
  { id: '2', date: '2026-12-25', name: 'Christmas' },
  { id: '3', date: '2027-01-01', name: 'New Year' },
  { id: '4', date: '2027-01-26', name: 'Republic Day' },
];

export default function SettingsPage() {
  const { tab: urlTab } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState(urlTab || 'shop');

  const switchTab = (key: string) => {
    setActiveTab(key);
    navigate(`/settings/${key}`, { replace: true });
  };

  return (
    <div className="max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">{t('settings.title')}</h1>

      <div className="flex gap-6">
        {/* Tab nav */}
        <div className="hidden md:block w-48 shrink-0 space-y-0.5">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            return (
              <button key={tab.key} onClick={() => switchTab(tab.key)}
                className={cn('flex items-center gap-2 w-full px-3 py-2 text-sm rounded-lg transition-colors text-left',
                  activeTab === tab.key ? 'bg-[var(--color-maroon)] text-white font-medium' : 'text-[var(--color-ink)]/60 hover:bg-[var(--color-ivory)]')}>
                <Icon className="w-4 h-4" /> {tab.label}
              </button>
            );
          })}
        </div>

        {/* Tab content */}
        <div className="flex-1 min-w-0">
          {activeTab === 'shop' && (
            <div className="bg-white rounded-xl border border-[#E5DDD3] p-6 space-y-4">
              <h2 className="font-semibold text-lg">Shop Settings</h2>
              <div>
                <label className="block text-sm font-medium mb-1">Shop Name</label>
                <input defaultValue="Majestic Jewellers" className="w-full px-3 py-2 rounded-lg border border-[#E5DDD3] bg-[var(--color-ivory)] text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Timezone</label>
                <input defaultValue="Asia/Kolkata" className="w-full px-3 py-2 rounded-lg border border-[#E5DDD3] bg-[var(--color-ivory)] text-sm" disabled />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Working Days</label>
                <div className="flex gap-2">
                  {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d, i) => (
                    <button key={d} className={cn('w-10 h-10 rounded-lg text-xs font-medium border',
                      i < 6 ? 'bg-[var(--color-maroon)] text-white border-[var(--color-maroon)]' : 'border-[#E5DDD3]')}>
                      {d}
                    </button>
                  ))}
                </div>
              </div>
              <Button><Save className="w-4 h-4" /> Save</Button>
            </div>
          )}

          {activeTab === 'departments' && (
            <div className="space-y-3">
              <div className="flex justify-between">
                <h2 className="font-semibold text-lg">Departments</h2>
                <Button size="sm"><Plus className="w-4 h-4" /> Add</Button>
              </div>
              {DEPARTMENTS.map((d) => (
                <div key={d.id} className="bg-white rounded-xl border border-[#E5DDD3] p-4 flex items-center gap-3">
                  <div className="w-4 h-4 rounded-full shrink-0" style={{ backgroundColor: d.color }} />
                  <div className="flex-1">
                    <p className="font-medium text-sm">{d.name}</p>
                    <p className="text-xs text-[var(--color-ink)]/40">{d.head ? `Head: ${d.head}` : 'No head assigned'}</p>
                  </div>
                  <Button variant="ghost" size="icon"><Edit className="w-4 h-4" /></Button>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'users' && (
            <div className="space-y-3">
              <div className="flex justify-between">
                <h2 className="font-semibold text-lg">Users & Roles</h2>
                <Button size="sm"><Plus className="w-4 h-4" /> Invite User</Button>
              </div>
              <div className="bg-white rounded-xl border border-[#E5DDD3] divide-y divide-[#E5DDD3]">
                {DEMO_USERS.map((u) => (
                  <div key={u.id} className="flex items-center gap-3 px-4 py-3">
                    <div className="w-8 h-8 rounded-full bg-[var(--color-maroon)]/10 flex items-center justify-center text-xs font-semibold text-[var(--color-maroon)]">
                      {u.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">{u.name}</p>
                      <p className="text-xs text-[var(--color-ink)]/40">{u.dept}</p>
                    </div>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-[var(--color-ivory)] capitalize">{u.role.replace('_', ' ')}</span>
                    <div className={cn('w-2.5 h-2.5 rounded-full', u.active ? 'bg-green-500' : 'bg-gray-300')} />
                    <Button variant="ghost" size="icon"><Edit className="w-4 h-4" /></Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'holidays' && (
            <div className="space-y-3">
              <div className="flex justify-between">
                <h2 className="font-semibold text-lg">Holidays</h2>
                <Button size="sm"><Plus className="w-4 h-4" /> Add Holiday</Button>
              </div>
              <div className="bg-white rounded-xl border border-[#E5DDD3] divide-y divide-[#E5DDD3]">
                {HOLIDAYS.map((h) => (
                  <div key={h.id} className="flex items-center gap-3 px-4 py-3">
                    <Calendar className="w-4 h-4 text-[var(--color-ink)]/30" />
                    <div className="flex-1">
                      <p className="text-sm font-medium">{h.name}</p>
                      <p className="text-xs text-[var(--color-ink)]/40">{new Date(h.date).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
                    </div>
                    <Button variant="ghost" size="icon" className="text-[var(--color-urgent)]"><Trash2 className="w-4 h-4" /></Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {!['shop', 'departments', 'users', 'holidays'].includes(activeTab) && (
            <div className="bg-white rounded-xl border border-[#E5DDD3] p-8 text-center">
              <p className="text-sm text-[var(--color-ink)]/40">
                {TABS.find(t => t.key === activeTab)?.label} settings — coming soon
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

