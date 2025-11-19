# Automated Android App Testing Instructions

## Prerequisites

✅ Android emulator running (emulator-5554)
✅ App deployed and loaded on emulator
✅ Server running on http://localhost:5000
✅ Test user created: `androidtest / Testpass123`

## How to Run Automated Tests

### Step 1: Open Chrome DevTools

1. Open Chrome browser
2. Navigate to: `chrome://inspect`
3. Find "com.viralforge.ai" in the list of WebViews
4. Click **"inspect"** next to it

### Step 2: Load Test Script

In the DevTools Console tab, paste and run:

```javascript
fetch('file:///home/omar/viralforge/scripts/android/android-autotest.js')
  .then(r => r.text())
  .then(eval)
  .catch(err => console.error('Failed to load script:', err));
```

**OR** manually copy-paste the entire contents of `scripts/android/android-autotest.js` into the console.

### Step 3: Tests Auto-Run

The test suite will automatically start in 2 seconds and run all tests:

- ✅ Login Flow
- ✅ Quick Actions Visibility
- ✅ Performance Insights Loading
- ✅ Ideas Page Content (not black screen)
- ✅ Activity Items Clickable
- ✅ All Navigation Buttons
- ✅ JavaScript Error Detection
- ✅ API Call Verification

### Step 4: View Results

Results appear in the console with color-coded output:

- ✅ Green = Passed
- ❌ Red = Failed
- ⚠️  Yellow = Warning
- ℹ️  Blue = Info

Final report is saved to `window.testReport`

To view detailed report:
```javascript
console.table(window.testReport.passed);
console.table(window.testReport.failed);
console.table(window.testReport.warnings);
```

## What Each Test Does

### Test 1: Login Flow
- Fills username: `androidtest`
- Fills password: `Testpass123`
- Clicks "Sign In" button
- Verifies navigation to dashboard
- **Expected**: ✅ Success

### Test 2: Quick Actions Visibility
- Locates "Quick Actions" section
- Measures position relative to viewport
- Checks if fully visible (not cut off by bottom nav)
- **Expected**: ✅ Fully visible with 48px+ clearance

### Test 3: Performance Insights
- Finds "Performance Insights" section
- Checks for loading state
- Verifies data loaded (metrics, percentages)
- **Expected**: ✅ Data loaded with metrics

### Test 4: Navigate to Ideas Page
- Clicks Ideas/Trend navigation button
- Waits for page load
- Verifies navigation successful
- **Expected**: ✅ Successfully navigates

### Test 5: Ideas Page Content
- Checks background is not pure black
- Looks for loading/error/empty states
- Counts trend items displayed
- **Expected**: ✅ Shows content (not black screen)

### Test 6: Navigate to Dashboard
- Clicks Dashboard navigation button
- Verifies return to dashboard
- **Expected**: ✅ Successfully navigates back

### Test 7: Activity Items Clickable
- Finds Recent Activity section
- Locates clickable activity items
- Tests clicking first item
- Detects navigation or URL change
- **Expected**: ✅ Items are clickable with cursor-pointer

### Test 8: All Navigation Buttons
- Finds all nav buttons (header, footer, sidebar)
- Tests each button individually
- Records which buttons work
- **Expected**: ⚠️  Most buttons functional

### Test 9: JavaScript Errors
- Scans DOM for error elements
- Checks console for errors
- **Expected**: ✅ No visible errors

### Test 10: API Auth Headers
- Instructs manual verification in Network tab
- Check for: `Authorization: Bearer <token>`
- **Expected**: ⚠️  Manual verification required

## Manual Verification Steps

After automated tests complete:

### 1. Check Network Tab
- Filter by: `10.0.2.2:5000`
- Verify all API requests have:
  - `Authorization: Bearer ...` header
  - Status: `200` (not 401/403)

### 2. Visual Inspection
- Screenshot Quick Actions - is it fully visible?
- Screenshot Ideas page - is content showing?
- Try clicking activity items - do they work?

### 3. Edge Cases
- Try scrolling pages
- Try different screen orientations
- Try rapid navigation between pages

## Troubleshooting

### If DevTools Won't Connect
```bash
adb forward tcp:9222 localabstract:chrome_devtools_remote
```
Then refresh `chrome://inspect`

### If Script Fails to Load
Manually copy-paste the script contents from `scripts/android/android-autotest.js`

### If Tests Don't Auto-Run
Manually run:
```javascript
runAllTests()
```

### If Login Fails
Check credentials in script match test user:
```javascript
TEST_CONFIG.credentials = {
  username: 'androidtest',
  password: 'Testpass123'
};
```

## Expected Output

```
ℹ️  [13:45:01] Test script loaded! Starting tests in 2 seconds...
ℹ️  [13:45:03] Starting Login Flow Test...
✅ [13:45:05] PASS: Login Flow - Successfully logged in and navigated to dashboard
ℹ️  [13:45:05] Testing Quick Actions Visibility...
✅ [13:45:06] PASS: Quick Actions Visibility - Fully visible - bottom at 850px, viewport 1920px, clearance 1070px
ℹ️  [13:45:06] Testing Performance Insights...
✅ [13:45:07] PASS: Performance Insights - Data loaded successfully with metrics
...
📊 TEST SUMMARY:
   Total Tests: 10
   ✅ Passed: 8
   ❌ Failed: 0
   ⚠️  Warnings: 2
   ⏱️  Duration: 15.3s
```

## Saving Results

To save test results to file:
```javascript
copy(JSON.stringify(window.testReport, null, 2));
```
Then paste into a text file.

Or download via console:
```javascript
const blob = new Blob([JSON.stringify(window.testReport, null, 2)], {type: 'application/json'});
const url = URL.createObjectURL(blob);
const a = document.createElement('a');
a.href = url;
a.download = 'android-test-results.json';
a.click();
```

## Next Steps After Testing

Based on test results:
- ✅ All passed → Deploy to production
- ❌ Any failed → Fix issues and re-test
- ⚠️  Warnings → Investigate and document

---

**Test Credentials**: `androidtest / Testpass123`
**Server**: http://localhost:5000
**Emulator**: emulator-5554
**DevTools**: chrome://inspect
