# Support Widgets Visual Guide

## Current Setup

Your dashboard now has **TWO support widgets** positioned strategically:

```
┌────────────────────────────────────────────────────────────────┐
│                        Dashboard Header                        │
│                    [Balance] [Actions] [Menu]                  │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│  ┌──────────────────────────────────────────────────────┐    │
│  │         Support Options Info Banner (First Visit)    │    │
│  │  💬 Live Chat (Right) | 🎫 Support Tickets (Left)   │    │
│  │                    [Got it]                          │    │
│  └──────────────────────────────────────────────────────┘    │
│                                                                │
│                                                                │
│                     Main Dashboard Content                     │
│                                                                │
│                  [Portfolio] [Assets] [Activity]               │
│                                                                │
│                                                                │
│                                                                │
│                                                                │
│  ┌─────────┐                                  ┌─────────┐    │
│  │   🎫    │                                  │   💬    │    │
│  │ Tickets │                                  │  Chat   │    │
│  └─────────┘                                  └─────────┘    │
│  Left Corner                                  Right Corner   │
└────────────────────────────────────────────────────────────────┘
```

## Widget Details

### Left Widget: Support Tickets (FloatingSupport)

```
┌─────────────────────────────────┐
│ 🎫 Rhiza Support                │
│ ● Ticket System                 │
├─────────────────────────────────┤
│ [New Request] [My Tickets]      │
├─────────────────────────────────┤
│                                 │
│ Choose Subject:                 │
│ ○ General Inquiry               │
│ ○ Wallet & Security             │
│ ○ Transactions                  │
│ ○ Technical Issue               │
│ ○ RZC Utility                   │
│                                 │
│ Your Message:                   │
│ ┌─────────────────────────────┐ │
│ │                             │ │
│ │ [Type your message here...] │ │
│ │                             │ │
│ └─────────────────────────────┘ │
│                                 │
│      [Send Request]             │
│                                 │
│ Response time: < 2 hours        │
└─────────────────────────────────┘
```

**Features**:
- ✅ Subject categorization
- ✅ Ticket history tracking
- ✅ Status updates
- ✅ Admin responses
- ✅ Stored in your database

**Best For**:
- Non-urgent issues
- Detailed requests
- Documentation needs
- Account-related questions

### Right Widget: Live Chat (Tawk.to)

```
┌─────────────────────────────────┐
│ 💬 Chat with us                 │
│ ● Online                        │
├─────────────────────────────────┤
│                                 │
│ Agent: Hi! How can I help       │
│        you today?               │
│                                 │
│ You: I need help with my        │
│      wallet activation          │
│                                 │
│ Agent: I'd be happy to help!    │
│        Let me check...          │
│                                 │
│ [Agent is typing...]            │
│                                 │
├─────────────────────────────────┤
│ [Type your message...]    [📎]  │
└─────────────────────────────────┘
```

**Features**:
- ✅ Real-time messaging
- ✅ Instant responses
- ✅ File attachments
- ✅ Typing indicators
- ✅ Chat history
- ✅ Auto user identification

**Best For**:
- Urgent issues
- Quick questions
- Real-time guidance
- Immediate assistance

## Info Banner (First Visit Only)

```
┌──────────────────────────────────────────────────────────────┐
│                                                          [×] │
│  💬 Two Ways to Get Help                                    │
│  Choose the best option for your needs                      │
│                                                              │
│  ┌─────────────────────────┐  ┌─────────────────────────┐  │
│  │ ⚡ Live Chat            │  │ 🕐 Support Tickets      │  │
│  │ Instant responses       │  │ Detailed requests       │  │
│  │ Real-time help          │  │ Track history           │  │
│  │                         │  │                         │  │
│  │ ● Bottom-right corner   │  │ ● Bottom-left corner    │  │
│  └─────────────────────────┘  └─────────────────────────┘  │
│                                                              │
│  💡 Tip: Use live chat for urgent issues                    │
│                                          [Got it]           │
└──────────────────────────────────────────────────────────────┘
```

**Behavior**:
- Shows 3 seconds after page load
- Only appears once per user
- Dismissible
- Stored in localStorage

## Mobile View

### Portrait Mode (Stacked)

```
┌─────────────────────┐
│   Mobile Header     │
├─────────────────────┤
│                     │
│   Main Content      │
│                     │
│                     │
│                     │
│                     │
│                     │
│                     │
│                     │
│                     │
│  ┌────┐             │
│  │ 🎫 │             │
│  └────┘             │
│         ┌────┐      │
│         │ 💬 │      │
│         └────┘      │
└─────────────────────┘
```

### Landscape Mode (Side-by-Side)

```
┌──────────────────────────────────────┐
│         Mobile Header                │
├──────────────────────────────────────┤
│                                      │
│         Main Content                 │
│                                      │
│                                      │
│  ┌────┐                    ┌────┐   │
│  │ 🎫 │                    │ 💬 │   │
│  └────┘                    └────┘   │
└──────────────────────────────────────┘
```

## User Journey Examples

### Example 1: Urgent Transaction Issue

```
User: "My transaction is stuck!"
    ↓
Clicks Live Chat (right) 💬
    ↓
Agent responds in 30 seconds
    ↓
Real-time troubleshooting
    ↓
Issue resolved in 5 minutes
    ↓
User satisfied ✅
```

### Example 2: Account Verification Request

```
User: "Need to verify my account"
    ↓
Clicks Support Tickets (left) 🎫
    ↓
Selects "Wallet & Security"
    ↓
Provides detailed information
    ↓
Submits ticket
    ↓
Receives response in 2 hours
    ↓
Account verified ✅
```

### Example 3: General Question

```
User: "How does RZC staking work?"
    ↓
Can use either widget
    ↓
Live Chat: Quick answer
OR
Ticket: Detailed explanation
    ↓
User informed ✅
```

## Color Coding

### FloatingSupport (Left)
- **Primary Color**: `#00FF88` (Primary green)
- **Accent**: `#00dd77` (Hover state)
- **Background**: White/Dark mode adaptive
- **Icon**: 🎫 Ticket

### Tawk.to (Right)
- **Primary Color**: Configurable in dashboard
- **Default**: Blue/Green
- **Background**: White/Dark mode adaptive
- **Icon**: 💬 Chat bubble

### Info Banner
- **Live Chat Section**: Emerald/Cyan gradient
- **Tickets Section**: Blue/Indigo gradient
- **Background**: White/Dark mode adaptive

## Animations

### FloatingSupport
```css
/* Slide in from bottom-left */
animation: slide-in-from-bottom-4 fade-in 300ms

/* Hover effect */
hover: scale-110

/* Active effect */
active: scale-95
```

### Tawk.to
```css
/* Fade in */
animation: fade-in 500ms

/* Hover effect */
hover: scale-110

/* Pulse notification */
animation: pulse 2s infinite
```

### Info Banner
```css
/* Slide in from top */
animation: slide-in-from-top-4 fade-in 500ms

/* Dismiss animation */
animation: fade-out 300ms
```

## Accessibility

### Keyboard Navigation
- **Tab**: Navigate between widgets
- **Enter**: Open widget
- **Escape**: Close widget
- **Arrow Keys**: Navigate within widget

### Screen Readers
- FloatingSupport: "Support ticket system button"
- Tawk.to: "Live chat button"
- Info Banner: "Support options information"

### Focus States
- Clear focus indicators
- High contrast borders
- Visible on all themes

## Z-Index Hierarchy

```
Layer 10000: Info Banner (top-most)
Layer 9999:  Support Widgets
Layer 9998:  Other modals
Layer 9997:  Overlays
...
Layer 0:     Base content
```

## Responsive Breakpoints

### Desktop (≥1024px)
- Both widgets visible
- Side-by-side positioning
- Full-size chat windows

### Tablet (768px - 1023px)
- Both widgets visible
- Slightly smaller
- Optimized spacing

### Mobile (≤767px)
- Both widgets visible
- Stacked positioning
- Compact size
- Touch-optimized

## Performance

### Load Times
- FloatingSupport: Instant (built-in)
- Tawk.to: ~1-2 seconds (external)
- Info Banner: Instant (built-in)

### Bundle Size Impact
- FloatingSupport: ~15KB
- Tawk.to: ~50KB (external, cached)
- Info Banner: ~5KB

### Network Requests
- FloatingSupport: 0 (uses existing API)
- Tawk.to: 2-3 (script + assets)
- Info Banner: 0 (built-in)

## Testing Scenarios

### Scenario 1: First-Time User
1. User opens dashboard
2. Info banner appears after 3s
3. User reads both options
4. User clicks "Got it"
5. Banner dismissed forever
6. User sees both widgets

### Scenario 2: Returning User
1. User opens dashboard
2. No info banner (already seen)
3. User sees both widgets
4. User chooses based on need

### Scenario 3: Mobile User
1. User opens on mobile
2. Widgets appear at bottom
3. User scrolls down
4. Widgets hide (optional)
5. User scrolls up
6. Widgets reappear

## Customization Quick Reference

### Change Widget Positions
```typescript
// FloatingSupport.tsx
className="fixed bottom-8 left-6"  // Current
className="fixed bottom-8 right-6" // Move to right
className="fixed top-8 left-6"     // Move to top-left
```

### Hide Info Banner
```typescript
// App.tsx
// <SupportOptionsInfo /> // Comment out
```

### Change Colors
```typescript
// FloatingSupport.tsx
bg-primary // Change to your color
text-black // Change text color

// Tawk.to
// Configure in dashboard.tawk.to
```

### Adjust Timing
```typescript
// SupportOptionsInfo.tsx
setTimeout(() => {
  setIsVisible(true);
}, 3000); // Change delay (milliseconds)
```

---

## Quick Tips

💡 **For Users**:
- Use Live Chat for urgent issues
- Use Tickets for detailed requests
- Both are monitored by support team

💡 **For Admins**:
- Check Tawk.to dashboard for live chats
- Check Supabase for tickets
- Respond within 2 hours for tickets
- Respond instantly for live chats

💡 **For Developers**:
- Both widgets are independent
- Easy to remove either one
- Fully customizable
- Mobile-optimized

---

**Visual Guide Version**: 1.0.0  
**Last Updated**: May 2, 2026  
**Status**: ✅ Complete
