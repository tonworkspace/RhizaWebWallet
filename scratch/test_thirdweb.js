import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function testThirdweb() {
  console.log('🔍 Locating .env file...');
  const envPath = path.join(__dirname, '..', '.env');
  if (!fs.existsSync(envPath)) {
    console.error('❌ .env file not found!');
    return;
  }

  const envContent = fs.readFileSync(envPath, 'utf8');
  const match = envContent.match(/VITE_THIRDWEB_CLIENT_ID=["']?([^"'\r\n]+)/);
  
  if (!match || !match[1]) {
    console.error('❌ VITE_THIRDWEB_CLIENT_ID not found or is empty in .env');
    return;
  }

  const clientId = match[1];
  console.log(`✅ Loaded Client ID: ${clientId.slice(0, 5)}...${clientId.slice(-5)}`);

  const rpcUrl = `https://1.rpc.thirdweb.com/${clientId}`;
  console.log(`📡 Connecting to Ethereum Mainnet RPC via Thirdweb: ${rpcUrl.slice(0, 30)}...`);

  try {
    const res = await fetch(rpcUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'eth_chainId',
        params: [],
        id: 1
      })
    });

    if (!res.ok) {
      throw new Error(`HTTP ${res.status} ${res.statusText}`);
    }

    const data = await res.json();
    if (data.error) {
      throw new Error(data.error.message || JSON.stringify(data.error));
    }

    const chainIdHex = data.result;
    const chainId = parseInt(chainIdHex, 16);
    console.log(`\n🎉 Connection Successful!`);
    console.log(`🔗 Returned Chain ID (Hex): ${chainIdHex}`);
    console.log(`🔗 Returned Chain ID (Decimal): ${chainId} (Ethereum Mainnet)`);
  } catch (err) {
    console.error(`\n❌ Connection Failed:`, err.message);
  }
}

testThirdweb();
