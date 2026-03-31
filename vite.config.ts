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
        }
      },
      optimizeDeps: {
        include: ['sodium-javascript'],
        esbuildOptions: {
          // sodium-javascript uses BigInt and other modern features
          target: 'es2020',
        },
      },
    };
});

