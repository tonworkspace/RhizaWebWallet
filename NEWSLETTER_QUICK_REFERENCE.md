# Newsletter System - Quick Reference 📋

## For Developers

### Test Newsletter Form
```bash
# 1. Start dev server
npm run dev

# 2. Go to http://localhost:5173
# 3. Scroll to footer
# 4. Enter email and submit
```

### Check Database
```sql
-- View all subscriptions
SELECT * FROM wallet_newsletter_subscriptions 
ORDER BY created_at DESC;

-- Count active subscriptions
SELECT COUNT(*) FROM wallet_newsletter_subscriptions 
WHERE status = 'active';
```

### Get Statistics (Code)
```typescript
import { supabaseService } from './services/supabaseService';

const stats = await supabaseService.getNewsletterStats();
console.log(stats.data);
// { total: 150, active: 142, unsubscribed: 8 }
```

---

## For Users

### Subscribe to Newsletter
1. Go to landing page
2. Scroll to footer
3. Enter your email
4. Click arrow button or press Enter
5. See success message

### What Happens
- ✅ Email validated
- ✅ Saved to database
- ✅ Success message shown
- ✅ Input cleared
- ✅ Activity tracked (if logged in)

---

## Database Schema

```
wallet_newsletter_subscriptions
├── id (UUID, Primary Key)
├── email (TEXT, UNIQUE)
├── status (TEXT, 'active' or 'unsubscribed')
├── source (TEXT, default 'landing_page')
├── ip_address (TEXT, optional)
├── user_agent (TEXT, optional)
├── metadata (JSONB)
├── subscribed_at (TIMESTAMPTZ)
├── unsubscribed_at (TIMESTAMPTZ, nullable)
└── created_at (TIMESTAMPTZ)
```

---

## API Methods

### Subscribe to Newsletter
```typescript
const result = await supabaseService.subscribeToNewsletter(
  'user@example.com',
  {
    source: 'landing_page',
    ipAddress: '192.168.1.1',
    userAgent: navigator.userAgent
  }
);

if (result.success) {
  console.log(result.message);
} else {
  console.error(result.error);
}
```

### Get Statistics (Admin)
```typescript
const stats = await supabaseService.getNewsletterStats();

if (stats.success) {
  console.log(`Total: ${stats.data.total}`);
  console.log(`Active: ${stats.data.active}`);
  console.log(`Unsubscribed: ${stats.data.unsubscribed}`);
}
```

---

## Common Queries

### Recent Subscriptions
```sql
SELECT email, subscribed_at, status 
FROM wallet_newsletter_subscriptions 
ORDER BY subscribed_at DESC 
LIMIT 10;
```

### Active Subscribers
```sql
SELECT email FROM wallet_newsletter_subscriptions 
WHERE status = 'active';
```

### Subscriptions by Source
```sql
SELECT source, COUNT(*) as count 
FROM wallet_newsletter_subscriptions 
GROUP BY source;
```

### Today's Subscriptions
```sql
SELECT COUNT(*) FROM wallet_newsletter_subscriptions 
WHERE DATE(subscribed_at) = CURRENT_DATE;
```

---

## Toast Messages

### Success
- "Thank you for subscribing! Check your inbox for updates."
- "You are already subscribed to our newsletter!"
- "Welcome back! You have been resubscribed to our newsletter."

### Error
- "Invalid email format"
- "Please enter your email address"
- "Failed to subscribe. Please try again."

---

## Security

### RLS Policies
- ✅ Anyone can subscribe (INSERT)
- ❌ Only admins can view (SELECT)
- ❌ Only admins can update (UPDATE)

### Validation
- Email format checked
- Duplicates prevented
- SQL injection protected
- XSS attacks prevented

---

## Testing

### Quick Test
```javascript
// In browser console on landing page
const input = document.querySelector('input[type="email"]');
input.value = 'test@example.com';
input.closest('form').dispatchEvent(new Event('submit', { bubbles: true }));
```

### Verify in Database
```sql
SELECT * FROM wallet_newsletter_subscriptions 
WHERE email = 'test@example.com';
```

---

## Troubleshooting

### Newsletter form not working?
1. Check browser console for errors
2. Verify Supabase connection
3. Check RLS policies
4. Verify table exists

### Email not saving?
1. Check database migration ran
2. Verify UNIQUE constraint
3. Check RLS policies
4. Review error logs

### Toast not appearing?
1. Verify ToastContext wrapped
2. Check `showToast` imported
3. Review browser console

---

## Files

### Database
- `supabase_migration_safe.sql` - Migration script

### Services
- `services/supabaseService.ts` - Newsletter methods

### Frontend
- `pages/Landing.tsx` - Newsletter form

### Documentation
- `NEWSLETTER_INTEGRATION_COMPLETE.md` - Full docs
- `NEWSLETTER_VISUAL_GUIDE.md` - Visual guide
- `NEWSLETTER_TESTING_GUIDE.md` - Testing guide
- `NEWSLETTER_QUICK_REFERENCE.md` - This file

---

## Status

✅ Database integration complete
✅ Newsletter form functional
✅ Email validation working
✅ Duplicate prevention working
✅ Toast notifications working
✅ Activity tracking working
✅ Mobile responsive
✅ Dark mode compatible
✅ Build successful
✅ Documentation complete

---

## Next Steps

1. Deploy database migration
2. Test in production
3. Connect email service
4. Set up welcome emails
5. Create unsubscribe flow
6. Build analytics dashboard
