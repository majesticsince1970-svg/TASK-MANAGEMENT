import { supabase } from '@/lib/supabase';
import type { Profile, UserRole } from '@/types/database';
import type { User } from '@supabase/supabase-js';
import { create } from 'zustand';

/* ─── plain auth helpers ─── */

export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (error) throw error;
  return data;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function getCurrentUser() {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session?.user ?? null;
}

/* ─── auth store ─── */

interface AuthState {
  user: User | null;
  profile: Profile | null;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  fetchProfile: (userId: string) => Promise<void>;
  setUser: (user: User | null) => void;
  setProfile: (profile: Profile | null) => void;
  setLoading: (v: boolean) => void;
}

export const useAuth = create<AuthState>((set, get) => ({
  user: null,
  profile: null,
  isLoading: true,

  signIn: async (email: string, password: string) => {
    set({ isLoading: true });
    try {
      const { user } = await signIn(email, password);
      set({ user });
      if (user) await get().fetchProfile(user.id);
    } finally {
      set({ isLoading: false });
    }
  },

  signOut: async () => {
    await signOut();
    set({ user: null, profile: null });
  },

  fetchProfile: async (userId: string) => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    set({ profile: (data as Profile) ?? null });
  },

  setUser: (user) => set({ user }),
  setProfile: (profile) => set({ profile }),
  setLoading: (isLoading) => set({ isLoading }),
}));

/* ─── role helpers ─── */

const ROLE_HIERARCHY: Record<UserRole, number> = {
  owner: 50,
  director: 40,
  dept_head: 30,
  staff: 10,
  device: 5,
  ai_system: 5,
};

export function hasMinRole(userRole: UserRole, minRole: UserRole): boolean {
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[minRole];
}
