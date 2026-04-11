import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { nodePolyfills } from 'vite-plugin-node-polyfills';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      base: process.env.NODE_ENV === 'production' ? '/RhizaWebWallet/' : '/',
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [
        react(),
        nodePolyfills({
          // Enable all polyfills except net and tls which we alias manually
          protocolImports: true,
          exclude: ['net', 'tls'],
          globals: {
            Buffer: true,
            global: true,
            process: true,
          },
        }),
      ],
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.version': JSON.stringify('v18.0.0'),
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
          'net': path.resolve(__dirname, 'net-mock.js'),
          'tls': path.resolve(__dirname, 'tls-mock.js'),
          // sodium-universal uses sodium-javascript as its browser fallback
          // Explicitly alias it so Vite can resolve the optional peer dep
          'sodium-universal': path.resolve(
            __dirname,
            'node_modules/sodium-javascript'
          ),
          // tronweb ships a separate browser bundle — alias it so Vite
          // doesn't bundle the Node-only build (TronWeb.node.js)
          'tronweb': path.resolve(
            __dirname,
            'node_modules/tronweb/dist/TronWeb.js'
          ),
          // @noble/hashes v2.0.1 renamed export keys to include .js extension.
          // wdk-wallet-btc imports the bare '/hmac' and '/sha2' specifiers
          // (v1.x style). These aliases bridge the gap without downgrading the package.
          '@noble/hashes/hmac': path.resolve(
            __dirname,
            'node_modules/@noble/hashes/hmac.js'
          ),
          '@noble/hashes/sha2': path.resolve(
            __dirname,
            'node_modules/@noble/hashes/sha2.js'
          ),
        }
      },
      optimizeDeps: {
        // Force Vite to pre-bundle wdk-wallet-btc so esbuild resolves
        // its raw src/ ESM imports (including the @noble/hashes subpaths) in one pass.
        include: ['sodium-javascript', 'tronweb', '@tetherto/wdk-wallet-btc'],
        esbuildOptions: {
          target: 'es2020',
        },
      },
    };
});

