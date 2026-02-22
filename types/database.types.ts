export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      wallet_users: {
        Row: {
          id: string
          auth_user_id: string | null
          wallet_address: string
          email: string | null
          name: string
          avatar: string
          role: string
          is_active: boolean
          referrer_code: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          auth_user_id?: string | null
          wallet_address: string
          email?: string | null
          name?: string
          avatar?: string
          role?: string
          is_active?: boolean
          referrer_code?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          auth_user_id?: string | null
          wallet_address?: string
          email?: string | null
          name?: string
          avatar?: string
          role?: string
          is_active?: boolean
          referrer_code?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      wallet_transactions: {
        Row: {
          id: string
          user_id: string | null
          wallet_address: string
          type: string
          amount: string
          asset: string
          to_address: string | null
          from_address: string | null
          tx_hash: string | null
          status: string
          metadata: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          wallet_address: string
          type: string
          amount: string
          asset: string
          to_address?: string | null
          from_address?: string | null
          tx_hash?: string | null
          status?: string
          metadata?: Json | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string | null
          wallet_address?: string
          type?: string
          amount?: string
          asset?: string
          to_address?: string | null
          from_address?: string | null
          tx_hash?: string | null
          status?: string
          metadata?: Json | null
          created_at?: string
        }
      }
      wallet_referrals: {
        Row: {
          id: string
          user_id: string | null
          referrer_id: string | null
          referral_code: string
          total_earned: number
          rank: string
          level: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          referrer_id?: string | null
          referral_code: string
          total_earned?: number
          rank?: string
          level?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string | null
          referrer_id?: string | null
          referral_code?: string
          total_earned?: number
          rank?: string
          level?: number
          created_at?: string
          updated_at?: string
        }
      }
      wallet_analytics: {
        Row: {
          id: string
          user_id: string | null
          event_name: string
          properties: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          event_name: string
          properties?: Json | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string | null
          event_name?: string
          properties?: Json | null
          created_at?: string
        }
      }
      wallet_admin_audit: {
        Row: {
          id: string
          admin_id: string | null
          action: string
          target_user_id: string | null
          details: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          admin_id?: string | null
          action: string
          target_user_id?: string | null
          details?: Json | null
          created_at?: string
        }
        Update: {
          id?: string
          admin_id?: string | null
          action?: string
          target_user_id?: string | null
          details?: Json | null
          created_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      is_wallet_admin: {
        Args: never
        Returns: boolean
      }
      get_wallet_user_id: {
        Args: never
        Returns: string
      }
    }
    Enums: {
      [_ in never]: never
    }
  }
}

// Helper types for easier usage
export type WalletUser = Database['public']['Tables']['wallet_users']['Row']
export type WalletUserInsert = Database['public']['Tables']['wallet_users']['Insert']
export type WalletUserUpdate = Database['public']['Tables']['wallet_users']['Update']

export type WalletTransaction = Database['public']['Tables']['wallet_transactions']['Row']
export type WalletTransactionInsert = Database['public']['Tables']['wallet_transactions']['Insert']
export type WalletTransactionUpdate = Database['public']['Tables']['wallet_transactions']['Update']

export type WalletReferral = Database['public']['Tables']['wallet_referrals']['Row']
export type WalletReferralInsert = Database['public']['Tables']['wallet_referrals']['Insert']
export type WalletReferralUpdate = Database['public']['Tables']['wallet_referrals']['Update']

export type WalletAnalytics = Database['public']['Tables']['wallet_analytics']['Row']
export type WalletAnalyticsInsert = Database['public']['Tables']['wallet_analytics']['Insert']
export type WalletAnalyticsUpdate = Database['public']['Tables']['wallet_analytics']['Update']

export type WalletAdminAudit = Database['public']['Tables']['wallet_admin_audit']['Row']
export type WalletAdminAuditInsert = Database['public']['Tables']['wallet_admin_audit']['Insert']
export type WalletAdminAuditUpdate = Database['public']['Tables']['wallet_admin_audit']['Update']
