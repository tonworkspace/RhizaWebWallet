// ═══════════════════════════════════════════════════════════════════════════════
// 🧪 TEST BALANCE VERIFICATION FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

console.log('🧪 Testing Balance Verification Functions...');

// Test the get_user_balance_status function
async function testBalanceStatus() {
  try {
    console.log('📊 Testing get_user_balance_status function...');
    
    // This should work if the function exists
    const { data, error } = await supabase.rpc('get_user_balance_status');
    
    if (error) {
      console.error('❌ Function call failed:', error);
      return false;
    }
    
    console.log('✅ Function exists and returned:', data);
    return true;
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    return false;
  }
}

// Test if verification badge table exists
async function testVerificationBadgeTable() {
  try {
    console.log('🏆 Testing verification_badges table...');
    
    const { data, error } = await supabase
      .from('verification_badges')
      .select('*')
      .limit(1);
    
    if (error) {
      console.error('❌ Table access failed:', error);
      return false;
    }
    
    console.log('✅ verification_badges table exists');
    return true;
    
  } catch (error) {
    console.error('❌ Table test failed:', error);
    return false;
  }
}

// Test if wallet_users has new verification fields
async function testWalletUsersFields() {
  try {
    console.log('👤 Testing wallet_users verification fields...');
    
    const { data, error } = await supabase
      .from('wallet_users')
      .select('balance_verified, balance_locked, verification_level, verification_badge_earned_at')
      .limit(1);
    
    if (error) {
      console.error('❌ Fields access failed:', error);
      return false;
    }
    
    console.log('✅ wallet_users verification fields exist');
    return true;
    
  } catch (error) {
    console.error('❌ Fields test failed:', error);
    return false;
  }
}

// Run all tests
async function runTests() {
  console.log('🚀 Starting Balance Verification System Tests...\n');
  
  const results = {
    balanceStatus: await testBalanceStatus(),
    badgeTable: await testVerificationBadgeTable(),
    walletFields: await testWalletUsersFields()
  };
  
  console.log('\n📊 Test Results:');
  console.log('- Balance Status Function:', results.balanceStatus ? '✅' : '❌');
  console.log('- Verification Badges Table:', results.badgeTable ? '✅' : '❌');
  console.log('- Wallet Users Fields:', results.walletFields ? '✅' : '❌');
  
  const allPassed = Object.values(results).every(result => result);
  
  if (allPassed) {
    console.log('\n🎉 All tests passed! Balance verification system is ready.');
  } else {
    console.log('\n⚠️ Some tests failed. You may need to run the setup SQL file.');
    console.log('📝 Run: run_balance_verification_setup.sql');
  }
  
  return allPassed;
}

// Auto-run if in browser console
if (typeof window !== 'undefined' && window.supabase) {
  runTests();
} else {
  console.log('ℹ️ To run this test, copy and paste into browser console on your app page.');
}