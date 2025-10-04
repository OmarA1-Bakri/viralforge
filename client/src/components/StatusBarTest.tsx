import { useEffect } from 'react';

/**
 * DIAGNOSTIC TEST COMPONENT
 * Purpose: Isolate and identify why safe-area-top padding isn't working
 */
export default function StatusBarTest() {
  useEffect(() => {
    // Log computed styles for debugging
    setTimeout(() => {
      const testElements = {
        customClass: document.getElementById('test-custom-class'),
        inlineStyle: document.getElementById('test-inline-style'),
        tailwindOnly: document.getElementById('test-tailwind-only'),
        combined: document.getElementById('test-combined'),
      };

      console.log('=== STATUS BAR DIAGNOSTIC TEST ===');
      
      Object.entries(testElements).forEach(([name, element]) => {
        if (element) {
          const styles = window.getComputedStyle(element);
          console.log(`\n${name}:`);
          console.log(`  padding-top: ${styles.paddingTop}`);
          console.log(`  padding-bottom: ${styles.paddingBottom}`);
          console.log(`  position: ${styles.position}`);
          console.log(`  top: ${styles.top}`);
        }
      });

      // Check if CSS variable is set
      const statusBarHeight = getComputedStyle(document.documentElement)
        .getPropertyValue('--status-bar-height');
      console.log(`\n--status-bar-height CSS variable: ${statusBarHeight}`);
    }, 1000);
  }, []);

  return (
    <div className="bg-background min-h-screen">
      <h1 className="p-4 text-xl font-bold">Status Bar Padding Diagnostic Test</h1>
      
      {/* Test 1: Custom CSS class (current approach) */}
      <div 
        id="test-custom-class"
        className="sticky top-0 z-40 bg-red-500/50 border-b border-white px-4 pb-3 safe-area-top"
      >
        <p className="text-white font-bold">Test 1: Custom CSS (.safe-area-top)</p>
        <p className="text-xs text-white">Should have 72px padding-top</p>
      </div>

      {/* Test 2: Inline style */}
      <div 
        id="test-inline-style"
        style={{ paddingTop: '72px' }}
        className="sticky top-0 z-40 bg-blue-500/50 border-b border-white px-4 pb-3 mt-4"
      >
        <p className="text-white font-bold">Test 2: Inline Style</p>
        <p className="text-xs text-white">Should have 72px padding-top (inline)</p>
      </div>

      {/* Test 3: Tailwind utility only */}
      <div 
        id="test-tailwind-only"
        className="sticky top-0 z-40 bg-green-500/50 border-b border-white px-4 pb-3 pt-[72px] mt-4"
      >
        <p className="text-white font-bold">Test 3: Tailwind Arbitrary Value</p>
        <p className="text-xs text-white">Should have 72px padding-top (pt-[72px])</p>
      </div>

      {/* Test 4: Combined approach */}
      <div 
        id="test-combined"
        className="sticky top-0 z-40 bg-yellow-500/50 border-b border-white px-4 pb-3 pt-18 safe-area-top mt-4"
      >
        <p className="text-black font-bold">Test 4: Tailwind pt-18 + safe-area-top</p>
        <p className="text-xs text-black">Should have both Tailwind and custom padding</p>
      </div>

      {/* Scrollable content */}
      <div className="p-4 space-y-4">
        <p className="text-muted-foreground">
          Scroll down to test sticky positioning...
        </p>
        {Array.from({ length: 50 }).map((_, i) => (
          <div key={i} className="p-4 bg-card rounded border border-border">
            <p>Content block {i + 1}</p>
            <p className="text-sm text-muted-foreground">
              The sticky headers above should remain visible with proper padding.
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
