import { BitfinexHttpProvider } from '@tetherto/wdk-pricing-bitfinex-http';

async function main() {
  const provider = new BitfinexHttpProvider();
  
  try {
    const symbols = ['BTCUSD', 'ETHUSD', 'TONUSD'];
    
    for (const symbol of symbols) {
      try {
        const price = await provider.getPrice(symbol);
        console.log(`✅ ${symbol} Price: $${price}`);
      } catch (err: any) {
        console.error(`❌ Failed to get price for ${symbol}:`, err.message);
      }
    }
  } catch (error) {
    console.error('Error initializing or making requests:', error);
  }
}

main();
