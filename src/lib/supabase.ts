import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const hasSupabaseConfig = Boolean(supabaseUrl && supabaseAnonKey);

function missingSupabaseConfigError(): never {
  throw new Error(
    'Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to use production auth flows.'
  );
}

function normalizeBasePath(basePath: string | undefined): string {
  const raw = (basePath || '/').trim();
  if (!raw) return '/';
  const withLeadingSlash = raw.startsWith('/') ? raw : `/${raw}`;
  return withLeadingSlash.endsWith('/') ? withLeadingSlash : `${withLeadingSlash}/`;
}

export const supabase = hasSupabaseConfig
  ? createClient(supabaseUrl!, supabaseAnonKey!, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,  // Enable persistence so session survives OAuth redirects
        detectSessionInUrl: true,
      },
    })
  : ({
      auth: {
        getUser: async () => missingSupabaseConfigError(),
        getSession: async () => missingSupabaseConfigError(),
        signInWithOAuth: async () => missingSupabaseConfigError(),
        signOut: async () => missingSupabaseConfigError(),
        onAuthStateChange: () => missingSupabaseConfigError(),
      },
    } as any);

// Helper to get current user
export const getCurrentUser = async () => {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error) throw error;
  return user;
};

// Helper to get session
export const getSession = async () => {
  const { data: { session }, error } = await supabase.auth.getSession();
  if (error) throw error;
  return session;
};

// Sign in with GitHub OAuth
export const signInWithGitHub = async () => {
  console.log('[Supabase] 🔑 signInWithGitHub called');

  // Allow explicit override when environments need a fixed callback URL.
  const configuredRedirect = String(import.meta.env.VITE_SUPABASE_REDIRECT_URL || '').trim();
  const basePath = normalizeBasePath(import.meta.env.BASE_URL);
  const redirectTo = configuredRedirect || new URL(`${basePath}auth/callback`, window.location.origin).toString();
  
  console.log('[Supabase] → Redirect URL will be:', redirectTo);
  console.log('[Supabase] → Calling supabase.auth.signInWithOAuth...');
  
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'github',
    options: {
      redirectTo,
    },
  });
  
  console.log('[Supabase] ← OAuth response:', { data, error });
  
  if (error) {
    if (/redirect|callback|not allowed/i.test(error.message || '')) {
      console.error(
        '[Supabase] OAuth redirect URL rejected. Ensure this exact URL is listed in Supabase Auth > URL Configuration > Redirect URLs:',
        redirectTo
      );
    }
    console.error('[Supabase] ❌ OAuth error:', error);
    throw error;
  }
  
  console.log('[Supabase] ✅ OAuth initiated successfully, should redirect to:', data.url);
  return data;
};

// Sign out
export const signOut = async () => {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
};
