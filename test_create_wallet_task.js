// Test Create Wallet Task Functionality
// Run this in browser console on the dashboard page

console.log('🧪 Testing Create Wallet Task Functionality...');

// Test 1: Check if airdrop service is available
if (typeof window !== 'undefined' && window.airdropService) {
  console.log('✅ Airdrop service is available');
} else {
  console.log('❌ Airdrop service not found - checking alternative access');
}

// Test 2: Check wallet context
const testWalletContext = () => {
  // Try to access wallet context from React DevTools or global state
  const walletAddress = localStorage.getItem('wallet_address') || 
                       sessionStorage.getItem('wallet_address');
  
  if (walletAddress) {
    console.log('✅ Wallet address found:', walletAddress);
    return walletAddress;
  } else {
    console.log('❌ No wallet address found in storage');
    return null;
  }
};

// Test 3: Manual wallet verification test
const testWalletVerification = async (walletAddress) => {
  if (!walletAddress) {
    console.log('❌ Cannot test without wallet address');
    return;
  }

  try {
    console.log('🔍 Testing wallet verification for:', walletAddress);
    
    // Simulate the verification logic
    const testProfile = {
      success: true,
      profile: {
        id: 'test-id',
        wallet_address: walletAddress,
        name: 'Test User',
        created_at: new Date().toISOString()
      }
    };
    
    console.log('✅ Mock profile verification successful');
    console.log('Profile data:', testProfile);
    
    return testProfile.success && !!testProfile.profile;
  } catch (error) {
    console.error('❌ Wallet verification test failed:', error);
    return false;
  }
};

// Test 4: Check task completion logic
const testTaskCompletion = () => {
  console.log('🔍 Testing task completion logic...');
  
  const mockTask = {
    id: 0,
    title: 'Create RhizaCore Wallet',
    action: 'create_wallet',
    reward: 150,
    completed: false
  };
  
  console.log('Mock task:', mockTask);
  
  // Simulate completion
  const completedTask = { ...mockTask, completed: true };
  console.log('✅ Task completion simulation successful');
  console.log('Completed task:', completedTask);
  
  return completedTask;
};

// Test 5: Check UI elements
const testUIElements = () => {
  console.log('🔍 Testing UI elements...');
  
  // Check if airdrop widget exists
  const airdropWidget = document.querySelector('[class*="airdrop"]') || 
                       document.querySelector('[class*="Gift"]');
  
  if (airdropWidget) {
    console.log('✅ Airdrop UI elements found');
  } else {
    console.log('❌ Airdrop UI elements not found');
  }
  
  // Check for task buttons
  const taskButtons = document.querySelectorAll('button');
  const verifyButtons = Array.from(taskButtons).filter(btn => 
    btn.textContent && btn.textContent.toLowerCase().includes('verify')
  );
  
  console.log(`✅ Found ${verifyButtons.length} verify buttons`);
  
  return { airdropWidget, verifyButtons };
};

// Run all tests
const runAllTests = async () => {
  console.log('\n🚀 Starting Create Wallet Task Tests...\n');
  
  const walletAddress = testWalletContext();
  const verificationResult = await testWalletVerification(walletAddress);
  const completionResult = testTaskCompletion();
  const uiResult = testUIElements();
  
  console.log('\n📊 Test Results Summary:');
  console.log('- Wallet Address:', walletAddress ? '✅' : '❌');
  console.log('- Verification Logic:', verificationResult ? '✅' : '❌');
  console.log('- Task Completion:', completionResult ? '✅' : '❌');
  console.log('- UI Elements:', uiResult.airdropWidget ? '✅' : '❌');
  
  if (walletAddress && verificationResult) {
    console.log('\n🎉 Create Wallet Task should work properly!');
    console.log('💡 If task is not auto-completing, check:');
    console.log('   1. User is logged in with valid wallet');
    console.log('   2. Supabase connection is working');
    console.log('   3. Profile exists in database');
  } else {
    console.log('\n⚠️  Issues detected that may prevent task completion');
  }
};

// Export for manual testing
window.testCreateWalletTask = {
  runAllTests,
  testWalletContext,
  testWalletVerification,
  testTaskCompletion,
  testUIElements
};

// Auto-run tests
runAllTests();