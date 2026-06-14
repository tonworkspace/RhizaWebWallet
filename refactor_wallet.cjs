const fs = require('fs');

let code = fs.readFileSync('services/tonWalletService.ts', 'utf8');

const blocksToReplace = [
  // 1. getBalanceByAddress
  {
    regex: /const v3Endpoint = this\.currentNetwork === 'mainnet'[\s\S]*?const res = await fetch\(`\$\{v3Endpoint\}\/account\?address=\$\{address\}`\);/,
    replacement: `const res = await this.toncenterFetch(\`/account?address=\${address}\`);`
  },
  // 2. getJettons
  {
    regex: /const v3Endpoint = this\.currentNetwork === 'mainnet'[\s\S]*?const res = await fetch\(`\$\{v3Endpoint\}\/jetton\/wallets\?owner_address=\$\{address\}`\);/,
    replacement: `const res = await this.toncenterFetch(\`/jetton/wallets?owner_address=\${address}\`);`
  },
  // 3. resolveJettonWallet
  {
    regex: /const v3Endpoint = this\.currentNetwork === 'mainnet'[\s\S]*?const res = await fetch\([\s\S]*?`\$\{v3Endpoint\}\/jetton\/wallets\?owner_address=\$\{ownerAddress\}&jetton_address=\$\{jettonMasterAddress\}&limit=1`,\s*\{[\s\S]*?headers:\s*\{[^}]*?\}[^}]*?\}\s*\);/,
    replacement: `const res = await this.toncenterFetch(\`/jetton/wallets?owner_address=\${ownerAddress}&jetton_address=\${jettonMasterAddress}&limit=1\`);`
  },
  // 4. getTransactions
  {
    regex: /const config = getNetworkConfig\(this\.currentNetwork\);[\s\S]*?const v3Endpoint = this\.currentNetwork === 'mainnet'[\s\S]*?const response = await fetch\(`\$\{v3Endpoint\}\/transactions\?account=\$\{address\}&limit=\$\{limit\}`,\s*\{[\s\S]*?headers:\s*\{[\s\S]*?'x-api-key': config\.API_KEY[\s\S]*?\}[\s\S]*?\}\);/,
    replacement: `const response = await this.toncenterFetch(\`/transactions?account=\${address}&limit=\${limit}\`);`
  },
  // 5. getNFTs
  {
    regex: /const config = getNetworkConfig\(this\.currentNetwork\);[\s\S]*?const v3Endpoint = this\.currentNetwork === 'mainnet'[\s\S]*?const response = await fetch\(`\$\{v3Endpoint\}\/nft\/items\?owner_address=\$\{address\}&limit=\$\{limit\}`,\s*\{[\s\S]*?headers:\s*\{[\s\S]*?'x-api-key': config\.API_KEY[\s\S]*?\}[\s\S]*?\}\);/,
    replacement: `const response = await this.toncenterFetch(\`/nft/items?owner_address=\${address}&limit=\${limit}\`);`
  }
];

blocksToReplace.forEach((block, index) => {
  if(block.regex.test(code)) {
    code = code.replace(block.regex, block.replacement);
    console.log(`Replaced fetch block ${index + 1}`);
  } else {
    console.log(`Regex did not match for block ${index + 1}`);
  }
});

const broadcastRegex = /const v3Endpoint = this\.currentNetwork === 'mainnet'[\s\S]*?const broadcastRes = await fetch\(`\$\{v3Endpoint\}\/message`,\s*\{[\s\S]*?method:\s*'POST',[\s\S]*?body:\s*JSON\.stringify\(\{ boc: bocBase64 \}\),?\s*\}\);/g;

code = code.replace(broadcastRegex, `const broadcastRes = await this.toncenterFetch('/message', {
        method: 'POST',
        body: JSON.stringify({ boc: bocBase64 }),
      });`);
console.log('Replaced broadcast fetches');

const pollingRegex1 = /\/\/ Wait for transaction confirmation[\s\S]*?if \(currentSeqno > seqno\) \{[\s\S]*?console\.log\(`?[^`]*?confirmed[^`]*?`?\);[\s\S]*?return\s*\{([\s\S]*?txHash: bocBase64[\s\S]*?)\};[\s\S]*?\} else \{[\s\S]*?return\s*\{[\s\S]*?\};[\s\S]*?\}/g;

code = code.replace(pollingRegex1, (match, p1) => {
  return `// UX OPTIMIZATION (Phase 1): Return immediately to instantly unblock UI
      // Background sync handles final confirmation.
      return {
        ${p1.trim()},
        pending: true
      };`;
});
console.log('Replaced polling loops');

fs.writeFileSync('services/tonWalletService.ts', code);
console.log('Refactoring complete');
