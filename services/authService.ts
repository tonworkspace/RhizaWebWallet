import { createClient, SupabaseClient, User, Session } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

export interface WalletUser {
  id: string;
  auth_user_id: string;
  wallet_address: string;
  email?: string;
  name: string;
  avatar: string;
  role: 'user' | 'admin';
  is_active: boolean;
  referrer_code?: string;
  created_at: string;
  updated_at: string;
}

export interface AuthResponse {
  success: boolean;
  user?: User;
  session?: Session;
  walletUser?: WalletUser;
  error?: string;
}

// Singleton client instance — shared across all imports
let clientInstance: SupabaseClient | null = null;

function getSharedClient(): SupabaseClient {
  if (!clientInstance) {
    clientInstance = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    console.log('🔧 Supabase auth client initialized (singleton)');
  }
  return clientInstance;
}

class AuthService {
  private sessionRestored: boolean = false;

  getClient(): SupabaseClient {
    return getSharedClient();
  }

  /**
   * Ensure session is restored before making authenticated requests.
   * Call this before any RLS-protected operation.
   */
  async ensureSession(): Promise<boolean> {
    const client = this.getClient();
    
    if (this.sessionRestored) {
      const { data } = await client.auth.getSession();
      return !!data.session;
    }
    
    // Wait for initial restore
    const { data } = await client.auth.getSession();
    this.sessionRestored = true;
    
    if (data.session) {
      console.log('✅ Auth session restored:', data.session.user.id);
    } else {
      console.warn('⚠️ No auth session found in storage');
    }
    
    return !!data.session;
  }

  // Sign up with email and password
  async signUp(email: string, password: string, walletAddress: string, name?: string): Promise<AuthResponse> {
    try {
      const client = this.getClient();
      // Note: Email confirmation behavior depends on Supabase settings
      // - If disabled: User is immediately logged in with session
      // - If enabled: User must confirm email before logging in
      const { data, error } = await client.auth.signUp({
        email,
        password,
        options: {
          data: {
            wallet_address: walletAddress,
            name: name || 'Rhiza User'
          }
          // emailRedirectTo: 'https://yourdomain.com/auth/callback' // Optional: for email confirmation
        }
      });

      if (error) throw error;

      // Get the wallet user profile (created by database trigger)
      if (data.user) {
        // Wait a moment for the trigger to complete
        await new Promise(resolve => setTimeout(resolve, 500));
        
        const walletUser = await this.getWalletUser(data.user.id);
        return {
          success: true,
          user: data.user,
          session: data.session || undefined,
          walletUser: walletUser || undefined
        };
      }

      return { success: true, user: data.user || undefined, session: data.session || undefined };
    } catch (error: any) {
      console.error('Sign up error:', error);
      return { success: false, error: error.message };
    }
  }

  // Sign in with email and password
  async signIn(email: string, password: string): Promise<AuthResponse> {
    try {
      const client = this.getClient();
      const { data, error } = await client.auth.signInWithPassword({
        email,
        password
      });

      if (error) throw error;

      // Get the wallet user profile
      if (data.user) {
        const walletUser = await this.getWalletUser(data.user.id);
        return {
          success: true,
          user: data.user,
          session: data.session,
          walletUser: walletUser || undefined
        };
      }

      return { success: true, user: data.user, session: data.session };
    } catch (error: any) {
      console.error('Sign in error:', error);
      return { success: false, error: error.message };
    }
  }

  // Sign in with wallet (passwordless) - Creates anonymous session
  async signInWithWallet(walletAddress: string): Promise<AuthResponse> {
    try {
      const client = this.getClient();
      console.log('🔐 Creating Supabase auth session for wallet:', walletAddress);

      // Normalize to non-bounceable (UQ...) so the derived email is stable
      // regardless of whether the caller passes EQ... or UQ...
      let normalizedAddress = walletAddress;
      try {
        const { Address } = await import('@ton/ton');
        normalizedAddress = Address.parse(walletAddress).toString({ bounceable: false, testOnly: false });
      } catch {
        // Not a TON address — use as-is
      }

      // Generate deterministic credentials from wallet address.
      // We try the current (UQ...) form first, then fall back to the legacy (EQ...) form
      // so existing users whose auth account was created with EQ... are still found.
      const makeCredentials = (addr: string) => ({
        email: `${addr.toLowerCase()}@rhiza.wallet`,
        password: `wallet_${addr}_${import.meta.env.VITE_WALLET_AUTH_SECRET || 'rhiza2024'}`
      });

      const primaryCreds = makeCredentials(normalizedAddress);

      // Build legacy EQ... credentials for fallback
      let legacyCreds: { email: string; password: string } | null = null;
      try {
        const { Address } = await import('@ton/ton');
        const eqAddress = Address.parse(walletAddress).toString({ bounceable: true, testOnly: false });
        if (eqAddress !== normalizedAddress) {
          legacyCreds = makeCredentials(eqAddress);
        }
      } catch {
        // ignore
      }

      // Helper: attempt sign-in with given credentials
      const trySignIn = async (creds: { email: string; password: string }) => {
        return client.auth.signInWithPassword({ email: creds.email, password: creds.password });
      };

      // 1. Try primary (UQ...) credentials
      let { data: signInData, error: signInError } = await trySignIn(primaryCreds);

      // 2. If not found, try legacy (EQ...) credentials
      if (signInError && legacyCreds) {
        const legacyResult = await trySignIn(legacyCreds);
        if (!legacyResult.error && legacyResult.data.session) {
          console.log('✅ Wallet user signed in via legacy EQ address credentials');
          signInData = legacyResult.data;
          signInError = null;
        }
      }

      if (!signInError && signInData?.session) {
        console.log('✅ Wallet user signed in with auth session');
        // Ensure auth_user_id is linked
        await client.rpc('sync_auth_user_id', {
          p_auth_user_id: signInData.user.id,
          p_email: signInData.user.email
        }).then(({ error }) => {
          if (error) console.warn('[auth] sync_auth_user_id failed (non-fatal):', error.message);
        });
        const walletUser = await this.getWalletUser(signInData.user.id);
        return {
          success: true,
          user: signInData.user,
          session: signInData.session,
          walletUser: walletUser || undefined
        };
      }

      // Sign-in failed — user likely doesn't exist yet, create them
      const isNewUser = signInError?.message?.toLowerCase().includes('invalid login') ||
                        signInError?.message?.toLowerCase().includes('invalid credentials') ||
                        signInError?.message?.toLowerCase().includes('user not found') ||
                        signInError?.status === 400;

      if (!isNewUser) {
        console.error('❌ Sign in error:', signInError);
        throw signInError;
      }

      console.log('📝 Creating new wallet user with auth...');
      const { data: signUpData, error: signUpError } = await client.auth.signUp({
        email: primaryCreds.email,
        password: primaryCreds.password,
        options: {
          data: {
            wallet_address: normalizedAddress,
            name: `Rhiza User #${normalizedAddress.slice(-4)}`
          },
          emailRedirectTo: undefined
        }
      });

      if (signUpError) {
        console.error('❌ Sign up error:', signUpError);
        throw signUpError;
      }

      if (signUpData.session) {
        console.log('✅ Wallet user created with auth session');
        await new Promise(resolve => setTimeout(resolve, 500));
        const newWalletUser = await this.getWalletUser(signUpData.user!.id);
        return {
          success: true,
          user: signUpData.user || undefined,
          session: signUpData.session,
          walletUser: newWalletUser || undefined
        };
      }

      // Retry sign-in after sign-up (email confirmation may not be required)
      console.warn('⚠️ signUp returned no session, retrying signIn...');
      const { data: retryData, error: retryError } = await trySignIn(primaryCreds);

      if (!retryError && retryData.session) {
        console.log('✅ Wallet user signed in after signUp');
        await new Promise(resolve => setTimeout(resolve, 500));
        const walletUser = await this.getWalletUser(retryData.user.id);
        return {
          success: true,
          user: retryData.user,
          session: retryData.session,
          walletUser: walletUser || undefined
        };
      }

      console.warn('⚠️ Email confirmation required — no session established');
      return {
        success: true,
        user: signUpData.user || undefined,
        session: undefined
      };
    } catch (error: any) {
      console.error('❌ Wallet sign in error:', error);
      return { success: false, error: error.message };
    }
  }

  // Sign out
  async signOut(): Promise<{ success: boolean; error?: string }> {
    try {
      const client = this.getClient();
      const { error } = await client.auth.signOut();
      if (error) throw error;
      return { success: true };
    } catch (error: any) {
      console.error('Sign out error:', error);
      return { success: false, error: error.message };
    }
  }

  // Get current session
  async getSession(): Promise<{ session: Session | null; error?: string }> {
    try {
      const client = this.getClient();
      const { data, error } = await client.auth.getSession();
      if (error) throw error;
      return { session: data.session };
    } catch (error: any) {
      console.error('Get session error:', error);
      return { session: null, error: error.message };
    }
  }

  // Get current user
  async getCurrentUser(): Promise<{ user: User | null; error?: string }> {
    try {
      const client = this.getClient();
      const { data, error} = await client.auth.getUser();
      if (error) throw error;
      return { user: data?.user || null };
    } catch (error: any) {
      console.error('Get user error:', error);
      return { user: null, error: error.message };
    }
  }

  // Get wallet user profile
  async getWalletUser(authUserId: string): Promise<WalletUser | null> {
    try {
      const client = this.getClient();
      const { data, error } = await client
        .from('wallet_users')
        .select('*')
        .eq('auth_user_id', authUserId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') return null; // Not found
        throw error;
      }

      return data;
    } catch (error: any) {
      console.error('Get wallet user error:', error);
      return null;
    }
  }

  // Update wallet user profile
  async updateWalletUser(userId: string, updates: Partial<WalletUser>): Promise<{ success: boolean; error?: string }> {
    try {
      const client = this.getClient();
      const { error } = await client
        .from('wallet_users')
        .update(updates)
        .eq('id', userId);

      if (error) throw error;
      return { success: true };
    } catch (error: any) {
      console.error('Update wallet user error:', error);
      return { success: false, error: error.message };
    }
  }

  // Check if user is admin
  async isAdmin(): Promise<boolean> {
    try {
      console.log('Checking if user is admin...');
      
      // Use direct check instead of RPC function
      const { user } = await this.getCurrentUser();
      console.log('Current user:', user?.email, 'ID:', user?.id);
      
      if (!user) {
        console.log('No user logged in');
        return false;
      }
      
      const walletUser = await this.getWalletUser(user.id);
      console.log('Wallet user:', walletUser);
      
      if (!walletUser) {
        console.log('No wallet user found');
        return false;
      }
      
      const isAdmin = walletUser.role === 'admin' && walletUser.is_active === true;
      console.log('Is admin check:', { role: walletUser.role, is_active: walletUser.is_active, result: isAdmin });
      
      return isAdmin;
    } catch (error: any) {
      console.error('Check admin error:', error);
      return false;
    }
  }

  // Admin: Get all users
  async getAllUsers(limit = 50, offset = 0): Promise<{ users: WalletUser[]; error?: string }> {
    try {
      const client = this.getClient();
      const { data, error } = await client
        .from('wallet_users')
        .select('*')
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) throw error;
      return { users: data || [] };
    } catch (error: any) {
      console.error('Get all users error:', error);
      return { users: [], error: error.message };
    }
  }

  // Admin: Update user role
  async updateUserRole(userId: string, role: 'user' | 'admin'): Promise<{ success: boolean; error?: string }> {
    try {
      const client = this.getClient();
      const { error } = await client
        .from('wallet_users')
        .update({ role })
        .eq('id', userId);

      if (error) throw error;

      // Log admin action
      await this.logAdminAction('update_user_role', userId, { role });

      return { success: true };
    } catch (error: any) {
      console.error('Update user role error:', error);
      return { success: false, error: error.message };
    }
  }

  // Admin: Deactivate user
  async deactivateUser(userId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const client = this.getClient();
      const { error } = await client
        .from('wallet_users')
        .update({ is_active: false })
        .eq('id', userId);

      if (error) throw error;

      // Log admin action
      await this.logAdminAction('deactivate_user', userId, {});

      return { success: true };
    } catch (error: any) {
      console.error('Deactivate user error:', error);
      return { success: false, error: error.message };
    }
  }

  // Admin: Log action
  private async logAdminAction(action: string, targetUserId: string, details: any): Promise<void> {
    try {
      const { user: currentUser } = await this.getCurrentUser();
      if (!currentUser) return;

      const walletUser = await this.getWalletUser(currentUser.id);
      if (!walletUser) return;

      const client = this.getClient();
      await client
        .from('wallet_admin_audit')
        .insert({
          admin_id: walletUser.id,
          action,
          target_user_id: targetUserId,
          details
        });
    } catch (error) {
      console.error('Log admin action error:', error);
    }
  }

  // Listen to auth state changes
  onAuthStateChange(callback: (event: string, session: Session | null) => void) {
    const client = this.getClient();
    return client.auth.onAuthStateChange(callback);
  }
}

export const authService = new AuthService();
