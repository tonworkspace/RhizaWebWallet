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

class AuthService {
  private client: SupabaseClient;

  constructor() {
    this.client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  }

  getClient(): SupabaseClient {
    return this.client;
  }

  // Sign up with email and password
  async signUp(email: string, password: string, walletAddress: string, name?: string): Promise<AuthResponse> {
    try {
      // Note: Email confirmation behavior depends on Supabase settings
      // - If disabled: User is immediately logged in with session
      // - If enabled: User must confirm email before logging in
      const { data, error } = await this.client.auth.signUp({
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
      const { data, error } = await this.client.auth.signInWithPassword({
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

  // Sign in with wallet (passwordless)
  async signInWithWallet(walletAddress: string): Promise<AuthResponse> {
    try {
      // Check if user exists with this wallet address
      const { data: walletUser, error: fetchError } = await this.client
        .from('wallet_users')
        .select('*')
        .eq('wallet_address', walletAddress)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') throw fetchError;

      if (!walletUser) {
        // Create new user with magic link
        const { data, error } = await this.client.auth.signInWithOtp({
          email: `${walletAddress.slice(0, 8)}@rhizacore.wallet`,
          options: {
            data: {
              wallet_address: walletAddress,
              name: 'Rhiza Sovereign'
            }
          }
        });

        if (error) throw error;

        return {
          success: true,
          error: 'Check your email for the login link'
        };
      }

      // User exists, send magic link
      const { data, error } = await this.client.auth.signInWithOtp({
        email: walletUser.email || `${walletAddress.slice(0, 8)}@rhizacore.wallet`
      });

      if (error) throw error;

      return {
        success: true,
        error: 'Check your email for the login link'
      };
    } catch (error: any) {
      console.error('Wallet sign in error:', error);
      return { success: false, error: error.message };
    }
  }

  // Sign out
  async signOut(): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await this.client.auth.signOut();
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
      const { data, error } = await this.client.auth.getSession();
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
      const { data, error } = await this.client.auth.getUser();
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
      const { data, error } = await this.client
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
      const { error } = await this.client
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
      const { data, error } = await this.client
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
      const { error } = await this.client
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
      const { error } = await this.client
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

      await this.client
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
    return this.client.auth.onAuthStateChange(callback);
  }
}

export const authService = new AuthService();
