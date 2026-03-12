// ============================================================================
// BROWSER TEST: Duplicate Referral Claim Prevention
// Run this in browser console on the Referral page
// ============================================================================

console.log('🧪 Starting Duplicate Claim Prevention Test...\n');

// Test Configuration
const TEST_CONFIG = {
  claimAttempts: 3,  // Try to claim 3 times
  delayBetweenAttempts: 2000  // 2 seconds between attempts
};

// Store test results
const testResults = {
  attempts: [],
  initialBalance: 0,
  finalBalance: 0,
  duplicatePrevented: false
};

// Helper: Get current RZC balance
async function getCurrentBalance() {
  const balanceElement = document.querySelector('[class*="rzc_balance"]') || 
                         document.querySelector('h2[class*="text-3xl"]');
  if (balanceElement) {
    const balanceText = balanceElement.textContent.replace(/,/g, '');
    return parseInt(balanceText) || 0;
  }
  return 0;
}

// Helper: Click claim button
async function clickClaimButton() {
  const claimButton = Array.from(document.querySelectorAll('button'))
    .find(btn => btn.textContent.includes('Claim') && btn.textContent.includes('RZC'));
  
  if (!claimButton) {
    console.log('❌ Claim button not found');
    return false;
  }
  
  if (claimButton.disabled) {
    console.log('⚠️ Claim button is disabled');
    return false;
  }
  
  console.log('🖱️ Clicking claim button...');
  claimButton.click();
  return true;
}

// Helper: Wait for specified time
function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Main test function
async function testDuplicatePrevention() {
  console.log('📊 Test Configuration:', TEST_CONFIG);
  console.log('─'.repeat(60));
  
  // Get initial balance
  testResults.initialBalance = await getCurrentBalance();
  console.log(`💰 Initial Balance: ${testResults.initialBalance} RZC\n`);
  
  // Attempt multiple claims
  for (let i = 1; i <= TEST_CONFIG.claimAttempts; i++) {
    console.log(`\n🔄 Attempt ${i}/${TEST_CONFIG.claimAttempts}`);
    console.log('─'.repeat(40));
    
    const balanceBefore = await getCurrentBalance();
    console.log(`Balance before: ${balanceBefore} RZC`);
    
    const clicked = await clickClaimButton();
    
    if (!clicked) {
      testResults.attempts.push({
        attempt: i,
        status: 'button_not_available',
        balanceBefore,
        balanceAfter: balanceBefore,
        change: 0
      });
      console.log('⏭️ Skipping - button not available\n');
      continue;
    }
    
    // Wait for claim to process
    await wait(3000);
    
    const balanceAfter = await getCurrentBalance();
    const change = balanceAfter - balanceBefore;
    
    console.log(`Balance after: ${balanceAfter} RZC`);
    console.log(`Change: ${change > 0 ? '+' : ''}${change} RZC`);
    
    testResults.attempts.push({
      attempt: i,
      status: change > 0 ? 'claimed' : 'prevented',
      balanceBefore,
      balanceAfter,
      change
    });
    
    if (change > 0) {
      console.log('✅ Claim successful');
    } else {
      console.log('🛡️ Claim prevented (duplicate)');
    }
    
    // Wait before next attempt
    if (i < TEST_CONFIG.claimAttempts) {
      console.log(`⏳ Waiting ${TEST_CONFIG.delayBetweenAttempts/1000}s before next attempt...`);
      await wait(TEST_CONFIG.delayBetweenAttempts);
      
      // Reload the page to simulate user behavior
      console.log('🔄 Reloading page...');
      window.location.reload();
      await wait(3000);  // Wait for page to load
    }
  }
  
  // Get final balance
  testResults.finalBalance = await getCurrentBalance();
  
  // Analyze results
  console.log('\n' + '='.repeat(60));
  console.log('📋 TEST RESULTS SUMMARY');
  console.log('='.repeat(60));
  
  console.log(`\n💰 Balance Changes:`);
  console.log(`   Initial: ${testResults.initialBalance} RZC`);
  console.log(`   Final: ${testResults.finalBalance} RZC`);
  console.log(`   Total Change: ${testResults.finalBalance - testResults.initialBalance} RZC`);
  
  console.log(`\n📊 Claim Attempts:`);
  testResults.attempts.forEach(attempt => {
    const icon = attempt.status === 'claimed' ? '✅' : 
                 attempt.status === 'prevented' ? '🛡️' : '⏭️';
    console.log(`   ${icon} Attempt ${attempt.attempt}: ${attempt.status.toUpperCase()} (${attempt.change > 0 ? '+' : ''}${attempt.change} RZC)`);
  });
  
  // Determine if duplicate prevention worked
  const successfulClaims = testResults.attempts.filter(a => a.status === 'claimed').length;
  const preventedClaims = testResults.attempts.filter(a => a.status === 'prevented').length;
  
  testResults.duplicatePrevented = successfulClaims <= 1 && preventedClaims > 0;
  
  console.log(`\n🎯 Test Verdict:`);
  if (testResults.duplicatePrevented) {
    console.log('   ✅ PASSED - Duplicate prevention is working!');
    console.log(`   Only ${successfulClaims} claim(s) succeeded, ${preventedClaims} prevented.`);
  } else if (successfulClaims === 0) {
    console.log('   ⚠️ INCONCLUSIVE - No claims were successful');
    console.log('   This might mean there are no unclaimed rewards.');
  } else {
    console.log('   ❌ FAILED - Multiple claims succeeded!');
    console.log(`   ${successfulClaims} claims succeeded when only 1 should have.`);
  }
  
  console.log('\n' + '='.repeat(60));
  
  return testResults;
}

// Alternative: Simple single test (no page reload)
async function quickTest() {
  console.log('🧪 Quick Duplicate Prevention Test\n');
  
  const initialBalance = await getCurrentBalance();
  console.log(`💰 Initial Balance: ${initialBalance} RZC\n`);
  
  // First claim
  console.log('🔄 Attempt 1: First claim');
  await clickClaimButton();
  await wait(3000);
  
  const balanceAfterFirst = await getCurrentBalance();
  const firstChange = balanceAfterFirst - initialBalance;
  console.log(`   Result: ${firstChange > 0 ? '+' : ''}${firstChange} RZC ${firstChange > 0 ? '✅' : '⏭️'}\n`);
  
  // Second claim (should be prevented)
  console.log('🔄 Attempt 2: Duplicate claim');
  await clickClaimButton();
  await wait(3000);
  
  const balanceAfterSecond = await getCurrentBalance();
  const secondChange = balanceAfterSecond - balanceAfterFirst;
  console.log(`   Result: ${secondChange > 0 ? '+' : ''}${secondChange} RZC ${secondChange === 0 ? '🛡️ PREVENTED' : '❌ NOT PREVENTED'}\n`);
  
  // Verdict
  if (secondChange === 0 && firstChange > 0) {
    console.log('✅ TEST PASSED: Duplicate was prevented!');
  } else if (secondChange === 0 && firstChange === 0) {
    console.log('⚠️ TEST INCONCLUSIVE: No rewards to claim');
  } else {
    console.log('❌ TEST FAILED: Duplicate was NOT prevented!');
  }
}

// ============================================================================
// HOW TO USE:
// ============================================================================
// 
// 1. Open your app and navigate to the Referral page
// 2. Open browser console (F12)
// 3. Copy and paste this entire script
// 4. Run one of these commands:
//
//    Quick Test (recommended):
//    await quickTest()
//
//    Full Test (with page reloads):
//    await testDuplicatePrevention()
//
// ============================================================================

console.log('✅ Test functions loaded!');
console.log('\nRun: await quickTest()');
console.log('Or:  await testDuplicatePrevention()');
