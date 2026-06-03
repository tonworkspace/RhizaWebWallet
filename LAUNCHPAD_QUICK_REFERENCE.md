# 🚀 Launchpad Quick Reference Card

**Last Updated:** May 13, 2026

---

## 📁 Key Files

| File | Purpose |
|------|---------|
| `create_launchpad_tables_FIXED.sql` | Database schema (USE THIS) |
| `services/launchpadService.ts` | Service layer |
| `pages/LaunchpadList.tsx` | Catalog page |
| `pages/ProjectDetail.tsx` | Dynamic detail page |

---

## 🔗 Routes

| Route | Page |
|-------|------|
| `/wallet/launchpad-list` | Catalog (landing + projects) |
| `/wallet/launchpad/:projectId` | Project detail (dynamic) |
| `/wallet/launchpad` | Redirects to catalog |

---

## 🧪 Quick Test

```bash
# 1. Deploy database
# Run create_launchpad_tables_FIXED.sql in Supabase

# 2. Start app
npm run dev

# 3. Navigate
/wallet/launchpad-list

# 4. Test
- Click "View Live Sales"
- Click any project card
- Verify dynamic loading works
```

---

## 📊 Service Methods

```typescript
// Get all projects
await launchpadService.getProjects();

// Get live projects
await launchpadService.getProjects({ status: 'live' });

// Get single project
await launchpadService.getProject(projectId);

// Get stats
await launchpadService.getStats();

// Validate purchase
await launchpadService.canUserPurchase({
  projectId, userAddress, amount
});
```

---

## 🎯 Status

| Phase | Status |
|-------|--------|
| Phase 1: Backend & Catalog | ✅ Complete |
| Phase 2: Dynamic Detail | ✅ Complete |
| Phase 3: Blockchain | ⏳ Next |
| Phase 4: Polish | ⏳ Future |

---

## 🐛 Troubleshooting

### Projects not loading?
```sql
SELECT COUNT(*) FROM launchpad_projects;
-- Should return 4
```

### Stats showing 0?
```sql
SELECT SUM(raised_amount) FROM launchpad_projects;
-- Should return 226100
```

### Routing not working?
- Check App.tsx imports
- Verify ProjectDetail.tsx exists
- Clear browser cache

---

## 📚 Documentation

- **Setup:** `LAUNCHPAD_QUICK_START.md`
- **Testing:** `LAUNCHPAD_QUICK_TEST.md`
- **Phase 2:** `LAUNCHPAD_PHASE2_COMPLETE.md`
- **Progress:** `LAUNCHPAD_PROGRESS_SUMMARY.md`

---

## ✅ Checklist

### Phase 2 Complete
- [x] File renamed to ProjectDetail.tsx
- [x] Dynamic loading via URL params
- [x] Wallet integration
- [x] Purchase validation
- [x] Real-time countdown
- [x] Error handling
- [x] All project statuses handled

### Phase 3 TODO
- [ ] USDC contract integration
- [ ] Presale contract integration
- [ ] Transaction signing
- [ ] Database updates
- [ ] Notification system

---

**Quick Reference v1.0**  
**Status:** Phase 2 Complete  
**Next:** Phase 3 - Blockchain Integration

