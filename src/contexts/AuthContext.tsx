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

        const parseHashOAuthTokens = () => {
          if (typeof window === 'undefined') return null;
          const hash = window.location.hash.startsWith('#') ? window.location.hash.substring(1) : window.location.hash;
          if (!hash) return null;
          const params = new URLSearchParams(hash);
          const accessToken = params.get('access_token');
          const refreshToken = params.get('refresh_token');
          if (!accessToken || !refreshToken) return null;
          return { accessToken, refreshToken };
        };

        // Register token getter for API calls
        APIService.setAuthTokenGetter(async () => {
          const { data: { session: freshSession } } = await supabase.auth.getSession();
          return freshSession?.access_token ?? null;
        });

        // Initial session (getSession handles standard callback parsing).
        let { data: { session: initialSession } } = await supabase.auth.getSession();

        // Fallback for hash-based implicit callbacks arriving at '/' before session is persisted.
        if (!initialSession) {
          const hashTokens = parseHashOAuthTokens();
          if (hashTokens) {
            const { data, error } = await supabase.auth.setSession({
              access_token: hashTokens.accessToken,
              refresh_token: hashTokens.refreshToken,
            });

            if (error) {
              if (error.message?.includes('Unregistered API key')) {
                console.error(
                  '[ProductionAuthProvider] Supabase API key is not valid for this project. Update VITE_SUPABASE_ANON_KEY in .env.local from Supabase Dashboard > Settings > API.'
                );
              }
              console.error('[ProductionAuthProvider] Failed to set session from OAuth hash:', error);
            } else {
              initialSession = data.session;
            }

            // Always clear hash tokens to prevent repeated processing loops on reload.
            const cleanUrl = `${window.location.pathname}${window.location.search}`;
            window.history.replaceState({}, document.title, cleanUrl);
          }
        }

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
        if (error instanceof Error && error.message.includes('Unregistered API key')) {
          console.error(
            '[ProductionAuthProvider] Supabase API key is unregistered. Update VITE_SUPABASE_ANON_KEY in .env.local with a valid key for VITE_SUPABASE_URL.'
          );
        }
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
      user_metadata: { username: devUserFixture.username },
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
    // Return dev token in format backend expects: dev-token-<role>
    const token = getDevToken(devUserFixture.role);
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


