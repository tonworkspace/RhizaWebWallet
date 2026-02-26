/**
 * Referral UI Test Script
 * 
 * Run this in the browser console on the Referral page to verify all data is loading correctly
 * 
 * Usage:
 * 1. Navigate to the Referral page
 * 2. Open browser console (F12)
 * 3. Copy and paste this entire script
 * 4. Press Enter
 * 5. Review the output
 */

(function testReferralUI() {
  console.log('🧪 Starting Referral UI Test...\n');
  
  // Test 1: Check if React context is accessible
  console.log('='.repeat(50));
  console.log('TEST 1: React Context Data');
  console.log('='.repeat(50));
  
  try {
    // Try to access React Fiber to get component state
    const rootElement = document.querySelector('#root');
    if (!rootElement) {
      console.error('❌ Root element not found');
      return;
    }
    
    // Get React internal instance
    const reactKey = Object.keys(rootElement).find(key => 
      key.startsWith('__reactContainer') || key.startsWith('__reactFiber')
    );
    
    if (reactKey) {
      console.log('✅ React instance found');
    } else {
      console.warn('⚠️ Could not access React internals directly');
      console.log('ℹ️ This is normal - will check DOM instead');
    }
  } catch (error) {
    console.warn('⚠️ React context check failed:', error.message);
  }
  
  console.log('\n');
  
  // Test 2: Check DOM elements
  console.log('='.repeat(50));
  console.log('TEST 2: DOM Elements');
  console.log('='.repeat(50));
  
  const checks = {
    'Referral Title': document.querySelector('h1'),
    'Rank Badge': document.querySelector('[class*="Crown"]')?.parentElement,
    'RZC Balance': document.querySelectorAll('[class*="text-3xl"]')[0],
    'Total Referrals Stat': document.querySelectorAll('[class*="text-2xl"]')[0],
    'Active Rate Stat': document.querySelectorAll('[class*="text-2xl"]')[1],
    'Level Stat': document.querySelectorAll('[class*="text-2xl"]')[2],
    'Referral Link': document.querySelector('[class*="font-mono"]'),
    'Copy Button': document.querySelector('button:has([class*="Copy"])'),
    'Refresh Button': document.querySelector('button[title="Refresh"]'),
    'Downline Section': document.querySelector('[class*="Downline"]')?.parentElement,
  };
  
  Object.entries(checks).forEach(([name, element]) => {
    if (element) {
      console.log(`✅ ${name}: Found`);
      if (element.textContent && element.textContent.trim()) {
        console.log(`   Content: "${element.textContent.trim().substring(0, 50)}..."`);
      }
    } else {
      console.log(`❌ ${name}: Not found`);
    }
  });
  
  console.log('\n');
  
  // Test 3: Check displayed values
  console.log('='.repeat(50));
  console.log('TEST 3: Displayed Values');
  console.log('='.repeat(50));
  
  const rzcBalance = document.querySelectorAll('[class*="text-3xl"]')[0]?.textContent;
  const totalReferrals = document.querySelectorAll('[class*="text-2xl"]')[0]?.textContent;
  const activeRate = document.querySelectorAll('[class*="text-2xl"]')[1]?.textContent;
  const level = document.querySelectorAll('[class*="text-2xl"]')[2]?.textContent;
  const referralLink = document.querySelector('[class*="font-mono"]')?.textContent;
  const rankBadge = document.querySelector('[class*="Crown"]')?.parentElement?.textContent;
  
  console.log('RZC Balance:', rzcBalance || 'Not found');
  console.log('Total Referrals:', totalReferrals || 'Not found');
  console.log('Active Rate:', activeRate || 'Not found');
  console.log('Level:', level || 'Not found');
  console.log('Rank:', rankBadge || 'Not found');
  console.log('Referral Link:', referralLink || 'Not found');
  
  console.log('\n');
  
  // Test 4: Check for loading states
  console.log('='.repeat(50));
  console.log('TEST 4: Loading States');
  console.log('='.repeat(50));
  
  const loadingSpinner = document.querySelector('[class*="animate-spin"]');
  const loadingText = Array.from(document.querySelectorAll('*')).find(el => 
    el.textContent.includes('Loading') || el.textContent.includes('...')
  );
  
  if (loadingSpinner) {
    console.log('⏳ Loading spinner detected - data is still loading');
  } else {
    console.log('✅ No loading spinner - data should be loaded');
  }
  
  if (loadingText) {
    console.log('⏳ Loading text found:', loadingText.textContent.trim());
  }
  
  console.log('\n');
  
  // Test 5: Check downline members
  console.log('='.repeat(50));
  console.log('TEST 5: Downline Members');
  console.log('='.repeat(50));
  
  const downlineMembers = document.querySelectorAll('[class*="divide-y"] > div');
  console.log(`Found ${downlineMembers.length} downline member elements`);
  
  if (downlineMembers.length > 0) {
    console.log('\nDownline Members:');
    downlineMembers.forEach((member, index) => {
      const name = member.querySelector('[class*="font-bold"]')?.textContent;
      const status = member.querySelector('[class*="Active"], [class*="Inactive"]')?.textContent;
      const balance = Array.from(member.querySelectorAll('*')).find(el => 
        el.textContent.includes('RZC')
      )?.textContent;
      
      console.log(`  ${index + 1}. ${name || 'Unknown'}`);
      console.log(`     Status: ${status || 'Unknown'}`);
      console.log(`     Balance: ${balance || 'Unknown'}`);
    });
  } else {
    const emptyState = document.querySelector('[class*="No team members"]');
    if (emptyState) {
      console.log('ℹ️ Empty state displayed: "No team members yet"');
    } else {
      console.log('⚠️ No downline members or empty state found');
    }
  }
  
  console.log('\n');
  
  // Test 6: Check upline
  console.log('='.repeat(50));
  console.log('TEST 6: Upline (Sponsor)');
  console.log('='.repeat(50));
  
  const uplineSection = Array.from(document.querySelectorAll('*')).find(el => 
    el.textContent.includes('Upline') || el.textContent.includes('Sponsor')
  );
  
  if (uplineSection) {
    console.log('✅ Upline section found');
    const uplineName = uplineSection.querySelector('[class*="font-black"]')?.textContent;
    console.log('   Sponsor:', uplineName || 'Name not found');
  } else {
    console.log('ℹ️ No upline section (user was not referred by anyone)');
  }
  
  console.log('\n');
  
  // Test 7: Check for errors
  console.log('='.repeat(50));
  console.log('TEST 7: Error Messages');
  console.log('='.repeat(50));
  
  const errorElements = document.querySelectorAll('[class*="red"], [class*="error"]');
  if (errorElements.length > 0) {
    console.log(`⚠️ Found ${errorElements.length} potential error elements:`);
    errorElements.forEach(el => {
      if (el.textContent.trim()) {
        console.log(`   - ${el.textContent.trim()}`);
      }
    });
  } else {
    console.log('✅ No error messages displayed');
  }
  
  console.log('\n');
  
  // Test 8: Interaction test
  console.log('='.repeat(50));
  console.log('TEST 8: Interactive Elements');
  console.log('='.repeat(50));
  
  const copyButton = document.querySelector('button:has([class*="Copy"])');
  const refreshButton = document.querySelector('button[title="Refresh"]');
  
  if (copyButton) {
    console.log('✅ Copy button found');
    console.log('   Disabled:', copyButton.disabled);
  } else {
    console.log('❌ Copy button not found');
  }
  
  if (refreshButton) {
    console.log('✅ Refresh button found');
    console.log('   Disabled:', refreshButton.disabled);
  } else {
    console.log('❌ Refresh button not found');
  }
  
  console.log('\n');
  
  // Summary
  console.log('='.repeat(50));
  console.log('TEST SUMMARY');
  console.log('='.repeat(50));
  
  const issues = [];
  
  if (!rzcBalance || rzcBalance.includes('0')) {
    issues.push('⚠️ RZC Balance is 0 or not displayed');
  }
  
  if (!referralLink || referralLink.includes('Loading')) {
    issues.push('⚠️ Referral link not loaded');
  }
  
  if (totalReferrals && totalReferrals !== '0' && downlineMembers.length === 0) {
    issues.push('⚠️ Total referrals shows count but downline is empty');
  }
  
  if (loadingSpinner) {
    issues.push('⏳ Data is still loading');
  }
  
  if (issues.length > 0) {
    console.log('\n⚠️ Issues Found:');
    issues.forEach(issue => console.log(issue));
  } else {
    console.log('\n✅ All tests passed! UI appears to be working correctly.');
  }
  
  console.log('\n');
  console.log('='.repeat(50));
  console.log('NEXT STEPS');
  console.log('='.repeat(50));
  console.log('1. Check browser console for any error messages');
  console.log('2. Look for network errors in Network tab');
  console.log('3. Verify data in Supabase database');
  console.log('4. Run diagnostic SQL queries from diagnose_referral_system.sql');
  console.log('\n');
  
  // Return test results
  return {
    rzcBalance,
    totalReferrals,
    activeRate,
    level,
    referralLink,
    rankBadge,
    downlineCount: downlineMembers.length,
    hasUpline: !!uplineSection,
    issues
  };
})();
