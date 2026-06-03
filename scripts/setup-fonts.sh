#!/bin/bash

# Font Setup Script for SRI Implementation
# Downloads fonts from Google Fonts and sets up self-hosted fonts with SRI

set -e

echo "🔤 Setting up self-hosted fonts with SRI protection..."

# Create fonts directory
mkdir -p public/fonts/{space-grotesk,dm-sans,inter,jetbrains-mono}

echo "📥 Downloading fonts..."
echo ""
echo "Please download the following fonts manually from https://gwfh.mranftl.com/fonts"
echo ""
echo "1. Space Grotesk:"
echo "   - Weights: 500, 600, 700"
echo "   - Format: WOFF2"
echo "   - Charset: latin"
echo "   - Save to: public/fonts/space-grotesk/"
echo ""
echo "2. DM Sans:"
echo "   - Weights: 400, 500, 600, 700, 400italic"
echo "   - Format: WOFF2"
echo "   - Charset: latin"
echo "   - Save to: public/fonts/dm-sans/"
echo ""
echo "3. Inter:"
echo "   - Weights: 400, 500, 600, 700"
echo "   - Format: WOFF2"
echo "   - Charset: latin"
echo "   - Save to: public/fonts/inter/"
echo ""
echo "4. JetBrains Mono:"
echo "   - Weights: 400, 500, 700"
echo "   - Format: WOFF2"
echo "   - Charset: latin"
echo "   - Save to: public/fonts/jetbrains-mono/"
echo ""
echo "After downloading, run: npm run generate-sri"
