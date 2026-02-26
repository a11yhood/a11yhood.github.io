import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { APIService } from '@/lib/api';
import { getDevUser, getDevToken } from '@/lib/dev-users';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
  getAccessToken: () => Promise<string | null>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  // Dev mode is opt-in via VITE_DEV_MODE
  const isDevMode = import.meta.env.VITE_DEV_MODE === 'true';

  if (isDevMode) {
    return <DevAuthProvider>{children}</DevAuthProvider>;
  }

  return <ProductionAuthProvider>{children}</ProductionAuthProvider>;
}

// Production: Supabase-based auth
function ProductionAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubscribed = false;
    let cleanup: (() => void) | undefined;

    const init = async () => {
      try {
        const { supabase } = await import('@/lib/supabase');

        // Register token getter for API calls
        APIService.setAuthTokenGetter(async () => {
          const { data: { session: freshSession } } = await supabase.auth.getSession();
          return freshSession?.access_token ?? null;
        });

        // Initial session
        const { data: { session: initialSession } } = await supabase.auth.getSession();
        if (!unsubscribed) {
          setSession(initialSession);
          setUser(initialSession?.user ?? null);
          setLoading(false);
        }

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, nextSession) => {
          if (unsubscribed) return;
          setSession(nextSession);
          setUser(nextSession?.user ?? null);
          setLoading(false);
        });

        cleanup = () => subscription.unsubscribe();
      } catch (error) {
        console.error('[ProductionAuthProvider] Failed to initialize Supabase auth:', error);
        if (!unsubscribed) setLoading(false);
      }
    };

    void init();

    return () => {
      unsubscribed = true;
      if (cleanup) cleanup();
    };
  }, []);

  const signIn = async () => {
    console.log('[ProductionAuthProvider] 🚀 signIn called - loading Supabase...');
    try {
      const { signInWithGitHub } = await import('@/lib/supabase');
      console.log('[ProductionAuthProvider] → Supabase loaded, calling signInWithGitHub...');
      await signInWithGitHub();
      console.log('[ProductionAuthProvider] ✅ signInWithGitHub completed (should redirect now)');
    } catch (error) {
      console.error('[ProductionAuthProvider] ❌ signIn failed:', error);
      throw error;
    }
  };

  const signOut = async () => {
    const { signOut: supabaseSignOut } = await import('@/lib/supabase');
    await supabaseSignOut();
    setUser(null);
    setSession(null);
  };

  const getAccessToken = async (): Promise<string | null> => {
    try {
      const { supabase } = await import('@/lib/supabase');
      const { data: { session: freshSession } } = await supabase.auth.getSession();
      const token = freshSession?.access_token ?? null;
      if (!token) {
        console.warn('[ProductionAuthProvider] getAccessToken: no access token in session');
      }
      return token;
    } catch (error) {
      console.error('[ProductionAuthProvider] getAccessToken error:', error);
      return null;
    }
  };

  const value = {
    user,
    session,
    loading,
    signIn,
    signOut,
    getAccessToken,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// Development: Dev token-based auth for testing
function DevAuthProvider({ children }: { children: ReactNode }) {
  const storedUser = typeof localStorage !== 'undefined' ? localStorage.getItem('dev-user') : null;
  const defaultUser = storedUser || import.meta.env.VITE_DEV_USER || 'admin';
  const devUserFixture = getDevUser(defaultUser);

  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(false);

  // Convert dev user fixture to Supabase User format
  useEffect(() => {
    const supabaseUser: User = {
      id: devUserFixture.id,
      aud: 'authenticated',
      email: devUserFixture.email,
      email_confirmed_at: new Date().toISOString(),
      phone: '',
      confirmed_at: new Date().toISOString(),
      last_sign_in_at: new Date().toISOString(),
      app_metadata: { role: devUserFixture.role },
      user_metadata: { username: devUserFixture.login },
      identities: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      is_anonymous: false,
    };
    setUser(supabaseUser);
    
    // Create session after user is set
    const mockSession: Session = {
      access_token: 'dev-token',
      token_type: 'bearer',
      expires_in: 3600,
      expires_at: Date.now() / 1000 + 3600,
      refresh_token: 'dev-refresh-token',
      user: supabaseUser,
    };
    setSession(mockSession);
  }, [devUserFixture]);

  // Register token getter with APIService once on load
  useEffect(() => {
    console.log('[DevAuthProvider] Registering token getter for user:', devUserFixture.id);
    APIService.setAuthTokenGetter(getAccessToken);
  }, []);

  const signIn = async () => {
    // No-op in dev mode
  };

  const signOut = async () => {
    // No-op in dev mode
  };

  const getAccessToken = async (): Promise<string | null> => {
    // Return dev token in format backend expects: dev-token-<user_id>
    const token = getDevToken(devUserFixture.id);
    console.log('[DevAuthProvider] getAccessToken called, returning:', token);
    return token;
  };

  const value = {
    user,
    session,
    loading,
    signIn,
    signOut,
    getAccessToken,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}


