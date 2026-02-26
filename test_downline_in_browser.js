/**
 * Test Downline Loading in Browser
 * 
 * Run this on the Referral page to see what's happening
 * 
 * Usage:
 * 1. Navigate to Referral page
 * 2. Open browser console (F12)
 * 3. Paste this entire script
 * 4. Press Enter
 */

(async function testDownlineLoading() {
  console.log('🧪 Testing Downline Loading...\n');
  
  // Check if we're on the Referral page
  if (!window.location.hash.includes('referral')) {
    console.warn('⚠️ Please navigate to the Referral page first!');
    return;
  }
  
  console.log('='.repeat(60));
  console.log('STEP 1: Check Local State');
  console.log('='.repeat(60));
  
  // Try to access React state (may not work)
  const rootElement = document.querySelector('#root');
  console.log('Root element found:', !!rootElement);
  
  console.log('\n');
  console.log('='.repeat(60));
  console.log('STEP 2: Check UI Elements');
  console.log('='.repeat(60));
  
  // Check if downline section exists
  const downlineSection = Array.from(document.querySelectorAll('*')).find(el => 
    el.textContent.includes('DOWNLINE') || el.textContent.includes('Downline')
  );
  console.log('Downline section found:', !!downlineSection);
  
  // Check member count display
  const memberCountElement = Array.from(document.querySelectorAll('*')).find(el => 
    el.textContent.includes('Members') || el.textContent.includes('Member')
  );
  if (memberCountElement) {
    console.log('Member count text:', memberCountElement.textContent.trim());
  }
  
  // Check for empty state
  const emptyState = Array.from(document.querySelectorAll('*')).find(el => 
    el.textContent.includes('No team members yet')
  );
  console.log('Empty state showing:', !!emptyState);
  
  // Check for loading state
  const loadingSpinner = document.querySelector('[class*="animate-spin"]');
  console.log('Loading spinner:', !!loadingSpinner);
  
  console.log('\n');
  console.log('='.repeat(60));
  console.log('STEP 3: Check Console Logs');
  console.log('='.repeat(60));
  console.log('Look for these logs in the console:');
  console.log('  - "🔄 Loading referral network for user: [ID]"');
  console.log('  - "🔍 Fetching downline for user: [ID]"');
  console.log('  - "📊 Found X referral records"');
  console.log('  - "📊 Found X user records"');
  console.log('  - "✅ Found X downline members"');
  console.log('\nIf you don\'t see these, the function might not be running.');
  
  console.log('\n');
  console.log('='.repeat(60));
  console.log('STEP 4: Trigger Refresh');
  console.log('='.repeat(60));
  
  // Try to find and click the refresh button
  const refreshButton = document.querySelector('button[title="Refresh"]');
  if (refreshButton) {
    console.log('✅ Found refresh button, clicking it...');
    refreshButton.click();
    console.log('⏳ Wait for logs to appear above...');
  } else {
    console.log('❌ Refresh button not found');
    console.log('💡 Try clicking the refresh button manually');
  }
  
  console.log('\n');
  console.log('='.repeat(60));
  console.log('STEP 5: Check Network Requests');
  console.log('='.repeat(60));
  console.log('Open the Network tab and look for:');
  console.log('  - Requests to Supabase');
  console.log('  - POST requests to /rest/v1/rpc/');
  console.log('  - Any failed requests (red)');
  
  console.log('\n');
  console.log('='.repeat(60));
  console.log('WHAT TO LOOK FOR');
  console.log('='.repeat(60));
  console.log('\n1. If you see "📊 Found 1 referral records" but "📊 Found 0 user records":');
  console.log('   → The user_id in referral record doesn\'t match any user');
  console.log('   → Run the SQL query: test_getDownline_query.sql');
  console.log('\n2. If you see "ℹ️ No downline members found":');
  console.log('   → The query is not finding the referral record');
  console.log('   → Check if referrer_id is correct in database');
  console.log('\n3. If you see "✅ Found 1 downline members" but UI shows empty:');
  console.log('   → Data is loading but not displaying');
  console.log('   → Check React state update');
  console.log('\n4. If you see no logs at all:');
  console.log('   → Function is not being called');
  console.log('   → Check if userProfile.id is set');
  
  console.log('\n');
  console.log('='.repeat(60));
  console.log('NEXT STEPS');
  console.log('='.repeat(60));
  console.log('1. Click the refresh button (or it was clicked automatically)');
  console.log('2. Watch the console for the logs mentioned above');
  console.log('3. Share the logs you see');
  console.log('4. If no logs appear, check if you\'re logged in');
  
  console.log('\n✅ Test setup complete. Watch the console for logs...\n');
})();
