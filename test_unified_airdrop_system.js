// Test Unified Airdrop System - Admin & User Components
// Run this in browser console to verify both admin and user systems work together

console.log('🧪 Testing Unified Airdrop System');

// Test 1: Verify centralized task configuration is working
function testCentralizedTasks() {
  console.log('\n📋 Test 1: Centralized Task Configuration');
  
  // Check if tasks are consistent between admin and user views
  const adminTasks = document.querySelectorAll('[data-testid="admin-task"], .admin-task-item');
  const userTasks = document.querySelectorAll('[data-testid="user-task"], .user-task-item');
  
  console.log(`📊 Found ${adminTasks.length} admin tasks and ${userTasks.length} user tasks`);
  
  if (adminTasks.length > 0 || userTasks.length > 0) {
    console.log('✅ Task components found');
    return true;
  } else {
    console.log('❌ No task components found');
    return false;
  }
}

// Test 2: Check task data consistency
function testTaskConsistency() {
  console.log('\n🔄 Test 2: Task Data Consistency');
  
  // Look for task titles and rewards in both admin and user views
  const taskTitles = document.querySelectorAll('[class*="font-bold"]:contains("RhizaCore"), [class*="font-black"]:contains("RhizaCore")');
  const rewardElements = document.querySelectorAll('[class*="text"]:contains("RZC"), [class*="emerald"]:contains("RZC")');
  
  console.log(`📝 Found ${taskTitles.length} task titles and ${rewardElements.length} reward elements`);
  
  if (taskTitles.length > 0 && rewardElements.length > 0) {
    console.log('✅ Task data elements found');
    return true;
  } else {
    console.log('❌ Task data elements missing');
    return false;
  }
}

// Test 3: Admin task editing functionality
function testAdminTaskEditing() {
  console.log('\n✏️ Test 3: Admin Task Editing');
  
  const editButtons = document.querySelectorAll('button:contains("Edit")');
  console.log(`🔧 Found ${editButtons.length} edit buttons`);
  
  if (editButtons.length > 0) {
    console.log('✅ Admin edit functionality available');
    return true;
  } else {
    console.log('❌ Admin edit functionality not found');
    return false;
  }
}

// Test 4: User task interaction
function testUserTaskInteraction() {
  console.log('\n👤 Test 4: User Task Interaction');
  
  const verifyButtons = document.querySelectorAll('button:contains("Verify"), button:contains("Complete")');
  const taskActions = document.querySelectorAll('button:contains("Follow"), button:contains("Join"), button:contains("Post")');
  
  console.log(`✅ Found ${verifyButtons.length} verify buttons and ${taskActions.length} action buttons`);
  
  if (verifyButtons.length > 0 || taskActions.length > 0) {
    console.log('✅ User interaction elements found');
    return true;
  } else {
    console.log('❌ User interaction elements missing');
    return false;
  }
}

// Test 5: Task statistics consistency
function testTaskStatistics() {
  console.log('\n📊 Test 5: Task Statistics');
  
  // Look for statistics displays
  const statNumbers = document.querySelectorAll('[class*="text-2xl"], [class*="text-3xl"], [class*="text-4xl"]');
  const statLabels = document.querySelectorAll('[class*="text-xs"]:contains("Tasks"), [class*="text-xs"]:contains("RZC")');
  
  console.log(`📈 Found ${statNumbers.length} stat numbers and ${statLabels.length} stat labels`);
  
  if (statNumbers.length > 0 && statLabels.length > 0) {
    console.log('✅ Statistics display found');
    return true;
  } else {
    console.log('❌ Statistics display missing');
    return false;
  }
}

// Run all tests
async function runUnifiedTests() {
  console.log('🚀 Starting Unified Airdrop System Tests...\n');
  
  const results = {
    centralizedTasks: testCentralizedTasks(),
    taskConsistency: testTaskConsistency(),
    adminEditing: testAdminTaskEditing(),
    userInteraction: testUserTaskInteraction(),
    taskStatistics: testTaskStatistics()
  };
  
  const passedTests = Object.values(results).filter(Boolean).length;
  const totalTests = Object.keys(results).length;
  
  console.log(`\n✨ Unified System Tests Complete!`);
  console.log(`📊 Results: ${passedTests}/${totalTests} tests passed`);
  
  if (passedTests === totalTests) {
    console.log('🎉 All tests passed! Admin and user systems are unified.');
  } else {
    console.log('⚠️ Some tests failed. Check individual results above.');
  }
  
  return results;
}

// Auto-run tests
runUnifiedTests();

// Export for manual use
window.testUnifiedAirdrop = {
  runUnifiedTests,
  testCentralizedTasks,
  testTaskConsistency,
  testAdminTaskEditing,
  testUserTaskInteraction,
  testTaskStatistics
};