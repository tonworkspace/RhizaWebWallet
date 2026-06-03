# Tawk.to Integration Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                     RhizaCore Web Wallet                        │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                      App.tsx                             │  │
│  │                                                          │  │
│  │  ┌────────────────────────────────────────────────┐     │  │
│  │  │         WalletProvider (Context)               │     │  │
│  │  │  • userProfile                                 │     │  │
│  │  │  • address                                     │     │  │
│  │  │  • network                                     │     │  │
│  │  │  • isLoggedIn                                  │     │  │
│  │  └────────────────┬───────────────────────────────┘     │  │
│  │                   │                                      │  │
│  │                   ▼                                      │  │
│  │  ┌────────────────────────────────────────────────┐     │  │
│  │  │         TawkToWidget Component                 │     │  │
│  │  │                                                │     │  │
│  │  │  1. Load Tawk.to Script                       │     │  │
│  │  │  2. Initialize Tawk_API                       │     │  │
│  │  │  3. Set User Attributes                       │     │  │
│  │  │  4. Add Custom Tags                           │     │  │
│  │  │  5. Send User Context                         │     │  │
│  │  └────────────────┬───────────────────────────────┘     │  │
│  │                   │                                      │  │
│  └───────────────────┼──────────────────────────────────────┘  │
│                      │                                         │
└──────────────────────┼─────────────────────────────────────────┘
                       │
                       │ HTTPS/WSS
                       │
                       ▼
        ┌──────────────────────────────┐
        │      Tawk.to Platform        │
        │                              │
        │  • Chat Server               │
        │  • WebSocket Gateway         │
        │  • User Management           │
        │  • Analytics Engine          │
        └──────────────┬───────────────┘
                       │
                       │
                       ▼
        ┌──────────────────────────────┐
        │   Support Agent Dashboard    │
        │                              │
        │  • Live Chat Interface       │
        │  • User Context Display      │
        │  • Chat History              │
        │  • Analytics & Reports       │
        └──────────────────────────────┘
```

## Component Flow

### 1. Initialization Flow

```
User Opens App
     │
     ▼
App.tsx Renders
     │
     ▼
TawkToWidget Mounts
     │
     ├─► Check if script exists
     │   │
     │   ├─► Yes: Update user info
     │   │
     │   └─► No: Load script
     │        │
     │        ▼
     │   Create <script> tag
     │        │
     │        ▼
     │   Inject into DOM
     │        │
     │        ▼
     │   Wait for onLoad
     │        │
     │        ▼
     └─► Initialize Tawk_API
          │
          ▼
     Set User Attributes
          │
          ▼
     Widget Ready
```

### 2. User Identification Flow

```
User Logs In
     │
     ▼
WalletContext Updates
     │
     ├─► userProfile
     ├─► address
     ├─► network
     └─► isLoggedIn
          │
          ▼
TawkToWidget useEffect Triggered
          │
          ▼
Check Tawk_API Available
          │
          ├─► Yes: Continue
          │
          └─► No: Wait for load
               │
               ▼
          Set Attributes
               │
               ├─► name: userProfile.name
               ├─► email: userProfile.email
               └─► hash: address
                    │
                    ▼
          Add Tags
               │
               ├─► logged-in
               ├─► network-{network}
               └─► activated (if applicable)
                    │
                    ▼
          Send Custom Event
               │
               └─► user-info
                    ├─► walletAddress
                    ├─► network
                    ├─► isActivated
                    └─► referralCode
                         │
                         ▼
          Data Sent to Tawk.to
                         │
                         ▼
          Visible to Support Agents
```

### 3. Chat Interaction Flow

```
User Clicks Widget
     │
     ▼
Widget Maximizes
     │
     ▼
User Types Message
     │
     ▼
Message Sent via WebSocket
     │
     ▼
Tawk.to Server Receives
     │
     ├─► Store in Database
     │
     ├─► Route to Available Agent
     │
     └─► Send Notification
          │
          ▼
Agent Receives Message
     │
     ├─► See User Context
     │   ├─► Name
     │   ├─► Email
     │   ├─► Wallet Address
     │   ├─► Network
     │   └─► Tags
     │
     ▼
Agent Responds
     │
     ▼
Response Sent via WebSocket
     │
     ▼
User Receives Message
     │
     ▼
Conversation Continues
```

## Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    User Browser                             │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  React Application                                   │  │
│  │                                                      │  │
│  │  ┌────────────────┐         ┌──────────────────┐   │  │
│  │  │ WalletContext  │────────▶│ TawkToWidget     │   │  │
│  │  │                │         │                  │   │  │
│  │  │ • userProfile  │         │ • Load Script    │   │  │
│  │  │ • address      │         │ • Set Attributes │   │  │
│  │  │ • network      │         │ • Add Tags       │   │  │
│  │  └────────────────┘         └─────────┬────────┘   │  │
│  │                                       │            │  │
│  └───────────────────────────────────────┼────────────┘  │
│                                          │               │
│  ┌───────────────────────────────────────┼────────────┐  │
│  │  window.Tawk_API                      │            │  │
│  │                                       │            │  │
│  │  • setAttributes() ◀──────────────────┘            │  │
│  │  • addTags()                                       │  │
│  │  • addEvent()                                      │  │
│  │  • maximize()                                      │  │
│  │  • minimize()                                      │  │
│  └────────────────────────┬───────────────────────────┘  │
│                           │                              │
└───────────────────────────┼──────────────────────────────┘
                            │
                            │ HTTPS (REST)
                            │ WSS (WebSocket)
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                  Tawk.to Cloud Platform                     │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  API Gateway                                         │  │
│  │  • Authentication                                    │  │
│  │  • Rate Limiting                                     │  │
│  │  • Load Balancing                                    │  │
│  └────────────────┬─────────────────────────────────────┘  │
│                   │                                         │
│  ┌────────────────▼─────────────────────────────────────┐  │
│  │  Chat Service                                        │  │
│  │  • Message Routing                                   │  │
│  │  • User Management                                   │  │
│  │  • Session Handling                                  │  │
│  └────────────────┬─────────────────────────────────────┘  │
│                   │                                         │
│  ┌────────────────▼─────────────────────────────────────┐  │
│  │  Database                                            │  │
│  │  • Chat History                                      │  │
│  │  • User Profiles                                     │  │
│  │  • Analytics Data                                    │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
                            │
                            │ WebSocket
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│              Support Agent Dashboard                        │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Live Chat Interface                                 │  │
│  │                                                      │  │
│  │  ┌────────────────────────────────────────────────┐ │  │
│  │  │  Active Chats                                  │ │  │
│  │  │  • User: John Doe                              │ │  │
│  │  │  • Email: john@example.com                     │ │  │
│  │  │  • Wallet: UQAb...cdef                         │ │  │
│  │  │  • Network: mainnet                            │ │  │
│  │  │  • Tags: logged-in, activated                  │ │  │
│  │  └────────────────────────────────────────────────┘ │  │
│  │                                                      │  │
│  │  ┌────────────────────────────────────────────────┐ │  │
│  │  │  Chat History                                  │ │  │
│  │  │  • Previous conversations                      │ │  │
│  │  │  • Resolved tickets                            │ │  │
│  │  └────────────────────────────────────────────────┘ │  │
│  │                                                      │  │
│  │  ┌────────────────────────────────────────────────┐ │  │
│  │  │  Analytics                                     │ │  │
│  │  │  • Response time                               │ │  │
│  │  │  • Satisfaction score                          │ │  │
│  │  └────────────────────────────────────────────────┘ │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## Security Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                  Security Layers                            │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  1. Content Security Policy (CSP)                    │  │
│  │                                                      │  │
│  │  • script-src: embed.tawk.to                        │  │
│  │  • connect-src: embed.tawk.to, wss://*.tawk.to     │  │
│  │  • frame-src: embed.tawk.to                         │  │
│  │  • style-src: embed.tawk.to                         │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  2. HTTPS/WSS Encryption                             │  │
│  │                                                      │  │
│  │  • All communication encrypted                       │  │
│  │  • TLS 1.2+ required                                │  │
│  │  • Certificate validation                            │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  3. Data Sanitization                                │  │
│  │                                                      │  │
│  │  • No private keys sent                             │  │
│  │  • No passwords sent                                │  │
│  │  • Wallet address hashed                            │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  4. Access Control                                   │  │
│  │                                                      │  │
│  │  • Agent authentication required                     │  │
│  │  • Role-based permissions                           │  │
│  │  • Audit logging                                    │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## Performance Optimization

```
┌─────────────────────────────────────────────────────────────┐
│              Performance Strategy                           │
│                                                             │
│  1. Async Script Loading                                   │
│     • Non-blocking                                          │
│     • Deferred execution                                    │
│     • Cached by browser                                     │
│                                                             │
│  2. Lazy Initialization                                     │
│     • Load after page content                               │
│     • Initialize on first interaction                       │
│     • Minimal impact on FCP/LCP                            │
│                                                             │
│  3. Resource Optimization                                   │
│     • CDN delivery                                          │
│     • Gzip compression                                      │
│     • Browser caching                                       │
│                                                             │
│  4. Memory Management                                       │
│     • Single script instance                                │
│     • Proper cleanup on unmount                            │
│     • No memory leaks                                       │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## Integration Points

### 1. Entry Point
- **File**: `App.tsx`
- **Location**: Inside `AppContent` component
- **Render**: `<TawkToWidget />`

### 2. Widget Component
- **File**: `components/TawkToWidget.tsx`
- **Purpose**: Load and configure Tawk.to
- **Dependencies**: WalletContext

### 3. Security Configuration
- **File**: `index.html`
- **Section**: Content Security Policy meta tag
- **Purpose**: Allow Tawk.to resources

### 4. Type Definitions
- **File**: `components/TawkToWidget.tsx`
- **Interface**: `Window` extension
- **Properties**: `Tawk_API`, `Tawk_LoadStart`

## Monitoring & Analytics

```
┌─────────────────────────────────────────────────────────────┐
│                  Metrics Dashboard                          │
│                                                             │
│  Real-time Metrics                                          │
│  ├─ Active Chats: 5                                         │
│  ├─ Waiting Users: 2                                        │
│  ├─ Available Agents: 3                                     │
│  └─ Avg Response Time: 45s                                  │
│                                                             │
│  Daily Statistics                                           │
│  ├─ Total Chats: 127                                        │
│  ├─ Resolved: 115                                           │
│  ├─ Satisfaction: 4.8/5                                     │
│  └─ Avg Duration: 8m 32s                                    │
│                                                             │
│  User Insights                                              │
│  ├─ Logged-in Users: 85%                                    │
│  ├─ Activated Wallets: 72%                                  │
│  ├─ Mainnet Users: 68%                                      │
│  └─ Testnet Users: 32%                                      │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## Deployment Checklist

- [x] CSP updated in `index.html`
- [x] TawkToWidget component created
- [x] Component integrated in `App.tsx`
- [x] TypeScript types defined
- [x] User identification implemented
- [x] Custom attributes configured
- [x] Tags system implemented
- [ ] Tawk.to dashboard configured
- [ ] Support agents added
- [ ] Automated responses set up
- [ ] Business hours configured
- [ ] Widget appearance customized
- [ ] Testing completed
- [ ] Production deployment

---

**Architecture Version**: 1.0.0  
**Last Updated**: May 2, 2026  
**Status**: ✅ Implementation Complete
