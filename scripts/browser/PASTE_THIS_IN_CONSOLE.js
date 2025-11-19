// COMPREHENSIVE ANDROID APP TEST - PASTE THIS ENTIRE SCRIPT IN CHROME DEVTOOLS CONSOLE

(async function() {
  const results = { passed: [], failed: [], warnings: [] };
  const log = (msg, type = 'info') => console.log(`${type === 'success' ? '✅' : type === 'error' ? '❌' : type === 'warning' ? '⚠️' : 'ℹ️'} ${msg}`);
  const sleep = ms => new Promise(r => setTimeout(r, ms));

  log('🚀 STARTING ANDROID APP TEST SUITE', 'info');

  // Test 1: Login
  log('\n📋 TEST 1: Login Flow', 'info');
  try {
    const username = document.querySelector('input[type="text"]');
    const password = document.querySelector('input[type="password"]');
    const signIn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Sign In'));

    username.value = 'androidtest2';
    username.dispatchEvent(new Event('input', {bubbles: true}));
    password.value = 'Testpass123';
    password.dispatchEvent(new Event('input', {bubbles: true}));
    await sleep(500);
    signIn.click();
    await sleep(2000);

    if (document.body.textContent.includes('Dashboard')) {
      results.passed.push('Login Flow');
      log('PASS: Login - Navigated to dashboard', 'success');
    } else {
      throw new Error('Dashboard not found');
    }
  } catch (e) {
    results.failed.push({test: 'Login', error: e.message});
    log('FAIL: Login - ' + e.message, 'error');
  }

  // Test 2: Quick Actions Visibility
  log('\n📋 TEST 2: Quick Actions Visibility', 'info');
  try {
    const qa = Array.from(document.querySelectorAll('*')).find(el => el.textContent.includes('Quick Actions'));
    if (!qa) throw new Error('Quick Actions not found');

    // Scroll to Quick Actions component
    qa.scrollIntoView({ behavior: 'smooth', block: 'end' });
    await sleep(500); // Wait for scroll to complete

    const rect = qa.getBoundingClientRect();
    const clearance = window.innerHeight - rect.bottom;

    if (clearance >= 48) {
      results.passed.push('Quick Actions Visibility');
      log(`PASS: Quick Actions - Fully visible (${clearance}px clearance)`, 'success');
    } else if (clearance > 0) {
      results.warnings.push({test: 'Quick Actions', msg: `Only ${clearance}px clearance`});
      log(`WARN: Quick Actions - Partially cut off (${clearance}px clearance)`, 'warning');
    } else {
      throw new Error(`Quick Actions cut off (${clearance}px clearance - negative means off-screen)`);
    }
  } catch (e) {
    results.failed.push({test: 'Quick Actions', error: e.message});
    log('FAIL: Quick Actions - ' + e.message, 'error');
  }

  // Test 3: Performance Insights
  log('\n📋 TEST 3: Performance Insights', 'info');
  try {
    const insights = Array.from(document.querySelectorAll('*')).find(el => el.textContent.includes('Performance Insights'));
    if (!insights) throw new Error('Insights section not found');

    await sleep(1000); // Wait for data to load
    const hasData = /\d+%|\d+\s*(views|likes|engagement)/i.test(insights.textContent);

    if (hasData) {
      results.passed.push('Performance Insights');
      log('PASS: Performance Insights - Data loaded', 'success');
    } else {
      throw new Error('No metrics found');
    }
  } catch (e) {
    results.failed.push({test: 'Insights', error: e.message});
    log('FAIL: Performance Insights - ' + e.message, 'error');
  }

  // Test 4: Navigate to Ideas
  log('\n📋 TEST 4: Navigate to Ideas Page', 'info');
  try {
    const ideasBtn = Array.from(document.querySelectorAll('button, a')).find(el =>
      el.textContent.toLowerCase().includes('idea') || el.textContent.toLowerCase().includes('trend')
    );
    if (!ideasBtn) throw new Error('Ideas button not found');

    ideasBtn.click();
    await sleep(1500);

    if (document.body.textContent.includes('Idea Lab') || document.body.textContent.includes('Trending')) {
      results.passed.push('Navigate to Ideas');
      log('PASS: Navigation - Reached Ideas page', 'success');
    } else {
      throw new Error('Ideas page not loaded');
    }
  } catch (e) {
    results.failed.push({test: 'Navigate Ideas', error: e.message});
    log('FAIL: Navigate to Ideas - ' + e.message, 'error');
  }

  // Test 5: Ideas Page Not Black
  log('\n📋 TEST 5: Ideas Page Content', 'info');
  try {
    const bgColor = window.getComputedStyle(document.body).backgroundColor;
    const isBlack = bgColor === 'rgb(0, 0, 0)' && document.body.textContent.trim().length < 50;

    if (isBlack) throw new Error('Black screen detected');

    const trendCount = document.querySelectorAll('[class*="trend"], [class*="card"]').length;
    if (trendCount > 0) {
      results.passed.push('Ideas Page Content');
      log(`PASS: Ideas Page - Showing ${trendCount} trends`, 'success');
    } else if (document.body.textContent.includes('No trends')) {
      results.warnings.push({test: 'Ideas', msg: 'Empty state'});
      log('WARN: Ideas Page - Empty state (no black screen)', 'warning');
    } else {
      results.passed.push('Ideas Page Content');
      log('PASS: Ideas Page - Content visible (not black)', 'success');
    }
  } catch (e) {
    results.failed.push({test: 'Ideas Page', error: e.message});
    log('FAIL: Ideas Page - ' + e.message, 'error');
  }

  // Test 6: Back to Dashboard
  log('\n📋 TEST 6: Navigate Back to Dashboard', 'info');
  try {
    const dashBtn = Array.from(document.querySelectorAll('button, a')).find(el =>
      el.textContent.toLowerCase().includes('dashboard') || el.textContent.toLowerCase().includes('home')
    );
    if (!dashBtn) throw new Error('Dashboard button not found');

    dashBtn.click();
    await sleep(1500);

    if (document.body.textContent.includes('Dashboard') || document.body.textContent.includes('Quick Actions')) {
      results.passed.push('Navigate to Dashboard');
      log('PASS: Navigation - Back to dashboard', 'success');
    } else {
      throw new Error('Dashboard not loaded');
    }
  } catch (e) {
    results.failed.push({test: 'Navigate Dashboard', error: e.message});
    log('FAIL: Navigate to Dashboard - ' + e.message, 'error');
  }

  // Test 7: Activity Items Clickable
  log('\n📋 TEST 7: Activity Items Clickable', 'info');
  try {
    const activity = Array.from(document.querySelectorAll('*')).find(el => el.textContent.includes('Recent Activity'));
    if (!activity) throw new Error('Recent Activity not found');

    const items = activity.querySelectorAll('[class*="cursor-pointer"], [onclick], button');
    if (items.length === 0) throw new Error('No clickable items');

    results.passed.push('Activity Items Clickable');
    log(`PASS: Activity Items - ${items.length} clickable items found`, 'success');
  } catch (e) {
    results.failed.push({test: 'Activity Items', error: e.message});
    log('FAIL: Activity Items - ' + e.message, 'error');
  }

  // Test 8: Check for Errors
  log('\n📋 TEST 8: JavaScript Errors', 'info');
  const errors = document.querySelectorAll('[class*="error"], [class*="destructive"]');
  const visibleErrors = Array.from(errors).filter(el => el.getBoundingClientRect().height > 0);

  if (visibleErrors.length === 0) {
    results.passed.push('No JS Errors');
    log('PASS: No visible error messages', 'success');
  } else {
    results.warnings.push({test: 'Errors', msg: `${visibleErrors.length} error elements`});
    log(`WARN: ${visibleErrors.length} visible error elements`, 'warning');
  }

  // Final Report
  log('\n' + '='.repeat(60), 'info');
  log('📊 TEST SUMMARY', 'info');
  log('='.repeat(60), 'info');
  log(`Total Tests: ${results.passed.length + results.failed.length}`, 'info');
  log(`✅ Passed: ${results.passed.length}`, 'success');
  log(`❌ Failed: ${results.failed.length}`, 'error');
  log(`⚠️  Warnings: ${results.warnings.length}`, 'warning');

  if (results.failed.length > 0) {
    log('\n❌ FAILED TESTS:', 'error');
    results.failed.forEach(f => log(`  - ${f.test}: ${f.error}`, 'error'));
  }

  if (results.warnings.length > 0) {
    log('\n⚠️  WARNINGS:', 'warning');
    results.warnings.forEach(w => log(`  - ${w.test}: ${w.msg}`, 'warning'));
  }

  log('\n✅ PASSED TESTS:', 'success');
  results.passed.forEach(t => log(`  - ${t}`, 'success'));

  log('\n📋 Full results saved to: window.testResults', 'info');
  window.testResults = results;

  log('\n🔍 MANUAL CHECKS REQUIRED:', 'info');
  log('1. Open Network tab → Filter: 10.0.2.2:5000', 'info');
  log('2. Check API requests have: Authorization: Bearer ...', 'info');
  log('3. Verify response status: 200 (not 401/403)', 'info');

  return results;
})();
