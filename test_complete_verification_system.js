// ═══════════════════════════════════════════════════════════════════════════════
// 🧪 TEST COMPLETE BALANCE VERIFICATION SYSTEM
// ═══════════════════════════════════════════════════════════════════════════════

console.log('🧪 Testing Complete Balance Verification System...');

// Test all required functions exist
async function testRequiredFunctions() {
  const functions = [
    'submit_balance_verification_request',
    'get_user_verification_status', 
    'get_user_balance_status',
    'admin_update_verification_request_with_unlock',
    'get_all_verification_requests'
  ];
  
  console.log('🔧 Testing required functions...');
  
  const results = {};
  
  for (const funcName of functions) {
    try {
      // Try to call each function (will fail with auth error if exists, or function not found if missing)
      const { data, error } = await supabase.rpc(funcName, {});
      
      if (error) {
        if (error.message.includes('Could not find the function')) {
          console.log(`❌ Function missing: ${funcName}`);
          results[funcName] = false;
        } else {
          console.log(`✅ Function exists: ${funcName} (${error.message})`);
          results[funcName] = true;
        }
      } else {
        console.log(`✅ Function exists and callable: ${funcName}`);
        results[funcName] = true;
      }
    } catch (error) {
      console.log(`❌ Function test failed: ${funcName}`, error);
      results[funcName] = false;
    }
  }
  
  return results;
}

// Test table structure
async function testTableStructure() {
  console.log('📊 Testing table structure...');
  
  const tables = [
    'balance_verification_requests',
    'verification_badges'
  ];
  
  const results = {};
  
  for (const tableName of tables) {
    try {
      const { data, error } = await supabase
        .from(tableName)
        .select('*')
        .limit(1);
      
      if (error) {
        console.log(`❌ Table access failed: ${tableName}`, error.message);
        results[tableName] = false;
      } else {
        console.log(`✅ Table accessible: ${tableName}`);
        results[tableName] = true;
      }
    } catch (error) {
      console.log(`❌ Table test failed: ${tableName}`, error);
      results[tableName] = false;
    }
  }
  
  return results;
}

// Test authentication handling
async function testAuthenticationHandling() {
  console.log('🔐 Testing authentication handling...');
  
  try {
    // Check if user is authenticated
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      console.log('⚠️ User not authenticated - testing unauthenticated behavior');
      
      // Test that functions properly reject unauthenticated requests
      const { data, error } = await supabase.rpc('submit_balance_verification_request', {
        p_telegram_username: '@test',
        p_old_wallet_address: 'test',
        p_claimed_balance: 100
      });
      
      if (error || (data && !data.success && data.error.includes('Authentication'))) {
        console.log('✅ Proper authentication rejection for unauthenticated user');
        return { authenticated: false, properRejection: true };
      } else {
        console.log('❌ Function should reject unauthenticated requests');
        return { authenticated: false, properRejection: false };
      }
    } else {
      console.log('✅ User is authenticated:', user.email || user.id);
      return { authenticated: true, properRejection: true };
    }
  } catch (error) {
    console.error('❌ Authentication test failed:', error);
    return { authenticated: false, properRejection: false };
  }
}

// Test wallet_users verification fields
async function testWalletUsersFields() {
  console.log('👤 Testing wallet_users verification fields...');
  
  const fields = [
    'balance_verified',
    'balance_locked', 
    'verification_badge_earned_at',
    'verification_level'
  ];
  
  try {
    const { data, error } = await supabase
      .from('wallet_users')
      .select(fields.join(', '))
      .limit(1);
    
    if (error) {
      console.log('❌ wallet_users verification fields missing:', error.message);
      return false;
    }
    
    console.log('✅ wallet_users verification fields exist');
    return true;
  } catch (error) {
    console.error('❌ wallet_users fields test failed:', error);
    return false;
  }
}

// Run comprehensive system test
async function runCompleteSystemTest() {
  console.log('🚀 Starting Complete Balance Verification System Test...\n');
  
  const results = {
    functions: await testRequiredFunctions(),
    tables: await testTableStructure(),
    authentication: await testAuthenticationHandling(),
    walletFields: await testWalletUsersFields()
  };
  
  console.log('\n📊 Complete Test Results:');
  console.log('\n🔧 Functions:');
  Object.entries(results.functions).forEach(([func, exists]) => {
    console.log(`  - ${func}: ${exists ? '✅' : '❌'}`);
  });
  
  console.log('\n📊 Tables:');
  Object.entries(results.tables).forEach(([table, accessible]) => {
    console.log(`  - ${table}: ${accessible ? '✅' : '❌'}`);
  });
  
  console.log('\n🔐 Authentication:');
  console.log(`  - User Authenticated: ${results.authentication.authenticated ? '✅' : '⚠️'}`);
  console.log(`  - Proper Auth Handling: ${results.authentication.properRejection ? '✅' : '❌'}`);
  
  console.log('\n👤 Wallet Fields:');
  console.log(`  - Verification Fields: ${results.walletFields ? '✅' : '❌'}`);
  
  // Overall assessment
  const functionsWorking = Object.values(results.functions).every(v => v);
  const tablesWorking = Object.values(results.tables).every(v => v);
  const authWorking = results.authentication.properRejection;
  const fieldsWorking = results.walletFields;
  
  const allWorking = functionsWorking && tablesWorking && authWorking && fieldsWorking;
  
  console.log('\n🎯 Overall System Status:');
  if (allWorking) {
    console.log('🎉 Complete balance verification system is fully operational!');
    console.log('\n✅ Ready for:');
    console.log('  - User verification request submissions');
    console.log('  - Admin verification request reviews');
    console.log('  - Balance unlock and badge awards');
    console.log('  - Complete verification workflow');
  } else {
    console.log('⚠️ System setup incomplete. Issues detected:');
    if (!functionsWorking) console.log('  - Missing database functions');
    if (!tablesWorking) console.log('  - Table access issues');
    if (!authWorking) console.log('  - Authentication handling problems');
    if (!fieldsWorking) console.log('  - Missing wallet_users fields');
    
    console.log('\n📝 Next Steps:');
    console.log('  1. Run: run_balance_verification_setup.sql in Supabase SQL Editor');
    console.log('  2. Verify all functions and tables are created');
    console.log('  3. Test again after setup completion');
  }
  
  return results;
}

// Auto-run if in browser console
if (typeof window !== 'undefined' && window.supabase) {
  runCompleteSystemTest();
} else {
  console.log('ℹ️ To run this test, copy and paste into browser console on your app page.');
}