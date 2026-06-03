/**
 * Launchpad Service Test Suite
 * Tests all launchpad service methods to verify functionality
 */

import { launchpadService } from './services/launchpadService';

// ============================================================================
// TEST CONFIGURATION
// ============================================================================

const TEST_CONFIG = {
  // Replace with a real wallet address from your wallet_users table
  TEST_WALLET_ADDRESS: 'YOUR_WALLET_ADDRESS_HERE',
  
  // Replace with a real user ID from your wallet_users table
  TEST_USER_ID: 'YOUR_USER_ID_HERE',
  
  // Test project ID (will be created during tests)
  TEST_PROJECT_ID: '',
  
  // Test transaction hash
  TEST_TX_HASH: '0xtest' + Date.now(),
};

// ============================================================================
// TEST UTILITIES
// ============================================================================

const log = {
  section: (title: string) => {
    console.log('\n' + '='.repeat(80));
    console.log(`  ${title}`);
    console.log('='.repeat(80) + '\n');
  },
  
  test: (name: string) => {
    console.log(`\n🧪 TEST: ${name}`);
    console.log('-'.repeat(80));
  },
  
  success: (message: string, data?: any) => {
    console.log(`✅ ${message}`);
    if (data) console.log('   Data:', JSON.stringify(data, null, 2));
  },
  
  error: (message: string, error?: any) => {
    console.error(`❌ ${message}`);
    if (error) console.error('   Error:', error);
  },
  
  info: (message: string, data?: any) => {
    console.log(`ℹ️  ${message}`);
    if (data) console.log('   ', data);
  },
  
  warning: (message: string) => {
    console.warn(`⚠️  ${message}`);
  }
};

// ============================================================================
// TEST SUITE
// ============================================================================

async function runTests() {
  log.section('LAUNCHPAD SERVICE TEST SUITE');
  
  let testsPassed = 0;
  let testsFailed = 0;
  
  try {
    // ========================================================================
    // TEST 1: Get All Projects
    // ========================================================================
    log.test('Get All Projects');
    
    const projectsResult = await launchpadService.getProjects();
    
    if (projectsResult.success && projectsResult.data) {
      log.success(`Found ${projectsResult.data.length} projects`);
      
      if (projectsResult.data.length > 0) {
        const project = projectsResult.data[0];
        TEST_CONFIG.TEST_PROJECT_ID = project.id;
        
        log.info('Sample Project:', {
          id: project.id,
          name: project.name,
          symbol: project.symbol,
          status: project.status,
          raised: project.raised_amount,
          hardCap: project.hard_cap,
          participants: project.participant_count
        });
      }
      
      testsPassed++;
    } else {
      log.error('Failed to get projects', projectsResult.error);
      testsFailed++;
    }
    
    // ========================================================================
    // TEST 2: Get Projects with Filters
    // ========================================================================
    log.test('Get Projects with Filters (status=live)');
    
    const liveProjectsResult = await launchpadService.getProjects({ status: 'live' });
    
    if (liveProjectsResult.success && liveProjectsResult.data) {
      log.success(`Found ${liveProjectsResult.data.length} live projects`);
      testsPassed++;
    } else {
      log.error('Failed to get live projects', liveProjectsResult.error);
      testsFailed++;
    }
    
    // ========================================================================
    // TEST 3: Get Single Project
    // ========================================================================
    if (TEST_CONFIG.TEST_PROJECT_ID) {
      log.test('Get Single Project by ID');
      
      const projectResult = await launchpadService.getProject(TEST_CONFIG.TEST_PROJECT_ID);
      
      if (projectResult.success && projectResult.data) {
        log.success('Project retrieved successfully');
        log.info('Project Details:', {
          name: projectResult.data.name,
          status: projectResult.data.status,
          presaleStart: projectResult.data.presale_start,
          presaleEnd: projectResult.data.presale_end,
          minPurchase: projectResult.data.min_purchase,
          maxPurchase: projectResult.data.max_purchase
        });
        testsPassed++;
      } else {
        log.error('Failed to get project', projectResult.error);
        testsFailed++;
      }
    } else {
      log.warning('Skipping single project test (no project ID available)');
    }
    
    // ========================================================================
    // TEST 4: Get Project Progress
    // ========================================================================
    if (TEST_CONFIG.TEST_PROJECT_ID) {
      log.test('Get Project Progress');
      
      const progressResult = await launchpadService.getProjectProgress(TEST_CONFIG.TEST_PROJECT_ID);
      
      if (progressResult.success && progressResult.data) {
        log.success('Progress retrieved successfully');
        log.info('Progress Data:', progressResult.data);
        testsPassed++;
      } else {
        log.error('Failed to get progress', progressResult.error);
        testsFailed++;
      }
    } else {
      log.warning('Skipping progress test (no project ID available)');
    }
    
    // ========================================================================
    // TEST 5: Get Launchpad Stats
    // ========================================================================
    log.test('Get Launchpad Statistics');
    
    const statsResult = await launchpadService.getStats();
    
    if (statsResult.success && statsResult.data) {
      log.success('Stats retrieved successfully');
      log.info('Statistics:', {
        totalProjects: statsResult.data.total_projects,
        liveProjects: statsResult.data.live_projects,
        totalRaised: `$${statsResult.data.total_raised.toLocaleString()}`,
        totalParticipants: statsResult.data.total_participants.toLocaleString()
      });
      testsPassed++;
    } else {
      log.error('Failed to get stats', statsResult.error);
      testsFailed++;
    }
    
    // ========================================================================
    // TEST 6: Validate Purchase Eligibility
    // ========================================================================
    if (TEST_CONFIG.TEST_PROJECT_ID && TEST_CONFIG.TEST_WALLET_ADDRESS !== 'YOUR_WALLET_ADDRESS_HERE') {
      log.test('Validate Purchase Eligibility');
      
      const validationResult = await launchpadService.canUserPurchase({
        projectId: TEST_CONFIG.TEST_PROJECT_ID,
        userAddress: TEST_CONFIG.TEST_WALLET_ADDRESS,
        amount: 100
      });
      
      if (validationResult.success) {
        if (validationResult.canPurchase) {
          log.success('User can purchase');
        } else {
          log.info('User cannot purchase', validationResult.reason);
        }
        testsPassed++;
      } else {
        log.error('Validation failed', validationResult.reason);
        testsFailed++;
      }
      
      // Test with invalid amount (too low)
      log.test('Validate Purchase - Amount Too Low');
      
      const lowAmountResult = await launchpadService.canUserPurchase({
        projectId: TEST_CONFIG.TEST_PROJECT_ID,
        userAddress: TEST_CONFIG.TEST_WALLET_ADDRESS,
        amount: 10 // Below minimum
      });
      
      if (lowAmountResult.success && !lowAmountResult.canPurchase) {
        log.success('Correctly rejected low amount');
        log.info('Reason:', lowAmountResult.reason);
        testsPassed++;
      } else {
        log.error('Should have rejected low amount');
        testsFailed++;
      }
      
      // Test with invalid amount (too high)
      log.test('Validate Purchase - Amount Too High');
      
      const highAmountResult = await launchpadService.canUserPurchase({
        projectId: TEST_CONFIG.TEST_PROJECT_ID,
        userAddress: TEST_CONFIG.TEST_WALLET_ADDRESS,
        amount: 50000 // Above maximum
      });
      
      if (highAmountResult.success && !highAmountResult.canPurchase) {
        log.success('Correctly rejected high amount');
        log.info('Reason:', highAmountResult.reason);
        testsPassed++;
      } else {
        log.error('Should have rejected high amount');
        testsFailed++;
      }
    } else {
      log.warning('Skipping purchase validation tests (configure TEST_WALLET_ADDRESS)');
    }
    
    // ========================================================================
    // TEST 7: Create Transaction (Read-Only Test)
    // ========================================================================
    if (TEST_CONFIG.TEST_PROJECT_ID && TEST_CONFIG.TEST_WALLET_ADDRESS !== 'YOUR_WALLET_ADDRESS_HERE') {
      log.test('Create Transaction (Dry Run)');
      
      log.info('Would create transaction with:', {
        projectId: TEST_CONFIG.TEST_PROJECT_ID,
        userAddress: TEST_CONFIG.TEST_WALLET_ADDRESS,
        amountUsdc: 100,
        tokensReceived: 420,
        txHash: TEST_CONFIG.TEST_TX_HASH
      });
      
      log.warning('Skipping actual transaction creation (read-only test)');
      log.info('To test transaction creation, uncomment the code below');
      
      /*
      const txResult = await launchpadService.createTransaction({
        projectId: TEST_CONFIG.TEST_PROJECT_ID,
        userAddress: TEST_CONFIG.TEST_WALLET_ADDRESS,
        amountUsdc: 100,
        tokensReceived: 420,
        txHash: TEST_CONFIG.TEST_TX_HASH
      });
      
      if (txResult.success) {
        log.success('Transaction created successfully');
        log.info('Transaction ID:', txResult.data?.id);
        testsPassed++;
      } else {
        log.error('Failed to create transaction', txResult.error);
        testsFailed++;
      }
      */
    } else {
      log.warning('Skipping transaction creation test (configure TEST_WALLET_ADDRESS)');
    }
    
    // ========================================================================
    // TEST 8: Get User Transactions
    // ========================================================================
    if (TEST_CONFIG.TEST_WALLET_ADDRESS !== 'YOUR_WALLET_ADDRESS_HERE') {
      log.test('Get User Transactions');
      
      const userTxResult = await launchpadService.getUserTransactions(TEST_CONFIG.TEST_WALLET_ADDRESS);
      
      if (userTxResult.success) {
        log.success(`Found ${userTxResult.data?.length || 0} transactions for user`);
        
        if (userTxResult.data && userTxResult.data.length > 0) {
          log.info('Sample Transaction:', {
            id: userTxResult.data[0].id,
            amount: userTxResult.data[0].amount_usdc,
            tokens: userTxResult.data[0].tokens_received,
            status: userTxResult.data[0].status,
            txHash: userTxResult.data[0].tx_hash
          });
        }
        testsPassed++;
      } else {
        log.error('Failed to get user transactions', userTxResult.error);
        testsFailed++;
      }
    } else {
      log.warning('Skipping user transactions test (configure TEST_WALLET_ADDRESS)');
    }
    
    // ========================================================================
    // TEST 9: Get Recent Contributions
    // ========================================================================
    if (TEST_CONFIG.TEST_PROJECT_ID) {
      log.test('Get Recent Contributions');
      
      const contributionsResult = await launchpadService.getRecentContributions(TEST_CONFIG.TEST_PROJECT_ID, 5);
      
      if (contributionsResult.success) {
        log.success(`Found ${contributionsResult.data?.length || 0} recent contributions`);
        testsPassed++;
      } else {
        log.error('Failed to get contributions', contributionsResult.error);
        testsFailed++;
      }
    } else {
      log.warning('Skipping contributions test (no project ID available)');
    }
    
    // ========================================================================
    // TEST 10: Search Projects
    // ========================================================================
    log.test('Search Projects by Name');
    
    const searchResult = await launchpadService.getProjects({ search: 'Abundance' });
    
    if (searchResult.success && searchResult.data) {
      log.success(`Found ${searchResult.data.length} projects matching "Abundance"`);
      testsPassed++;
    } else {
      log.error('Search failed', searchResult.error);
      testsFailed++;
    }
    
    // ========================================================================
    // TEST 11: Filter by Featured
    // ========================================================================
    log.test('Get Featured Projects');
    
    const featuredResult = await launchpadService.getProjects({ featured: true });
    
    if (featuredResult.success && featuredResult.data) {
      log.success(`Found ${featuredResult.data.length} featured projects`);
      testsPassed++;
    } else {
      log.error('Failed to get featured projects', featuredResult.error);
      testsFailed++;
    }
    
    // ========================================================================
    // TEST 12: Filter by Trending
    // ========================================================================
    log.test('Get Trending Projects');
    
    const trendingResult = await launchpadService.getProjects({ trending: true });
    
    if (trendingResult.success && trendingResult.data) {
      log.success(`Found ${trendingResult.data.length} trending projects`);
      testsPassed++;
    } else {
      log.error('Failed to get trending projects', trendingResult.error);
      testsFailed++;
    }
    
  } catch (error) {
    log.error('Test suite crashed', error);
  }
  
  // ========================================================================
  // TEST SUMMARY
  // ========================================================================
  log.section('TEST SUMMARY');
  
  const total = testsPassed + testsFailed;
  const passRate = total > 0 ? ((testsPassed / total) * 100).toFixed(1) : '0';
  
  console.log(`Total Tests: ${total}`);
  console.log(`✅ Passed: ${testsPassed}`);
  console.log(`❌ Failed: ${testsFailed}`);
  console.log(`📊 Pass Rate: ${passRate}%`);
  
  if (testsFailed === 0) {
    console.log('\n🎉 ALL TESTS PASSED! Launchpad service is working correctly.');
  } else {
    console.log('\n⚠️  SOME TESTS FAILED. Review errors above.');
  }
  
  // ========================================================================
  // CONFIGURATION REMINDER
  // ========================================================================
  if (TEST_CONFIG.TEST_WALLET_ADDRESS === 'YOUR_WALLET_ADDRESS_HERE') {
    log.section('CONFIGURATION NEEDED');
    console.log('⚠️  To run all tests, update TEST_CONFIG in this file:');
    console.log('');
    console.log('1. Get a wallet address from your database:');
    console.log('   SELECT wallet_address, id FROM wallet_users LIMIT 1;');
    console.log('');
    console.log('2. Update TEST_CONFIG.TEST_WALLET_ADDRESS');
    console.log('3. Update TEST_CONFIG.TEST_USER_ID');
    console.log('4. Re-run tests');
  }
}

// ============================================================================
// RUN TESTS
// ============================================================================

console.log('🚀 Starting Launchpad Service Tests...\n');

runTests()
  .then(() => {
    console.log('\n✅ Test suite completed');
  })
  .catch((error) => {
    console.error('\n❌ Test suite failed:', error);
  });

// ============================================================================
// EXPORT FOR USE IN OTHER FILES
// ============================================================================

export { runTests };
