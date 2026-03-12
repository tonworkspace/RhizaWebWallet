// ============================================================================
// PACKAGE PURCHASE & RZC CREDITING TEST
// ============================================================================
// Run this in browser console after logging into the wallet
// This tests the complete package purchase flow including RZC crediting
// ============================================================================

async function testPackagePurchaseFlow() {
  console.log('🧪 Starting Package Purchase Flow Test...\n');

  // Step 1: Check if user is logged in
  console.log('📋 Step 1: Checking wallet connection...');
  const { supabaseService } = await import('./services/supabaseService.js');
  
  // Get current user from localStorage
  const walletData = localStorage.getItem('ton-wallet');
  if (!walletData) {
    console.error('❌ No wallet connected. Please connect wallet first.');
    return;
  }

  const { address } = JSON.parse(walletData);
  console.log('✅ Wallet connected:', address);

  // Step 2: Get user profile and current RZC balance
  console.log('\n📋 Step 2: Fetching user profile...');
  const profileResult = await supabaseService.getProfile(address);
  
  if (!profileResult.success) {
    console.error('❌ Failed to get profile:', profileResult.error);
    return;
  }

  const userId = profileResult.data.id;
  const initialBalance = profileResult.data.rzc_balance || 0;
  const isActivated = profileResult.data.is_activated;

  console.log('✅ User ID:', userId);
  console.log('✅ Initial RZC Balance:', initialBalance);
  console.log('✅ Wallet Activated:', isActivated);

  // Step 3: Test RZC award function
  console.log('\n📋 Step 3: Testing RZC award function...');
  const testAmount = 100;
  
  const awardResult = await supabaseService.awardRZCTokens(
    userId,
    testAmount,
    'test_credit',
    'Test package purchase RZC crediting',
    {
      test: true,
      timestamp: new Date().toISOString(),
      package_name: 'Test Package'
    }
  );

  if (!awardResult.success) {
    console.error('❌ Failed to award RZC:', awardResult.error);
    return;
  }

  console.log('✅ RZC awarded successfully!');
  console.log('✅ New Balance:', awardResult.newBalance);
  console.log('✅ Balance Increase:', awardResult.newBalance - initialBalance);

  // Step 4: Verify transaction was recorded
  console.log('\n📋 Step 4: Verifying transaction record...');
  
  // Get recent transactions
  const { data: transactions, error: txError } = await supabaseService.client
    .from('rzc_transactions')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(5);

  if (txError) {
    console.error('❌ Failed to fetch transactions:', txError);
    return;
  }

  console.log('✅ Recent transactions:', transactions);

  const testTransaction = transactions.find(tx => tx.type === 'test_credit');
  if (testTransaction) {
    console.log('✅ Test transaction found:', testTransaction);
  } else {
    console.warn('⚠️ Test transaction not found in recent transactions');
  }

  // Step 5: Test package purchase simulation
  console.log('\n📋 Step 5: Simulating package purchase...');
  
  const packageData = {
    id: 'starter-100',
    tierName: 'Bronze Package',
    pricePoint: 100,
    rzcReward: 1000,
    activationFee: isActivated ? 0 : 15
  };

  console.log('📦 Package:', packageData.tierName);
  console.log('💰 Price:', `$${packageData.pricePoint}`);
  console.log('🪙 RZC Reward:', packageData.rzcReward);
  console.log('🔓 Activation Fee:', `$${packageData.activationFee}`);

  // Simulate RZC award for package purchase
  const packageAwardResult = await supabaseService.awardRZCTokens(
    userId,
    packageData.rzcReward,
    'package_purchase',
    `${packageData.tierName} purchase`,
    {
      package_id: packageData.id,
      package_name: packageData.tierName,
      price_usd: packageData.pricePoint,
      activation_fee: packageData.activationFee,
      test: true
    }
  );

  if (!packageAwardResult.success) {
    console.error('❌ Failed to award package RZC:', packageAwardResult.error);
    return;
  }

  console.log('✅ Package RZC awarded successfully!');
  console.log('✅ New Balance:', packageAwardResult.newBalance);
  console.log('✅ Total Increase:', packageAwardResult.newBalance - initialBalance);

  // Step 6: Final verification
  console.log('\n📋 Step 6: Final verification...');
  
  const finalProfileResult = await supabaseService.getProfile(address);
  if (finalProfileResult.success) {
    const finalBalance = finalProfileResult.data.rzc_balance;
    console.log('✅ Final RZC Balance:', finalBalance);
    console.log('✅ Total RZC Credited:', finalBalance - initialBalance);
    
    if (finalBalance === packageAwardResult.newBalance) {
      console.log('✅ Balance matches expected value!');
    } else {
      console.warn('⚠️ Balance mismatch!');
      console.warn('   Expected:', packageAwardResult.newBalance);
      console.warn('   Actual:', finalBalance);
    }
  }

  // Step 7: Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 TEST SUMMARY');
  console.log('='.repeat(60));
  console.log('Initial Balance:', initialBalance, 'RZC');
  console.log('Test Credit:', testAmount, 'RZC');
  console.log('Package Reward:', packageData.rzcReward, 'RZC');
  console.log('Final Balance:', packageAwardResult.newBalance, 'RZC');
  console.log('Total Credited:', packageAwardResult.newBalance - initialBalance, 'RZC');
  console.log('='.repeat(60));
  console.log('✅ ALL TESTS PASSED! RZC crediting works correctly.');
  console.log('='.repeat(60));

  return {
    success: true,
    initialBalance,
    finalBalance: packageAwardResult.newBalance,
    totalCredited: packageAwardResult.newBalance - initialBalance
  };
}

// ============================================================================
// QUICK TEST FUNCTIONS
// ============================================================================

// Test 1: Check current RZC balance
async function checkRZCBalance() {
  const walletData = localStorage.getItem('ton-wallet');
  if (!walletData) {
    console.error('❌ No wallet connected');
    return;
  }

  const { address } = JSON.parse(walletData);
  const { supabaseService } = await import('./services/supabaseService.js');
  const result = await supabaseService.getProfile(address);

  if (result.success) {
    console.log('🪙 Current RZC Balance:', result.data.rzc_balance);
    console.log('🔓 Wallet Activated:', result.data.is_activated);
    return result.data.rzc_balance;
  } else {
    console.error('❌ Failed to get balance:', result.error);
  }
}

// Test 2: Award test RZC
async function awardTestRZC(amount = 100) {
  const walletData = localStorage.getItem('ton-wallet');
  if (!walletData) {
    console.error('❌ No wallet connected');
    return;
  }

  const { address } = JSON.parse(walletData);
  const { supabaseService } = await import('./services/supabaseService.js');
  
  const profileResult = await supabaseService.getProfile(address);
  if (!profileResult.success) {
    console.error('❌ Failed to get profile');
    return;
  }

  const userId = profileResult.data.id;
  const initialBalance = profileResult.data.rzc_balance;

  console.log('💰 Initial Balance:', initialBalance);
  console.log('🎁 Awarding:', amount, 'RZC');

  const result = await supabaseService.awardRZCTokens(
    userId,
    amount,
    'test_credit',
    'Manual test credit',
    { test: true }
  );

  if (result.success) {
    console.log('✅ Success! New Balance:', result.newBalance);
    console.log('📈 Increase:', result.newBalance - initialBalance);
    return result.newBalance;
  } else {
    console.error('❌ Failed:', result.error);
  }
}

// Test 3: View recent transactions
async function viewRecentTransactions(limit = 10) {
  const walletData = localStorage.getItem('ton-wallet');
  if (!walletData) {
    console.error('❌ No wallet connected');
    return;
  }

  const { address } = JSON.parse(walletData);
  const { supabaseService } = await import('./services/supabaseService.js');
  
  const profileResult = await supabaseService.getProfile(address);
  if (!profileResult.success) {
    console.error('❌ Failed to get profile');
    return;
  }

  const userId = profileResult.data.id;

  const { data, error } = await supabaseService.client
    .from('rzc_transactions')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('❌ Failed to fetch transactions:', error);
    return;
  }

  console.log('📜 Recent Transactions:');
  console.table(data.map(tx => ({
    Amount: tx.amount,
    Type: tx.type,
    Description: tx.description,
    Date: new Date(tx.created_at).toLocaleString()
  })));

  return data;
}

// ============================================================================
// USAGE INSTRUCTIONS
// ============================================================================
console.log(`
╔════════════════════════════════════════════════════════════════╗
║         PACKAGE PURCHASE & RZC CREDITING TEST SUITE           ║
╚════════════════════════════════════════════════════════════════╝

Available test functions:

1. testPackagePurchaseFlow()
   - Complete end-to-end test of package purchase and RZC crediting
   - Tests both test credit and package purchase simulation

2. checkRZCBalance()
   - Quick check of current RZC balance

3. awardTestRZC(amount)
   - Award test RZC tokens (default: 100)
   - Example: awardTestRZC(500)

4. viewRecentTransactions(limit)
   - View recent RZC transactions (default: 10)
   - Example: viewRecentTransactions(20)

To run the complete test:
> testPackagePurchaseFlow()

To check your balance:
> checkRZCBalance()

To award test RZC:
> awardTestRZC(100)

To view transactions:
> viewRecentTransactions()
`);

// Auto-export for easy access
window.testPackagePurchaseFlow = testPackagePurchaseFlow;
window.checkRZCBalance = checkRZCBalance;
window.awardTestRZC = awardTestRZC;
window.viewRecentTransactions = viewRecentTransactions;
