# 🔤 RhizaWebWallet — Font Design Audit Report

## 1. What's Currently Loaded

Fonts are pulled from Google Fonts in `index.html` (line 94):

| Font | Weights Loaded | Role |
|---|---|---|
| **Space Grotesk** | 300, 400, 500, 600, 700 | Headings, navigation labels |
| **DM Sans** | 300–800, italic, optical-size 9–40 | Body text (base font) |
| **Inter** | 400–900 | Numeric/tabular data |
| **JetBrains Mono** | 400, 500, 700 | Addresses, hashes, code |

✅ All four fonts are preconnected and loaded correctly. No missing weights.

---

## 2. Tailwind Design Tokens (tailwind.config.cjs)

```js
fontFamily: {
  heading:        ['Space Grotesk', 'sans-serif'],   // → font-heading
  body:           ['DM Sans', 'sans-serif'],          // → font-body
  numbers:        ['Inter', 'sans-serif'],            // → font-numbers
  monoPrecision:  ['JetBrains Mono', 'monospace'],   // → font-monoPrecision
}
```

✅ Four clean tokens map exactly to the four loaded fonts.

---

## 3. CSS-Level Font Rules (index.css)

| Selector | Font Set | Issue? |
|---|---|---|
| `body` | `'DM Sans', 'Inter', sans-serif` | ⚠️ Hardcoded strings instead of Tailwind token |
| `h1, h2, h3, .font-heading` | `'Space Grotesk', sans-serif` | ✅ Correct |
| `.font-nav` | `'Space Grotesk', sans-serif` | ✅ Correct |
| `.font-numbers` | `'Inter', sans-serif` | ✅ Correct |
| `.font-mono-precision` | `'JetBrains Mono', monospace` | ✅ Correct |

> **Warning:** The global `h1, h2, h3` rule (line 497–505) forces `text-transform: uppercase` on ALL headings app-wide. This causes unintended uppercasing in long-form pages like Whitepaper, UserGuide, and WalletMigration.

---

## 4. Token Adoption Across Components

### ✅ Well-adopted
- `font-heading` — heavily used in `Transfer.tsx`, `Dashboard.tsx`, `Layout.tsx`
- `font-numbers` — correctly used for balance amounts
- `font-mono` (Tailwind built-in) — widely used for addresses/code

### ❌ Problems Found

#### Problem 1: `font-mono` resolves to SYSTEM font, not JetBrains Mono
60+ instances across the codebase use Tailwind's generic `font-mono` (which resolves to `ui-monospace, SFMono-Regular, Menlo` — **NOT JetBrains Mono**).

The custom `font-monoPrecision` token is almost never used. This means crypto addresses, referral codes, hashes, and 2FA secrets are rendering in a system monospace, not the premium JetBrains Mono you loaded.

**Most affected files:**
- `WalletMigration.tsx` — 3 instances
- `WalletLogin.tsx` — 5 instances  
- `Referral.tsx`, `History.tsx`, `More.tsx`
- `MultiChain.tsx`, `SecondaryWallet.tsx`, `MiningNodes.tsx`

#### Problem 2: `font-body` token never used in TSX
Zero TSX files apply `font-body` as a Tailwind class. Body text works via CSS cascade, but makes the system fragile and inconsistent.

#### Problem 3: Parallel monospace systems don't connect
You have **three ways** to get monospace — but they're disconnected:
- `font-monoPrecision` (Tailwind, camelCase) — rarely used
- `font-mono-precision` (hand-written CSS) — rarely used
- `font-mono` (Tailwind default = system font) — used everywhere ❌

#### Problem 4: `font-sans` used incorrectly as a body reset
`WalletLogin.tsx` (line 641) and `History.tsx` (lines 389, 393) use `font-sans` to reset text. Tailwind's `font-sans` is the **system UI stack**, not DM Sans. The correct class is `font-body`.

#### Problem 5: `tracking-widest` contradicts CSS heading rule
The CSS sets `letter-spacing: -0.02em` on `.font-heading`, but hundreds of components add `tracking-widest` (`0.1em`) on top. The Tailwind class wins via specificity, creating unintended wide spacing on heading-font labels.

#### Problem 6: Global heading `uppercase` is too aggressive
The CSS rule at line 504 forces ALL `h1/h2/h3` to uppercase — including long-form documentation headings in Whitepaper and UserGuide.

---

## 5. Performance Assessment

| Metric | Status | Notes |
|---|---|---|
| Preconnect | ✅ | Both Google Fonts domains |
| `display=swap` | ✅ | Prevents invisible text |
| Weight variants | ⚠️ | 18 variants (~120–150 KB) |
| Variable font usage | ❌ | DM Sans supports optical sizing — not fully exploited |
| Subsetting | ❌ | No `text=` or `subset=latin` — full charset loaded |

---

## 6. Recommended Improvements

### 🔴 High Priority

**Fix 1 — Override `font-mono` with JetBrains Mono in Tailwind config:**
```js
// tailwind.config.cjs — highest-impact change, fixes 60+ instances at once
theme: {
  extend: {
    fontFamily: {
      heading:  ['Space Grotesk', 'sans-serif'],
      body:     ['DM Sans', 'sans-serif'],
      numbers:  ['Inter', 'sans-serif'],
    },
    // Override the DEFAULT mono to JetBrains Mono:
  },
  fontFamily: {
    mono: ['JetBrains Mono', 'ui-monospace', 'SFMono-Regular', 'monospace'],
  }
}
```
This makes every existing `font-mono` class across the app automatically use JetBrains Mono.

**Fix 2 — Remove global `text-transform: uppercase` from heading rule:**
```css
/* index.css — line 497-505 */
h1, h2, h3, .font-heading {
  font-family: 'Space Grotesk', sans-serif;
  letter-spacing: -0.02em;
  font-weight: 700;
  /* Remove: text-transform: uppercase; */
}
```
Add `uppercase` manually per component where needed.

**Fix 3 — Fix `font-sans` misuses:**
```tsx
// ❌ WalletLogin.tsx line 641
<span className="... font-sans">sec</span>

// ✅ Should be:
<span className="... font-body">sec</span>
```

### 🟡 Medium Priority

**Fix 4 — Add `font-feature-settings` for financial precision:**
```css
.font-numbers {
  font-variant-numeric: tabular-nums;
  font-feature-settings: "tnum" 1, "zero" 1; /* tabular + slashed zero */
  letter-spacing: -0.01em;
}
```

**Fix 5 — Add a shared label cap utility:**
```css
/* index.css */
.label-caps {
  @apply uppercase tracking-widest text-xs font-heading font-black;
}
```
This consolidates the ~200 instances of repeated `uppercase tracking-widest font-heading font-black text-xs`.

**Fix 6 — Add explicit line-height scale:**
```css
body { line-height: 1.6; }
h1, h2, h3 { line-height: 1.1; }
p { line-height: 1.7; }
```

### 🟢 Low Priority

**Fix 7 — Slim the Google Fonts URL (saves ~40–60 KB):**
```html
<!-- index.html -->
<link href="https://fonts.googleapis.com/css2?
  family=Space+Grotesk:wght@500;700&
  family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600&
  family=Inter:wght@400;600;700&
  family=JetBrains+Mono:wght@400;500&
  display=swap" rel="stylesheet">
```

---

## 7. Summary Score

| Category | Score | Notes |
|---|---|---|
| Font Selection | 9/10 | Excellent Web3 stack |
| Google Fonts Loading | 8/10 | Good, needs weight trimming |
| Tailwind Token Design | 7/10 | Well-designed, camelCase naming hurts adoption |
| Token Adoption | 4/10 | `font-mono` bypass is widespread |
| CSS Coherence | 5/10 | Global uppercase override causes issues |
| Performance | 6/10 | Too many weight variants |
| **Overall** | **6.5/10** | **Strong foundation, weak enforcement** |

> **Top Tip:** The single highest-impact change is overriding Tailwind's `fontFamily.mono` to JetBrains Mono in `tailwind.config.cjs`. It instantly upgrades all 60+ monospace usages app-wide with zero TSX changes needed.
