// Simple Airdrop Frontend Test
// Copy and paste this into your browser console while on your app

console.log('🚀 Starting Simple Airdrop Test...');

// Test configuration - we'll auto-detect your wallet
const testConfig = {
  taskId: 1,
  taskAction: 'create_wallet',
  taskTitle: 'Create RhizaCore Wallet',
  reward: 150
};

async function runSimpleAirdropTest() {
  try {
    console.log('🔍 Step 1: Checking if airdropService is available...');
    
    if (typeof airdropService === 'undefined') {
      console.error('❌ airdropService not found. Make sure you\'re on the right page.');
      console.log('💡 Try navigating to the Dashboard or Landing page first.');
      return;
    }
    
    console.log('✅ airdropService found');
    
    console.log('🔍 Step 2: Trying to detect your wallet address...');
    
    let walletAddress = null;
    
    // Try multiple methods to get wallet address
    if (typeof userProfile !== 'undefined' && userProfile?.wallet_address) {
      walletAddress = userProfile.wallet_address;
      console.log('✅ Found wallet from userProfile:', walletAddress);
    } else if (localStorage.getItem('wallet_address')) {
      walletAddress = localStorage.getItem('wallet_address');
      console.log('✅ Found wallet from localStorage:', walletAddress);
    } else {
      console.log('⚠️ Could not auto-detect wallet. Using test wallet.');
      walletAddress = 'EQTestWallet123456789'; // Fallback test wallet
    }
    
    console.log('🎯 Testing with wallet:', walletAddress);
    
    console.log('🔍 Step 3: Testing database connection...');
    
    // Quick database check
    if (typeof supabaseService !== 'undefined' && supabaseService.isConfigured()) {
      console.log('✅ Supabase is configured');
      
      const supabase = supabaseService.getClient();
      if (supabase) {
        console.log('✅ Supabase client available');
        
        // Test if airdrop table exists
        try {
          const { data, error } = await supabase
            .from('airdrop_task_completions')
            .select('count', { count: 'exact', head: true });
          
          if (error) {
            console.error('❌ Airdrop table not found:', error.message);
            console.log('💡 Make sure you\'ve run create_airdrop_system_fixed.sql in Supabase');
            return;
          } else {
            console.log('✅ Airdrop table exists with', data || 0, 'completions');
          }
        } catch (err) {
          console.error('❌ Database test failed:', err);
          return;
        }
      }
    } else {
      console.error('❌ Supabase not configured');
      return;
    }
    
    console.log('🔍 Step 4: Getting initial airdrop progress...');
    
    const initialProgress = await airdropService.getAirdropProgress(walletAddress);
    console.log('📊 Initial progress:', initialProgress);
    
    console.log('🔍 Step 5: Testing task completion...');
    
    const completionResult = await airdropService.recordTaskCompletion(
      walletAddress,
      testConfig.taskId,
      testConfig.taskAction,
      testConfig.taskTitle,
      testConfig.reward
    );
    
    console.log('🎯 Task completion result:', completionResult);
    
    if (completionResult.success) {
      console.log('✅ Task completed successfully!');
      
      console.log('🔍 Step 6: Checking updated progress...');
      
      const updatedProgress = await airdropService.getAirdropProgress(walletAddress);
      console.log('📈 Updated progress:', updatedProgress);
      
      console.log('🔍 Step 7: Testing duplicate prevention...');
      
      const duplicateResult = await airdropService.recordTaskCompletion(
        walletAddress,
        testConfig.taskId,
        testConfig.taskAction,
        testConfig.taskTitle,
        testConfig.reward
      );
      
      console.log('🔄 Duplicate attempt result (should fail):', duplicateResult);
      
      if (!duplicateResult.success) {
        console.log('✅ Duplicate prevention working correctly!');
      }
      
    } else {
      console.log('❌ Task completion failed:', completionResult.message);
    }
    
    console.log('🔍 Step 8: Testing airdrop statistics...');
    
    const stats = await airdropService.getAirdropStats();
    console.log('📊 Airdrop stats:', stats);
    
    console.log('🎉 Test completed! Check the results above.');
    
  } catch (error) {
    console.error('❌ Test failed with error:', error);
    console.log('💡 Make sure you\'ve run the SQL setup script first.');
  }
}

// Auto-run the test
runSimpleAirdropTest();

// Also make it available for manual running
window.runSimpleAirdropTest = runSimpleAirdropTest;

console.log(`
🧪 SIMPLE AIRDROP TEST

This test will:
1. ✅ Check if airdropService is available
2. 🔍 Auto-detect your wallet address  
3. 🔗 Test database connection
4. 📊 Get your current airdrop progress
5. 🎯 Try to complete a test task
6. 📈 Check updated progress
7. 🔄 Test duplicate prevention
8. 📊 Get airdrop statistics

If you see any errors, make sure you've:
- Run create_airdrop_system_fixed.sql in Supabase
- Are logged into your wallet
- Are on a page that loads the airdrop service

To run again: runSimpleAirdropTest()
`);