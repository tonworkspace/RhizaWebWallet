import { supabaseService } from '../services/supabaseService';

/**
 * Utility functions for referral system
 */

export interface ReferralValidationResult {
  isValid: boolean;
  referrerId?: string;
  referrerName?: string;
  error?: string;
}

/**
 * Validate a referral code and return referrer information
 */
export const validateReferralCode = async (referralCode: string): Promise<ReferralValidationResult> => {
  if (!referralCode || referralCode.trim().length === 0) {
    return { isValid: false, error: 'Referral code is empty' };
  }

  // Normalize the referral code
  const normalizedCode = referralCode.trim().toUpperCase();

  try {
    console.log('🔍 Validating referral code:', normalizedCode);

    // Look up the referral code
    const referralResult = await supabaseService.getUserByReferralCode(normalizedCode);
    
    if (!referralResult.success) {
      return { isValid: false, error: referralResult.error || 'Failed to validate referral code' };
    }

    if (!referralResult.data) {
      return { isValid: false, error: 'Referral code not found' };
    }

    // Get the referrer's profile information
    const referrerProfile = await supabaseService.getProfileById(referralResult.data.user_id);
    
    if (!referrerProfile.success || !referrerProfile.data) {
      return { isValid: false, error: 'Referrer profile not found' };
    }

    console.log('✅ Referral code validated:', {
      code: normalizedCode,
      referrerId: referralResult.data.user_id,
      referrerName: referrerProfile.data.name
    });

    return {
      isValid: true,
      referrerId: referralResult.data.user_id,
      referrerName: referrerProfile.data.name
    };
  } catch (error: any) {
    console.error('❌ Referral validation error:', error);
    return { isValid: false, error: error.message };
  }
};

/**
 * Generate a referral link for a user
 */
export const generateReferralLink = (referralCode: string, baseUrl?: string): string => {
  const base = baseUrl || window.location.origin;
  return `${base}/#/join?ref=${referralCode.toUpperCase()}`;
};

/**
 * Extract referral code from URL
 */
export const extractReferralCodeFromUrl = (url: string): string | null => {
  try {
    const urlObj = new URL(url);
    return urlObj.searchParams.get('ref');
  } catch {
    // If URL parsing fails, try regex
    const match = url.match(/[?&]ref=([^&]+)/);
    return match ? match[1] : null;
  }
};

/**
 * Format referral code for display
 */
export const formatReferralCode = (code: string): string => {
  return code.toUpperCase();
};

/**
 * Check if a referral code format is valid
 */
export const isValidReferralCodeFormat = (code: string): boolean => {
  // Referral codes should be 8 characters (last 8 of wallet address)
  const normalizedCode = code.trim().toUpperCase();
  return /^[A-Z0-9]{8}$/.test(normalizedCode);
};

/**
 * Process referral signup - handles all referral-related actions when a new user signs up
 */
export const processReferralSignup = async (
  newUserId: string,
  newUserAddress: string,
  referralCode?: string
): Promise<{
  success: boolean;
  referrerId?: string;
  bonusAwarded?: boolean;
  error?: string;
}> => {
  if (!referralCode) {
    console.log('ℹ️ No referral code provided');
    return { success: true };
  }

  try {
    // Validate the referral code
    const validation = await validateReferralCode(referralCode);
    
    if (!validation.isValid || !validation.referrerId) {
      console.warn('⚠️ Invalid referral code:', referralCode);
      return { success: false, error: validation.error };
    }

    console.log('🎯 Processing referral signup:', {
      newUserId,
      referrerId: validation.referrerId,
      referralCode
    });

    // Increment referrer's count
    const incrementResult = await supabaseService.incrementReferralCount(validation.referrerId);
    if (!incrementResult.success) {
      console.error('❌ Failed to increment referral count:', incrementResult.error);
    }

    // Update referrer's rank
    const rankResult = await supabaseService.updateReferralRank(validation.referrerId);
    if (!rankResult.success) {
      console.error('❌ Failed to update referral rank:', rankResult.error);
    }

    // Award referral bonus logic removed to prevent manipulation.
    // Referrers now earn RZC from their downline's actual activity (e.g., purchases/commissions).
    // const { rzcRewardService } = await import('../services/rzcRewardService');
    // const bonusResult = await rzcRewardService.awardReferralBonus(
    //   validation.referrerId,
    //   newUserId,
    //   newUserAddress
    // );

    // Instead, just send a notification that someone joined
    try {
      const { notificationService } = await import('../services/notificationService');
      const referrerProfile = await supabaseService.getProfileById(validation.referrerId);
      
      if (referrerProfile.success && referrerProfile.data) {
        await notificationService.createNotification(
          referrerProfile.data.wallet_address,
          'referral_joined',
          'New Referral Signup! 🎉',
          `Someone just joined using your referral link! You'll earn RZC and TON commissions when they activate or purchase packages.`,
          {
            data: { referral_code: referralCode, new_user_address: newUserAddress },
            priority: 'normal'
          }
        );
        console.log('📬 Notification sent to referrer');
      }
    } catch (notifError) {
      console.warn('⚠️ Failed to send notification:', notifError);
    }

    return {
      success: true,
      referrerId: validation.referrerId,
      bonusAwarded: false
    };
  } catch (error: any) {
    console.error('❌ Referral processing error:', error);
    return { success: false, error: error.message };
  }
};