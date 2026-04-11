/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./index.tsx",
    "./App.tsx",
    "./pages/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
    "./context/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    // Override default fontFamily.mono so ALL font-mono classes use JetBrains Mono
    fontFamily: {
      mono: ['JetBrains Mono', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'monospace'],
    },
    extend: {
      fontFamily: {
        heading:  ['Space Grotesk', 'sans-serif'],
        body:     ['DM Sans', 'sans-serif'],
        numbers:  ['Inter', 'sans-serif'],
        // monoPrecision kept as alias for backwards compat
        monoPrecision: ['JetBrains Mono', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      colors: {
        primary: '#00FF88',
        secondary: '#00CCFF',
      },
    },
  },
  plugins: [],
}
