import fetch from 'node-fetch';

const TONCENTER_KEY_MAINNET = '509fc324e5a26df719b2e637cad9f34fd7c3576455b707522ce8319d8b450441';
const TONCENTER_KEY_TESTNET = 'bb31868e5cf6529efb16bcf547beb3c534a28d1e139bd63356fd936c168fe662';

// We'll test V2 endpoint used by TonClient
async function testV2API(network, endpoint, apiKey) {
  console.log(`\n[${network}] Testing TonCenter V2 API (${endpoint})`);
  try {
    const start = Date.now();
    const res = await fetch(`${endpoint}?api_key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'getMasterchainInfo',
        params: {}
      })
    });
    const time = Date.now() - start;
    if (res.ok) {
      const data = await res.json();
      if (data.ok) {
        console.log(`✅ Success! Latency: ${time}ms | Last Seqno: ${data.result.last.seqno}`);
      } else {
        console.log(`❌ Error in response:`, data);
      }
    } else {
      console.log(`❌ API HTTP Error: ${res.status} ${res.statusText}`);
    }
  } catch (err) {
    console.log(`❌ Connection Exception:`, err.message);
  }
}

// We'll test V3 endpoint used by tetherWdkService
async function testV3API(network, endpoint) {
  console.log(`\n[${network}] Testing TonCenter V3 API (${endpoint})`);
  try {
    const start = Date.now();
    const res = await fetch(`${endpoint}/masterchainInfo`);
    const time = Date.now() - start;
    if (res.ok) {
      const data = await res.json();
      console.log(`✅ Success! Latency: ${time}ms | Last Seqno: ${data.last.seqno}`);
    } else {
      console.log(`❌ API HTTP Error: ${res.status} ${res.statusText}`);
    }
  } catch (err) {
    console.log(`❌ Connection Exception:`, err.message);
  }
}

async function runTests() {
  console.log('🚀 Starting TON API Verification tests...');
  
  await testV2API('Mainnet', 'https://toncenter.com/api/v2/jsonRPC', TONCENTER_KEY_MAINNET);
  await testV2API('Testnet', 'https://testnet.toncenter.com/api/v2/jsonRPC', TONCENTER_KEY_TESTNET);
  
  await testV3API('Mainnet', 'https://toncenter.com/api/v3');
  await testV3API('Testnet', 'https://testnet.toncenter.com/api/v3');
  
  console.log('\n🏁 Tests completed.');
}

runTests();
