# Subresource Integrity (SRI) Implementation Plan

**Date**: April 27, 2026  
**Issue**: #18 - No Subresource Integrity (SRI)  
**Severity**: LOW  
**Status**: ⚠️ PARTIAL FIX (Trade-off Required)

---

## Current External Resources Audit

### ✅ External Scripts: NONE
- No external JavaScript files loaded from CDNs
- All JS bundled via Vite (self-hosted)

### ✅ External Stylesheets: NONE  
- No external CSS files loaded from CDNs
- All CSS bundled via Vite (self-hosted)

### ⚠️ External Fonts: Google Fonts
```html
<link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;1,9..40,400&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;700&display=swap" rel="stylesheet">
```

---

## The Google Fonts SRI Problem

### Why SRI Doesn't Work with Google Fonts

1. **Dynamic Content**: Google Fonts serves different CSS based on:
   - User's browser (Chrome vs Firefox vs Safari)
   - User's OS (Windows vs macOS vs Linux)
   - Font format support (WOFF2 vs WOFF vs TTF)
   - Unicode range optimization

2. **Frequent Updates**: Google updates font files regularly:
   - Bug fixes in font rendering
   - New character support
   - Performance optimizations
   - **SRI hash would break on every update**

3. **Industry Standard**: Major wallets don't use SRI for Google Fonts:
   - MetaMask: ❌ No SRI on Google Fonts
   - Trust Wallet: ❌ No SRI on Google Fonts
   - Coinbase Wallet: ❌ No SRI on Google Fonts
   - Phantom: ❌ No SRI on Google Fonts

---

## Solution Options

### Option 1: Self-Host Fonts (RECOMMENDED) ✅

**Pros**:
- ✅ Full SRI support
- ✅ No external dependencies
- ✅ Faster load times (no DNS lookup)
- ✅ Works offline
- ✅ GDPR compliant (no Google tracking)

**Cons**:
- ⚠️ Requires manual font updates
- ⚠️ Increases bundle size (~200-300KB)
- ⚠️ Need to manage font files

**Implementation**: 
- Download fonts from Google Fonts
- Add to `/public/fonts/` directory
- Update CSS to use local fonts
- Add SRI hashes to font CSS file

**Effort**: 2-3 hours

---

### Option 2: Keep Google Fonts + CSP (CURRENT) ⚠️

**Pros**:
- ✅ Already implemented
- ✅ CSP restricts to trusted domains
- ✅ Automatic font updates
- ✅ Optimized delivery per browser

**Cons**:
- ❌ No SRI protection
- ❌ External dependency
- ❌ Potential GDPR concerns

**Current Protection**:
```html
<meta http-equiv="Content-Security-Policy" content="
  style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
  font-src 'self' data: https://fonts.gstatic.com;
">
```

**Effort**: 0 hours (already done)

---

### Option 3: Hybrid Approach ⚡

**Strategy**:
- Self-host critical fonts (Space Grotesk, Inter)
- Use Google Fonts as fallback
- Add SRI to self-hosted fonts

**Pros**:
- ✅ SRI protection for primary fonts
- ✅ Fallback if self-hosted fails
- ✅ Best of both worlds

**Cons**:
- ⚠️ More complex setup
- ⚠️ Larger bundle size

**Effort**: 3-4 hours

---

## Recommended Implementation: Option 1 (Self-Host)

### Step 1: Download Fonts

Use [google-webfonts-helper](https://gwfh.mranftl.com/fonts) to download:
- Space Grotesk (500, 600, 700)
- DM Sans (400, 500, 600, 700, 400 italic)
- Inter (400, 500, 600, 700)
- JetBrains Mono (400, 500, 700)

### Step 2: Create Font Directory Structure

```
public/
  fonts/
    space-grotesk/
      space-grotesk-v15-latin-500.woff2
      space-grotesk-v15-latin-600.woff2
      space-grotesk-v15-latin-700.woff2
    dm-sans/
      dm-sans-v11-latin-400.woff2
      dm-sans-v11-latin-500.woff2
      dm-sans-v11-latin-600.woff2
      dm-sans-v11-latin-700.woff2
      dm-sans-v11-latin-400italic.woff2
    inter/
      inter-v12-latin-400.woff2
      inter-v12-latin-500.woff2
      inter-v12-latin-600.woff2
      inter-v12-latin-700.woff2
    jetbrains-mono/
      jetbrains-mono-v13-latin-400.woff2
      jetbrains-mono-v13-latin-500.woff2
      jetbrains-mono-v13-latin-700.woff2
```

### Step 3: Create Font CSS with SRI

Create `public/fonts/fonts.css`:

```css
/* Space Grotesk */
@font-face {
  font-family: 'Space Grotesk';
  font-style: normal;
  font-weight: 500;
  font-display: swap;
  src: url('/fonts/space-grotesk/space-grotesk-v15-latin-500.woff2') format('woff2');
}

@font-face {
  font-family: 'Space Grotesk';
  font-style: normal;
  font-weight: 600;
  font-display: swap;
  src: url('/fonts/space-grotesk/space-grotesk-v15-latin-600.woff2') format('woff2');
}

@font-face {
  font-family: 'Space Grotesk';
  font-style: normal;
  font-weight: 700;
  font-display: swap;
  src: url('/fonts/space-grotesk/space-grotesk-v15-latin-700.woff2') format('woff2');
}

/* DM Sans */
@font-face {
  font-family: 'DM Sans';
  font-style: normal;
  font-weight: 400;
  font-display: swap;
  src: url('/fonts/dm-sans/dm-sans-v11-latin-400.woff2') format('woff2');
}

@font-face {
  font-family: 'DM Sans';
  font-style: italic;
  font-weight: 400;
  font-display: swap;
  src: url('/fonts/dm-sans/dm-sans-v11-latin-400italic.woff2') format('woff2');
}

@font-face {
  font-family: 'DM Sans';
  font-style: normal;
  font-weight: 500;
  font-display: swap;
  src: url('/fonts/dm-sans/dm-sans-v11-latin-500.woff2') format('woff2');
}

@font-face {
  font-family: 'DM Sans';
  font-style: normal;
  font-weight: 600;
  font-display: swap;
  src: url('/fonts/dm-sans/dm-sans-v11-latin-600.woff2') format('woff2');
}

@font-face {
  font-family: 'DM Sans';
  font-style: normal;
  font-weight: 700;
  font-display: swap;
  src: url('/fonts/dm-sans/dm-sans-v11-latin-700.woff2') format('woff2');
}

/* Inter */
@font-face {
  font-family: 'Inter';
  font-style: normal;
  font-weight: 400;
  font-display: swap;
  src: url('/fonts/inter/inter-v12-latin-400.woff2') format('woff2');
}

@font-face {
  font-family: 'Inter';
  font-style: normal;
  font-weight: 500;
  font-display: swap;
  src: url('/fonts/inter/inter-v12-latin-500.woff2') format('woff2');
}

@font-face {
  font-family: 'Inter';
  font-style: normal;
  font-weight: 600;
  font-display: swap;
  src: url('/fonts/inter/inter-v12-latin-600.woff2') format('woff2');
}

@font-face {
  font-family: 'Inter';
  font-style: normal;
  font-weight: 700;
  font-display: swap;
  src: url('/fonts/inter/inter-v12-latin-700.woff2') format('woff2');
}

/* JetBrains Mono */
@font-face {
  font-family: 'JetBrains Mono';
  font-style: normal;
  font-weight: 400;
  font-display: swap;
  src: url('/fonts/jetbrains-mono/jetbrains-mono-v13-latin-400.woff2') format('woff2');
}

@font-face {
  font-family: 'JetBrains Mono';
  font-style: normal;
  font-weight: 500;
  font-display: swap;
  src: url('/fonts/jetbrains-mono/jetbrains-mono-v13-latin-500.woff2') format('woff2');
}

@font-face {
  font-family: 'JetBrains Mono';
  font-style: normal;
  font-weight: 700;
  font-display: swap;
  src: url('/fonts/jetbrains-mono/jetbrains-mono-v13-latin-700.woff2') format('woff2');
}
```

### Step 4: Generate SRI Hash

```bash
# Generate SHA-384 hash for fonts.css
openssl dgst -sha384 -binary public/fonts/fonts.css | openssl base64 -A
```

### Step 5: Update index.html

Replace Google Fonts link with:

```html
<!-- Self-hosted fonts with SRI -->
<link 
  rel="stylesheet" 
  href="/fonts/fonts.css"
  integrity="sha384-[GENERATED_HASH_HERE]"
  crossorigin="anonymous"
>
```

### Step 6: Update CSP

Remove Google Fonts from CSP:

```html
<meta http-equiv="Content-Security-Policy" content="
  default-src 'self';
  script-src 'self' 'unsafe-inline' 'unsafe-eval';
  style-src 'self' 'unsafe-inline';
  font-src 'self' data:;
  ...
">
```

---

## Security Benefits

### Before (Google Fonts)
- ❌ No SRI protection
- ❌ CDN compromise risk
- ⚠️ External dependency
- ⚠️ GDPR concerns

### After (Self-Hosted + SRI)
- ✅ Full SRI protection
- ✅ No CDN compromise risk
- ✅ No external dependencies
- ✅ GDPR compliant
- ✅ Works offline
- ✅ Faster load times

---

## Performance Impact

### Bundle Size
- **Before**: 0 KB (external)
- **After**: ~250 KB (WOFF2 compressed)
- **Impact**: +250 KB one-time download

### Load Time
- **Before**: 
  - DNS lookup: ~50ms
  - TLS handshake: ~100ms
  - Download: ~50ms
  - **Total**: ~200ms

- **After**:
  - Same origin: 0ms
  - Download: ~30ms (cached)
  - **Total**: ~30ms

**Result**: ✅ **85% faster** after first load

---

## Alternative: Document the Trade-off

If self-hosting is not desired, document the security trade-off:

### Create `SECURITY_TRADEOFFS.md`

```markdown
# Security Trade-offs

## Google Fonts (No SRI)

**Decision**: Use Google Fonts without SRI hashes

**Rationale**:
- Google Fonts serves dynamic content per browser
- SRI hashes would break on every Google update
- Industry standard (MetaMask, Trust Wallet, etc.)
- CSP restricts to trusted Google domains only

**Mitigation**:
- Content Security Policy restricts font sources
- Only fonts.googleapis.com and fonts.gstatic.com allowed
- No JavaScript execution from font domains
- Regular security audits

**Risk Level**: LOW
- Google Fonts is a trusted, widely-used service
- No known security incidents
- Used by millions of websites
```

---

## Recommendation

### For Production Wallet: Self-Host Fonts ✅

**Reasons**:
1. Maximum security (SRI protection)
2. No external dependencies
3. Better performance
4. GDPR compliant
5. Works offline

**Effort**: 2-3 hours (one-time)

### Quick Win: Document Trade-off ⚡

If time is limited, document the Google Fonts trade-off and mark as "accepted risk" with proper CSP protection already in place.

---

## Implementation Status

- [ ] Download fonts from Google Fonts
- [ ] Create `/public/fonts/` directory structure
- [ ] Create `fonts.css` with @font-face declarations
- [ ] Generate SRI hash for fonts.css
- [ ] Update index.html with SRI link
- [ ] Update CSP to remove Google Fonts domains
- [ ] Test font loading in all browsers
- [ ] Update SecurityAudit.tsx

**Estimated Time**: 2-3 hours  
**Priority**: Low (no critical security risk)

---

## Conclusion

While SRI for Google Fonts is technically challenging due to dynamic content, **self-hosting fonts is the recommended solution** for a production wallet. This provides:

- ✅ Full SRI protection
- ✅ Better performance
- ✅ No external dependencies
- ✅ GDPR compliance

The current CSP implementation provides adequate protection, but self-hosting with SRI is the gold standard for security-critical applications like crypto wallets.
