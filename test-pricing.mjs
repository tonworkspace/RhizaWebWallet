import { BitfinexPricingClient } from '@tetherto/wdk-pricing-bitfinex-http';

async function main() {
  const provider = new BitfinexPricingClient();
  
  try {
    const symbols = [
      { from: 'BTC', to: 'USD' },
      { from: 'ETH', to: 'USD' },
      { from: 'TON', to: 'USD' }
    ];
    
    for (const symbol of symbols) {
      try {
        const price = await provider.getCurrentPrice(symbol.from, symbol.to);
        console.log(`✅ ${symbol.from}/${symbol.to} Price: $${price}`);
      } catch (err) {
        console.error(`❌ Failed to get price for ${symbol.from}:`, err.response?.data || err.message);
      }
    }
    
    console.log('\nTesting multi pricing:');
    const prices = await provider.getMultiCurrentPrices(symbols);
    console.log(prices);
    
  } catch (error) {
    console.error('Error initializing or making requests:', error);
  }
}

main();
