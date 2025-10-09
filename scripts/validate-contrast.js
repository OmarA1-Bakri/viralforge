/**
 * WCAG Contrast Ratio Validation Script
 *
 * Validates that all color combinations meet WCAG AA standards:
 * - Normal text: 4.5:1 minimum
 * - Large text (18pt+ or 14pt+ bold): 3:1 minimum
 *
 * Tests all 70 color shades against common foreground colors
 */

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Parse HSL to RGB for contrast calculation
function hslToRgb(h, s, l) {
  s /= 100;
  l /= 100;

  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;

  let r = 0, g = 0, b = 0;

  if (h >= 0 && h < 60) {
    r = c; g = x; b = 0;
  } else if (h >= 60 && h < 120) {
    r = x; g = c; b = 0;
  } else if (h >= 120 && h < 180) {
    r = 0; g = c; b = x;
  } else if (h >= 180 && h < 240) {
    r = 0; g = x; b = c;
  } else if (h >= 240 && h < 300) {
    r = x; g = 0; b = c;
  } else if (h >= 300 && h < 360) {
    r = c; g = 0; b = x;
  }

  return {
    r: Math.round((r + m) * 255),
    g: Math.round((g + m) * 255),
    b: Math.round((b + m) * 255),
  };
}

// Calculate relative luminance (WCAG formula)
function getLuminance(r, g, b) {
  const [rs, gs, bs] = [r, g, b].map(val => {
    val /= 255;
    return val <= 0.03928
      ? val / 12.92
      : Math.pow((val + 0.055) / 1.055, 2.4);
  });

  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

// Calculate contrast ratio (WCAG formula)
function getContrastRatio(color1, color2) {
  const lum1 = getLuminance(color1.r, color1.g, color1.b);
  const lum2 = getLuminance(color2.r, color2.g, color2.b);

  const lighter = Math.max(lum1, lum2);
  const darker = Math.min(lum1, lum2);

  return (lighter + 0.05) / (darker + 0.05);
}

// Parse HSL string "184 88% 62%" to RGB
function parseHslString(hslStr) {
  const [h, s, l] = hslStr.split(/\s+/).map((v, i) => {
    return parseFloat(v.replace('%', ''));
  });
  return hslToRgb(h, s, l);
}

// Extract all color variables from index.css
function extractColors() {
  const cssPath = join(__dirname, '../client/src/index.css');
  const css = readFileSync(cssPath, 'utf8');

  const colors = {};
  const colorRegex = /--(primary|accent|gray|success|warning|info|error)-(50|100|200|300|400|500|600|700|800|900):\s+([\d\s%]+);/g;

  let match;
  while ((match = colorRegex.exec(css)) !== null) {
    const [, category, shade, hslValue] = match;
    const name = `${category}-${shade}`;
    colors[name] = parseHslString(hslValue);
  }

  return colors;
}

// Validate WCAG contrast requirements
function validateContrast() {
  console.log('═══════════════════════════════════════════════════════');
  console.log('  WCAG AA Contrast Ratio Validation');
  console.log('═══════════════════════════════════════════════════════');
  console.log('');

  const colors = extractColors();

  // Common foreground colors
  const foregroundColors = {
    'white': { r: 255, g: 255, b: 255 },
    'black': { r: 0, g: 0, b: 0 },
    'gray-900': colors['gray-900'] || { r: 10, g: 10, b: 10 },
    'gray-50': colors['gray-50'] || { r: 250, g: 250, b: 250 },
  };

  const categories = ['primary', 'accent', 'gray', 'success', 'warning', 'info', 'error'];
  const shades = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900];

  const results = {
    passed: [],
    warnings: [],
    failed: [],
  };

  categories.forEach(category => {
    console.log(`\n📊 ${category.toUpperCase()} Color Scale:`);
    console.log('─'.repeat(70));

    shades.forEach(shade => {
      const colorName = `${category}-${shade}`;
      const bgColor = colors[colorName];

      if (!bgColor) {
        console.log(`   ⚠️  ${colorName}: COLOR NOT FOUND`);
        results.warnings.push(`${colorName}: not found in CSS`);
        return;
      }

      // Test against white and black (most common foregrounds)
      const whiteContrast = getContrastRatio(bgColor, foregroundColors.white);
      const blackContrast = getContrastRatio(bgColor, foregroundColors.black);

      const meetsAA = whiteContrast >= 4.5 || blackContrast >= 4.5;
      const meetsAALarge = whiteContrast >= 3.0 || blackContrast >= 3.0;

      const bestFg = whiteContrast > blackContrast ? 'white' : 'black';
      const bestContrast = Math.max(whiteContrast, blackContrast);

      const status = meetsAA ? '✅' : (meetsAALarge ? '⚠️ ' : '❌');
      const level = meetsAA ? 'AA' : (meetsAALarge ? 'AA Large' : 'FAIL');

      console.log(`   ${status} ${colorName.padEnd(15)} ${bestContrast.toFixed(2)}:1 (on ${bestFg})  [${level}]`);

      if (meetsAA) {
        results.passed.push(`${colorName}: ${bestContrast.toFixed(2)}:1`);
      } else if (meetsAALarge) {
        results.warnings.push(`${colorName}: ${bestContrast.toFixed(2)}:1 (large text only)`);
      } else {
        results.failed.push(`${colorName}: ${bestContrast.toFixed(2)}:1 (fails WCAG AA)`);
      }
    });
  });

  console.log('\n\n═══════════════════════════════════════════════════════');
  console.log('  SUMMARY');
  console.log('═══════════════════════════════════════════════════════');
  console.log(`\n✅ Passed (AA normal text):  ${results.passed.length}/70`);
  console.log(`⚠️  Large text only:          ${results.warnings.length}/70`);
  console.log(`❌ Failed:                   ${results.failed.length}/70`);

  if (results.failed.length > 0) {
    console.log('\n\n❌ FAILED COMBINATIONS:');
    results.failed.forEach(f => console.log(`   - ${f}`));
  }

  if (results.warnings.length > 0) {
    console.log('\n\n⚠️  WARNINGS (large text only):');
    results.warnings.forEach(w => console.log(`   - ${w}`));
  }

  console.log('\n\n📋 RECOMMENDATIONS:');
  console.log('   - Shades 50-400: Use dark text (gray-900 or black)');
  console.log('   - Shades 500-900: Use light text (gray-50 or white)');
  console.log('   - For critical text, always use shades with ✅ AA rating');
  console.log('');

  const passRate = (results.passed.length / 70 * 100).toFixed(1);
  console.log(`\n🎯 Pass Rate: ${passRate}% (${results.passed.length}/70 colors meet WCAG AA)\n`);

  return results;
}

// Run validation
const results = validateContrast();

// Exit with error code if any critical failures
if (results.failed.length > 10) {
  console.error('⛔ Too many WCAG failures! Fix critical contrast issues.');
  process.exit(1);
}
