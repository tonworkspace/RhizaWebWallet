// ═══════════════════════════════════════════════════════════════════════════════
// 🧪 TEST WALLET AUTHENTICATION FIX
// ═══════════════════════════════════════════════════════════════════════════════

console.log('🧪 Testing Wallet Authentication Fix...');

async function testWalletAuthFix() {
  try {
    console.log('🔍 Step 1: Check Current Authentication State');
    
    // Check if user is authenticated
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError) {
      console.error('❌ Error getting user:', userError);
      return;
    }
    
    if (!user) {
      console.error('❌ User not authenticated');
      console.log('💡 Please log in with your wallet first');
      return;
    }
    
    console.log('✅ User authenticated:', {
      id: user.id,
      email: user.email
    });

    console.log('\n🔍 Step 2: Check JWT Token Contents');
    const { data: { session } } = await supabase.auth.getSession();
    
    if (session?.access_token) {
      try {
        const tokenParts = session.access_token.split('.');
        const payload = JSON.parse(atob(tokenParts[1]));
        console.log('JWT Payload:', {
          sub: payload.sub,
          email: payload.email,
          wallet_address: payload.wallet_address,
          user_metadata: payload.user_metadata,
          app_metadata: payload.app_metadata
        });
      } catch (e) {
        console.log('Could not decode JWT:', e);
      }
    }

    console.log('\n🔍 Step 3: Test Enhanced Balance Status Function');
    const { data: balanceResult, error: balanceError } = await supabase.rpc('get_user_balance_status');
    
    if (balanceError) {
      console.error('❌ Balance status failed:', balanceError);
    } else {
      console.log('✅ Balance status success:', balanceResult);
    }

    console.log('\n🔍 Step 4: Test Enhanced Submit Function');
    const testData = {
      p_telegram_username: '@testuser_' + Date.now(),
      p_old_wallet_address: 'EQDX5XHmQJctY7Wm2McEgJkr8eb0nHqaWbs',
      p_claimed_balance: 250000,
      p_additional_notes: 'Test submission from wallet auth fix'
    };
    
    console.log('Submitting test request:', testData);
    
    const { data: submitResult, error: submitError } = await supabase.rpc('submit_balance_verification_request', testData);
    
    if (submitError) {
      console.error('❌ Submit function failed:', submitError);
      console.log('Error details:', {
        message: submitError.message,
        code: submitError.code,
        details: submitError.details,
        hint: submitError.hint
      });
    } else {
      console.log('✅ Submit function success:', submitResult);
    }

    console.log('\n📊 Test Results Summary:');
    console.log('- User Authentication:', user ? '✅' : '❌');
    console.log('- Balance Status Function:', balanceResult?.success ? '✅' : '❌');
    console.log('- Submit Function:', submitResult?.success ? '✅' : '❌');

    if (submitResult?.success) {
      console.log('\n🎉 WALLET AUTHENTICATION FIX SUCCESSFUL!');
      console.log('✅ Users can now submit verification requests');
      console.log('✅ Wallet-based authentication is working');
      console.log('✅ Request ID:', submitResult.request_id);
    } else {
      console.log('\n⚠️ Authentication issue still exists');
      
      if (submitResult?.debug_info) {
        console.log('Debug Info:', submitResult.debug_info);
      }
      
      console.log('\n💡 Next steps:');
      console.log('1. Ensure user profile exists in wallet_users table');
      console.log('2. Check if wallet_address is properly stored');
      console.log('3. Verify JWT token contains correct user information');
    }

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Check wallet_users table for current user
async function checkUserInWalletUsers() {
  try {
    console.log('\n👤 Checking User in wallet_users Table...');
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.log('❌ No authenticated user');
      return;
    }

    // Try to find user by different methods
    const { data: profiles, error } = await supabase
      .from('wallet_users')
      .select('*')
      .or(`auth_user_id.eq.${user.id},email.eq.${user.email || 'none'}`);
    
    if (error) {
      console.error('❌ Error querying wallet_users:', error);
    } else {
      if (profiles && profiles.length > 0) {
        console.log('✅ User profile found:', profiles[0]);
      } else {
        console.log('⚠️ User profile NOT found in wallet_users table');
        console.log('This is likely the cause of the authentication error');
        console.log('User needs to complete wallet connection process');
      }
    }
  } catch (error) {
    console.error('❌ Profile check failed:', error);
  }
}

// Run complete test
async function runCompleteWalletAuthTest() {
  console.log('🚀 Starting Complete Wallet Authentication Test...\n');
  
  await testWalletAuthFix();
  await checkUserInWalletUsers();
  
  console.log('\n📋 Test Complete');
  console.log('If issues persist, the user may need to reconnect their wallet or complete profile setup.');
}

// Auto-run if in browser console
if (typeof window !== 'undefined' && window.supabase) {
  runCompleteWalletAuthTest();
} else {
  console.log('ℹ️ To run this test, copy and paste into browser console on your app page.');
}