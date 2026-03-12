# Test Node - Development Mode Only ✅

## Change Summary
The Test Node is now only visible in development mode, not in production or testnet.

## Previous Behavior
```typescript
// Showed on testnet only
...(network === 'testnet' ? [{
  id: 'test-001',
  tierName: 'Test Node',
  badge: 'Test'
}] : [])
```

**Issues:**
- Visible to all testnet users
- Could confuse real users
- Not appropriate for production testing

## New Behavior
```typescript
// Shows only in development mode
...(import.meta.env.DEV ? [{
  id: 'test-001',
  tierName: 'Test Node',
  badge: 'Dev'
}] : [])
```

**Benefits:**
- Only visible to developers
- Hidden from production users
- Hidden from testnet users
- Clean production experience

## Environment Detection

### Development Mode
```bash
# Running with Vite dev server
npm run dev
# or
yarn dev
```

**Result**: Test Node is visible
- Badge shows "Dev"
- Features show "Development Only"
- Available on both mainnet and testnet

### Production Mode
```bash
# Built for production
npm run build
npm run preview
# or deployed to production
```

**Result**: Test Node is hidden
- Not visible to any users
- Clean node selection
- Professional appearance

## Test Node Specifications

**When Visible (Dev Mode Only):**
- **Price**: 0.5 TON
- **Activation Fee**: 0.5 TON (waived if already activated)
- **Mining Rate**: 1 RZC/day
- **Referral**: 5% direct, 2% indirect
- **Badge**: "Dev" (green)
- **Features**:
  - Test Activation
  - Minimal Mining
  - For Testing Only
  - Development Only

## Use Cases

### For Developers
```typescript
// Local development
import.meta.env.DEV === true
// Test Node appears in Mining Nodes list
```

**Purpose:**
- Test activation flow
- Test payment processing
- Test RZC rewards
- Debug issues
- Verify UI/UX

### For Production Users
```typescript
// Production build
import.meta.env.DEV === false
// Test Node is completely hidden
```

**Result:**
- Clean, professional interface
- No confusion about test nodes
- Only real mining nodes visible
- Better user experience

## Checking Environment

### In Code
```typescript
if (import.meta.env.DEV) {
  console.log('Development mode - Test Node visible');
} else {
  console.log('Production mode - Test Node hidden');
}
```

### In Browser Console
```javascript
// Check if in development mode
console.log('DEV mode:', import.meta.env.DEV);
console.log('Mode:', import.meta.env.MODE);
```

## Testing

### Test in Development
1. Run `npm run dev`
2. Navigate to Mining Nodes
3. Should see Test Node with "Dev" badge
4. Can purchase for 0.5 TON

### Test in Production
1. Run `npm run build && npm run preview`
2. Navigate to Mining Nodes
3. Should NOT see Test Node
4. Only real nodes visible

## Comparison

| Aspect | Previous (Testnet) | New (Dev Mode) |
|--------|-------------------|----------------|
| Visibility | Testnet users | Developers only |
| Badge | "Test" | "Dev" |
| Environment | Testnet network | Development mode |
| Production | Hidden | Hidden |
| Testnet | Visible | Hidden |
| Local Dev | Hidden | Visible |

## Benefits

1. **Cleaner Production**: No test nodes in production
2. **Better UX**: Users don't see test/dev features
3. **Professional**: Production looks polished
4. **Developer Friendly**: Easy testing in dev mode
5. **No Confusion**: Clear separation of test vs real

## Environment Variables

### Vite Environment Variables
```typescript
import.meta.env.DEV      // true in development
import.meta.env.PROD     // true in production
import.meta.env.MODE     // 'development' or 'production'
```

### Usage in Code
```typescript
// Show test features only in dev
if (import.meta.env.DEV) {
  // Test Node
  // Debug panels
  // Developer tools
}

// Production-only features
if (import.meta.env.PROD) {
  // Analytics
  // Error tracking
  // Production optimizations
}
```

## Related Changes

### Node Features Updated
- Changed "Testnet Only" → "Development Only"
- Changed badge "Test" → "Dev"
- Updated comments to reflect dev mode

### Filtering Logic
```typescript
// Before: network-based
const showTestNode = network === 'testnet';

// After: environment-based
const showTestNode = import.meta.env.DEV;
```

## Future Enhancements

1. **Admin Panel**: Add admin-only test nodes
2. **Feature Flags**: Use feature flags for test features
3. **Staging Environment**: Separate staging from production
4. **Test Mode Toggle**: Allow admins to enable test mode

## Deployment Checklist

Before deploying to production:
- [ ] Run `npm run build`
- [ ] Verify Test Node is not in build
- [ ] Test production build locally
- [ ] Confirm no dev-only features visible
- [ ] Deploy with confidence

## Related Files

- `pages/MiningNodes.tsx` - Node definitions
- `vite.config.ts` - Build configuration
- `.env.development` - Dev environment variables
- `.env.production` - Production environment variables

---

**Status**: ✅ Complete
**Date**: February 27, 2026
**Change**: Test Node now only visible in development mode
**Impact**: Cleaner production experience, no test nodes for real users
