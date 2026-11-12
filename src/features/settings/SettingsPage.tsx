import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useAppSettings, useUpdateSettings, useDepartments, useHolidays, usePeople } from '@/lib/hooks';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import {
  Store, Building, Users, Calendar, Bell, Brain, Shield, Keyboard, Palette,
  Plus, Trash2, Save, Loader2, ChevronRight, AlertTriangle
} from 'lucide-react';

type SettingsTab = 'shop' | 'departments' | 'users' | 'holidays' | 'notifications' | 'ai' | 'privacy' | 'shortcuts' | 'appearance';

const TABS: { key: SettingsTab; label: string; icon: React.ElementType }[] = [
  { key: 'shop', label: 'Shop', icon: Store },
  { key: 'departments', label: 'Departments', icon: Building },
  { key: 'users', label: 'Users', icon: Users },
  { key: 'holidays', label: 'Holidays', icon: Calendar },
  { key: 'notifications', label: 'Notifications', icon: Bell },
  { key: 'ai', label: 'AI & Voice', icon: Brain },
  { key: 'privacy', label: 'Privacy', icon: Shield },
  { key: 'shortcuts', label: 'Shortcuts', icon: Keyboard },
  { key: 'appearance', label: 'Appearance', icon: Palette },
];

export default function SettingsPage() {
  const { t } = useTranslation();
  const { tab: urlTab } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<SettingsTab>((urlTab as SettingsTab) || 'shop');
  const { data: settings } = useAppSettings();
  const updateSettings = useUpdateSettings();
  const { data: departments = [] } = useDepartments();
  const { data: holidays = [] } = useHolidays();
  const { data: users = [] } = usePeople();

  const [shopName, setShopName] = useState('');
  const [timezone, setTimezone] = useState('');
  const [workingDays, setWorkingDays] = useState<number[]>([]);

  // Dialog states
  const [showAddDept, setShowAddDept] = useState(false);
  const [deptName, setDeptName] = useState('');
  const [deptColor, setDeptColor] = useState('#7A1F2B');
  const [deptSaving, setDeptSaving] = useState(false);

  const [showAddHoliday, setShowAddHoliday] = useState(false);
  const [holidayName, setHolidayName] = useState('');
  const [holidayDate, setHolidayDate] = useState('');
  const [holidaySaving, setHolidaySaving] = useState(false);

  const [showAddUser, setShowAddUser] = useState(false);

  const [confirmDelete, setConfirmDelete] = useState<{ type: string; id: string; name: string } | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (settings) {
      setShopName(settings.shop_name || '');
      setTimezone(settings.timezone || 'Asia/Kolkata');
      setWorkingDays(settings.working_days || [1, 2, 3, 4, 5, 6]);
    }
  }, [settings]);

  const handleSaveShop = () => {
    updateSettings.mutate({
      shop_name: shopName,
      timezone,
      working_days: workingDays,
    });
  };

  const handleAddDepartment = async () => {
    if (!deptName.trim()) return;
    setDeptSaving(true);
    try {
      const { error } = await supabase.from('departments').insert({
        name: deptName.trim(),
        color: deptColor,
        sort_order: departments.length,
      });
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ['departments'] });
      setShowAddDept(false);
      setDeptName('');
      setDeptColor('#7A1F2B');
    } catch (err) {
      console.error('Failed to add department:', err);
    } finally {
      setDeptSaving(false);
    }
  };

  const handleAddHoliday = async () => {
    if (!holidayName.trim() || !holidayDate) return;
    setHolidaySaving(true);
    try {
      const { error } = await supabase.from('holidays').insert({
        name: holidayName.trim(),
        date: holidayDate,
      });
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ['holidays'] });
      setShowAddHoliday(false);
      setHolidayName('');
      setHolidayDate('');
    } catch (err) {
      console.error('Failed to add holiday:', err);
    } finally {
      setHolidaySaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    setDeleting(true);
    try {
      const table = confirmDelete.type === 'department' ? 'departments' : 'holidays';
      const { error } = await supabase.from(table).delete().eq('id', confirmDelete.id);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: [table] });
      setConfirmDelete(null);
    } catch (err) {
      console.error('Failed to delete:', err);
    } finally {
      setDeleting(false);
    }
  };

  const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">{t('nav.settings')}</h1>

      <div className="flex gap-6">
        {/* Tab Nav */}
        <div className="hidden md:block w-48 shrink-0">
          <nav className="space-y-1">
            {TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => { setActiveTab(tab.key); navigate(`/settings/${tab.key}`); }}
                className={cn(
                  'w-full flex items-center gap-2 px-3 py-2 text-sm rounded-lg transition-colors text-left',
                  activeTab === tab.key
                    ? 'bg-[var(--color-maroon)] text-white font-medium'
                    : 'text-[var(--color-ink)]/60 hover:bg-[var(--color-ivory)]'
                )}
              >
                <tab.icon className="w-4 h-4" /> {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Mobile tab scroll */}
        <div className="md:hidden flex gap-1 overflow-x-auto pb-2 w-full">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                'flex items-center gap-1 px-3 py-1.5 text-xs rounded-lg whitespace-nowrap transition-colors shrink-0',
                activeTab === tab.key
                  ? 'bg-[var(--color-maroon)] text-white'
                  : 'text-[var(--color-ink)]/60 hover:bg-[var(--color-ivory)]'
              )}
            >
              <tab.icon className="w-3.5 h-3.5" /> {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="bg-white rounded-xl border border-[#E5DDD3] p-6">
        {/* Shop */}
        {activeTab === 'shop' && (
          <div className="space-y-4 max-w-lg">
            <h2 className="text-lg font-semibold">Shop Settings</h2>
            <div>
              <label className="block text-sm font-medium mb-1">Shop Name</label>
              <input
                value={shopName}
                onChange={(e) => setShopName(e.target.value)}
                className="w-full px-4 py-2 rounded-xl border border-[#E5DDD3] bg-[var(--color-ivory)] text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Timezone</label>
              <select
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                className="w-full px-4 py-2 rounded-xl border border-[#E5DDD3] bg-[var(--color-ivory)] text-sm"
              >
                <option value="Asia/Kolkata">Asia/Kolkata (IST)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Working Days</label>
              <div className="flex gap-2">
                {dayLabels.map((day, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      setWorkingDays(
                        workingDays.includes(i)
                          ? workingDays.filter((d) => d !== i)
                          : [...workingDays, i].sort()
                      );
                    }}
                    className={cn(
                      'w-10 h-10 rounded-lg text-xs font-medium transition-colors',
                      workingDays.includes(i)
                        ? 'bg-[var(--color-maroon)] text-white'
                        : 'bg-[var(--color-ivory)] text-[var(--color-ink)]/40'
                    )}
                  >
                    {day}
                  </button>
                ))}
              </div>
            </div>
            <Button onClick={handleSaveShop} disabled={updateSettings.isPending}>
              {updateSettings.isPending ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Save className="w-4 h-4 mr-1" />}
              Save
            </Button>
          </div>
        )}

        {/* Departments */}
        {activeTab === 'departments' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Departments</h2>
              <Button size="sm" onClick={() => setShowAddDept(true)}><Plus className="w-4 h-4" /> Add</Button>
            </div>
            {departments.map((dept: any) => (
              <div key={dept.id} className="flex items-center gap-3 p-3 border border-[#E5DDD3] rounded-lg">
                <div className="w-4 h-4 rounded-full" style={{ backgroundColor: dept.color }} />
                <div className="flex-1">
                  <p className="text-sm font-medium">{dept.name}</p>
                  {dept.name_ml && <p className="text-xs text-[var(--color-ink)]/40">{dept.name_ml}</p>}
                </div>
                <button
                  className="p-1 hover:bg-red-50 rounded transition-colors"
                  onClick={() => setConfirmDelete({ type: 'department', id: dept.id, name: dept.name })}
                >
                  <Trash2 className="w-4 h-4 text-[var(--color-ink)]/30 hover:text-red-500" />
                </button>
              </div>
            ))}
            {departments.length === 0 && <p className="text-sm text-[var(--color-ink)]/40">No departments yet</p>}
          </div>
        )}

        {/* Users */}
        {activeTab === 'users' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Users</h2>
              <Button size="sm" onClick={() => setShowAddUser(true)}><Plus className="w-4 h-4" /> Add User</Button>
            </div>
            {users.map((user: any) => (
              <div key={user.id} className="flex items-center gap-3 p-3 border border-[#E5DDD3] rounded-lg">
                <div className="w-9 h-9 rounded-full bg-[var(--color-maroon)]/10 flex items-center justify-center text-xs font-semibold text-[var(--color-maroon)]">
                  {user.full_name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">{user.full_name}</p>
                  <p className="text-xs text-[var(--color-ink)]/40 capitalize">{user.role} · {user.job_title || ''}</p>
                </div>
                <span className={cn(
                  'px-2 py-0.5 text-[10px] rounded-full',
                  user.is_active ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'
                )}>
                  {user.is_active ? 'Active' : 'Inactive'}
                </span>
              </div>
            ))}
            {users.length === 0 && <p className="text-sm text-[var(--color-ink)]/40">No users yet. Add users in Supabase Auth.</p>}
          </div>
        )}

        {/* Holidays */}
        {activeTab === 'holidays' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Holidays</h2>
              <Button size="sm" onClick={() => setShowAddHoliday(true)}><Plus className="w-4 h-4" /> Add Holiday</Button>
            </div>
            {holidays.map((h: any) => (
              <div key={h.id} className="flex items-center gap-3 p-3 border border-[#E5DDD3] rounded-lg">
                <Calendar className="w-4 h-4 text-[var(--color-ink)]/30" />
                <div className="flex-1">
                  <p className="text-sm font-medium">{h.name}</p>
                  <p className="text-xs text-[var(--color-ink)]/40">{new Date(h.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                </div>
                <button
                  className="p-1 hover:bg-red-50 rounded transition-colors"
                  onClick={() => setConfirmDelete({ type: 'holiday', id: h.id, name: h.name })}
                >
                  <Trash2 className="w-4 h-4 text-[var(--color-ink)]/30 hover:text-red-500" />
                </button>
              </div>
            ))}
            {holidays.length === 0 && <p className="text-sm text-[var(--color-ink)]/40">No holidays added</p>}
          </div>
        )}

        {/* Notifications */}
        {activeTab === 'notifications' && (
          <div className="space-y-4 max-w-lg">
            <h2 className="text-lg font-semibold">Notification Settings</h2>
            <div className="space-y-3">
              {[
                { label: 'Quiet hours behavior', desc: 'What to do with notifications during quiet hours', options: ['hold', 'deliver', 'mute'] },
                { label: 'Digest time', desc: 'When to send the daily AI digest', value: settings?.digest_time || '21:00' },
              ].map((setting) => (
                <div key={setting.label} className="p-3 border border-[#E5DDD3] rounded-lg">
                  <p className="text-sm font-medium">{setting.label}</p>
                  <p className="text-xs text-[var(--color-ink)]/40 mb-2">{setting.desc}</p>
                  {setting.options ? (
                    <select className="px-3 py-1.5 rounded-lg border border-[#E5DDD3] bg-[var(--color-ivory)] text-sm">
                      {setting.options.map((opt) => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  ) : (
                    <input type="time" defaultValue={setting.value} className="px-3 py-1.5 rounded-lg border border-[#E5DDD3] bg-[var(--color-ivory)] text-sm" />
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* AI */}
        {activeTab === 'ai' && (
          <div className="space-y-4 max-w-lg">
            <h2 className="text-lg font-semibold">AI & Voice Settings</h2>
            {[
              { label: 'AI Manager', desc: 'Enable AI-powered insights and alerts', key: 'ai_enabled', value: settings?.ai_enabled },
              { label: 'Voice Tasks', desc: 'Enable voice-to-task creation', key: 'voice_enabled', value: settings?.voice_enabled },
              { label: 'Leaderboard', desc: 'Show points leaderboard to all users', key: 'leaderboard_enabled', value: settings?.leaderboard_enabled },
              { label: 'Activity Tracking', desc: 'Directors can see staff activity', key: 'directors_see_activity', value: settings?.directors_see_activity },
            ].map((toggle) => (
              <div key={toggle.key} className="flex items-center justify-between p-3 border border-[#E5DDD3] rounded-lg">
                <div>
                  <p className="text-sm font-medium">{toggle.label}</p>
                  <p className="text-xs text-[var(--color-ink)]/40">{toggle.desc}</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={toggle.value ?? true}
                    onChange={(e) => updateSettings.mutate({ [toggle.key]: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:ring-2 peer-focus:ring-[var(--color-maroon)]/20 rounded-full peer peer-checked:bg-[var(--color-maroon)] transition-colors after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full" />
                </label>
              </div>
            ))}
          </div>
        )}

        {/* Privacy */}
        {activeTab === 'privacy' && (
          <div className="space-y-4 max-w-lg">
            <h2 className="text-lg font-semibold">Privacy & Data</h2>
            <div className="p-3 border border-[#E5DDD3] rounded-lg">
              <p className="text-sm font-medium">Data Retention</p>
              <p className="text-xs text-[var(--color-ink)]/40 mb-2">How long to keep completed task data</p>
              <select
                defaultValue={settings?.retention_days || 90}
                className="px-3 py-1.5 rounded-lg border border-[#E5DDD3] bg-[var(--color-ivory)] text-sm"
                onChange={(e) => updateSettings.mutate({ retention_days: Number(e.target.value) })}
              >
                <option value={30}>30 days</option>
                <option value={60}>60 days</option>
                <option value={90}>90 days</option>
                <option value={180}>180 days</option>
                <option value={365}>1 year</option>
              </select>
            </div>
          </div>
        )}

        {/* Shortcuts */}
        {activeTab === 'shortcuts' && (
          <div className="space-y-3 max-w-lg">
            <h2 className="text-lg font-semibold">Keyboard Shortcuts</h2>
            {[
              { keys: 'N', desc: 'New task' },
              { keys: '/', desc: 'Search' },
              { keys: '⌘K', desc: 'Quick search' },
              { keys: 'G then H', desc: 'Go to Home' },
              { keys: 'G then T', desc: 'Go to Tasks' },
              { keys: 'G then A', desc: 'Go to Approvals' },
              { keys: 'G then P', desc: 'Go to People' },
              { keys: 'G then R', desc: 'Go to Reports' },
              { keys: 'G then S', desc: 'Go to Settings' },
            ].map((shortcut) => (
              <div key={shortcut.keys} className="flex items-center justify-between py-2 border-b border-[#E5DDD3] last:border-0">
                <span className="text-sm">{shortcut.desc}</span>
                <kbd className="px-2 py-1 bg-[var(--color-ivory)] border border-[#E5DDD3] rounded text-xs font-mono">
                  {shortcut.keys}
                </kbd>
              </div>
            ))}
          </div>
        )}

        {/* Appearance */}
        {activeTab === 'appearance' && (
          <div className="space-y-4 max-w-lg">
            <h2 className="text-lg font-semibold">Appearance</h2>
            <p className="text-sm text-[var(--color-ink)]/50">Theme customization coming soon. The current theme uses Majestic Jewellers' brand colors.</p>
            <div className="flex gap-3">
              {[
                { name: 'Maroon', color: 'var(--color-maroon)' },
                { name: 'Gold', color: 'var(--color-gold)' },
                { name: 'Ivory', color: 'var(--color-ivory)' },
                { name: 'Ink', color: 'var(--color-ink)' },
              ].map((c) => (
                <div key={c.name} className="text-center">
                  <div className="w-12 h-12 rounded-xl border border-[#E5DDD3]" style={{ backgroundColor: c.color }} />
                  <p className="text-[10px] text-[var(--color-ink)]/40 mt-1">{c.name}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Add Department Dialog */}
      <Dialog open={showAddDept} onOpenChange={setShowAddDept} title="Add Department">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Department Name</label>
            <input
              value={deptName}
              onChange={(e) => setDeptName(e.target.value)}
              className="w-full px-4 py-2 rounded-xl border border-[#E5DDD3] bg-[var(--color-ivory)] text-sm"
              placeholder="e.g. Gold Section"
              autoFocus
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Color</label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={deptColor}
                onChange={(e) => setDeptColor(e.target.value)}
                className="w-10 h-10 rounded-lg border border-[#E5DDD3] cursor-pointer"
              />
              <span className="text-sm text-[var(--color-ink)]/50">{deptColor}</span>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => setShowAddDept(false)}>Cancel</Button>
            <Button onClick={handleAddDepartment} disabled={deptSaving || !deptName.trim()}>
              {deptSaving ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Plus className="w-4 h-4 mr-1" />}
              Add Department
            </Button>
          </div>
        </div>
      </Dialog>

      {/* Add Holiday Dialog */}
      <Dialog open={showAddHoliday} onOpenChange={setShowAddHoliday} title="Add Holiday">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Holiday Name</label>
            <input
              value={holidayName}
              onChange={(e) => setHolidayName(e.target.value)}
              className="w-full px-4 py-2 rounded-xl border border-[#E5DDD3] bg-[var(--color-ivory)] text-sm"
              placeholder="e.g. Diwali"
              autoFocus
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Date</label>
            <input
              type="date"
              value={holidayDate}
              onChange={(e) => setHolidayDate(e.target.value)}
              className="w-full px-4 py-2 rounded-xl border border-[#E5DDD3] bg-[var(--color-ivory)] text-sm"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => setShowAddHoliday(false)}>Cancel</Button>
            <Button onClick={handleAddHoliday} disabled={holidaySaving || !holidayName.trim() || !holidayDate}>
              {holidaySaving ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Plus className="w-4 h-4 mr-1" />}
              Add Holiday
            </Button>
          </div>
        </div>
      </Dialog>

      {/* Add User Info Dialog */}
      <Dialog open={showAddUser} onOpenChange={setShowAddUser} title="Add User">
        <div className="space-y-4">
          <p className="text-sm text-[var(--color-ink)]/70">
            Users are created through Supabase Auth. Follow these steps:
          </p>
          <ol className="space-y-2 text-sm text-[var(--color-ink)]/60 list-decimal ml-4">
            <li>Go to your <strong>Supabase Dashboard</strong> → Authentication → Users</li>
            <li>Click <strong>"Add User"</strong> → fill in email and password</li>
            <li>After the auth user is created, a profile row is automatically created via the database trigger</li>
            <li>Come back here to <strong>Settings → Users</strong> to verify the user appears</li>
            <li>Update their role, department, and other details from the <strong>Profiles</strong> table</li>
          </ol>
          <div className="p-3 bg-amber-50 rounded-lg flex gap-2 text-sm text-amber-800">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <p>For security, user creation is only available through the Supabase admin dashboard.</p>
          </div>
          <div className="flex justify-end pt-2">
            <Button variant="ghost" onClick={() => setShowAddUser(false)}>Close</Button>
          </div>
        </div>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={!!confirmDelete}
        onOpenChange={(open) => { if (!open) setConfirmDelete(null); }}
        title={`Delete ${confirmDelete?.type === 'department' ? 'Department' : 'Holiday'}?`}
      >
        <div className="space-y-4">
          <p className="text-sm text-[var(--color-ink)]/70">
            Are you sure you want to delete <strong>{confirmDelete?.name}</strong>? This action cannot be undone.
          </p>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => setConfirmDelete(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Trash2 className="w-4 h-4 mr-1" />}
              Delete
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
