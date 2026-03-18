// ═══════════════════════════════════════════════════════════════════════════════
// 🧪 TEST VERIFICATION BADGE AUTHENTICATION
// ═══════════════════════════════════════════════════════════════════════════════

console.log('🧪 Testing VerificationBadge Authentication Handling...');

// Test authentication check
async function testAuthenticationCheck() {
  try {
    console.log('🔐 Testing authentication check...');
    
    // Check if user is authenticated
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      console.log('❌ User not authenticated - this is expected if not logged in');
      return false;
    }
    
    console.log('✅ User is authenticated:', user.email || user.id);
    return true;
    
  } catch (error) {
    console.error('❌ Authentication check failed:', error);
    return false;
  }
}

// Test balance status function with auth
async function testBalanceStatusWithAuth() {
  try {
    console.log('📊 Testing balance status with authentication...');
    
    const { data, error } = await supabase.rpc('get_user_balance_status');
    
    if (error) {
      if (error.message.includes('Authentication required')) {
        console.log('⚠️ Authentication required - this is expected if not logged in');
        return { authenticated: false, success: true };
      } else {
        console.error('❌ Function call failed:', error);
        return { authenticated: true, success: false, error: error.message };
      }
    }
    
    console.log('✅ Balance status loaded successfully:', data);
    return { authenticated: true, success: true, data };
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    return { authenticated: false, success: false, error: error.message };
  }
}

// Test VerificationBadge component behavior
async function testVerificationBadgeComponent() {
  try {
    console.log('🏆 Testing VerificationBadge component behavior...');
    
    // Check if VerificationBadge components exist in DOM
    const badges = document.querySelectorAll('[class*="VerificationBadge"], [class*="verification-badge"]');
    
    if (badges.length === 0) {
      console.log('ℹ️ No VerificationBadge components found in current page');
      return true;
    }
    
    console.log(`✅ Found ${badges.length} VerificationBadge component(s)`);
    
    // Check for error states
    const errorElements = document.querySelectorAll('[class*="error"], .text-red-500, .text-red-600');
    const hasErrors = Array.from(errorElements).some(el => 
      el.textContent?.includes('Authentication') || 
      el.textContent?.includes('balance status')
    );
    
    if (hasErrors) {
      console.log('⚠️ Found authentication-related errors in UI');
      return false;
    }
    
    console.log('✅ No authentication errors found in UI');
    return true;
    
  } catch (error) {
    console.error('❌ Component test failed:', error);
    return false;
  }
}

// Run all tests
async function runAuthTests() {
  console.log('🚀 Starting VerificationBadge Authentication Tests...\n');
  
  const results = {
    authCheck: await testAuthenticationCheck(),
    balanceStatus: await testBalanceStatusWithAuth(),
    componentBehavior: await testVerificationBadgeComponent()
  };
  
  console.log('\n📊 Test Results:');
  console.log('- Authentication Check:', results.authCheck ? '✅' : '❌');
  console.log('- Balance Status Function:', results.balanceStatus.success ? '✅' : '❌');
  console.log('- Component Behavior:', results.componentBehavior ? '✅' : '❌');
  
  if (!results.authCheck) {
    console.log('\n💡 To test with authentication:');
    console.log('1. Make sure you are logged in to the app');
    console.log('2. Navigate to a page with VerificationBadge component');
    console.log('3. Run this test again');
  }
  
  if (results.balanceStatus.success && results.componentBehavior) {
    console.log('\n🎉 Authentication handling is working correctly!');
  } else {
    console.log('\n⚠️ Some issues detected. Check the logs above for details.');
  }
  
  return results;
}

// Auto-run if in browser console
if (typeof window !== 'undefined' && window.supabase) {
  runAuthTests();
} else {
  console.log('ℹ️ To run this test, copy and paste into browser console on your app page.');
}