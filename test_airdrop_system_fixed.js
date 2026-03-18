// Test Airdrop System - Fixed Version
// Run this in browser console to test the airdrop system

console.log('🚀 Starting Airdrop System Test...');

// Test configuration
const TEST_CONFIG = {
  // Replace with a real wallet address from your wallet_users table
  testWallet: 'EQTestWallet123', // You'll need to update this
  tasks: [
    { id: 1, action: 'create_wallet', title: 'Create RhizaCore Wallet', reward: 150 },
    { id: 2, action: 'follow', title: 'Follow @RhizaCore on Twitter', reward: 50 },
    { id: 3, action: 'retweet', title: 'Retweet Launch Post', reward: 30 },
    { id: 4, action: 'telegram', title: 'Join Telegram Community', reward: 40 },
    { id: 5, action: 'referral', title: 'Refer 3 Friends', reward: 100 }
  ]
};

// Test functions
async function testAirdropSystem() {
  try {
    console.log('📋 Test Configuration:', TEST_CONFIG);
    
    // Test 1: Check if airdropService exists
    console.log('\n🔍 Test 1: Checking airdropService availability...');
    if (typeof airdropService === 'undefined') {
      console.error('❌ airdropService not found. Make sure you\'re on a page that loads the service.');
      return;
    }
    console.log('✅ airdropService found');
    
    // Test 2: Test wallet validation
    console.log('\n🔍 Test 2: Testing wallet validation...');
    const isValidWallet = airdropService.isValidTONAddress(TEST_CONFIG.testWallet);
    console.log(`Wallet ${TEST_CONFIG.testWallet} is valid:`, isValidWallet);
    
    // Test 3: Get initial progress
    console.log('\n🔍 Test 3: Getting initial airdrop progress...');
    const initialProgress = await airdropService.getAirdropProgress(TEST_CONFIG.testWallet);
    console.log('Initial progress:', initialProgress);
    
    // Test 4: Test task completion
    console.log('\n🔍 Test 4: Testing task completion...');
    const testTask = TEST_CONFIG.tasks[0]; // Create wallet task
    
    console.log(`Attempting to complete task: ${testTask.title}`);
    const completionResult = await airdropService.recordTaskCompletion(
      TEST_CONFIG.testWallet,
      testTask.id,
      testTask.action,
      testTask.title,
      testTask.reward
    );
    console.log('Task completion result:', completionResult);
    
    // Test 5: Check progress after completion
    console.log('\n🔍 Test 5: Checking progress after task completion...');
    const updatedProgress = await airdropService.getAirdropProgress(TEST_CONFIG.testWallet);
    console.log('Updated progress:', updatedProgress);
    
    // Test 6: Test duplicate prevention
    console.log('\n🔍 Test 6: Testing duplicate prevention...');
    const duplicateResult = await airdropService.recordTaskCompletion(
      TEST_CONFIG.testWallet,
      testTask.id,
      testTask.action,
      testTask.title,
      testTask.reward
    );
    console.log('Duplicate completion result (should fail):', duplicateResult);
    
    // Test 7: Test task status verification
    console.log('\n🔍 Test 7: Testing task status verification...');
    const taskStatus = await airdropService.getTaskStatus(TEST_CONFIG.testWallet);
    console.log('Task status:', taskStatus);
    
    // Test 8: Test airdrop statistics
    console.log('\n🔍 Test 8: Testing airdrop statistics...');
    const stats = await airdropService.getAirdropStats();
    console.log('Airdrop stats:', stats);
    
    // Test 9: Test leaderboard
    console.log('\n🔍 Test 9: Testing airdrop leaderboard...');
    const leaderboard = await airdropService.getAirdropLeaderboard(5);
    console.log('Leaderboard:', leaderboard);
    
    console.log('\n🎉 All tests completed! Check results above.');
    
  } catch (error) {
    console.error('❌ Test failed with error:', error);
  }
}

// Helper function to test with real wallet from current user
async function testWithCurrentUser() {
  try {
    console.log('🔍 Attempting to get current user wallet...');
    
    // Try to get current user's wallet address
    let currentWallet = null;
    
    // Method 1: Check if userProfile exists (from context)
    if (typeof userProfile !== 'undefined' && userProfile?.wallet_address) {
      currentWallet = userProfile.wallet_address;
      console.log('✅ Found wallet from userProfile:', currentWallet);
    }
    
    // Method 2: Check localStorage
    if (!currentWallet) {
      const storedWallet = localStorage.getItem('wallet_address');
      if (storedWallet) {
        currentWallet = storedWallet;
        console.log('✅ Found wallet from localStorage:', currentWallet);
      }
    }
    
    // Method 3: Check if walletContext exists
    if (!currentWallet && typeof walletContext !== 'undefined' && walletContext?.address) {
      currentWallet = walletContext.address;
      console.log('✅ Found wallet from walletContext:', currentWallet);
    }
    
    if (currentWallet) {
      console.log(`🎯 Testing with real wallet: ${currentWallet}`);
      TEST_CONFIG.testWallet = currentWallet;
      await testAirdropSystem();
    } else {
      console.warn('⚠️ No current wallet found. Using test wallet.');
      console.log('💡 Make sure you\'re logged in, or update TEST_CONFIG.testWallet manually');
      await testAirdropSystem();
    }
    
  } catch (error) {
    console.error('❌ Error getting current user wallet:', error);
    console.log('🔄 Falling back to test wallet...');
    await testAirdropSystem();
  }
}

// Quick database check function
async function quickDatabaseCheck() {
  console.log('🔍 Quick Database Check...');
  
  try {
    // Check if supabaseService exists
    if (typeof supabaseService === 'undefined') {
      console.error('❌ supabaseService not found');
      return;
    }
    
    if (!supabaseService.isConfigured()) {
      console.error('❌ Supabase not configured');
      return;
    }
    
    const supabase = supabaseService.getClient();
    if (!supabase) {
      console.error('❌ Supabase client not available');
      return;
    }
    
    // Test database connection
    const { data, error } = await supabase
      .from('airdrop_task_completions')
      .select('count', { count: 'exact', head: true });
    
    if (error) {
      console.error('❌ Database connection error:', error);
      console.log('💡 Make sure you\'ve run create_airdrop_system_fixed.sql');
    } else {
      console.log('✅ Database connection successful');
      console.log(`📊 Total airdrop completions: ${data || 0}`);
    }
    
  } catch (error) {
    console.error('❌ Database check failed:', error);
  }
}

// Export functions for manual testing
window.testAirdropSystem = testAirdropSystem;
window.testWithCurrentUser = testWithCurrentUser;
window.quickDatabaseCheck = quickDatabaseCheck;

// Instructions
console.log(`
🧪 AIRDROP SYSTEM TEST SUITE

Available test functions:
1. testAirdropSystem()     - Run full test suite with configured wallet
2. testWithCurrentUser()   - Auto-detect current user and test
3. quickDatabaseCheck()    - Check database connection and setup

Quick start:
1. Update TEST_CONFIG.testWallet with a real wallet address
2. Run: testWithCurrentUser()

Or run individual tests:
- testAirdropSystem()
- quickDatabaseCheck()
`);

// Auto-run quick check
quickDatabaseCheck();