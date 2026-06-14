const ALCHEMY_KEY = 'zRX_VUEjNwIrcZrBvqfZN';

async function testCombinedTransfers() {
  const address = '0x71C7656EC7ab88b098defB751B7401B5f6d8976F';
  console.log(`\n--- Testing EVM Combined (Alchemy external + erc20) for address ${address} ---`);
  try {
    const res = await fetch(`https://eth-mainnet.g.alchemy.com/v2/${ALCHEMY_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'alchemy_getAssetTransfers',
        params: [
          {
            fromBlock: '0x0',
            toBlock: 'latest',
            toAddress: address,
            category: ['external', 'erc20'],
            withMetadata: true,
            excludeZeroValue: true,
            maxCount: '0xa' // 10
          }
        ]
      })
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    console.log('Alchemy status:', data.error ? 'Error' : 'Success');
    if (data.result && data.result.transfers) {
      console.log(`Fetched ${data.result.transfers.length} transfers`);
      data.result.transfers.forEach((tx, i) => {
        console.log(`[${i}] Hash: ${tx.hash.slice(0, 10)}... | Category: ${tx.category} | Value: ${tx.value} ${tx.asset} | Timestamp: ${tx.metadata?.blockTimestamp}`);
      });
    } else {
      console.log('Alchemy raw response:', JSON.stringify(data));
    }
  } catch (e) {
    console.error('Alchemy failed:', e.message);
  }
}

async function run() {
  await testCombinedTransfers();
}

run();
