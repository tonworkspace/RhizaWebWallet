#!/usr/bin/env node

/**
 * Generate SRI (Subresource Integrity) hashes for fonts.css
 * Run: node scripts/generate-sri.js
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const FONTS_CSS_PATH = path.join(__dirname, '../public/fonts/fonts.css');

function generateSRIHash(filePath) {
  try {
    const fileBuffer = fs.readFileSync(filePath);
    const hashSum = crypto.createHash('sha384');
    hashSum.update(fileBuffer);
    const hash = hashSum.digest('base64');
    return `sha384-${hash}`;
  } catch (error) {
    console.error(`❌ Error reading file: ${error.message}`);
    return null;
  }
}

function main() {
  console.log('🔐 Generating SRI hash for fonts.css...\n');

  if (!fs.existsSync(FONTS_CSS_PATH)) {
    console.error(`❌ File not found: ${FONTS_CSS_PATH}`);
    console.error('Please ensure public/fonts/fonts.css exists.');
    process.exit(1);
  }

  const sriHash = generateSRIHash(FONTS_CSS_PATH);

  if (!sriHash) {
    console.error('❌ Failed to generate SRI hash');
    process.exit(1);
  }

  console.log('✅ SRI Hash Generated Successfully!\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`Integrity: ${sriHash}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  console.log('📝 Add this to your index.html:\n');
  console.log('<!-- Self-hosted fonts with SRI protection -->');
  console.log('<link');
  console.log('  rel="stylesheet"');
  console.log('  href="/fonts/fonts.css"');
  console.log(`  integrity="${sriHash}"`);
  console.log('  crossorigin="anonymous"');
  console.log('>\n');

  console.log('🔧 Replace the Google Fonts link with the above code.');
  console.log('✅ Done!');
}

main();
