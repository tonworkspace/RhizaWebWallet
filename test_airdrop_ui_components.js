// Test Airdrop UI Components
// Run this in browser console to test the airdrop UI integration

console.log('🎨 Testing Airdrop UI Components...');

async function testAirdropUI() {
  try {
    console.log('🔍 Step 1: Checking if airdrop modal is available...');
    
    // Check if global airdrop context exists
    if (typeof useAirdrop !== 'undefined') {
      console.log('✅ useAirdrop hook found');
    } else {
      console.log('⚠️ useAirdrop hook not found - might be in a different scope');
    }
    
    // Check if airdrop trigger buttons exist
    const airdropTriggers = document.querySelectorAll('[data-testid*="airdrop"], .airdrop-trigger, button[class*="airdrop"]');
    console.log(`🎯 Found ${airdropTriggers.length} airdrop trigger elements:`, airdropTriggers);
    
    // Check if airdrop modal exists
    const airdropModal = document.querySelector('[data-testid="airdrop-modal"], .airdrop-modal, [class*="airdrop-modal"]');
    if (airdropModal) {
      console.log('✅ Airdrop modal element found:', airdropModal);
    } else {
      console.log('⚠️ Airdrop modal element not found in DOM');
    }
    
    console.log('🔍 Step 2: Testing airdrop trigger...');
    
    // Try to find and click airdrop trigger
    const triggerButton = document.querySelector('button[class*="airdrop"], [data-testid*="airdrop-trigger"]');
    if (triggerButton) {
      console.log('✅ Found airdrop trigger button:', triggerButton);
      console.log('🖱️ Attempting to click trigger...');
      triggerButton.click();
      
      // Wait a bit and check if modal opened
      setTimeout(() => {
        const openModal = document.querySelector('[data-testid="airdrop-modal"]:not([style*="display: none"]), .airdrop-modal:not([style*="display: none"])');
        if (openModal) {
          console.log('✅ Airdrop modal opened successfully!');
        } else {
          console.log('⚠️ Modal might not have opened or uses different styling');
        }
      }, 500);
    } else {
      console.log('⚠️ No airdrop trigger button found');
      console.log('💡 Try navigating to Dashboard or Landing page');
    }
    
    console.log('🔍 Step 3: Checking airdrop preview on Landing page...');
    
    // Check if we're on landing page and if preview exists
    if (window.location.pathname === '/' || window.location.pathname.includes('landing')) {
      const airdropPreview = document.querySelector('[data-testid="airdrop-preview"], .airdrop-preview');
      if (airdropPreview) {
        console.log('✅ Airdrop preview found on Landing page:', airdropPreview);
      } else {
        console.log('⚠️ Airdrop preview not found on Landing page');
      }
    } else {
      console.log('ℹ️ Not on Landing page, skipping preview check');
    }
    
    console.log('🔍 Step 4: Checking airdrop widget on Dashboard...');
    
    // Check if we're on dashboard and if widget exists
    if (window.location.pathname.includes('dashboard')) {
      const airdropWidget = document.querySelector('[data-testid="airdrop-widget"], .airdrop-widget');
      if (airdropWidget) {
        console.log('✅ Airdrop widget found on Dashboard:', airdropWidget);
      } else {
        console.log('⚠️ Airdrop widget not found on Dashboard');
      }
    } else {
      console.log('ℹ️ Not on Dashboard, skipping widget check');
    }
    
    console.log('🔍 Step 5: Testing task completion UI...');
    
    // Look for task completion buttons
    const taskButtons = document.querySelectorAll('button[class*="task"], button[data-testid*="task"], .task-button');
    console.log(`🎯 Found ${taskButtons.length} task-related buttons:`, taskButtons);
    
    // Look for task status indicators
    const taskStatuses = document.querySelectorAll('.task-status, [data-testid*="task-status"], .completed, .pending');
    console.log(`📊 Found ${taskStatuses.length} task status indicators:`, taskStatuses);
    
    console.log('🔍 Step 6: Checking for airdrop-related text content...');
    
    // Search for airdrop-related text
    const bodyText = document.body.innerText.toLowerCase();
    const airdropKeywords = ['airdrop', 'rzc', 'reward', 'task', 'complete', 'earn'];
    const foundKeywords = airdropKeywords.filter(keyword => bodyText.includes(keyword));
    
    console.log('📝 Found airdrop-related keywords:', foundKeywords);
    
    if (foundKeywords.length > 0) {
      console.log('✅ Airdrop content is present on the page');
    } else {
      console.log('⚠️ No airdrop-related content found on current page');
    }
    
    console.log('🎉 UI component test completed!');
    
  } catch (error) {
    console.error('❌ UI test failed:', error);
  }
}

// Auto-run the UI test
testAirdropUI();

// Make it available for manual running
window.testAirdropUI = testAirdropUI;

console.log(`
🎨 AIRDROP UI TEST

This test checks:
1. ✅ Airdrop modal availability
2. 🎯 Trigger button functionality  
3. 📱 Landing page preview
4. 🏠 Dashboard widget
5. 🎯 Task completion UI
6. 📝 Airdrop content presence

Current page: ${window.location.pathname}

To test different pages:
1. Go to Landing page (/) and run: testAirdropUI()
2. Go to Dashboard (/dashboard) and run: testAirdropUI()

To run again: testAirdropUI()
`);