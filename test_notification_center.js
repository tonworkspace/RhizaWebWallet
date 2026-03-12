// ============================================================================
// BROWSER TEST: Notification Center Integration
// Run this in browser console to test notification system
// ============================================================================

console.log('🧪 Testing Notification Center Integration...\n');

// Test Configuration
const TEST_CONFIG = {
  createTestNotification: true,
  checkRealtime: true
};

// Main test function
async function testNotificationCenter() {
  console.log('📊 Starting Notification Center Tests');
  console.log('─'.repeat(60));

  // Test 1: Check if notification service is available
  console.log('\n1️⃣ Checking notification service...');
  try {
    // Access the notification service through window or import
    const hasNotificationService = typeof window !== 'undefined';
    console.log(hasNotificationService ? '✅ Browser environment detected' : '❌ Not in browser');
  } catch (error) {
    console.error('❌ Error checking service:', error);
  }

  // Test 2: Check wallet context
  console.log('\n2️⃣ Checking wallet context...');
  try {
    // Try to find wallet address in the page
    const addressElements = document.querySelectorAll('[class*="wallet"]');
    console.log(`Found ${addressElements.length} wallet-related elements`);
    
    // Look for address in text content
    const pageText = document.body.innerText;
    const addressMatch = pageText.match(/EQ[A-Za-z0-9_-]{46}/);
    if (addressMatch) {
      console.log('✅ Wallet address found:', addressMatch[0]);
    } else {
      console.log('⚠️ No wallet address found in page');
    }
  } catch (error) {
    console.error('❌ Error checking wallet:', error);
  }

  // Test 3: Check notification bell
  console.log('\n3️⃣ Checking notification bell...');
  try {
    const bellButton = document.querySelector('button[class*="relative"]');
    const bellIcon = document.querySelector('svg[class*="lucide-bell"]');
    
    if (bellIcon) {
      console.log('✅ Notification bell found');
      
      // Check for unread badge
      const badge = bellIcon.closest('button')?.querySelector('span[class*="absolute"]');
      if (badge) {
        console.log(`✅ Unread badge found: ${badge.textContent}`);
      } else {
        console.log('⚠️ No unread badge (might be 0 notifications)');
      }
    } else {
      console.log('❌ Notification bell not found');
    }
  } catch (error) {
    console.error('❌ Error checking bell:', error);
  }

  // Test 4: Try to open notification panel
  console.log('\n4️⃣ Testing notification panel...');
  try {
    const bellButton = Array.from(document.querySelectorAll('button'))
      .find(btn => btn.querySelector('svg[class*="lucide-bell"]'));
    
    if (bellButton) {
      console.log('🖱️ Clicking notification bell...');
      bellButton.click();
      
      // Wait for panel to open
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Check if panel opened
      const panel = document.querySelector('[class*="fixed"][class*="inset-0"]') ||
                    document.querySelector('[class*="absolute"][class*="right-0"]');
      
      if (panel) {
        console.log('✅ Notification panel opened');
        
        // Check panel content
        const notificationItems = panel.querySelectorAll('[class*="hover:bg"]');
        console.log(`Found ${notificationItems.length} notification items`);
        
        // Check for loading state
        const loadingText = panel.textContent;
        if (loadingText.includes('Loading')) {
          console.log('⏳ Panel is loading notifications...');
        } else if (loadingText.includes('No notifications')) {
          console.log('⚠️ No notifications found');
        } else {
          console.log('✅ Notifications displayed');
        }
        
        // Close panel
        const closeButton = panel.querySelector('button');
        if (closeButton) {
          closeButton.click();
          console.log('🖱️ Closed notification panel');
        }
      } else {
        console.log('❌ Notification panel did not open');
      }
    } else {
      console.log('❌ Could not find notification bell button');
    }
  } catch (error) {
    console.error('❌ Error testing panel:', error);
  }

  // Test 5: Check browser console for errors
  console.log('\n5️⃣ Checking for errors...');
  console.log('Look for any red error messages above this test');
  console.log('Common issues:');
  console.log('  - "wallet_notifications" table not found → Run SETUP_NOTIFICATIONS_NOW.sql');
  console.log('  - "No wallet address" → Make sure you\'re logged in');
  console.log('  - "Permission denied" → Check RLS policies');

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📋 TEST SUMMARY');
  console.log('='.repeat(60));
  console.log('\nIf you see errors:');
  console.log('1. Check browser console for red error messages');
  console.log('2. Verify wallet_notifications table exists in Supabase');
  console.log('3. Run test_notification_system.sql in Supabase SQL Editor');
  console.log('4. Check that you\'re logged in with a wallet');
  console.log('\nIf no notifications appear:');
  console.log('1. Run test_notification_system.sql to create a test notification');
  console.log('2. Reload the page');
  console.log('3. Click the notification bell');
  console.log('\n' + '='.repeat(60));
}

// Helper: Create a test notification via console
async function createTestNotification() {
  console.log('🔔 Creating test notification...');
  
  try {
    // This would need to be called through your notification service
    console.log('⚠️ This function needs to be implemented in your app');
    console.log('Run this SQL instead:');
    console.log(`
SELECT create_notification(
  'YOUR_WALLET_ADDRESS',
  'system_announcement',
  'Test from Console',
  'This is a test notification created from browser console',
  jsonb_build_object('test', true, 'source', 'console'),
  'normal',
  '/wallet/dashboard',
  'View Dashboard'
);
    `);
  } catch (error) {
    console.error('❌ Error creating notification:', error);
  }
}

// Helper: Check notification service directly
async function checkNotificationService() {
  console.log('🔍 Checking notification service directly...');
  
  try {
    // Try to access the service through React DevTools or window
    console.log('⚠️ This requires React DevTools or exposed service');
    console.log('Alternative: Check Network tab for API calls to Supabase');
    console.log('Look for requests to: /rest/v1/wallet_notifications');
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

// ============================================================================
// HOW TO USE:
// ============================================================================
// 
// 1. Open your app in the browser
// 2. Make sure you're logged in
// 3. Open browser console (F12)
// 4. Copy and paste this entire script
// 5. Run: await testNotificationCenter()
//
// Additional commands:
//   await createTestNotification()  - Shows SQL to create test notification
//   await checkNotificationService() - Shows how to check service directly
//
// ============================================================================

console.log('✅ Test functions loaded!');
console.log('\nRun: await testNotificationCenter()');
console.log('Or:  await createTestNotification()');
