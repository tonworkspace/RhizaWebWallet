// ═══════════════════════════════════════════════════════════════════════════════
// 🧪 TEST AUTHENTICATION FIX
// ═══════════════════════════════════════════════════════════════════════════════

console.log('🧪 Testing Authentication Fix...');

async function testAuthenticationFix() {
  try {
    console.log('🔍 Step 1: Test JWT Debug Function');
    const { data: debugResult, error: debugError } = await supabase.rpc('debug_jwt_token');
    
    if (debugError) {
      console.error('❌ Debug function failed:', debugError);
    } else {
      console.log('✅ JWT Debug Result:', debugResult);
    }

    console.log('\n🔍 Step 2: Test Enhanced Balance Status Function');
    const { data: balanceResult, error: balanceError } = await supabase.rpc('get_user_balance_status');
    
    if (balanceError) {
      console.error('❌ Balance status failed:', balanceError);
    } else {
      console.log('✅ Balance status success:', balanceResult);
    }

    console.log('\n🔍 Step 3: Test Enhanced Submit Function');
    const { data: submitResult, error: submitError } = await supabase.rpc('submit_balance_verification_request', {
      p_telegram_username: '@testuser_' + Date.now(),
      p_old_wallet_address: 'test_wallet_' + Date.now(),
      p_claimed_balance: 1000
    });
    
    if (submitError) {
      console.error('❌ Submit function failed:', submitError);
      console.log('Error details:', {
        message: submitError.message,
        code: submitError.code,
        details: submitError.details
      });
    } else {
      console.log('✅ Submit function success:', submitResult);
    }

    console.log('\n📊 Test Summary:');
    console.log('- JWT Debug:', debugResult?.success ? '✅' : '❌');
    console.log('- Balance Status:', balanceResult?.success ? '✅' : '❌');
    console.log('- Submit Function:', submitResult?.success ? '✅' : '❌');

    if (submitResult?.success) {
      console.log('\n🎉 Authentication fix successful!');
      console.log('Users can now submit verification requests without authentication errors.');
    } else {
      console.log('\n⚠️ Authentication issue persists. Check the error details above.');
      
      if (debugResult?.success) {
        console.log('\n💡 Debugging info:');
        console.log('- JWT Present:', debugResult.has_jwt);
        console.log('- Wallet Address:', debugResult.wallet_address);
        console.log('- User ID:', debugResult.user_id);
      }
    }

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Auto-run if in browser console
if (typeof window !== 'undefined' && window.supabase) {
  testAuthenticationFix();
} else {
  console.log('ℹ️ To run this test, copy and paste into browser console on your app page.');
}