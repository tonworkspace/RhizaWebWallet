// Manual Test for Create Wallet Task
// Copy and paste this into browser console on the dashboard page

console.log('🧪 Manual Create Wallet Task Test');
console.log('================================');

// Function to test create wallet task
async function testCreateWalletTask() {
  try {
    // Step 1: Check if we're on the right page
    const currentUrl = window.location.href;
    console.log('📍 Current URL:', currentUrl);
    
    if (!currentUrl.includes('dashboard') && !currentUrl.includes('airdrop')) {
      console.log('⚠️  Navigate to dashboard or airdrop page first');
      return;
    }

    // Step 2: Check React context (try multiple methods)
    let walletAddress = null;
    let userProfile = null;

    // Method 1: Check localStorage
    walletAddress = localStorage.getItem('wallet_address') || 
                   localStorage.getItem('walletAddress') ||
                   localStorage.getItem('address');

    // Method 2: Check sessionStorage
    if (!walletAddress) {
      walletAddress = sessionStorage.getItem('wallet_address') || 
                     sessionStorage.getItem('walletAddress') ||
                     sessionStorage.getItem('address');
    }

    // Method 3: Try to find React context in DOM
    if (!walletAddress) {
      const reactRoot = document.querySelector('#root');
      if (reactRoot && reactRoot._reactInternalFiber) {
        console.log('🔍 Trying to access React context...');
        // This is a simplified attempt - actual implementation may vary
      }
    }

    console.log('👤 Wallet Address:', walletAddress || 'Not found');

    // Step 3: Check if airdrop components are present
    const airdropElements = {
      widget: document.querySelector('[class*="airdrop" i]'),
      dashboard: document.querySelector('[class*="social" i]'),
      tasks: document.querySelectorAll('button').length,
      verifyButtons: Array.from(document.querySelectorAll('button')).filter(btn => 
        btn.textContent && btn.textContent.toLowerCase().includes('verify')
      ).length
    };

    console.log('🎯 UI Elements Found:');
    console.log('  - Airdrop Widget:', !!airdropElements.widget);
    console.log('  - Dashboard:', !!airdropElements.dashboard);
    console.log('  - Total Buttons:', airdropElements.tasks);
    console.log('  - Verify Buttons:', airdropElements.verifyButtons);

    // Step 4: Test wallet verification logic
    if (walletAddress) {
      console.log('🔍 Testing wallet verification...');
      
      // Simulate the verification process
      const mockVerification = {
        hasAddress: !!walletAddress,
        addressFormat: /^[EU]Q[A-Za-z0-9_-]{46}$/.test(walletAddress),
        isLoggedIn: true // If we have an address, user is likely logged in
      };

      console.log('📊 Verification Results:');
      console.log('  - Has Address:', mockVerification.hasAddress);
      console.log('  - Valid Format:', mockVerification.addressFormat);
      console.log('  - Is Logged In:', mockVerification.isLoggedIn);

      if (mockVerification.hasAddress && mockVerification.isLoggedIn) {
        console.log('✅ Create Wallet Task should be COMPLETED');
        console.log('💰 Reward: 150 RZC should be available');
      } else {
        console.log('❌ Create Wallet Task requirements not met');
      }
    } else {
      console.log('❌ No wallet address found - user may not be logged in');
    }

    // Step 5: Check for task completion in UI
    const taskElements = Array.from(document.querySelectorAll('*')).filter(el => 
      el.textContent && el.textContent.includes('Create') && el.textContent.includes('Wallet')
    );

    console.log('🎯 Create Wallet Task Elements:', taskElements.length);
    
    if (taskElements.length > 0) {
      taskElements.forEach((el, index) => {
        const isCompleted = el.textContent.includes('Completed') || 
                           el.textContent.includes('✓') ||
                           el.classList.toString().includes('completed') ||
                           el.style.opacity === '0.5';
        
        console.log(`  Task ${index + 1}:`, isCompleted ? '✅ Completed' : '⏳ Pending');
      });
    }

    // Step 6: Provide recommendations
    console.log('\n💡 Recommendations:');
    
    if (!walletAddress) {
      console.log('  1. Make sure you are logged in');
      console.log('  2. Check if wallet connection is working');
      console.log('  3. Try refreshing the page');
    } else if (airdropElements.verifyButtons === 0) {
      console.log('  1. Navigate to the airdrop section');
      console.log('  2. Look for the Social Airdrop widget');
      console.log('  3. Check if tasks are loading');
    } else {
      console.log('  1. Task should auto-complete when logged in');
      console.log('  2. If not completed, try clicking "Verify" button');
      console.log('  3. Check browser console for any errors');
    }

    return {
      walletAddress,
      userProfile,
      airdropElements,
      success: !!walletAddress
    };

  } catch (error) {
    console.error('❌ Test failed:', error);
    return { success: false, error };
  }
}

// Function to simulate task completion
function simulateTaskCompletion() {
  console.log('\n🎮 Simulating Create Wallet Task Completion...');
  
  const mockTask = {
    id: 0,
    title: 'Create RhizaCore Wallet',
    action: 'create_wallet',
    reward: 150,
    completed: false,
    category: 'engagement',
    difficulty: 'easy'
  };

  console.log('📋 Original Task:', mockTask);

  // Simulate completion
  const completedTask = {
    ...mockTask,
    completed: true,
    completedAt: new Date().toISOString()
  };

  console.log('✅ Completed Task:', completedTask);
  console.log('💰 Reward Earned: 150 RZC');

  return completedTask;
}

// Function to check task status
function checkTaskStatus() {
  console.log('\n📊 Checking Current Task Status...');
  
  // Look for task indicators in the UI
  const indicators = {
    completedTasks: document.querySelectorAll('[class*="completed" i]').length,
    pendingTasks: document.querySelectorAll('[class*="pending" i]').length,
    verifyButtons: document.querySelectorAll('button[class*="verify" i]').length,
    checkmarks: document.querySelectorAll('[class*="check" i]').length
  };

  console.log('UI Indicators:', indicators);

  // Check for progress indicators
  const progressElements = Array.from(document.querySelectorAll('*')).filter(el => 
    el.textContent && (
      el.textContent.includes('/') || 
      el.textContent.includes('%') ||
      el.textContent.includes('RZC')
    )
  );

  console.log('Progress Elements Found:', progressElements.length);
  progressElements.forEach((el, i) => {
    console.log(`  ${i + 1}: "${el.textContent.trim()}"`);
  });
}

// Export functions for manual use
window.testCreateWallet = {
  test: testCreateWalletTask,
  simulate: simulateTaskCompletion,
  checkStatus: checkTaskStatus
};

// Auto-run the test
console.log('🚀 Running automatic test...\n');
testCreateWalletTask().then(result => {
  console.log('\n📋 Test Complete!');
  console.log('Result:', result);
  
  if (result.success) {
    console.log('\n🎉 Create Wallet Task should be working!');
  } else {
    console.log('\n⚠️  Issues detected. Check the recommendations above.');
  }
  
  console.log('\n🔧 Manual Commands Available:');
  console.log('  - testCreateWallet.test()     // Run full test');
  console.log('  - testCreateWallet.simulate() // Simulate completion');
  console.log('  - testCreateWallet.checkStatus() // Check UI status');
});