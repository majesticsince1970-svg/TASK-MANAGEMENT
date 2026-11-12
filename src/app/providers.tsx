import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useEffect, type ReactNode } from 'react';
import '@/i18n';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { useRealtimeInvalidation } from '@/lib/realtime';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 2,
      retry: 2,
      refetchOnWindowFocus: false,
    },
  },
});

function AuthListener({ children }: { children: ReactNode }) {
  const setUser = useAuth((s) => s.setUser);
  const setLoading = useAuth((s) => s.setLoading);
  const fetchProfile = useAuth((s) => s.fetchProfile);

  useEffect(() => {
    // Check initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      const user = session?.user ?? null;
      setUser(user);
      if (user) {
        fetchProfile(user.id).finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    });

    // Listen to auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      const user = session?.user ?? null;
      setUser(user);
      if (user) {
        fetchProfile(user.id);
      } else {
        useAuth.setState({ profile: null });
      }
    });

    return () => subscription.unsubscribe();
  }, [setUser, setLoading, fetchProfile]);

  useRealtimeInvalidation();
  return <>{children}</>;
}

export function Providers({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthListener>{children}</AuthListener>
    </QueryClientProvider>
  );
}
