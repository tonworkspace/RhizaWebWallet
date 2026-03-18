// Test Task Editing Functionality in Admin Dashboard
// Run this in the browser console on the admin dashboard airdrop tasks tab

console.log('🧪 Testing Task Editing Functionality');

// Test 1: Check if edit buttons are present
function testEditButtons() {
  console.log('\n✏️ Test 1: Edit Buttons');
  
  const editButtons = document.querySelectorAll('button:contains("Edit")');
  console.log(`📝 Found ${editButtons.length} edit buttons`);
  
  if (editButtons.length > 0) {
    console.log('✅ Edit buttons found');
    return true;
  } else {
    console.log('❌ No edit buttons found');
    return false;
  }
}

// Test 2: Test edit button click (simulate)
function testEditButtonClick() {
  console.log('\n🖱️ Test 2: Edit Button Click');
  
  const editButtons = document.querySelectorAll('button:contains("Edit")');
  if (editButtons.length > 0) {
    console.log('🔄 Simulating edit button click...');
    
    // Click the first edit button
    editButtons[0].click();
    
    // Check if modal appears
    setTimeout(() => {
      const modal = document.querySelector('[class*="fixed"][class*="inset-0"]');
      const modalTitle = document.querySelector('h2:contains("Edit Airdrop Task")');
      
      if (modal && modalTitle) {
        console.log('✅ Edit modal opened successfully');
        return true;
      } else {
        console.log('❌ Edit modal did not open');
        return false;
      }
    }, 500);
  } else {
    console.log('❌ No edit buttons to test');
    return false;
  }
}

// Test 3: Check modal form fields
function testModalFormFields() {
  console.log('\n📋 Test 3: Modal Form Fields');
  
  // Wait a bit for modal to be open
  setTimeout(() => {
    const titleInput = document.querySelector('input[placeholder*="task title"]');
    const descriptionTextarea = document.querySelector('textarea[placeholder*="description"]');
    const rewardInput = document.querySelector('input[type="number"]');
    const categorySelect = document.querySelector('select');
    const saveButton = document.querySelector('button:contains("Save Changes")');
    
    const fields = {
      'Title Input': titleInput,
      'Description Textarea': descriptionTextarea,
      'Reward Input': rewardInput,
      'Category Select': categorySelect,
      'Save Button': saveButton
    };
    
    let allFieldsFound = true;
    Object.entries(fields).forEach(([name, element]) => {
      if (element) {
        console.log(`✅ ${name} found`);
      } else {
        console.log(`❌ ${name} not found`);
        allFieldsFound = false;
      }
    });
    
    if (allFieldsFound) {
      console.log('✅ All form fields found');
    } else {
      console.log('❌ Some form fields missing');
    }
    
    return allFieldsFound;
  }, 1000);
}

// Test 4: Test form validation
function testFormValidation() {
  console.log('\n✅ Test 4: Form Validation');
  
  setTimeout(() => {
    // Try to clear title field and save
    const titleInput = document.querySelector('input[placeholder*="task title"]');
    const saveButton = document.querySelector('button:contains("Save Changes")');
    
    if (titleInput && saveButton) {
      console.log('🔄 Testing form validation...');
      
      // Clear title
      titleInput.value = '';
      titleInput.dispatchEvent(new Event('input', { bubbles: true }));
      
      // Try to save
      saveButton.click();
      
      // Check for error message
      setTimeout(() => {
        const errorMessage = document.querySelector('.text-red-500');
        if (errorMessage) {
          console.log('✅ Form validation working - error message displayed');
        } else {
          console.log('❌ Form validation not working - no error message');
        }
      }, 500);
    } else {
      console.log('❌ Cannot test validation - form elements not found');
    }
  }, 1500);
}

// Test 5: Test modal close functionality
function testModalClose() {
  console.log('\n❌ Test 5: Modal Close');
  
  setTimeout(() => {
    const closeButton = document.querySelector('button[class*="hover:bg-slate-200"]');
    const cancelButton = document.querySelector('button:contains("Cancel")');
    
    if (closeButton) {
      console.log('🔄 Testing close button...');
      closeButton.click();
      
      setTimeout(() => {
        const modal = document.querySelector('[class*="fixed"][class*="inset-0"]');
        if (!modal) {
          console.log('✅ Modal closed successfully with X button');
        } else {
          console.log('❌ Modal did not close with X button');
        }
      }, 500);
    } else if (cancelButton) {
      console.log('🔄 Testing cancel button...');
      cancelButton.click();
      
      setTimeout(() => {
        const modal = document.querySelector('[class*="fixed"][class*="inset-0"]');
        if (!modal) {
          console.log('✅ Modal closed successfully with Cancel button');
        } else {
          console.log('❌ Modal did not close with Cancel button');
        }
      }, 500);
    } else {
      console.log('❌ No close buttons found');
    }
  }, 2000);
}

// Test 6: Test task preview
function testTaskPreview() {
  console.log('\n👁️ Test 6: Task Preview');
  
  // First open modal
  const editButtons = document.querySelectorAll('button:contains("Edit")');
  if (editButtons.length > 0) {
    editButtons[0].click();
    
    setTimeout(() => {
      const previewSection = document.querySelector('h4:contains("Preview")');
      if (previewSection) {
        console.log('✅ Task preview section found');
        
        // Test if preview updates when form changes
        const titleInput = document.querySelector('input[placeholder*="task title"]');
        if (titleInput) {
          titleInput.value = 'Test Task Title';
          titleInput.dispatchEvent(new Event('input', { bubbles: true }));
          
          setTimeout(() => {
            const previewTitle = document.querySelector('.text-sm.font-bold.text-slate-900, .text-sm.font-bold.text-white');
            if (previewTitle && previewTitle.textContent.includes('Test Task Title')) {
              console.log('✅ Task preview updates dynamically');
            } else {
              console.log('❌ Task preview does not update dynamically');
            }
          }, 500);
        }
      } else {
        console.log('❌ Task preview section not found');
      }
    }, 1000);
  }
}

// Run all tests
async function runAllTests() {
  console.log('🚀 Starting Task Editing Tests...\n');
  
  // Ensure we're on the airdrop tasks tab
  const airdropTab = document.querySelector('button:has(span:contains("Airdrop Tasks"))');
  if (airdropTab) {
    airdropTab.click();
  }
  
  // Wait for content to load
  setTimeout(() => {
    testEditButtons();
    testEditButtonClick();
    testModalFormFields();
    testFormValidation();
    testModalClose();
    testTaskPreview();
    
    setTimeout(() => {
      console.log('\n✨ Task Editing Tests Complete!');
      console.log('\n📋 Summary:');
      console.log('- Edit buttons should be present on each task');
      console.log('- Clicking edit should open a modal with form fields');
      console.log('- Form should have validation for required fields');
      console.log('- Modal should close with X or Cancel button');
      console.log('- Task preview should update as you type');
      console.log('- Save button should validate and submit changes');
    }, 8000);
  }, 1000);
}

// Auto-run tests
runAllTests();

// Export test functions for manual use
window.testTaskEditing = {
  runAllTests,
  testEditButtons,
  testEditButtonClick,
  testModalFormFields,
  testFormValidation,
  testModalClose,
  testTaskPreview
};

console.log('\n💡 You can also run individual tests:');
console.log('- testTaskEditing.testEditButtons()');
console.log('- testTaskEditing.testEditButtonClick()');
console.log('- testTaskEditing.testModalFormFields()');
console.log('- testTaskEditing.testFormValidation()');
console.log('- testTaskEditing.testModalClose()');
console.log('- testTaskEditing.testTaskPreview()');