# Invoice System Setup Guide

## Quick Start (5 minutes)

### Step 1: Run Database Migration

**Option A: Supabase Dashboard**
1. Open Supabase Dashboard → SQL Editor
2. Copy contents of `add_payment_invoices.sql`
3. Click "Run"
4. Verify table created: `payment_invoices`

**Option B: Command Line**
```bash
psql -d your_database -f add_payment_invoices.sql
```

### Step 2: Add Route to Router

Open your router file (e.g., `App.tsx` or `routes.tsx`) and add:

```typescript
import InvoiceLookup from './pages/InvoiceLookup';

// Add this route
<Route path="/invoices" element={<InvoiceLookup />} />
```

### Step 3: Add Navigation Link (Optional)

Add a link to the invoice page in your navigation:

```typescript
<Link to="/invoices">
  <FileText size={20} />
  <span>Invoices</span>
</Link>
```

### Step 4: Test the System

1. **Open purchase modal** → Check browser console for "Invoice created"
2. **Start payment** → Invoice should update to "processing"
3. **Close modal during payment** → Invoice modal should appear
4. **Complete payment** → Invoice should update to "completed"
5. **Visit `/invoices`** → Should see your invoice history

## Verification Checklist

### Database
- [ ] `payment_invoices` table exists
- [ ] Indexes created successfully
- [ ] RLS policies enabled
- [ ] Trigger function created

### Frontend
- [ ] No TypeScript errors
- [ ] Invoice modal renders correctly
- [ ] Invoice lookup page accessible
- [ ] Copy buttons work
- [ ] Status colors display correctly

### Integration
- [ ] Invoice created on modal open
- [ ] Invoice updated during payment
- [ ] Invoice modal shown on close
- [ ] Resume/retry buttons work
- [ ] localStorage fallback works

## Testing Scenarios

### Test 1: Happy Path
```
1. Open purchase modal
2. Confirm payment
3. Wait for completion
4. Check invoice status = "completed"
✅ Expected: Invoice shows success with TX hash
```

### Test 2: Modal Close During Payment
```
1. Open purchase modal
2. Click "Confirm Payment"
3. Immediately close modal
✅ Expected: Invoice modal appears showing processing status
```

### Test 3: Manual Payment Resume
```
1. Open purchase modal
2. Switch to Manual/QR mode
3. Click "I've Sent Payment"
4. Close modal
5. Click "Resume Payment" in invoice modal
✅ Expected: Polling resumes, payment detected
```

### Test 4: Failed Payment
```
1. Open purchase modal
2. Disconnect wallet or cause error
3. Try to pay
✅ Expected: Invoice shows failed status with error message
```

### Test 5: Invoice Lookup
```
1. Complete a payment
2. Navigate to /invoices
3. Find your invoice
4. Click to view details
✅ Expected: Full invoice details displayed
```

## Troubleshooting

### Issue: Invoice not created
**Check:**
- Browser console for errors
- Supabase connection
- User wallet address is valid

**Fix:**
```typescript
// Verify supabaseService is initialized
console.log(supabaseService.isConfigured());
```

### Issue: Invoice modal not showing
**Check:**
- `showInvoice` state
- `currentInvoice` is not null
- Modal component imported correctly

**Fix:**
```typescript
// Add debug logging
console.log('Show invoice:', showInvoice, currentInvoice);
```

### Issue: Status not updating
**Check:**
- Database permissions
- RLS policies
- Network connectivity

**Fix:**
```typescript
// Check update result
const result = await invoiceService.updateStatus(id, 'processing');
console.log('Update result:', result);
```

### Issue: localStorage not working
**Check:**
- Browser privacy mode
- Storage quota
- localStorage enabled

**Fix:**
```typescript
// Test localStorage
try {
  localStorage.setItem('test', 'test');
  localStorage.removeItem('test');
  console.log('localStorage works');
} catch (e) {
  console.error('localStorage blocked:', e);
}
```

## Configuration Options

### Invoice Expiration Time
Default: 24 hours

To change, modify in SQL:
```sql
expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '12 hours')
```

### Invoice Number Format
Default: `INV-YYYYMMDD-XXXX`

To customize, edit `invoiceService.ts`:
```typescript
private generateInvoiceNumber(): string {
  // Your custom format
  return `CUSTOM-${Date.now()}`;
}
```

### Polling Timeout
Default: 10 minutes

To change, modify in `GlobalPurchaseModal.tsx`:
```typescript
const POLL_TIMEOUT_MS = 15 * 60 * 1000; // 15 minutes
```

## Support Integration

### For Support Team

When user reports payment issue:

1. **Ask for invoice number** (INV-YYYYMMDD-XXXX)
2. **Look up in database:**
   ```sql
   SELECT * FROM payment_invoices 
   WHERE invoice_number = 'INV-20260411-XXXX';
   ```
3. **Check status and error_message**
4. **Verify TX hash on blockchain**
5. **Manual activation if needed:**
   ```sql
   UPDATE payment_invoices 
   SET status = 'completed', 
       activated_at = NOW()
   WHERE invoice_number = 'INV-20260411-XXXX';
   ```

### Common Support Queries

**"I paid but wallet not activated"**
```sql
-- Check invoice status
SELECT status, tx_hash, error_message 
FROM payment_invoices 
WHERE wallet_address = 'USER_ADDRESS'
ORDER BY created_at DESC LIMIT 1;
```

**"Payment stuck in processing"**
```sql
-- Check if TX confirmed on blockchain
-- If yes, manually complete:
UPDATE payment_invoices 
SET status = 'completed', activated_at = NOW()
WHERE id = 'INVOICE_ID';
```

**"Lost invoice number"**
```sql
-- Find by wallet address
SELECT invoice_number, status, created_at 
FROM payment_invoices 
WHERE wallet_address = 'USER_ADDRESS'
ORDER BY created_at DESC;
```

## Performance Optimization

### Database Indexes
Already created in migration:
- `wallet_address` (most common query)
- `invoice_number` (unique lookups)
- `status` (filtering)
- `created_at` (sorting)

### Caching Strategy
```typescript
// Invoice service uses localStorage as cache
// Automatically syncs with database
// Falls back to local if DB unavailable
```

### Query Optimization
```typescript
// Limit results for performance
getWalletInvoices(address, limit = 20)

// Use pagination for large datasets
// TODO: Add pagination support
```

## Security Considerations

### RLS Policies
- ✅ Users can only see their own invoices
- ✅ Service role can insert/update all
- ✅ No public access without authentication

### Data Privacy
- ✅ Wallet addresses normalized
- ✅ No sensitive data in localStorage
- ✅ TX hashes are public (blockchain)

### Rate Limiting
Consider adding:
```typescript
// Prevent invoice spam
const recentInvoices = await getWalletInvoices(address);
if (recentInvoices.filter(i => 
  Date.now() - new Date(i.created_at).getTime() < 60000
).length > 5) {
  throw new Error('Too many invoices created. Please wait.');
}
```

## Monitoring & Analytics

### Key Metrics to Track

```sql
-- Conversion rate
SELECT 
  COUNT(*) FILTER (WHERE status = 'completed') * 100.0 / COUNT(*) as completion_rate
FROM payment_invoices
WHERE created_at > NOW() - INTERVAL '7 days';

-- Average time to payment
SELECT 
  AVG(EXTRACT(EPOCH FROM (paid_at - created_at))) as avg_seconds
FROM payment_invoices
WHERE status = 'completed';

-- Failure reasons
SELECT 
  error_message, 
  COUNT(*) 
FROM payment_invoices 
WHERE status = 'failed'
GROUP BY error_message
ORDER BY COUNT(*) DESC;

-- Payment method distribution
SELECT 
  payment_method, 
  COUNT(*) 
FROM payment_invoices
GROUP BY payment_method;
```

## Next Steps

After basic setup:

1. **Add email notifications** — Send invoice receipt via email
2. **PDF generation** — Generate downloadable PDF invoices
3. **Admin dashboard** — View all invoices, filter, export
4. **Webhook integration** — Notify external systems of payment events
5. **Analytics dashboard** — Visualize payment metrics

## Resources

- **Database Schema:** `add_payment_invoices.sql`
- **Service Layer:** `services/invoiceService.ts`
- **UI Components:** `components/PaymentInvoiceModal.tsx`
- **Lookup Page:** `pages/InvoiceLookup.tsx`
- **Integration:** `components/GlobalPurchaseModal.tsx`
- **Documentation:** `INVOICE_SYSTEM_IMPLEMENTATION.md`

## Support

For issues or questions:
1. Check browser console for errors
2. Verify database migration ran successfully
3. Test with a small payment first
4. Review `INVOICE_SYSTEM_IMPLEMENTATION.md` for detailed architecture

---

**Setup complete!** Your payment system now has professional invoice tracking. 🎉
