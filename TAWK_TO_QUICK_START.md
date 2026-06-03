# Tawk.to Integration - Quick Start Guide

## ✅ Integration Complete!

The Tawk.to live chat widget has been successfully integrated into your RhizaCore Web Wallet application.

## What Was Done

### 1. Security Configuration (index.html)
Updated Content Security Policy to allow Tawk.to resources:
- ✅ Script loading from `embed.tawk.to`
- ✅ WebSocket connections to `*.tawk.to`
- ✅ Frame embedding from `embed.tawk.to`

### 2. Widget Component (components/TawkToWidget.tsx)
Created a React component that:
- ✅ Dynamically loads Tawk.to script
- ✅ Automatically identifies logged-in users
- ✅ Sends user context (wallet address, network, activation status)
- ✅ Adds tags for better support categorization
- ✅ Cleans up properly on unmount

### 3. App Integration (App.tsx)
- ✅ Imported TawkToWidget component
- ✅ Added to AppContent render tree
- ✅ Widget loads on all pages

## How It Works

### For Users
1. **Widget Appearance**: A chat bubble appears in the bottom-right corner
2. **Click to Chat**: Users can click to start a conversation
3. **Auto-Identification**: Logged-in users are automatically identified
4. **Persistent**: Chat persists across page navigation

### For Support Agents
When a user starts a chat, agents see:
- **User Name**: From user profile
- **Email**: User's email or generated from wallet address
- **Wallet Address**: For account lookup
- **Network**: Mainnet or testnet
- **Activation Status**: Whether wallet is activated
- **Tags**: `logged-in`, `network-mainnet`, `activated`, etc.

## Testing the Integration

### 1. Start Development Server
```bash
npm run dev
```

### 2. Open Application
Navigate to `http://localhost:3000`

### 3. Verify Widget Loads
- Look for chat bubble in bottom-right corner
- Check browser console for any errors
- Verify no CSP violations

### 4. Test User Identification
1. Log in to the wallet
2. Open chat widget
3. In Tawk.to dashboard, verify user info appears

### 5. Test Across Pages
- Navigate between different pages
- Verify chat persists
- Check that widget doesn't reload unnecessarily

## Customization Options

### Hide Widget on Specific Pages
Edit `components/TawkToWidget.tsx`:

```typescript
import { useLocation } from 'react-router-dom';

const TawkToWidget: React.FC = () => {
  const location = useLocation();
  
  useEffect(() => {
    if (window.Tawk_API) {
      // Hide on login/onboarding pages
      if (location.pathname.includes('/login') || 
          location.pathname.includes('/onboarding')) {
        window.Tawk_API.hideWidget();
      } else {
        window.Tawk_API.showWidget();
      }
    }
  }, [location.pathname]);
  
  // ... rest of component
};
```

### Change Widget Position
In Tawk.to dashboard:
1. Go to **Administration** → **Chat Widget**
2. Click **Widget Appearance**
3. Adjust position, colors, and behavior

### Trigger Chat Programmatically
Create a button to open chat:

```typescript
const openChat = () => {
  if (window.Tawk_API) {
    window.Tawk_API.maximize();
  }
};

<button onClick={openChat}>
  Contact Support
</button>
```

## Monitoring & Analytics

### Tawk.to Dashboard
Access at: https://dashboard.tawk.to

**Key Metrics:**
- Active chats
- Response time
- Customer satisfaction
- Chat history
- Agent performance

### Usage Analytics
Monitor:
- Number of chats per day
- Common questions/issues
- Peak support hours
- User satisfaction ratings

## Troubleshooting

### Widget Not Appearing?

**Check 1: Browser Console**
```javascript
// Should return an object
console.log(window.Tawk_API);
```

**Check 2: Network Tab**
- Look for requests to `embed.tawk.to`
- Verify 200 status codes

**Check 3: CSP Errors**
- No CSP violations in console
- All Tawk.to resources allowed

### User Info Not Showing?

**Verify WalletContext:**
```typescript
const { userProfile, address, network } = useWallet();
console.log({ userProfile, address, network });
```

**Check Tawk_API Methods:**
```javascript
console.log(typeof window.Tawk_API.setAttributes); // Should be 'function'
```

## Production Deployment

### Before Deploying

1. **Test Thoroughly**
   - [ ] Widget loads on all pages
   - [ ] User identification works
   - [ ] No console errors
   - [ ] Mobile responsive

2. **Configure Tawk.to**
   - [ ] Set business hours
   - [ ] Configure automated responses
   - [ ] Add support agents
   - [ ] Customize widget appearance

3. **Performance Check**
   - [ ] Page load time acceptable
   - [ ] No memory leaks
   - [ ] Widget doesn't block rendering

### Deployment Steps

1. **Build Application**
   ```bash
   npm run build
   ```

2. **Test Production Build**
   ```bash
   npm run preview
   ```

3. **Deploy**
   ```bash
   npm run deploy
   ```

4. **Verify in Production**
   - Test widget on live site
   - Verify user identification
   - Check analytics in dashboard

## Best Practices

### Do's ✅
- Keep widget visible on main pages
- Respond to chats promptly
- Use automated responses for common questions
- Monitor analytics regularly
- Train support agents on wallet features

### Don'ts ❌
- Don't send sensitive data (private keys, passwords)
- Don't block page load with widget
- Don't hide widget on all pages
- Don't ignore chat requests
- Don't forget to update widget settings

## Support Resources

### Documentation
- [Full Integration Guide](./TAWK_TO_INTEGRATION.md)
- [Tawk.to JavaScript API](https://developer.tawk.to/jsapi/)
- [Tawk.to Knowledge Base](https://www.tawk.to/knowledgebase/)

### Need Help?
1. Check browser console for errors
2. Review `components/TawkToWidget.tsx`
3. Verify CSP settings in `index.html`
4. Contact development team

## Next Steps

### Immediate
1. ✅ Integration complete
2. 🔄 Test in development
3. 📝 Configure Tawk.to dashboard
4. 👥 Add support agents

### Short-term
1. Set up automated responses
2. Create FAQ chatbot
3. Configure business hours
4. Train support team

### Long-term
1. Analyze support metrics
2. Optimize response times
3. Integrate with ticketing system
4. Add multilingual support

---

**Integration Status**: ✅ Complete and Ready for Testing

**Last Updated**: May 2, 2026

**Version**: 1.0.0
