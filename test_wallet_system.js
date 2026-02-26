/**
 * Wallet System Automated Test Script
 * 
 * Run this in the browser console on any page to check wallet system health
 * 
 * Usage:
 * 1. Open any page in your wallet app
 * 2. Open browser console (F12)
 * 3. Copy and paste this entire script
 * 4. Press Enter
 * 5. Review the results
 */

(async function testWalletSystem() {
  console.log('🧪 Starting Comprehensive Wallet System Health Check...\n');
  console.log('This will test all major wallet functionality\n');
  
  const results = {
    passed: 0,
    failed: 0,
    warnings: 0,
    tests: []
  };
  
  function logTest(name, passed, message = '') {
    const status = passed ? '✅' : '❌';
    console.log(`${status} ${name}${message ? ': ' + message : ''}`);
    results.tests.push({ name, passed, message });
    if (passed) results.passed++;
    else results.failed++;
  }
  
  function logWarning(name, message) {
    console.log(`⚠️ ${name}: ${message}`);
    results.warnings++;
  }
  
  // ============================================================================
  // TEST 1: LOCAL STORAGE
  // ============================================================================
  console.log('='.repeat(60));
  console.log('TEST CATEGORY 1: LOCAL STORAGE & SESSION');
  console.log('='.repeat(60));
  
  const activeWallet = localStorage.getItem('rhiza_active_wallet');
  logTest('Active Wallet Set', !!activeWallet, activeWallet ? `ID: ${activeWallet}` : 'Not logged in');
  
  const network = localStorage.getItem('rhiza_network');
  logTest('Network Configured', !!network, network || 'Not set');
  
  const theme = localStorage.getItem('rhiza_theme');
  logTest('Theme Set', !!theme, theme || 'Not set');
  
  const walletData = localStorage.getItem(`rhiza_wallet_${activeWallet}`);
  logTest('Wallet Data Exists', !!walletData, walletData ? 'Encrypted data found' : 'No wallet data');
  
  console.log('\n');
  
  // ============================================================================
  // TEST 2: DOM ELEMENTS
  // ============================================================================
  console.log('='.repeat(60));
  console.log('TEST CATEGORY 2: UI ELEMENTS');
  console.log('='.repeat(60));
  
  const rootElement = document.querySelector('#root');
  logTest('React Root Element', !!rootElement);
  
  const navigation = document.querySelector('nav') || document.querySelector('[role="navigation"]');
  logTest('Navigation Menu', !!navigation);
  
  // Check for common wallet UI elements
  const balanceElements = document.querySelectorAll('[class*="balance"]');
  logTest('Balance Display Elements', balanceElements.length > 0, `Found ${balanceElements.length} elements`);
  
  const addressElements = document.querySelectorAll('[class*="address"]');
  logTest('Address Display Elements', addressElements.length > 0, `Found ${addressElements.length} elements`);
  
  // Check for buttons
  const buttons = document.querySelectorAll('button');
  logTest('Interactive Buttons', buttons.length > 0, `Found ${buttons.length} buttons`);
  
  console.log('\n');
  
  // ============================================================================
  // TEST 3: CONSOLE ERRORS
  // ============================================================================
  console.log('='.repeat(60));
  console.log('TEST CATEGORY 3: CONSOLE ERRORS');
  console.log('='.repeat(60));
  
  // Note: This can't catch past errors, only future ones
  let errorCount = 0;
  const originalError = console.error;
  console.error = function(...args) {
    errorCount++;
    originalError.apply(console, args);
  };
  
  logTest('Console Error Monitoring', true, 'Monitoring enabled for future errors');
  
  console.log('\n');
  
  // ============================================================================
  // TEST 4: NETWORK CONNECTIVITY
  // ============================================================================
  console.log('='.repeat(60));
  console.log('TEST CATEGORY 4: NETWORK CONNECTIVITY');
  console.log('='.repeat(60));
  
  logTest('Browser Online', navigator.onLine, navigator.onLine ? 'Connected' : 'Offline');
  
  // Test TON API connectivity
  try {
    const testNetwork = network || 'testnet';
    const apiUrl = testNetwork === 'mainnet' 
      ? 'https://toncenter.com/api/v2/getAddressBalance?address=EQD4FPq-PRDieyQKkizFTRtSDyucUIqrj0v_zXJmqaDp6_0t'
      : 'https://testnet.toncenter.com/api/v2/getAddressBalance?address=0QD4FPq-PRDieyQKkizFTRtSDyucUIqrj0v_zXJmqaDp6_0t';
    
    const response = await fetch(apiUrl);
    logTest('TON API Reachable', response.ok, `Status: ${response.status}`);
  } catch (error) {
    logTest('TON API Reachable', false, error.message);
  }
  
  console.log('\n');
  
  // ============================================================================
  // TEST 5: REACT CONTEXT (if accessible)
  // ============================================================================
  console.log('='.repeat(60));
  console.log('TEST CATEGORY 5: REACT STATE');
  console.log('='.repeat(60));
  
  try {
    // Try to access React DevTools
    const reactKey = Object.keys(rootElement).find(key => 
      key.startsWith('__reactContainer') || key.startsWith('__reactFiber')
    );
    
    if (reactKey) {
      logTest('React Instance Found', true, 'Can access React internals');
    } else {
      logWarning('React Instance', 'Cannot access React internals (this is normal)');
    }
  } catch (error) {
    logWarning('React Instance', 'Cannot access React state directly');
  }
  
  console.log('\n');
  
  // ============================================================================
  // TEST 6: PAGE SPECIFIC CHECKS
  // ============================================================================
  console.log('='.repeat(60));
  console.log('TEST CATEGORY 6: PAGE-SPECIFIC ELEMENTS');
  console.log('='.repeat(60));
  
  const currentPath = window.location.hash || window.location.pathname;
  console.log(`Current Page: ${currentPath}`);
  
  // Dashboard checks
  if (currentPath.includes('dashboard')) {
    const statsCards = document.querySelectorAll('[class*="stat"], [class*="card"]');
    logTest('Dashboard Stats Cards', statsCards.length >= 3, `Found ${statsCards.length} cards`);
  }
  
  // Referral page checks
  if (currentPath.includes('referral')) {
    const referralCode = document.querySelector('[class*="font-mono"]');
    logTest('Referral Code Display', !!referralCode, referralCode?.textContent || 'Not found');
    
    const copyButton = document.querySelector('button:has([class*="Copy"])');
    logTest('Copy Button', !!copyButton);
  }
  
  // Transfer page checks
  if (currentPath.includes('transfer')) {
    const addressInput = document.querySelector('input[placeholder*="address"], input[placeholder*="Address"]');
    logTest('Recipient Address Input', !!addressInput);
    
    const amountInput = document.querySelector('input[type="number"], input[placeholder*="amount"]');
    logTest('Amount Input', !!amountInput);
  }
  
  console.log('\n');
  
  // ============================================================================
  // TEST 7: PERFORMANCE
  // ============================================================================
  console.log('='.repeat(60));
  console.log('TEST CATEGORY 7: PERFORMANCE');
  console.log('='.repeat(60));
  
  if (window.performance && window.performance.timing) {
    const loadTime = window.performance.timing.loadEventEnd - window.performance.timing.navigationStart;
    logTest('Page Load Time', loadTime < 5000, `${(loadTime / 1000).toFixed(2)}s`);
    
    const domReady = window.performance.timing.domContentLoadedEventEnd - window.performance.timing.navigationStart;
    logTest('DOM Ready Time', domReady < 3000, `${(domReady / 1000).toFixed(2)}s`);
  } else {
    logWarning('Performance', 'Performance API not available');
  }
  
  console.log('\n');
  
  // ============================================================================
  // TEST 8: SECURITY
  // ============================================================================
  console.log('='.repeat(60));
  console.log('TEST CATEGORY 8: SECURITY');
  console.log('='.repeat(60));
  
  logTest('HTTPS Connection', window.location.protocol === 'https:' || window.location.hostname === 'localhost', window.location.protocol);
  
  // Check if sensitive data is not in localStorage (unencrypted)
  const allStorage = { ...localStorage };
  const hasMnemonic = Object.values(allStorage).some(val => 
    typeof val === 'string' && val.split(' ').length === 24
  );
  logTest('No Unencrypted Mnemonics', !hasMnemonic, hasMnemonic ? '⚠️ Found unencrypted mnemonic!' : 'Safe');
  
  console.log('\n');
  
  // ============================================================================
  // TEST 9: RESPONSIVE DESIGN
  // ============================================================================
  console.log('='.repeat(60));
  console.log('TEST CATEGORY 9: RESPONSIVE DESIGN');
  console.log('='.repeat(60));
  
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  console.log(`Viewport: ${viewportWidth}x${viewportHeight}`);
  
  logTest('Viewport Size', viewportWidth > 0 && viewportHeight > 0, `${viewportWidth}x${viewportHeight}`);
  
  const isMobile = viewportWidth < 768;
  console.log(`Device Type: ${isMobile ? 'Mobile' : 'Desktop'}`);
  
  // Check for mobile-specific classes
  if (isMobile) {
    const mobileOptimized = document.querySelector('[class*="mobile"], [class*="sm:"]');
    logTest('Mobile Optimization', !!mobileOptimized, mobileOptimized ? 'Mobile classes found' : 'No mobile classes');
  }
  
  console.log('\n');
  
  // ============================================================================
  // TEST 10: ACCESSIBILITY
  // ============================================================================
  console.log('='.repeat(60));
  console.log('TEST CATEGORY 10: ACCESSIBILITY');
  console.log('='.repeat(60));
  
  const imagesWithoutAlt = document.querySelectorAll('img:not([alt])');
  logTest('Images Have Alt Text', imagesWithoutAlt.length === 0, 
    imagesWithoutAlt.length > 0 ? `${imagesWithoutAlt.length} images missing alt` : 'All images have alt');
  
  const buttonsWithoutLabel = Array.from(document.querySelectorAll('button')).filter(btn => 
    !btn.textContent.trim() && !btn.getAttribute('aria-label') && !btn.getAttribute('title')
  );
  logTest('Buttons Have Labels', buttonsWithoutLabel.length === 0,
    buttonsWithoutLabel.length > 0 ? `${buttonsWithoutLabel.length} buttons missing labels` : 'All buttons labeled');
  
  console.log('\n');
  
  // ============================================================================
  // SUMMARY
  // ============================================================================
  console.log('='.repeat(60));
  console.log('TEST SUMMARY');
  console.log('='.repeat(60));
  
  const totalTests = results.passed + results.failed;
  const passRate = ((results.passed / totalTests) * 100).toFixed(1);
  
  console.log(`\nTotal Tests: ${totalTests}`);
  console.log(`✅ Passed: ${results.passed}`);
  console.log(`❌ Failed: ${results.failed}`);
  console.log(`⚠️ Warnings: ${results.warnings}`);
  console.log(`\nPass Rate: ${passRate}%`);
  
  if (results.failed === 0) {
    console.log('\n🎉 ALL TESTS PASSED! Your wallet system is healthy!');
  } else if (results.failed <= 3) {
    console.log('\n⚠️ Some tests failed, but system is mostly functional.');
  } else {
    console.log('\n❌ Multiple tests failed. Please review the issues above.');
  }
  
  console.log('\n');
  console.log('='.repeat(60));
  console.log('RECOMMENDATIONS');
  console.log('='.repeat(60));
  
  if (!activeWallet) {
    console.log('📝 No active wallet - Please login or create a wallet');
  }
  
  if (results.failed > 0) {
    console.log('📝 Review failed tests above');
    console.log('📝 Check browser console for errors');
    console.log('📝 Verify network connectivity');
    console.log('📝 Check Supabase connection');
  }
  
  if (errorCount > 0) {
    console.log(`⚠️ ${errorCount} console errors detected during test`);
  }
  
  console.log('\n');
  console.log('='.repeat(60));
  console.log('NEXT STEPS');
  console.log('='.repeat(60));
  console.log('1. Review any failed tests above');
  console.log('2. Check WALLET_SYSTEM_HEALTH_CHECK.md for detailed checks');
  console.log('3. Run diagnostic SQL queries if database issues suspected');
  console.log('4. Test specific features manually');
  console.log('\n');
  
  // Return results for programmatic access
  return {
    summary: {
      total: totalTests,
      passed: results.passed,
      failed: results.failed,
      warnings: results.warnings,
      passRate: passRate + '%'
    },
    tests: results.tests,
    healthy: results.failed === 0
  };
})();
