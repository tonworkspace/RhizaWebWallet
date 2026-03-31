import { Buffer } from 'buffer';
import process from 'process';

// Polyfill Buffer and process globally for crypto libraries
if (typeof window !== 'undefined') {
  window.Buffer = window.Buffer || Buffer;
  // Ensure process and process.version exist for older crypto libs like ripemd160
  window.process = window.process || process;
  if (!window.process.version) {
    (window.process as any).version = 'v18.0.0'; // mock version
  }
  window.global = window.global || window;
}

import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
