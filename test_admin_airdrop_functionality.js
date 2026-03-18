// Test Admin Dashboard Airdrop Functionality
// Run this in the browser console on the admin dashboard page

console.log('🧪 Testing Admin Dashboard Airdrop Functionality');

// Test 1: Check if airdrop tasks tab is visible and clickable
function testAirdropTab() {
  console.log('\n📋 Test 1: Airdrop Tasks Tab');
  
  const airdropTab = document.querySelector('button[onclick*="airdrop-tasks"], button:has(span:contains("Airdrop Tasks"))');
  if (airdropTab) {
    console.log('✅ Airdrop Tasks tab found');
    
    // Click the tab
    airdropTab.click();
    
    setTimeout(() => {
      // Check if content loaded
      const airdropContent = document.querySelector('h3:contains("Manual Verification Queue"), h3:contains("Task Management")');
      if (airdropContent) {
        console.log('✅ Airdrop tab content loaded successfully');
      } else {
        console.log('❌ Airdrop tab content not found');
      }
    }, 500);
  } else {
    console.log('❌ Airdrop Tasks tab not found');
  }
}

// Test 2: Check if stats are displayed
function testAirdropStats() {
  console.log('\n📊 Test 2: Airdrop Statistics');
  
  const statElements = document.querySelectorAll('[class*="text-2xl"][class*="font-black"]');
  const stats = Array.from(statElements).map(el => el.textContent?.trim()).filter(Boolean);
  
  if (stats.length >= 4) {
    console.log('✅ Airdrop statistics found:', stats);
  } else {
    console.log('❌ Airdrop statistics not found or incomplete');
  }
}

// Test 3: Check if manual verification queue is present
function testManualVerificationQueue() {
  console.log('\n🔍 Test 3: Manual Verification Queue');
  
  const queueSection = document.querySelector('h3:contains("Manual Verification Queue")');
  if (queueSection) {
    console.log('✅ Manual Verification Queue section found');
    
    // Check for action buttons
    const approveButtons = document.querySelectorAll('button:contains("Approve")');
    const rejectButtons = document.querySelectorAll('button:contains("Reject")');
    
    console.log(`📝 Found ${approveButtons.length} approve buttons and ${rejectButtons.length} reject buttons`);
  } else {
    console.log('❌ Manual Verification Queue section not found');
  }
}

// Test 4: Check if task management section is present
function testTaskManagement() {
  console.log('\n⚙️ Test 4: Task Management');
  
  const taskSection = document.querySelector('h3:contains("Task Management")');
  if (taskSection) {
    console.log('✅ Task Management section found');
    
    // Check for management buttons
    const editButtons = document.querySelectorAll('button:contains("Edit")');
    const enableDisableButtons = document.querySelectorAll('button:contains("Enable"), button:contains("Disable")');
    
    console.log(`🔧 Found ${editButtons.length} edit buttons and ${enableDisableButtons.length} enable/disable buttons`);
  } else {
    console.log('❌ Task Management section not found');
  }
}

// Test 5: Test button functionality (without actually triggering actions)
function testButtonFunctionality() {
  console.log('\n🔘 Test 5: Button Functionality');
  
  // Test export button
  const exportButton = document.querySelector('button:contains("Export")');
  if (exportButton) {
    console.log('✅ Export button found');
  }
  
  // Test analytics button
  const analyticsButton = document.querySelector('button:contains("Analytics")');
  if (analyticsButton) {
    console.log('✅ Analytics button found');
  }
  
  // Test bulk approve button
  const bulkApproveButton = document.querySelector('button:contains("Bulk Approve")');
  if (bulkApproveButton) {
    console.log('✅ Bulk Approve button found');
  }
}

// Run all tests
async function runAllTests() {
  console.log('🚀 Starting Admin Dashboard Airdrop Tests...\n');
  
  // First ensure we're on the airdrop tasks tab
  testAirdropTab();
  
  // Wait a bit for content to load
  setTimeout(() => {
    testAirdropStats();
    testManualVerificationQueue();
    testTaskManagement();
    testButtonFunctionality();
    
    console.log('\n✨ Admin Dashboard Airdrop Tests Complete!');
    console.log('\n📋 Summary:');
    console.log('- Airdrop Tasks tab should be clickable and show content');
    console.log('- Statistics should display current numbers');
    console.log('- Manual verification queue should show pending submissions');
    console.log('- Task management should show task list with controls');
    console.log('- All action buttons should be present and functional');
  }, 1000);
}

// Auto-run tests
runAllTests();

// Export test functions for manual use
window.testAdminAirdrop = {
  runAllTests,
  testAirdropTab,
  testAirdropStats,
  testManualVerificationQueue,
  testTaskManagement,
  testButtonFunctionality
};

console.log('\n💡 You can also run individual tests:');
console.log('- testAdminAirdrop.testAirdropTab()');
console.log('- testAdminAirdrop.testAirdropStats()');
console.log('- testAdminAirdrop.testManualVerificationQueue()');
console.log('- testAdminAirdrop.testTaskManagement()');
console.log('- testAdminAirdrop.testButtonFunctionality()');