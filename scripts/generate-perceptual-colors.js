/**
 * Generate Perceptually Uniform Color Scales
 *
 * Uses OKLCH color space for perceptually uniform lightness progression.
 * OKLCH is designed so that equal numeric steps produce equal visual steps.
 *
 * Each color category generates 10 shades (50-900) where:
 * - Shade 500 is locked to the brand color
 * - Shades above/below are perceptually uniform steps
 */

import { formatHsl, oklch, converter, clampChroma } from 'culori';

// Color space converters
const toOklch = converter('oklch');
const toHsl = converter('hsl');

/**
 * Clamp HSL values to valid CSS ranges
 */
function clampHsl(hsl) {
  return {
    mode: 'hsl',
    h: ((hsl.h || 0) + 360) % 360, // Normalize hue to 0-360
    s: Math.max(0, Math.min(1, hsl.s || 0)), // Clamp saturation 0-1
    l: Math.max(0, Math.min(1, hsl.l || 0)), // Clamp lightness 0-1
  };
}

/**
 * Parse HSL string "184 88% 62%" to HSL object
 */
function parseHslString(hslStr) {
  const [h, s, l] = hslStr.split(/\s+/).map((v, i) => {
    const num = parseFloat(v.replace('%', ''));
    return i === 0 ? num : num / 100; // Hue in degrees, S/L as decimals
  });
  return { mode: 'hsl', h, s, l };
}

/**
 * Format HSL object back to CSS format "184 88% 62%"
 */
function formatHslString(hsl) {
  const h = Math.round(hsl.h || 0);
  const s = Math.round((hsl.s || 0) * 100);
  const l = Math.round((hsl.l || 0) * 100);
  return `${h} ${s}% ${l}%`;
}

/**
 * Generate perceptually uniform 10-shade scale
 *
 * @param {string} baseHsl - Base color in "H S% L%" format (shade 500)
 * @param {object} options - Configuration options
 * @returns {object} - Object with shade keys (50-900) and HSL values
 */
function generatePerceptualScale(baseHsl, options = {}) {
  const {
    lightnessRange = [0.95, 0.15], // Lightness range in OKLCH (0-1)
    maintainHue = true,             // Keep hue constant across shades
    maintainChroma = true,          // Keep chroma constant (or reduce at extremes)
  } = options;

  // Parse base color and convert to OKLCH
  const baseColor = parseHslString(baseHsl);
  const baseOklch = toOklch(baseColor);

  const shades = {};
  const shadeNumbers = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900];

  shadeNumbers.forEach((shade, index) => {
    if (shade === 500) {
      // Shade 500 is the base - keep it exactly as provided
      shades[shade] = baseHsl;
      return;
    }

    // Calculate perceptually uniform lightness
    // Index 0-9 maps to lightness from light to dark
    const lightnessStep = index / (shadeNumbers.length - 1);
    const [maxL, minL] = lightnessRange;
    const targetLightness = maxL - (lightnessStep * (maxL - minL));

    // Create new color in OKLCH space
    let newOklch = {
      mode: 'oklch',
      l: targetLightness,
      c: baseOklch.c, // Keep chroma (saturation intensity)
      h: baseOklch.h, // Keep hue
    };

    // Optional: Reduce chroma at extreme lightness to avoid neon/muddy colors
    if (!maintainChroma) {
      if (shade <= 100) {
        // Reduce chroma for very light shades
        newOklch.c = baseOklch.c * 0.5;
      } else if (shade >= 800) {
        // Reduce chroma for very dark shades
        newOklch.c = baseOklch.c * 0.7;
      }
    }

    // Clamp chroma to sRGB gamut, then convert to HSL
    const gamutMappedOklch = clampChroma(newOklch, 'oklch');
    const hslColor = toHsl(gamutMappedOklch);

    // Clamp HSL values to valid CSS ranges
    const clampedHsl = clampHsl(hslColor);
    shades[shade] = formatHslString(clampedHsl);
  });

  return shades;
}

/**
 * Generate all color scales for the design system
 */
function generateAllScales() {
  // Current base colors from index.css (shade 500 level)
  const baseColors = {
    primary: '184 88% 62%',   // Cyan
    accent: '321 100% 68%',   // Pink
    gray: '0 0% 45%',         // Neutral gray
    success: '142 69% 55%',   // Green
    warning: '25 95% 65%',    // Orange/Amber
    info: '240 90% 60%',      // Blue
    error: '0 84% 60%',       // Red
  };

  const allScales = {};

  Object.entries(baseColors).forEach(([name, baseHsl]) => {
    console.log(`\n🎨 Generating ${name} scale...`);

    // Special handling for accent (pink) - reduce chroma at extremes
    const options = name === 'accent'
      ? { maintainChroma: false }
      : {};

    allScales[name] = generatePerceptualScale(baseHsl, options);

    // Log the generated scale
    Object.entries(allScales[name]).forEach(([shade, hsl]) => {
      const marker = shade === '500' ? '← BASE' : '';
      console.log(`  ${name}-${shade}: ${hsl} ${marker}`);
    });
  });

  return allScales;
}

/**
 * Format scales for CSS output
 */
function formatForCss(scales) {
  let css = '';

  Object.entries(scales).forEach(([colorName, shades]) => {
    const categoryName = colorName.charAt(0).toUpperCase() + colorName.slice(1);
    css += `\n  /* ${categoryName.toUpperCase()} SCALE - 10 shades (Perceptually Uniform) */\n`;

    Object.entries(shades).forEach(([shade, hsl]) => {
      const comment = shade === '500' ? '  /* Base */' : '';
      css += `  --${colorName}-${shade}: ${hsl};${comment}\n`;
    });
  });

  return css;
}

// Generate and display all scales
console.log('═══════════════════════════════════════════════════════');
console.log('  Perceptual Color Scale Generator (OKLCH-based)');
console.log('═══════════════════════════════════════════════════════');

const scales = generateAllScales();

console.log('\n\n📋 CSS OUTPUT:');
console.log('═══════════════════════════════════════════════════════');
console.log(formatForCss(scales));

console.log('\n✅ Generation complete!');
console.log('Next step: Copy CSS output to index.css (replace linear scales)');
