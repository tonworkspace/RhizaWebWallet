// ═══════════════════════════════════════════════════════════════════════════════
// 🔍 DIAGNOSE AUTHENTICATION ISSUE
// ═══════════════════════════════════════════════════════════════════════════════

console.log('🔍 Diagnosing Authentication Issue...');

async function diagnoseAuthenticationIssue() {
  try {
    console.log('🔐 Step 1: Check Supabase Client');
    if (!window.supabase) {
      console.error('❌ Supabase client not available');
      return;
    }
    console.log('✅ Supabase client available');

    console.log('\n🔐 Step 2: Check User Authentication');
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError) {
      console.error('❌ Error getting user:', userError);
      return;
    }
    
    if (!user) {
      console.error('❌ User not authenticated');
      console.log('💡 User needs to log in first');
      return;
    }
    
    console.log('✅ User authenticated:', {
      id: user.id,
      email: user.email,
      created_at: user.created_at
    });

    console.log('\n🔐 Step 3: Check JWT Token');
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
      console.error('❌ Error getting session:', sessionError);
      return;
    }
    
    if (!session) {
      console.error('❌ No active session');
      return;
    }
    
    console.log('✅ Active session found');
    console.log('JWT Token present:', !!session.access_token);
    
    // Decode JWT to see what's in it
    try {
      const tokenParts = session.access_token.split('.');
      const payload = JSON.parse(atob(tokenParts[1]));
      console.log('JWT Payload:', {
        sub: payload.sub,
        email: payload.email,
        wallet_address: payload.wallet_address,
        exp: new Date(payload.exp * 1000),
        iat: new Date(payload.iat * 1000)
      });
    } catch (e) {
      console.log('Could not decode JWT:', e);
    }

    console.log('\n🔐 Step 4: Test Database Function Call');
    console.log('Testing submit_balance_verification_request...');
    
    const { data: submitResult, error: submitError } = await supabase.rpc('submit_balance_verification_request', {
      p_telegram_username: '@testuser',
      p_old_wallet_address: 'test_wallet_123',
      p_claimed_balance: 1000
    });
    
    if (submitError) {
      console.error('❌ Function call failed:', submitError);
      console.log('Error details:', {
        message: submitError.message,
        code: submitError.code,
        details: submitError.details,
        hint: submitError.hint
      });
    } else {
      console.log('✅ Function call successful:', submitResult);
    }

    console.log('\n🔐 Step 5: Check Wallet Context');
    // Check if wallet context has the user info
    if (window.walletContext) {
      console.log('Wallet Context:', window.walletContext);
    } else {
      console.log('⚠️ Wallet context not available in window');
    }

    console.log('\n🔐 Step 6: Test Simple RPC Call');
    console.log('Testing get_user_balance_status...');
    
    const { data: balanceResult, error: balanceError } = await supabase.rpc('get_user_balance_status');
    
    if (balanceError) {
      console.error('❌ Balance status call failed:', balanceError);
    } else {
      console.log('✅ Balance status call successful:', balanceResult);
    }

  } catch (error) {
    console.error('❌ Diagnosis failed:', error);
  }
}

// Check if user profile exists in wallet_users table
async function checkUserProfile() {
  try {
    console.log('\n👤 Checking User Profile in Database...');
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.log('❌ No authenticated user');
      return;
    }

    // Try to find user by email or other identifier
    const { data: profiles, error } = await supabase
      .from('wallet_users')
      .select('*')
      .limit(5);
    
    if (error) {
      console.error('❌ Error querying wallet_users:', error);
    } else {
      console.log('✅ wallet_users table accessible');
      console.log('Sample profiles:', profiles);
      
      // Check if current user exists
      const userProfile = profiles?.find(p => p.email === user.email);
      if (userProfile) {
        console.log('✅ User profile found:', userProfile);
      } else {
        console.log('⚠️ User profile not found in wallet_users table');
        console.log('This might be the issue - user needs a profile in wallet_users');
      }
    }
  } catch (error) {
    console.error('❌ Profile check failed:', error);
  }
}

// Run diagnosis
async function runFullDiagnosis() {
  console.log('🚀 Starting Full Authentication Diagnosis...\n');
  
  await diagnoseAuthenticationIssue();
  await checkUserProfile();
  
  console.log('\n📊 Diagnosis Complete');
  console.log('Check the logs above for specific issues and solutions');
}

// Auto-run if in browser console
if (typeof window !== 'undefined' && window.supabase) {
  runFullDiagnosis();
} else {
  console.log('ℹ️ To run this diagnosis, copy and paste into browser console on your app page.');
}