/**
 * Test Script: Multi-Transaction Referral Commission
 * 
 * This script tests both wallet types' multi-transaction functionality
 * to ensure referral commissions work correctly.
 */

// Test configuration
const TEST_CONFIG = {
  // Test addresses (replace with actual addresses)
  PLATFORM_ADDRESS: 'EQD3_PLATFORM_ADDRESS_HERE',
  REFERRER_ADDRESS: 'EQD3_REFERRER_ADDRESS_HERE',
  
  // Test amounts (in TON)
  TOTAL_AMOUNT: 0.5,  // 0.5 TON total purchase
  COMMISSION_RATE: 0.10,  // 10% commission
  
  // Network
  NETWORK: 'testnet'  // Use testnet for testing
};

/**
 * Test 24-word TON wallet multi-transaction
 */
async function test24WordWallet() {
  console.log('\n🔍 Testing 24-word TON wallet (tonWalletService)...');
  
  try {
    // Import the service
    const { tonWalletService } = await import('./services/tonWalletService.js');
    
    // Check if wallet is initialized
    if (!tonWalletService.isInitialized()) {
      console.log('❌ TON wallet not initialized. Please initialize wallet first.');
      return false;
    }
    
    // Calculate amounts
    const commissionAmount = parseFloat((TEST_CONFIG.TOTAL_AMOUNT * TEST_CONFIG.COMMISSION_RATE).toFixed(6));
    const platformAmount = parseFloat((TEST_CONFIG.TOTAL_AMOUNT - commissionAmount).toFixed(6));
    
    console.log(`💰 Total: ${TEST_CONFIG.TOTAL_AMOUNT} TON`);
    console.log(`🏢 Platform: ${platformAmount} TON (90%)`);
    console.log(`👥 Referrer: ${commissionAmount} TON (10%)`);
    
    // Prepare recipients
    const recipients = [
      {
        address: TEST_CONFIG.PLATFORM_ADDRESS,
        amount: platformAmount.toString(),
        comment: 'RhizaCore Test Purchase'
      },
      {
        address: TEST_CONFIG.REFERRER_ADDRESS,
        amount: commissionAmount.toString(),
        comment: 'RhizaCore 10% Referral Commission'
      }
    ];
    
    // Check balance first
    const balanceResult = await tonWalletService.getBalance();
    if (!balanceResult.success) {
      console.log('❌ Failed to check balance:', balanceResult.error);
      return false;
    }
    
    const currentBalance = parseFloat(balanceResult.balance);
    const requiredBalance = TEST_CONFIG.TOTAL_AMOUNT + 0.02; // Add fee buffer
    
    if (currentBalance < requiredBalance) {
      console.log(`❌ Insufficient balance. Need ${requiredBalance} TON, have ${currentBalance} TON`);
      return false;
    }
    
    console.log(`✅ Balance check passed: ${currentBalance} TON available`);
    
    // Send multi-transaction
    console.log('📤 Sending multi-transaction...');
    const result = await tonWalletService.sendMultiTransaction(recipients);
    
    if (result.success) {
      console.log('✅ Multi-transaction successful!');
      console.log(`📋 Transaction Hash: ${result.txHash}`);
      console.log(`🔢 Seqno: ${result.seqno}`);
      console.log(`🔗 TonViewer: https://${TEST_CONFIG.NETWORK === 'testnet' ? 'testnet.' : ''}tonviewer.com/transaction/${result.txHash}`);
      return true;
    } else {
      console.log('❌ Multi-transaction failed:', result.error);
      return false;
    }
    
  } catch (error) {
    console.log('❌ Test failed with error:', error.message);
    return false;
  }
}

/**
 * Test 12-word multi-chain wallet multi-transaction
 */
async function test12WordWallet() {
  console.log('\n🔍 Testing 12-word multi-chain wallet (tetherWdkService)...');
  
  try {
    // Import the service
    const { tetherWdkService } = await import('./services/tetherWdkService.js');
    
    // Check if wallet is initialized
    if (!tetherWdkService.isInitialized()) {
      console.log('❌ Multi-chain wallet not initialized. Please initialize wallet first.');
      return false;
    }
    
    // Calculate amounts
    const commissionAmount = parseFloat((TEST_CONFIG.TOTAL_AMOUNT * TEST_CONFIG.COMMISSION_RATE).toFixed(6));
    const platformAmount = parseFloat((TEST_CONFIG.TOTAL_AMOUNT - commissionAmount).toFixed(6));
    
    console.log(`💰 Total: ${TEST_CONFIG.TOTAL_AMOUNT} TON`);
    console.log(`🏢 Platform: ${platformAmount} TON (90%)`);
    console.log(`👥 Referrer: ${commissionAmount} TON (10%)`);
    
    // Prepare recipients
    const recipients = [
      {
        address: TEST_CONFIG.PLATFORM_ADDRESS,
        amount: platformAmount.toString(),
        comment: 'RhizaCore Test Purchase'
      },
      {
        address: TEST_CONFIG.REFERRER_ADDRESS,
        amount: commissionAmount.toString(),
        comment: 'RhizaCore 10% Referral Commission'
      }
    ];
    
    // Check balance first
    const balances = await tetherWdkService.getBalances();
    if (!balances || !balances.tonBalance) {
      console.log('❌ Failed to check TON balance');
      return false;
    }
    
    const currentBalance = parseFloat(balances.tonBalance);
    const requiredBalance = TEST_CONFIG.TOTAL_AMOUNT + 0.02; // Add fee buffer
    
    if (currentBalance < requiredBalance) {
      console.log(`❌ Insufficient balance. Need ${requiredBalance} TON, have ${currentBalance} TON`);
      return false;
    }
    
    console.log(`✅ Balance check passed: ${currentBalance} TON available`);
    
    // Send multi-transaction
    console.log('📤 Sending multi-transaction...');
    const result = await tetherWdkService.sendTonMultiTransaction(recipients);
    
    if (result.success) {
      console.log('✅ Multi-transaction successful!');
      console.log(`📋 Transaction Hash: ${result.txHash}`);
      console.log(`💰 Fee: ${result.fee || 'N/A'} TON`);
      console.log(`🔗 TonViewer: https://${TEST_CONFIG.NETWORK === 'testnet' ? 'testnet.' : ''}tonviewer.com/transaction/${result.txHash}`);
      return true;
    } else {
      console.log('❌ Multi-transaction failed:', result.error);
      return false;
    }
    
  } catch (error) {
    console.log('❌ Test failed with error:', error.message);
    return false;
  }
}

/**
 * Test commission calculation accuracy
 */
function testCommissionCalculation() {
  console.log('\n🔍 Testing commission calculation...');
  
  const testCases = [
    { total: 1.0, expected: { platform: 0.9, commission: 0.1 } },
    { total: 0.5, expected: { platform: 0.45, commission: 0.05 } },
    { total: 2.5, expected: { platform: 2.25, commission: 0.25 } },
    { total: 0.123456, expected: { platform: 0.111110, commission: 0.012346 } }
  ];
  
  let allPassed = true;
  
  testCases.forEach((testCase, index) => {
    const commission = parseFloat((testCase.total * 0.10).toFixed(6));
    const platform = parseFloat((testCase.total - commission).toFixed(6));
    
    const commissionMatch = Math.abs(commission - testCase.expected.commission) < 0.000001;
    const platformMatch = Math.abs(platform - testCase.expected.platform) < 0.000001;
    const totalMatch = Math.abs((platform + commission) - testCase.total) < 0.000001;
    
    if (commissionMatch && platformMatch && totalMatch) {
      console.log(`✅ Test ${index + 1}: ${testCase.total} TON → Platform: ${platform}, Commission: ${commission}`);
    } else {
      console.log(`❌ Test ${index + 1}: Calculation error`);
      console.log(`   Expected: Platform: ${testCase.expected.platform}, Commission: ${testCase.expected.commission}`);
      console.log(`   Got: Platform: ${platform}, Commission: ${commission}`);
      allPassed = false;
    }
  });
  
  return allPassed;
}

/**
 * Main test runner
 */
async function runTests() {
  console.log('🚀 Starting Referral Commission Multi-Transaction Tests');
  console.log('=' .repeat(60));
  
  // Test commission calculation
  const calcTest = testCommissionCalculation();
  
  // Test both wallet types (comment out if wallets not available)
  // const wallet24Test = await test24WordWallet();
  // const wallet12Test = await test12WordWallet();
  
  console.log('\n📊 Test Results Summary:');
  console.log('=' .repeat(30));
  console.log(`Commission Calculation: ${calcTest ? '✅ PASS' : '❌ FAIL'}`);
  // console.log(`24-word Wallet: ${wallet24Test ? '✅ PASS' : '❌ FAIL'}`);
  // console.log(`12-word Wallet: ${wallet12Test ? '✅ PASS' : '❌ FAIL'}`);
  
  console.log('\n💡 To test actual transactions:');
  console.log('1. Update TEST_CONFIG with real addresses');
  console.log('2. Initialize wallets in the app');
  console.log('3. Uncomment wallet test lines in runTests()');
  console.log('4. Run: node test_multi_transaction.js');
}

// Run tests if this file is executed directly
if (typeof window === 'undefined' && typeof module !== 'undefined') {
  runTests().catch(console.error);
}

// Export for use in other files
if (typeof module !== 'undefined') {
  module.exports = {
    test24WordWallet,
    test12WordWallet,
    testCommissionCalculation,
    TEST_CONFIG
  };
}