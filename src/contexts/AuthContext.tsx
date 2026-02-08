import React, { createContext, useContext, useEffect, useState } from 'react';
import { createClient, type User, type Session, type SupabaseClient } from '@supabase/supabase-js';

const supabase: SupabaseClient = createClient(
  import.meta.env.VITE_SUPABASE_URL || 'http://localhost:54321',
  import.meta.env.VITE_SUPABASE_ANON_KEY || 'placeholder-key'
);

export type UserRole = 'admin' | 'sales' | 'engineer' | 'installer';

const DEV_BYPASS_AUTH = import.meta.env.DEV && import.meta.env.VITE_DEV_BYPASS_AUTH === 'true';

const DEV_USER: User = {
  id: 'dev-user-001',
  email: 'dev@solaris.pa',
  app_metadata: { role: 'admin' },
  user_metadata: { full_name: 'Dev User', avatar_url: '' },
  aud: 'authenticated',
  created_at: new Date().toISOString(),
} as User;

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  role: UserRole;
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<{ error: string | null }>;
  signUpWithEmail: (email: string, password: string, fullName: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
  role: 'sales',
  signInWithGoogle: async () => {},
  signInWithEmail: async () => ({ error: null }),
  signUpWithEmail: async () => ({ error: null }),
  signOut: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(DEV_BYPASS_AUTH ? DEV_USER : null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(!DEV_BYPASS_AUTH);
  const [role, setRole] = useState<UserRole>(DEV_BYPASS_AUTH ? 'admin' : 'sales');

  useEffect(() => {
    if (DEV_BYPASS_AUTH) return;

    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) {
        setRole((s.user.app_metadata?.role as UserRole) || 'sales');
      }
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) {
        setRole((s.user.app_metadata?.role as UserRole) || 'sales');
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    });
  };

  const signInWithEmail = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error?.message ?? null };
  };

  const signUpWithEmail = async (email: string, password: string, fullName: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    });
    return { error: error?.message ?? null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setRole('sales');
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, role, signInWithGoogle, signInWithEmail, signUpWithEmail, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};
