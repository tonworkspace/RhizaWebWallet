const { ethers } = require('ethers');

try {
  // A standard TON mnemonic which might have an invalid BIP39 checksum
  // For testing, I'll just use a random invalid 24 words
  const mnemonicPhrase = "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon art"; // invalid checksum
  
  const password = ethers.toUtf8Bytes(mnemonicPhrase.normalize('NFKD'));
  const salt = ethers.toUtf8Bytes("mnemonic"); // empty passphrase
  const seed = ethers.pbkdf2(password, salt, 2048, 64, "sha512");
  
  const rootWallet = ethers.HDNodeWallet.fromSeed(seed);
  const derivedWallet = rootWallet.derivePath("m/44'/60'/0'/0/0");
  console.log("Derived address:", derivedWallet.address);
} catch (e) {
  console.error('Error:', e);
}
