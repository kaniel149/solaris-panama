import React, { createContext, useContext, useEffect, useState } from 'react';
import { createClient, type User, type Session, type SupabaseClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Auto-bypass auth when Supabase isn't configured (demo/dev mode)
const HAS_SUPABASE = !!(SUPABASE_URL && SUPABASE_KEY && !SUPABASE_URL.includes('localhost'));

const supabase: SupabaseClient = createClient(
  SUPABASE_URL || 'http://localhost:54321',
  SUPABASE_KEY || 'placeholder-key'
);

export type UserRole = 'admin' | 'sales' | 'engineer' | 'installer';

// Bypass auth — direct access while we fix login flow
const DEV_BYPASS_AUTH = true;

const DEV_USER: User = {
  id: '49c311f6-c0a5-4b04-a192-4214bb424994',
  email: 'k@kanielt.com',
  app_metadata: { role: 'admin', provider: 'email', providers: ['email'] },
  user_metadata: { full_name: 'Kaniel Tord', avatar_url: '' },
  aud: 'authenticated',
  created_at: '2026-02-10T04:54:07.115457+00:00',
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
    console.log('[Auth] Init — HAS_SUPABASE:', HAS_SUPABASE, 'DEV_BYPASS_AUTH:', DEV_BYPASS_AUTH);
    console.log('[Auth] Supabase URL:', SUPABASE_URL?.substring(0, 30) + '...');
    if (DEV_BYPASS_AUTH) return;

    supabase.auth.getSession().then(({ data: { session: s } }) => {
      console.log('[Auth] getSession result:', s?.user?.email ?? 'no session');
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) {
        setRole((s.user.app_metadata?.role as UserRole) || 'sales');
      }
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, s) => {
      console.log('[Auth] onAuthStateChange:', event, s?.user?.email ?? 'no user');
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
    console.log('[Auth] signInWithEmail called for:', email);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    console.log('[Auth] signInWithPassword result:', { user: data?.user?.email, session: !!data?.session, error: error?.message });
    if (data?.session) {
      console.log('[Auth] Setting user from sign-in response directly');
      setSession(data.session);
      setUser(data.user);
      if (data.user) {
        setRole((data.user.app_metadata?.role as UserRole) || 'sales');
      }
    }
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
