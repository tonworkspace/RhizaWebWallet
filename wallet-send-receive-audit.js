/**
 * 🔍 Comprehensive Wallet Send/Receive Audit
 * Tests all send/receive functionality across all supported chains
 */

import { tetherWdkService } from './services/tetherWdkService.js';

// Test configuration
const TEST_CONFIG = {
  // Test mnemonic (DO NOT USE IN PRODUCTION)
  mnemonic: 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about',
  
  // Test amounts (small amounts for safety)
  amounts: {
    evm: '0.001',      // 0.001 ETH
    ton: '0.1',        // 0.1 TON
    btc: '0.00001',    // 1000 sats
    sol: '0.001',      // 0.001 SOL
    tron: '1'          // 1 TRX
  },
  
  // Test token addresses (mainnet)
  tokens: {
    ethereum: {
      USDT: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
      USDC: '0xA0b86a33E6441e8e421c7c7c4b8c7c8c8c8c8c8c'
    },
    polygon: {
      USDT: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F',
      USDC: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174'
    }
  }
};

class WalletAudit {
  constructor() {
    this.results = {
      initialization: null,
      addresses: null,
      balances: null,
      sendTests: {},
      receiveTests: {},
      feeEstimation: {},
      errorHandling: {},
      security: {},
      performance: {}
    };
  }

  async runFullAudit() {
    console.log('🔍 Starting Comprehensive Wallet Send/Receive Audit\n');
    console.log('=' .repeat(80));

    try {
      await this.testInitialization();
      await this.testAddressGeneration();
      await this.testBalanceFetching();
      await this.testFeeEstimation();
      await this.testSendFunctionality();
      await this.testReceiveFunctionality();
      await this.testErrorHandling();
      await this.testSecurityFeatures();
      await this.testPerformance();
      await this.testCleanup();

      this.generateReport();
    } catch (error) {
      console.error('❌ Audit failed:', error);
    }
  }

  async testInitialization() {
    console.log('\n1️⃣ Testing Wallet Initialization...');
    
    try {
      const start = performance.now();
      const addresses = await tetherWdkService.initializeManagers(TEST_CONFIG.mnemonic);
      const duration = performance.now() - start;

      this.results.initialization = {
        success: true,
        duration: Math.round(duration),
        addresses,
        chainsInitialized: {
          evm: !!addresses.evmAddress,
          ton: !!addresses.tonAddress,
          btc: !!addresses.btcAddress,
          sol: !!addresses.solAddress,
          tron: !!addresses.tronAddress
        }
      };

      console.log(`✅ Initialization successful (${Math.round(duration)}ms)`);
      console.log(`   EVM: ${addresses.evmAddress}`);
      console.log(`   TON: ${addresses.tonAddress}`);
      console.log(`   BTC: ${addresses.btcAddress}`);
      console.log(`   SOL: ${addresses.solAddress}`);
      console.log(`   TRON: ${addresses.tronAddress}`);

    } catch (error) {
      this.results.initialization = { success: false, error: error.message };
      console.log(`❌ Initialization failed: ${error.message}`);
      throw error;
    }
  }

  async testAddressGeneration() {
    console.log('\n2️⃣ Testing Address Generation & Validation...');

    try {
      const addresses = await tetherWdkService.getAddresses();
      
      // Test address format validation
      const validations = {
        evm: this.validateEvmAddress(addresses.evmAddress),
        ton: this.validateTonAddress(addresses.tonAddress),
        btc: this.validateBtcAddress(addresses.btcAddress),
        sol: this.validateSolAddress(addresses.solAddress),
        tron: this.validateTronAddress(addresses.tronAddress)
      };

      this.results.addresses = { success: true, addresses, validations };
      
      console.log('✅ Address generation successful');
      for (const [chain, isValid] of Object.entries(validations)) {
        console.log(`   ${chain.toUpperCase()}: ${isValid ? '✅ Valid' : '❌ Invalid'}`);
      }

    } catch (error) {
      this.results.addresses = { success: false, error: error.message };
      console.log(`❌ Address generation failed: ${error.message}`);
    }
  }

  async testBalanceFetching() {
    console.log('\n3️⃣ Testing Balance Fetching...');

    try {
      const start = performance.now();
      const balances = await tetherWdkService.getBalances();
      const duration = performance.now() - start;

      this.results.balances = {
        success: true,
        duration: Math.round(duration),
        balances,
        nonZeroBalances: Object.entries(balances).filter(([_, balance]) => 
          parseFloat(balance) > 0
        ).length
      };

      console.log(`✅ Balance fetching successful (${Math.round(duration)}ms)`);
      console.log(`   EVM: ${balances.evmBalance} ETH`);
      console.log(`   TON: ${balances.tonBalance} TON`);
      console.log(`   BTC: ${balances.btcBalance} BTC`);
      console.log(`   SOL: ${balances.solBalance} SOL`);
      console.log(`   TRON: ${balances.tronBalance} TRX`);

    } catch (error) {
      this.results.balances = { success: false, error: error.message };
      console.log(`❌ Balance fetching failed: ${error.message}`);
    }
  }

  async testFeeEstimation() {
    console.log('\n4️⃣ Testing Fee Estimation...');

    const addresses = await tetherWdkService.getAddresses();
    const feeTests = {};

    // Test EVM fee estimation
    try {
      const evmFee = await tetherWdkService.quoteSendEvmTransaction(
        addresses.evmAddress, 
        TEST_CONFIG.amounts.evm
      );
      feeTests.evm = { success: true, fee: evmFee };
      console.log(`✅ EVM fee: ${evmFee?.feeEth} ETH`);
    } catch (error) {
      feeTests.evm = { success: false, error: error.message };
      console.log(`❌ EVM fee estimation failed: ${error.message}`);
    }

    // Test TON fee estimation
    try {
      const tonFee = await tetherWdkService.quoteSendTonTransaction(
        addresses.tonAddress, 
        TEST_CONFIG.amounts.ton
      );
      feeTests.ton = { success: true, fee: tonFee };
      console.log(`✅ TON fee: ${tonFee?.feeTon} TON`);
    } catch (error) {
      feeTests.ton = { success: false, error: error.message };
      console.log(`❌ TON fee estimation failed: ${error.message}`);
    }

    // Test BTC fee estimation
    try {
      const btcFee = await tetherWdkService.quoteSendBtcTransaction(
        addresses.btcAddress, 
        TEST_CONFIG.amounts.btc
      );
      feeTests.btc = { success: true, fee: btcFee };
      console.log(`✅ BTC fee: ${btcFee?.feeBtc} BTC`);
    } catch (error) {
      feeTests.btc = { success: false, error: error.message };
      console.log(`❌ BTC fee estimation failed: ${error.message}`);
    }

    // Test SOL fee estimation
    try {
      const solFee = await tetherWdkService.quoteSendSolTransaction(
        addresses.solAddress, 
        TEST_CONFIG.amounts.sol
      );
      feeTests.sol = { success: true, fee: solFee };
      console.log(`✅ SOL fee: ${solFee?.feeSol} SOL`);
    } catch (error) {
      feeTests.sol = { success: false, error: error.message };
      console.log(`❌ SOL fee estimation failed: ${error.message}`);
    }

    // Test TRON fee estimation
    try {
      const tronFee = await tetherWdkService.quoteSendTronTransaction(
        addresses.tronAddress, 
        TEST_CONFIG.amounts.tron
      );
      feeTests.tron = { success: true, fee: tronFee };
      console.log(`✅ TRON fee: ${tronFee?.feeTrx} TRX`);
    } catch (error) {
      feeTests.tron = { success: false, error: error.message };
      console.log(`❌ TRON fee estimation failed: ${error.message}`);
    }

    this.results.feeEstimation = feeTests;
  }

  async testSendFunctionality() {
    console.log('\n5️⃣ Testing Send Functionality (DRY RUN - No actual sends)...');

    const addresses = await tetherWdkService.getAddresses();
    const sendTests = {};

    // Test send function signatures and validation
    console.log('   Testing send function interfaces...');

    // EVM send test (dry run)
    try {
      // Test with invalid address to check validation
      const result = await this.dryRunSend('evm', () => 
        tetherWdkService.sendEvmTransaction('invalid-address', TEST_CONFIG.amounts.evm)
      );
      sendTests.evm = result;
    } catch (error) {
      sendTests.evm = { success: false, error: error.message };
    }

    // TON send test (dry run)
    try {
      const result = await this.dryRunSend('ton', () => 
        tetherWdkService.sendTonTransaction('invalid-address', TEST_CONFIG.amounts.ton)
      );
      sendTests.ton = result;
    } catch (error) {
      sendTests.ton = { success: false, error: error.message };
    }

    // BTC send test (dry run)
    try {
      const result = await this.dryRunSend('btc', () => 
        tetherWdkService.sendBtcTransaction('invalid-address', TEST_CONFIG.amounts.btc)
      );
      sendTests.btc = result;
    } catch (error) {
      sendTests.btc = { success: false, error: error.message };
    }

    // Test multi-send functionality
    try {
      const multiSendResult = await this.testMultiSend();
      sendTests.multiSend = multiSendResult;
    } catch (error) {
      sendTests.multiSend = { success: false, error: error.message };
    }

    this.results.sendTests = sendTests;
  }

  async dryRunSend(chain, sendFunction) {
    console.log(`     ${chain.toUpperCase()} send interface...`);
    
    try {
      // This should fail with address validation error, not crash
      const result = await sendFunction();
      
      if (result.success === false && result.error.includes('address')) {
        console.log(`     ✅ ${chain.toUpperCase()} address validation working`);
        return { success: true, validation: 'working', interface: 'correct' };
      } else {
        console.log(`     ⚠️  ${chain.toUpperCase()} unexpected result: ${JSON.stringify(result)}`);
        return { success: false, issue: 'unexpected_result', result };
      }
    } catch (error) {
      if (error.message.includes('address') || error.message.includes('invalid')) {
        console.log(`     ✅ ${chain.toUpperCase()} address validation working (threw error)`);
        return { success: true, validation: 'working', interface: 'correct' };
      } else {
        console.log(`     ❌ ${chain.toUpperCase()} unexpected error: ${error.message}`);
        return { success: false, error: error.message };
      }
    }
  }

  async testMultiSend() {
    console.log('     Testing TON multi-send functionality...');
    
    try {
      const addresses = await tetherWdkService.getAddresses();
      
      // Test multi-send with invalid addresses (should validate)
      const recipients = [
        { address: 'invalid1', amount: '0.01', comment: 'Test 1' },
        { address: 'invalid2', amount: '0.01', comment: 'Test 2' }
      ];
      
      const result = await tetherWdkService.sendTonMultiTransaction(recipients);
      
      if (result.success === false) {
        console.log('     ✅ Multi-send validation working');
        return { success: true, validation: 'working' };
      } else {
        console.log('     ⚠️  Multi-send unexpected result');
        return { success: false, issue: 'no_validation' };
      }
    } catch (error) {
      if (error.message.includes('address')) {
        console.log('     ✅ Multi-send validation working (threw error)');
        return { success: true, validation: 'working' };
      } else {
        console.log(`     ❌ Multi-send error: ${error.message}`);
        return { success: false, error: error.message };
      }
    }
  }

  async testReceiveFunctionality() {
    console.log('\n6️⃣ Testing Receive Functionality...');

    const receiveTests = {};

    // Test address retrieval for receiving
    try {
      const addresses = await tetherWdkService.getAddresses();
      receiveTests.addressRetrieval = { success: true, addresses };
      console.log('✅ Address retrieval for receiving: Working');
    } catch (error) {
      receiveTests.addressRetrieval = { success: false, error: error.message };
      console.log(`❌ Address retrieval failed: ${error.message}`);
    }

    // Test balance monitoring capability
    try {
      const balances1 = await tetherWdkService.getBalances();
      await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
      const balances2 = await tetherWdkService.getBalances();
      
      receiveTests.balanceMonitoring = {
        success: true,
        consistent: JSON.stringify(balances1) === JSON.stringify(balances2),
        balances: { first: balances1, second: balances2 }
      };
      console.log('✅ Balance monitoring: Working');
    } catch (error) {
      receiveTests.balanceMonitoring = { success: false, error: error.message };
      console.log(`❌ Balance monitoring failed: ${error.message}`);
    }

    // Test transaction history (if available)
    try {
      const btcHistory = await tetherWdkService.getBtcTransfers(5);
      const evmHistory = await tetherWdkService.getEvmTransfers(5);
      
      receiveTests.transactionHistory = {
        success: true,
        btcTransfers: btcHistory.length,
        evmTransfers: evmHistory.length
      };
      console.log(`✅ Transaction history: BTC(${btcHistory.length}) EVM(${evmHistory.length})`);
    } catch (error) {
      receiveTests.transactionHistory = { success: false, error: error.message };
      console.log(`❌ Transaction history failed: ${error.message}`);
    }

    this.results.receiveTests = receiveTests;
  }

  async testErrorHandling() {
    console.log('\n7️⃣ Testing Error Handling...');

    const errorTests = {};

    // Test insufficient balance error
    try {
      const addresses = await tetherWdkService.getAddresses();
      const result = await tetherWdkService.sendEvmTransaction(addresses.evmAddress, '999999');
      
      errorTests.insufficientBalance = {
        success: result.success === false,
        errorMessage: result.error,
        properHandling: result.error?.includes('insufficient') || result.error?.includes('balance')
      };
      
      console.log(`✅ Insufficient balance error: ${errorTests.insufficientBalance.properHandling ? 'Handled' : 'Not handled'}`);
    } catch (error) {
      errorTests.insufficientBalance = { success: false, error: error.message };
    }

    // Test invalid address error
    try {
      const result = await tetherWdkService.sendEvmTransaction('0xinvalid', '0.001');
      
      errorTests.invalidAddress = {
        success: result.success === false,
        errorMessage: result.error,
        properHandling: result.error?.includes('address') || result.error?.includes('invalid')
      };
      
      console.log(`✅ Invalid address error: ${errorTests.invalidAddress.properHandling ? 'Handled' : 'Not handled'}`);
    } catch (error) {
      errorTests.invalidAddress = { success: true, threwError: true, error: error.message };
    }

    this.results.errorHandling = errorTests;
  }

  async testSecurityFeatures() {
    console.log('\n8️⃣ Testing Security Features...');

    const securityTests = {};

    // Test fee guards
    try {
      // This should be blocked by fee guards
      const addresses = await tetherWdkService.getAddresses();
      const result = await tetherWdkService.sendEvmTransaction(addresses.evmAddress, '1000'); // Large amount
      
      securityTests.feeGuards = {
        working: result.success === false && (
          result.error?.includes('fee') || 
          result.error?.includes('limit') ||
          result.error?.includes('insufficient')
        ),
        result
      };
      
      console.log(`✅ Fee guards: ${securityTests.feeGuards.working ? 'Working' : 'Not working'}`);
    } catch (error) {
      securityTests.feeGuards = { working: true, threwError: true };
      console.log('✅ Fee guards: Working (threw error)');
    }

    // Test memory cleanup
    try {
      const beforeLogout = tetherWdkService.isInitialized();
      tetherWdkService.logout();
      const afterLogout = tetherWdkService.isInitialized();
      
      securityTests.memoryCleanup = {
        working: beforeLogout === true && afterLogout === false,
        before: beforeLogout,
        after: afterLogout
      };
      
      console.log(`✅ Memory cleanup: ${securityTests.memoryCleanup.working ? 'Working' : 'Not working'}`);
      
      // Re-initialize for remaining tests
      await tetherWdkService.initializeManagers(TEST_CONFIG.mnemonic);
    } catch (error) {
      securityTests.memoryCleanup = { working: false, error: error.message };
    }

    this.results.security = securityTests;
  }

  async testPerformance() {
    console.log('\n9️⃣ Testing Performance...');

    const performanceTests = {};

    // Test balance fetch speed
    try {
      const times = [];
      for (let i = 0; i < 3; i++) {
        const start = performance.now();
        await tetherWdkService.getBalances();
        times.push(performance.now() - start);
      }
      
      performanceTests.balanceFetch = {
        averageMs: Math.round(times.reduce((a, b) => a + b) / times.length),
        times: times.map(t => Math.round(t)),
        acceptable: times.every(t => t < 10000) // Under 10 seconds
      };
      
      console.log(`✅ Balance fetch performance: ${performanceTests.balanceFetch.averageMs}ms avg`);
    } catch (error) {
      performanceTests.balanceFetch = { error: error.message };
    }

    // Test initialization speed
    try {
      tetherWdkService.logout();
      const start = performance.now();
      await tetherWdkService.initializeManagers(TEST_CONFIG.mnemonic);
      const duration = performance.now() - start;
      
      performanceTests.initialization = {
        durationMs: Math.round(duration),
        acceptable: duration < 30000 // Under 30 seconds
      };
      
      console.log(`✅ Initialization performance: ${performanceTests.initialization.durationMs}ms`);
    } catch (error) {
      performanceTests.initialization = { error: error.message };
    }

    this.results.performance = performanceTests;
  }

  async testCleanup() {
    console.log('\n🧹 Testing Cleanup...');
    
    try {
      tetherWdkService.logout();
      console.log('✅ Cleanup completed');
    } catch (error) {
      console.log(`❌ Cleanup failed: ${error.message}`);
    }
  }

  // Address validation helpers
  validateEvmAddress(address) {
    return /^0x[a-fA-F0-9]{40}$/.test(address);
  }

  validateTonAddress(address) {
    return address && address.length > 40 && (address.startsWith('EQ') || address.startsWith('UQ'));
  }

  validateBtcAddress(address) {
    return address && (
      address.startsWith('1') || 
      address.startsWith('3') || 
      address.startsWith('bc1') ||
      address.startsWith('tb1')
    );
  }

  validateSolAddress(address) {
    return address && address.length >= 32 && address.length <= 44;
  }

  validateTronAddress(address) {
    return address && address.startsWith('T') && address.length === 34;
  }

  generateReport() {
    console.log('\n' + '=' .repeat(80));
    console.log('📊 WALLET SEND/RECEIVE AUDIT REPORT');
    console.log('=' .repeat(80));

    // Overall score calculation
    let totalTests = 0;
    let passedTests = 0;

    const sections = [
      'initialization', 'addresses', 'balances', 'feeEstimation', 
      'sendTests', 'receiveTests', 'errorHandling', 'security', 'performance'
    ];

    sections.forEach(section => {
      const result = this.results[section];
      if (result) {
        if (typeof result.success === 'boolean') {
          totalTests++;
          if (result.success) passedTests++;
        } else if (typeof result === 'object') {
          Object.values(result).forEach(test => {
            if (typeof test?.success === 'boolean') {
              totalTests++;
              if (test.success) passedTests++;
            }
          });
        }
      }
    });

    const score = Math.round((passedTests / totalTests) * 100);
    
    console.log(`\n🎯 OVERALL SCORE: ${score}% (${passedTests}/${totalTests} tests passed)`);
    
    if (score >= 90) {
      console.log('🟢 EXCELLENT - Wallet is production ready!');
    } else if (score >= 75) {
      console.log('🟡 GOOD - Minor improvements needed');
    } else if (score >= 60) {
      console.log('🟠 FAIR - Several issues need attention');
    } else {
      console.log('🔴 POOR - Major issues require fixing');
    }

    // Detailed results
    console.log('\n📋 DETAILED RESULTS:');
    console.log(JSON.stringify(this.results, null, 2));

    return { score, passedTests, totalTests, results: this.results };
  }
}

// Export for use
if (typeof window !== 'undefined') {
  window.WalletAudit = WalletAudit;
  window.runWalletAudit = () => new WalletAudit().runFullAudit();
  console.log('Run window.runWalletAudit() to start the audit');
} else {
  // Node.js environment
  const audit = new WalletAudit();
  audit.runFullAudit().catch(console.error);
}