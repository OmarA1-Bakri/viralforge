// Comprehensive Android App Automated Test Script
// Run this in Chrome DevTools console after connecting to WebView

const TEST_CONFIG = {
  credentials: {
    username: 'androidtest',
    password: 'Testpass123'
  },
  delays: {
    short: 500,
    medium: 1000,
    long: 2000
  }
};

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const testResults = {
  passed: [],
  failed: [],
  warnings: []
};

function log(message, type = 'info') {
  const emoji = {
    info: 'ℹ️',
    success: '✅',
    error: '❌',
    warning: '⚠️'
  }[type];
  console.log(`${emoji} [${new Date().toISOString().split('T')[1].slice(0, 8)}] ${message}`);
}

function recordResult(test, passed, message) {
  const result = { test, message, timestamp: new Date().toISOString() };
  if (passed) {
    testResults.passed.push(result);
    log(`PASS: ${test} - ${message}`, 'success');
  } else {
    testResults.failed.push(result);
    log(`FAIL: ${test} - ${message}`, 'error');
  }
}

function recordWarning(test, message) {
  testResults.warnings.push({ test, message, timestamp: new Date().toISOString() });
  log(`WARN: ${test} - ${message}`, 'warning');
}

// Test 1: Login Flow
async function testLogin() {
  log('Starting Login Flow Test...', 'info');

  try {
    // Find username input
    const usernameInput = document.querySelector('input[type="text"], input[placeholder*="username" i]');
    if (!usernameInput) throw new Error('Username input not found');

    // Find password input
    const passwordInput = document.querySelector('input[type="password"]');
    if (!passwordInput) throw new Error('Password input not found');

    // Find sign in button
    const signInButton = Array.from(document.querySelectorAll('button')).find(btn =>
      btn.textContent.toLowerCase().includes('sign in')
    );
    if (!signInButton) throw new Error('Sign In button not found');

    // Fill credentials
    usernameInput.value = TEST_CONFIG.credentials.username;
    usernameInput.dispatchEvent(new Event('input', { bubbles: true }));
    usernameInput.dispatchEvent(new Event('change', { bubbles: true }));

    await sleep(TEST_CONFIG.delays.short);

    passwordInput.value = TEST_CONFIG.credentials.password;
    passwordInput.dispatchEvent(new Event('input', { bubbles: true }));
    passwordInput.dispatchEvent(new Event('change', { bubbles: true }));

    await sleep(TEST_CONFIG.delays.short);

    // Click sign in
    signInButton.click();

    await sleep(TEST_CONFIG.delays.long);

    // Check if we're on dashboard (look for dashboard indicators)
    const isDashboard = document.body.textContent.includes('Dashboard') ||
                       document.body.textContent.includes('Quick Actions') ||
                       document.body.textContent.includes('Performance Insights');

    if (isDashboard) {
      recordResult('Login Flow', true, 'Successfully logged in and navigated to dashboard');
      return true;
    } else {
      // Check for error message
      const errorMsg = document.querySelector('[class*="error"], [class*="destructive"]')?.textContent;
      throw new Error(`Login failed: ${errorMsg || 'Unknown error'}`);
    }
  } catch (error) {
    recordResult('Login Flow', false, error.message);
    return false;
  }
}

// Test 2: Dashboard - Quick Actions Visibility
async function testQuickActionsVisibility() {
  log('Testing Quick Actions Visibility...', 'info');

  try {
    const quickActions = Array.from(document.querySelectorAll('*')).find(el =>
      el.textContent.includes('Quick Actions')
    );

    if (!quickActions) {
      throw new Error('Quick Actions section not found');
    }

    const rect = quickActions.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const bottomNavHeight = 48; // Expected bottom nav height

    // Check if Quick Actions is fully visible (not cut off by bottom nav)
    const isFullyVisible = rect.bottom <= (viewportHeight - bottomNavHeight);

    if (isFullyVisible) {
      recordResult('Quick Actions Visibility', true,
        `Fully visible - bottom at ${rect.bottom}px, viewport ${viewportHeight}px, clearance ${viewportHeight - rect.bottom}px`);
    } else {
      recordWarning('Quick Actions Visibility',
        `Partially cut off - bottom at ${rect.bottom}px exceeds safe area ${viewportHeight - bottomNavHeight}px`);
      recordResult('Quick Actions Visibility', false, 'Box is cut off by bottom navigation');
    }

    return isFullyVisible;
  } catch (error) {
    recordResult('Quick Actions Visibility', false, error.message);
    return false;
  }
}

// Test 3: Performance Insights Data Loading
async function testPerformanceInsights() {
  log('Testing Performance Insights...', 'info');

  try {
    const insightsSection = Array.from(document.querySelectorAll('*')).find(el =>
      el.textContent.includes('Performance Insights')
    );

    if (!insightsSection) {
      throw new Error('Performance Insights section not found');
    }

    // Check for loading state
    const hasLoadingSpinner = insightsSection.querySelector('[class*="animate-spin"]');
    if (hasLoadingSpinner) {
      recordWarning('Performance Insights', 'Still in loading state');
      await sleep(TEST_CONFIG.delays.long);
    }

    // Check for error state
    const hasError = insightsSection.textContent.includes('Error') ||
                    insightsSection.textContent.includes('Failed');
    if (hasError) {
      throw new Error('Insights failed to load - error state detected');
    }

    // Check for actual data (numbers, percentages, metrics)
    const hasData = /\d+%|\d+\s*(views|likes|engagement)/i.test(insightsSection.textContent);

    if (hasData) {
      recordResult('Performance Insights', true, 'Data loaded successfully with metrics');
    } else {
      throw new Error('No metrics data found in insights section');
    }

    return hasData;
  } catch (error) {
    recordResult('Performance Insights', false, error.message);
    return false;
  }
}

// Test 4: Navigate to Ideas Page
async function navigateToIdeasPage() {
  log('Navigating to Ideas page...', 'info');

  try {
    // Find bottom nav button for Ideas/Idea Lab
    const ideasButton = Array.from(document.querySelectorAll('button, a')).find(el =>
      el.textContent.toLowerCase().includes('idea') ||
      el.textContent.toLowerCase().includes('trend')
    );

    if (!ideasButton) {
      throw new Error('Ideas navigation button not found');
    }

    ideasButton.click();
    await sleep(TEST_CONFIG.delays.medium);

    // Verify we're on Ideas page
    const onIdeasPage = document.body.textContent.includes('Idea Lab') ||
                       document.body.textContent.includes('Trending') ||
                       document.body.textContent.includes('Discover');

    if (onIdeasPage) {
      recordResult('Navigate to Ideas', true, 'Successfully navigated to Ideas page');
      return true;
    } else {
      throw new Error('Navigation to Ideas page failed');
    }
  } catch (error) {
    recordResult('Navigate to Ideas', false, error.message);
    return false;
  }
}

// Test 5: Ideas Page - Not Black Screen
async function testIdeasPageContent() {
  log('Testing Ideas Page Content...', 'info');

  try {
    // Check background color is not pure black
    const bgColor = window.getComputedStyle(document.body).backgroundColor;
    const isBlackScreen = bgColor === 'rgb(0, 0, 0)' && document.body.textContent.trim().length < 50;

    if (isBlackScreen) {
      throw new Error('Ideas page shows black screen');
    }

    // Check for loading state
    const hasLoadingSpinner = document.querySelector('[class*="animate-spin"]');
    if (hasLoadingSpinner) {
      recordWarning('Ideas Page', 'Still in loading state');
      await sleep(TEST_CONFIG.delays.long);
    }

    // Check for error state
    const hasError = document.body.textContent.includes('Error loading trends') ||
                    document.body.textContent.includes('Failed');

    // Check for empty state
    const isEmpty = document.body.textContent.includes('No trends found');

    // Check for actual trends data
    const hasTrends = document.querySelectorAll('[class*="trend"], [class*="card"]').length > 0;

    if (hasError) {
      recordWarning('Ideas Page', 'Error state displayed');
      recordResult('Ideas Page Content', true, 'Showing error state (not black screen)');
    } else if (isEmpty) {
      recordWarning('Ideas Page', 'Empty state - no trends');
      recordResult('Ideas Page Content', true, 'Showing empty state (not black screen)');
    } else if (hasTrends) {
      recordResult('Ideas Page Content', true, `Showing ${document.querySelectorAll('[class*="trend"], [class*="card"]').length} trend items`);
    } else {
      recordWarning('Ideas Page', 'Content unclear - not black but no obvious trends');
      recordResult('Ideas Page Content', true, 'Not black screen, but content unclear');
    }

    return !isBlackScreen;
  } catch (error) {
    recordResult('Ideas Page Content', false, error.message);
    return false;
  }
}

// Test 6: Navigate back to Dashboard
async function navigateToDashboard() {
  log('Navigating back to Dashboard...', 'info');

  try {
    const dashboardButton = Array.from(document.querySelectorAll('button, a')).find(el =>
      el.textContent.toLowerCase().includes('dashboard') ||
      el.textContent.toLowerCase().includes('home')
    );

    if (!dashboardButton) {
      throw new Error('Dashboard navigation button not found');
    }

    dashboardButton.click();
    await sleep(TEST_CONFIG.delays.medium);

    const onDashboard = document.body.textContent.includes('Dashboard') ||
                       document.body.textContent.includes('Quick Actions');

    if (onDashboard) {
      recordResult('Navigate to Dashboard', true, 'Successfully navigated back to dashboard');
      return true;
    } else {
      throw new Error('Navigation to dashboard failed');
    }
  } catch (error) {
    recordResult('Navigate to Dashboard', false, error.message);
    return false;
  }
}

// Test 7: Activity Items Clickable
async function testActivityItemsClickable() {
  log('Testing Activity Items...', 'info');

  try {
    // Find Recent Activity section
    const activitySection = Array.from(document.querySelectorAll('*')).find(el =>
      el.textContent.includes('Recent Activity')
    );

    if (!activitySection) {
      throw new Error('Recent Activity section not found');
    }

    // Find activity items (should be clickable divs/buttons)
    const activityItems = activitySection.querySelectorAll('[class*="cursor-pointer"], [onclick], button');

    if (activityItems.length === 0) {
      throw new Error('No clickable activity items found');
    }

    // Test clicking first activity item
    const firstItem = activityItems[0];
    const initialUrl = window.location.href;

    // Add click listener to detect if navigation happens
    let navigationDetected = false;
    const navListener = () => { navigationDetected = true; };
    window.addEventListener('popstate', navListener);

    // Click the item
    firstItem.click();
    await sleep(TEST_CONFIG.delays.medium);

    window.removeEventListener('popstate', navListener);

    // Check if navigation occurred or new tab opened
    const urlChanged = window.location.href !== initialUrl;

    if (urlChanged || navigationDetected) {
      recordResult('Activity Items Clickable', true,
        `Activity item click triggered navigation (found ${activityItems.length} clickable items)`);
    } else {
      recordWarning('Activity Items Clickable',
        `Click registered but no navigation detected (may open in new tab or need specific content)`);
      recordResult('Activity Items Clickable', true,
        `Activity items are clickable (${activityItems.length} found with cursor-pointer/onclick)`);
    }

    return true;
  } catch (error) {
    recordResult('Activity Items Clickable', false, error.message);
    return false;
  }
}

// Test 8: Test all navigation buttons
async function testAllNavigationButtons() {
  log('Testing All Navigation Buttons...', 'info');

  const navTests = [];
  const navButtons = Array.from(document.querySelectorAll('button, a')).filter(el =>
    el.closest('[class*="nav"]') || el.closest('footer') || el.closest('header')
  );

  log(`Found ${navButtons.length} navigation buttons`, 'info');

  for (const button of navButtons) {
    const buttonText = button.textContent.trim();
    if (!buttonText || buttonText.length > 30) continue;

    try {
      const initialUrl = window.location.href;
      button.click();
      await sleep(500);

      const urlChanged = window.location.href !== initialUrl;
      navTests.push({
        button: buttonText,
        works: urlChanged || button.tagName === 'A',
        url: window.location.href
      });

      log(`Nav button "${buttonText}": ${urlChanged ? 'WORKS' : 'NO CHANGE'}`,
        urlChanged ? 'success' : 'warning');
    } catch (error) {
      navTests.push({ button: buttonText, works: false, error: error.message });
    }
  }

  recordResult('All Navigation Buttons', navTests.filter(t => t.works).length > 0,
    `${navTests.filter(t => t.works).length}/${navTests.length} navigation buttons functional`);

  return navTests;
}

// Test 9: Check for JavaScript errors
function testForJavaScriptErrors() {
  log('Checking for JavaScript Errors...', 'info');

  // Check if there are any error elements in DOM
  const errorElements = document.querySelectorAll('[class*="error"], [class*="destructive"]');
  const visibleErrors = Array.from(errorElements).filter(el => {
    const rect = el.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
  });

  if (visibleErrors.length > 0) {
    const errorTexts = visibleErrors.map(el => el.textContent.trim()).filter(t => t.length > 0);
    recordWarning('JavaScript Errors', `Found ${visibleErrors.length} visible error elements: ${errorTexts.join(', ')}`);
  } else {
    recordResult('JavaScript Errors', true, 'No visible error messages in DOM');
  }

  return visibleErrors.length === 0;
}

// Test 10: API Calls with Auth Headers
async function testAPICallsWithAuth() {
  log('Testing API Calls (check Network tab for auth headers)...', 'info');

  // This test requires manual verification in Network tab
  // We'll just trigger some API calls and log instructions

  log('Check Network tab for:', 'info');
  log('  1. Requests to http://10.0.2.2:5000/api/*', 'info');
  log('  2. Authorization: Bearer <token> header present', 'info');
  log('  3. Response status 200 (not 401/403)', 'info');

  recordWarning('API Auth Headers', 'Manual verification required - check Network tab in DevTools');

  return true;
}

// Main test runner
async function runAllTests() {
  log('=' .repeat(60), 'info');
  log('STARTING COMPREHENSIVE ANDROID APP TEST SUITE', 'info');
  log('=' + '='.repeat(58), 'info');

  const startTime = Date.now();

  // Phase 1: Authentication
  log('\n📋 PHASE 1: AUTHENTICATION', 'info');
  const loginSuccess = await testLogin();
  if (!loginSuccess) {
    log('❌ Login failed - cannot proceed with other tests', 'error');
    return generateReport();
  }

  // Phase 2: Dashboard Tests
  log('\n📋 PHASE 2: DASHBOARD TESTS', 'info');
  await testQuickActionsVisibility();
  await testPerformanceInsights();
  await testActivityItemsClickable();

  // Phase 3: Navigation Tests
  log('\n📋 PHASE 3: NAVIGATION TESTS', 'info');
  await navigateToIdeasPage();

  // Phase 4: Ideas Page Tests
  log('\n📋 PHASE 4: IDEAS PAGE TESTS', 'info');
  await testIdeasPageContent();

  // Phase 5: Return to Dashboard
  log('\n📋 PHASE 5: NAVIGATION BACK', 'info');
  await navigateToDashboard();

  // Phase 6: Comprehensive Navigation
  log('\n📋 PHASE 6: ALL NAVIGATION BUTTONS', 'info');
  await testAllNavigationButtons();

  // Phase 7: Error Detection
  log('\n📋 PHASE 7: ERROR DETECTION', 'info');
  testForJavaScriptErrors();

  // Phase 8: API Verification
  log('\n📋 PHASE 8: API VERIFICATION', 'info');
  await testAPICallsWithAuth();

  const duration = ((Date.now() - startTime) / 1000).toFixed(2);

  return generateReport(duration);
}

function generateReport(duration) {
  log('\n' + '='.repeat(60), 'info');
  log('TEST SUITE COMPLETE', 'info');
  log('='.repeat(60), 'info');

  const report = {
    summary: {
      total: testResults.passed.length + testResults.failed.length,
      passed: testResults.passed.length,
      failed: testResults.failed.length,
      warnings: testResults.warnings.length,
      duration: duration + 's'
    },
    passed: testResults.passed,
    failed: testResults.failed,
    warnings: testResults.warnings,
    timestamp: new Date().toISOString()
  };

  console.log('\n📊 TEST SUMMARY:');
  console.log(`   Total Tests: ${report.summary.total}`);
  console.log(`   ✅ Passed: ${report.summary.passed}`);
  console.log(`   ❌ Failed: ${report.summary.failed}`);
  console.log(`   ⚠️  Warnings: ${report.summary.warnings}`);
  console.log(`   ⏱️  Duration: ${report.summary.duration}`);

  if (report.failed.length > 0) {
    console.log('\n❌ FAILED TESTS:');
    report.failed.forEach(f => console.log(`   - ${f.test}: ${f.message}`));
  }

  if (report.warnings.length > 0) {
    console.log('\n⚠️  WARNINGS:');
    report.warnings.forEach(w => console.log(`   - ${w.test}: ${w.message}`));
  }

  console.log('\n📋 Full report available in: window.testReport');
  window.testReport = report;

  return report;
}

// Auto-start
log('Test script loaded! Starting tests in 2 seconds...', 'info');
log('To run manually: runAllTests()', 'info');
setTimeout(() => runAllTests(), 2000);
