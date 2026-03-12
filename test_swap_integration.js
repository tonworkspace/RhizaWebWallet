/**
 * Swap Integration Test Script
 * 
 * Run this in browser console to test swap functionality
 * Make sure you're logged into the wallet first!
 */

async function testSwapIntegration() {
  console.log('🧪 Testing Swap Integration...\n');

  // Test 1: Check if swap service is available
  console.log('1️⃣ Checking swap service...');
  try {
    const { swapService } = await import('./services/swapService.ts');
    console.log('✅ Swap service loaded');
    console.log(`   Demo mode: ${swapService.isDemoModeEnabled()}`);
  } catch (error) {
    console.error('❌ Failed to load swap service:', error);
    return;
  }

  // Test 2: Check wallet connection
  console.log('\n2️⃣ Checking wallet connection...');
  try {
    const { tonWalletService } = await import('./services/tonWalletService.ts');
    const isInitialized = tonWalletService.isInitialized();
    console.log(`   Wallet initialized: ${isInitialized}`);
    
    if (isInitialized) {
      const address = tonWalletService.getWalletAddress();
      console.log(`   Address: ${address}`);
      
      const balance = await tonWalletService.getBalance();
      console.log(`   Balance: ${typeof balance === 'string' ? balance : balance.balance} TON`);
    } else {
      console.warn('⚠️ Wallet not initialized. Please login first.');
    }
  } catch (error) {
    console.error('❌ Failed to check wallet:', error);
  }

  // Test 3: Get available tokens
  console.log('\n3️⃣ Fetching available tokens...');
  try {
    const { swapService } = await import('./services/swapService.ts');
    const { tonWalletService } = await import('./services/tonWalletService.ts');
    
    const address = tonWalletService.getWalletAddress();
    const tokens = await swapService.getAvailableTokens(address);
    
    console.log(`✅ Found ${tokens.length} tokens:`);
    tokens.forEach(token => {
      console.log(`   ${token.icon} ${token.symbol}: ${token.balance} (${token.name})`);
    });
  } catch (error) {
    console.error('❌ Failed to fetch tokens:', error);
  }

  // Test 4: Get exchange rate
  console.log('\n4️⃣ Testing exchange rate...');
  try {
    const { swapService } = await import('./services/swapService.ts');
    const rate = await swapService.getExchangeRate('TON', 'USDT');
    console.log(`✅ Exchange rate: 1 TON = ${rate} USDT`);
  } catch (error) {
    console.error('❌ Failed to get exchange rate:', error);
  }

  // Test 5: Get swap quote
  console.log('\n5️⃣ Testing swap quote...');
  try {
    const { swapService } = await import('./services/swapService.ts');
    const { tonWalletService } = await import('./services/tonWalletService.ts');
    
    const address = tonWalletService.getWalletAddress();
    const tokens = await swapService.getAvailableTokens(address);
    
    const fromToken = tokens.find(t => t.symbol === 'TON');
    const toToken = tokens.find(t => t.symbol === 'USDT');
    
    if (fromToken && toToken) {
      const quote = await swapService.getSwapQuote(fromToken, toToken, '1', 1.0);
      console.log('✅ Swap quote:');
      console.log(`   From: ${quote.fromAmount} ${quote.fromToken.symbol}`);
      console.log(`   To: ${quote.toAmount} ${quote.toToken.symbol}`);
      console.log(`   Rate: ${quote.exchangeRate}`);
      console.log(`   Price Impact: ${quote.priceImpact}%`);
      console.log(`   Min Received: ${quote.minimumReceived} ${quote.toToken.symbol}`);
      console.log(`   Gas: ${quote.estimatedGas} TON`);
    }
  } catch (error) {
    console.error('❌ Failed to get quote:', error);
  }

  // Test 6: Check DEX configuration
  console.log('\n6️⃣ Checking DEX configuration...');
  try {
    const { getDEXConfig, TOKEN_METADATA } = await import('./config/dexConfig.ts');
    const dexConfig = getDEXConfig('testnet');
    
    console.log('✅ DEX Configuration:');
    console.log(`   Name: ${dexConfig.name}`);
    console.log(`   Router: ${dexConfig.routerAddress}`);
    console.log(`   API: ${dexConfig.apiUrl}`);
    console.log(`   Explorer: ${dexConfig.explorerUrl}`);
    
    console.log(`\n   Supported tokens: ${Object.keys(TOKEN_METADATA).length}`);
    Object.values(TOKEN_METADATA).forEach(token => {
      console.log(`   - ${token.icon} ${token.symbol} (${token.decimals} decimals)`);
    });
  } catch (error) {
    console.error('❌ Failed to check DEX config:', error);
  }

  console.log('\n✅ Integration test complete!');
  console.log('\n📝 Next steps:');
  console.log('   1. Make sure wallet is logged in');
  console.log('   2. Go to Swap page');
  console.log('   3. Try a small test swap');
  console.log('   4. Check console for detailed logs');
}

// Run the test
testSwapIntegration().catch(console.error);
