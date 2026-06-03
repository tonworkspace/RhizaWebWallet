# Tawk.to Live Chat Integration

## Overview

This document describes the integration of Tawk.to live chat widget into the RhizaCore Web Wallet application.

## Implementation Details

### Files Modified/Created

1. **`index.html`** - Updated Content Security Policy (CSP)
   - Added `https://embed.tawk.to` to `script-src`
   - Added `https://embed.tawk.to` to `style-src`
   - Added `https://embed.tawk.to` to `connect-src`
   - Added `wss://*.tawk.to` to `connect-src` (for WebSocket connections)
   - Changed `frame-src 'none'` to `frame-src https://embed.tawk.to`

2. **`components/TawkToWidget.tsx`** - New component
   - Dynamically loads Tawk.to script
   - Automatically sets user information when logged in
   - Adds custom attributes for support context
   - Integrates with WalletContext for user data

3. **`App.tsx`** - Updated to include TawkToWidget
   - Imported TawkToWidget component
   - Added component to AppContent render

## Features

### Automatic User Identification
When a user is logged in, the widget automatically sets:
- **Name**: User's profile name
- **Email**: User's email or generated from wallet address
- **Hash**: Wallet address (unique identifier)

### Custom Attributes
The widget sends additional context to support agents:
- Wallet address
- Network (mainnet/testnet)
- Activation status
- Referral code

### Tags
Users are automatically tagged based on their status:
- `logged-in` - User is authenticated
- `network-mainnet` or `network-testnet` - Current network
- `activated` - User has activated their wallet

## Configuration

### Tawk.to Property Details
```typescript
const TAWK_PROPERTY_ID = '69f623dc0a739d1c3418fe79';
const TAWK_WIDGET_ID = '1jnkno613';
```

### Customization Options

You can customize the widget behavior by modifying `components/TawkToWidget.tsx`:

#### Hide Widget on Specific Pages
```typescript
useEffect(() => {
  if (window.Tawk_API && window.Tawk_API.hideWidget) {
    // Hide on login page
    if (location.pathname === '/login') {
      window.Tawk_API.hideWidget();
    } else {
      window.Tawk_API.showWidget();
    }
  }
}, [location.pathname]);
```

#### Customize Widget Position
Add to Tawk.to dashboard settings or use API:
```typescript
window.Tawk_API.customStyle = {
  visibility: {
    desktop: {
      position: 'br', // bottom-right
      xOffset: 20,
      yOffset: 20
    },
    mobile: {
      position: 'br',
      xOffset: 10,
      yOffset: 10
    }
  }
};
```

#### Pre-fill Chat Message
```typescript
window.Tawk_API.onLoad = function() {
  window.Tawk_API.setAttributes({
    name: userProfile?.name,
    email: userProfile?.email,
  });
};
```

## Security Considerations

### Content Security Policy (CSP)
The CSP has been updated to allow Tawk.to resources while maintaining security:
- Scripts are only allowed from `embed.tawk.to`
- WebSocket connections are restricted to `*.tawk.to`
- Frames are only allowed from `embed.tawk.to`

### User Privacy
- User wallet addresses are hashed and used as unique identifiers
- Email addresses are only sent if explicitly provided by the user
- All communication with Tawk.to is encrypted (HTTPS/WSS)

## Testing

### Manual Testing Checklist

1. **Widget Loads**
   - [ ] Widget appears in bottom-right corner
   - [ ] Widget is responsive on mobile devices
   - [ ] Widget loads without console errors

2. **User Identification**
   - [ ] When logged in, user name appears in chat
   - [ ] Custom attributes are visible to support agents
   - [ ] Tags are correctly applied

3. **Functionality**
   - [ ] Can send and receive messages
   - [ ] File uploads work (if enabled)
   - [ ] Notifications work properly
   - [ ] Widget persists across page navigation

4. **Performance**
   - [ ] Widget doesn't block page load
   - [ ] No memory leaks on navigation
   - [ ] Minimal impact on bundle size

### Browser Testing
Test on:
- [ ] Chrome/Edge (Desktop & Mobile)
- [ ] Firefox (Desktop & Mobile)
- [ ] Safari (Desktop & Mobile)
- [ ] Opera

## Troubleshooting

### Widget Not Appearing

1. **Check CSP Headers**
   ```bash
   # Open browser console and look for CSP errors
   # Should see no errors related to embed.tawk.to
   ```

2. **Verify Script Loading**
   ```javascript
   // In browser console
   console.log(window.Tawk_API);
   // Should return an object, not undefined
   ```

3. **Check Network Tab**
   - Look for requests to `embed.tawk.to`
   - Verify WebSocket connection is established

### User Info Not Updating

1. **Check WalletContext**
   ```typescript
   // Verify userProfile, address, and network are available
   console.log({ userProfile, address, network });
   ```

2. **Verify Tawk_API Methods**
   ```javascript
   // In browser console
   console.log(typeof window.Tawk_API.setAttributes);
   // Should return 'function'
   ```

### Performance Issues

1. **Lazy Load Widget**
   ```typescript
   // Only load on user interaction
   const [loadWidget, setLoadWidget] = useState(false);
   
   <button onClick={() => setLoadWidget(true)}>
     Open Support Chat
   </button>
   
   {loadWidget && <TawkToWidget />}
   ```

2. **Delay Loading**
   ```typescript
   useEffect(() => {
     // Load widget after 3 seconds
     const timer = setTimeout(() => {
       // Load Tawk.to script
     }, 3000);
     return () => clearTimeout(timer);
   }, []);
   ```

## Advanced Features

### Trigger Chat Programmatically
```typescript
// Open chat window
window.Tawk_API.maximize();

// Minimize chat window
window.Tawk_API.minimize();

// Toggle chat window
window.Tawk_API.toggle();
```

### Listen to Events
```typescript
window.Tawk_API.onLoad = function() {
  console.log('Tawk.to loaded');
};

window.Tawk_API.onChatMaximized = function() {
  console.log('Chat opened');
};

window.Tawk_API.onChatMinimized = function() {
  console.log('Chat closed');
};

window.Tawk_API.onChatStarted = function() {
  console.log('Chat started');
};
```

### Custom Styling
Customize widget appearance in Tawk.to dashboard:
1. Go to Administration > Chat Widget
2. Customize colors, position, and behavior
3. Changes apply automatically

## Best Practices

1. **Don't Block Page Load**
   - Script loads asynchronously
   - Widget initializes after page content

2. **Respect User Privacy**
   - Only send necessary information
   - Don't send sensitive data (private keys, passwords)

3. **Optimize Performance**
   - Widget script is cached by browser
   - Minimal impact on page load time

4. **Monitor Usage**
   - Check Tawk.to dashboard for analytics
   - Monitor chat volume and response times

## Support

### Tawk.to Resources
- [Documentation](https://www.tawk.to/knowledgebase/)
- [JavaScript API](https://developer.tawk.to/jsapi/)
- [Support](https://www.tawk.to/support/)

### Internal Support
For issues with the integration:
1. Check browser console for errors
2. Verify CSP settings in `index.html`
3. Review `TawkToWidget.tsx` implementation
4. Contact development team

## Future Enhancements

### Potential Improvements
1. **Conditional Loading**
   - Only load on specific pages
   - Load on user interaction

2. **Enhanced User Context**
   - Send transaction history summary
   - Include recent activity
   - Add user tier/level

3. **Automated Responses**
   - Set up chatbots for common questions
   - Create quick replies for FAQs

4. **Integration with Backend**
   - Log support tickets in database
   - Track support metrics
   - Generate reports

## Changelog

### Version 1.0.0 (2026-05-02)
- Initial integration of Tawk.to widget
- Updated CSP to allow Tawk.to resources
- Created TawkToWidget component
- Added automatic user identification
- Implemented custom attributes and tags
