const { ethers } = require('ethers');
try {
  const mnemonicPhrase = 'test test test test test test test test test test test junk';
  const mnemonicInstance = ethers.Mnemonic.fromPhrase(mnemonicPhrase);
  const wallet = ethers.HDNodeWallet.fromMnemonic(mnemonicInstance, "m/44'/60'/0'/0/0");
  console.log(wallet.address);
} catch (e) {
  console.error('Error:', e.message);
}
