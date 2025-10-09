# Depth System Implementation Specification
**Project**: ViralForge
**Based on**: Shadow.md
**Status**: Pre-Implementation (Critical Blockers Addressed)
**Date**: 2025-10-09

---

## CRITICAL BLOCKER RESOLUTIONS

### ✅ CRITICAL #1: Mobile Performance Budget

**Problem**: Two-layer shadows on every component will cause performance issues on mid-range Android devices.

**Solution**: Shadow Budget System

**Maximum Shadows Visible Simultaneously**: 8 elements
- 1 Modal (if open): `shadow-lg`
- 2 Dropdowns/Popovers (if open): `shadow-md`
- 3 Buttons (visible in viewport): `shadow-sm`
- 2 Cards (elevated state): `shadow-sm`

**Mobile-First Strategy**:
```css
/* Default: Full shadow system for all devices */
.shadow-sm { /* full shadow */ }

/* Performance mode: Disable shadows on low-end devices */
@media (max-width: 767px) and (prefers-reduced-motion: reduce) {
  .shadow-sm:not(.shadow-critical) { box-shadow: none; }
  .shadow-md:not(.shadow-critical) { box-shadow: none; }
  /* Only modals keep shadows (.shadow-critical class) */
}
```

**Performance Constraints**:
- Use `will-change: transform` ONLY on actively animating elements (< 100ms)
- Remove `will-change` after animation completes
- Use `transform: translateZ(0)` for GPU acceleration only on modals/dropdowns
- Static cards/buttons: CPU rendering (no GPU compositing)

**Testing Requirements** (MANDATORY before merge):
- FPS must be ≥ 60fps during scrolling on Pixel 6 (Android mid-range)
- FPS must be ≥ 60fps during scrolling on iPhone 13 (iOS mid-range)
- GPU memory < 100MB during normal use
- No thermal throttling after 5 minutes of use

---

### ✅ CRITICAL #2: Exact Shadow Values (Dark + Light Modes)

**Problem**: No actual shadow CSS values specified.

**Solution**: Complete shadow specification for both themes.

#### Dark Mode Shadows

```css
/* SMALL SHADOW (Subtle depth) */
--shadow-sm-dark:
  inset 0 1px 0 0 rgb(255 255 255 / 0.05),    /* Top highlight */
  0 1px 2px 0 rgb(0 0 0 / 0.3);                /* Bottom shadow */

/* MEDIUM SHADOW (Standard depth) */
--shadow-md-dark:
  inset 0 1px 0 0 rgb(255 255 255 / 0.08),    /* Top highlight */
  0 4px 8px 0 rgb(0 0 0 / 0.4);                /* Bottom shadow */

/* LARGE SHADOW (Prominent depth) */
--shadow-lg-dark:
  inset 0 2px 0 0 rgb(255 255 255 / 0.1),     /* Top highlight */
  0 12px 24px 0 rgb(0 0 0 / 0.5);              /* Bottom shadow */
```

#### Light Mode Shadows

```css
/* SMALL SHADOW (Subtle depth) */
--shadow-sm-light:
  inset 0 1px 0 0 rgb(255 255 255 / 0.9),     /* Stronger top highlight */
  0 1px 2px 0 rgb(0 0 0 / 0.12);               /* Softer bottom shadow */

/* MEDIUM SHADOW (Standard depth) */
--shadow-md-light:
  inset 0 1px 0 0 rgb(255 255 255 / 1),       /* Full white highlight */
  0 4px 8px 0 rgb(0 0 0 / 0.08),               /* Softer shadow */
  0 1px 3px 0 rgb(0 0 0 / 0.06);               /* Additional ambient shadow */

/* LARGE SHADOW (Prominent depth) */
--shadow-lg-light:
  inset 0 2px 0 0 rgb(255 255 255 / 1),       /* Full white highlight */
  0 12px 24px 0 rgb(0 0 0 / 0.1),              /* Softer shadow */
  0 4px 8px 0 rgb(0 0 0 / 0.08);               /* Additional ambient shadow */
```

**Transition Values**:
```css
transition: box-shadow 200ms cubic-bezier(0.4, 0, 0.2, 1);
```

**Shadow Hierarchy Assignments** (corrected):
- **No Shadow**: Cards (static), Background elements
- **Small (sm)**: Buttons (default), Subtle interactive elements
- **Medium (md)**: Buttons (hover/active), Dropdowns, Elevated cards
- **Large (lg)**: Modals, Critical alerts, Tooltips (always), Focused form inputs

---

### ✅ CRITICAL #3: Browser Compatibility (color-mix() Fallbacks)

**Problem**: `color-mix()` doesn't work on Android WebView < v119 or iOS < 16.4.

**Solution**: Use STATIC CSS variables with OKLCH-generated values.

**Decision**: NO `color-mix()` at runtime. All shades generated at build time using existing OKLCH system.

#### Static Layer Variables (Build-Time Generation)

```css
/* Layer 1: Deepest background (PAGE level) */
--layer-1-bg: 0 0% 5.5%;           /* Same as --background */
--layer-1-fg: 0 0% 92%;

/* Layer 2: Medium elevation (CARD level) */
--layer-2-bg: 0 0% 10%;            /* Same as --card */
--layer-2-fg: 0 0% 92%;

/* Layer 3: Light elevation (INTERACTIVE level) */
--layer-3-bg: 0 0% 16%;            /* Lighter than card */
--layer-3-fg: 0 0% 95%;            /* Compensated text */

/* Layer 4: Lightest elevation (ACTIVE/HOVER level) */
--layer-4-bg: 0 0% 22%;            /* Lightest background */
--layer-4-fg: 0 0% 98%;            /* Brightest text */
```

**Light Mode Adaptations**:
```css
@media (prefers-color-scheme: light) {
  --layer-1-bg: var(--gray-50);     /* 93% lightness */
  --layer-1-fg: var(--gray-900);    /* 4% lightness */

  --layer-2-bg: var(--gray-100);    /* 81% lightness */
  --layer-2-fg: var(--gray-900);

  --layer-3-bg: var(--gray-200);    /* 69% lightness */
  --layer-3-fg: var(--gray-900);

  --layer-4-bg: var(--gray-300);    /* 57% lightness */
  --layer-4-fg: var(--gray-900);
}
```

**Browser Support**: Works on ALL browsers (static CSS variables, no runtime computation).

---

### ✅ CRITICAL #4: WCAG Validation Automation

**Problem**: No validation mechanism to ensure layered colors maintain 4.5:1 contrast.

**Solution**: Automated contrast validation script + CI/CD gate.

#### Validation Script: `scripts/validate-depth-contrast.js`

```javascript
/**
 * WCAG Contrast Validation for Depth System Layers
 *
 * Validates that all layer backgrounds maintain ≥4.5:1 contrast
 * with their assigned foreground colors.
 *
 * CRITICAL: Build fails if any combination drops below 4.5:1
 */

import { readFileSync } from 'fs';

// Extract layer colors from index.css
function extractLayerColors() {
  const css = readFileSync('client/src/index.css', 'utf8');
  const layers = {};

  // Extract layer-1 through layer-4 background and foreground
  const regex = /--layer-(\d+)-(bg|fg):\s+([^;]+);/g;
  let match;

  while ((match = regex.exec(css)) !== null) {
    const [, layerNum, type, value] = match;
    const key = `layer-${layerNum}`;
    if (!layers[key]) layers[key] = {};
    layers[key][type] = parseHslString(value);
  }

  return layers;
}

// Calculate WCAG contrast ratio (same as validate-contrast.js)
function getContrastRatio(color1, color2) {
  const lum1 = getLuminance(color1.r, color1.g, color1.b);
  const lum2 = getLuminance(color2.r, color2.g, color2.b);
  const lighter = Math.max(lum1, lum2);
  const darker = Math.min(lum1, lum2);
  return (lighter + 0.05) / (darker + 0.05);
}

// Validate all layer combinations
function validateDepthContrast() {
  const layers = extractLayerColors();
  const failures = [];

  Object.entries(layers).forEach(([layerName, colors]) => {
    const bgColor = colors.bg;
    const fgColor = colors.fg;

    if (!bgColor || !fgColor) {
      failures.push(`${layerName}: Missing bg or fg color`);
      return;
    }

    const ratio = getContrastRatio(bgColor, fgColor);

    if (ratio < 4.5) {
      failures.push(
        `${layerName}: WCAG FAIL - ${ratio.toFixed(2)}:1 ` +
        `(needs ≥4.5:1)`
      );
    } else {
      console.log(`✅ ${layerName}: ${ratio.toFixed(2)}:1 - PASS`);
    }
  });

  if (failures.length > 0) {
    console.error('\n❌ WCAG VALIDATION FAILED:\n');
    failures.forEach(f => console.error(`   ${f}`));
    process.exit(1);
  }

  console.log('\n✅ All layer combinations pass WCAG AA (4.5:1)');
}

validateDepthContrast();
```

#### CI/CD Integration (package.json)

```json
{
  "scripts": {
    "validate:colors": "node scripts/validate-contrast.js",
    "validate:depth": "node scripts/validate-depth-contrast.js",
    "validate:all": "npm run validate:colors && npm run validate:depth",
    "build": "npm run validate:all && vite build"
  }
}
```

**Build Failure**: If ANY layer combination drops below 4.5:1, build fails with error message.

---

## IMPLEMENTATION PHASES

### Phase 1: CSS Foundation (Shadows + Layers)

**File**: `client/src/index.css`

**Add after existing shadow definitions**:

```css
/* =============================================================================
 * DEPTH SYSTEM - Two-Layer Shadows & Color Layering
 * =============================================================================
 * Based on: .claude/Archive/Shadow.md
 * Performance budget: Max 8 shadows visible simultaneously
 * WCAG validated: All layers maintain ≥4.5:1 contrast
 */

:root {
  /* Two-Layer Shadow System - Dark Mode (Default) */
  --shadow-sm:
    inset 0 1px 0 0 rgb(255 255 255 / 0.05),
    0 1px 2px 0 rgb(0 0 0 / 0.3);

  --shadow-md:
    inset 0 1px 0 0 rgb(255 255 255 / 0.08),
    0 4px 8px 0 rgb(0 0 0 / 0.4);

  --shadow-lg:
    inset 0 2px 0 0 rgb(255 255 255 / 0.1),
    0 12px 24px 0 rgb(0 0 0 / 0.5);

  /* Background Layers - Hierarchical Depth */
  --layer-1-bg: 0 0% 5.5%;      /* Deepest (page background) */
  --layer-1-fg: 0 0% 92%;

  --layer-2-bg: 0 0% 10%;       /* Medium (cards) */
  --layer-2-fg: 0 0% 92%;

  --layer-3-bg: 0 0% 16%;       /* Light (interactive elements) */
  --layer-3-fg: 0 0% 95%;

  --layer-4-bg: 0 0% 22%;       /* Lightest (active/hover) */
  --layer-4-fg: 0 0% 98%;

  /* Gradient Shine Presets */
  --gradient-shine-subtle: linear-gradient(
    to bottom,
    hsl(0 0% 11%),
    hsl(0 0% 9%)
  );

  --gradient-shine-medium: linear-gradient(
    to bottom,
    hsl(0 0% 18%),
    hsl(0 0% 14%)
  );
}

/* Light Mode Adaptations */
@media (prefers-color-scheme: light) {
  :root {
    /* Two-Layer Shadow System - Light Mode */
    --shadow-sm:
      inset 0 1px 0 0 rgb(255 255 255 / 0.9),
      0 1px 2px 0 rgb(0 0 0 / 0.12);

    --shadow-md:
      inset 0 1px 0 0 rgb(255 255 255 / 1),
      0 4px 8px 0 rgb(0 0 0 / 0.08),
      0 1px 3px 0 rgb(0 0 0 / 0.06);

    --shadow-lg:
      inset 0 2px 0 0 rgb(255 255 255 / 1),
      0 12px 24px 0 rgb(0 0 0 / 0.1),
      0 4px 8px 0 rgb(0 0 0 / 0.08);

    /* Background Layers - Light Mode */
    --layer-1-bg: var(--gray-50);     /* 93% */
    --layer-1-fg: var(--gray-900);    /* 4% */

    --layer-2-bg: var(--gray-100);    /* 81% */
    --layer-2-fg: var(--gray-900);

    --layer-3-bg: var(--gray-200);    /* 69% */
    --layer-3-fg: var(--gray-900);

    --layer-4-bg: var(--gray-300);    /* 57% */
    --layer-4-fg: var(--gray-900);

    /* Gradient Shine - Light Mode */
    --gradient-shine-subtle: linear-gradient(
      to bottom,
      hsl(0 0% 84%),
      hsl(0 0% 78%)
    );

    --gradient-shine-medium: linear-gradient(
      to bottom,
      hsl(0 0% 74%),
      hsl(0 0% 66%)
    );
  }
}

.dark {
  /* Explicit dark mode (same as :root defaults) */
  --shadow-sm:
    inset 0 1px 0 0 rgb(255 255 255 / 0.05),
    0 1px 2px 0 rgb(0 0 0 / 0.3);

  --shadow-md:
    inset 0 1px 0 0 rgb(255 255 255 / 0.08),
    0 4px 8px 0 rgb(0 0 0 / 0.4);

  --shadow-lg:
    inset 0 2px 0 0 rgb(255 255 255 / 0.1),
    0 12px 24px 0 rgb(0 0 0 / 0.5);
}
```

**Add Tailwind utilities** (at end of file):

```css
@layer utilities {
  /* Shadow Depth Utilities */
  .shadow-sm {
    box-shadow: var(--shadow-sm);
    transition: box-shadow 200ms cubic-bezier(0.4, 0, 0.2, 1);
  }

  .shadow-md {
    box-shadow: var(--shadow-md);
    transition: box-shadow 200ms cubic-bezier(0.4, 0, 0.2, 1);
  }

  .shadow-lg {
    box-shadow: var(--shadow-lg);
    transition: box-shadow 200ms cubic-bezier(0.4, 0, 0.2, 1);
  }

  /* Performance optimization: Disable on low-end devices */
  @media (max-width: 767px) and (prefers-reduced-motion: reduce) {
    .shadow-sm:not(.shadow-critical) { box-shadow: none; }
    .shadow-md:not(.shadow-critical) { box-shadow: none; }
    .shadow-lg.shadow-critical {
      /* Simplified shadow for modals on low-end devices */
      box-shadow: 0 8px 16px 0 rgb(0 0 0 / 0.3);
    }
  }

  /* Background Layer Utilities */
  .bg-layer-1 { background-color: hsl(var(--layer-1-bg)); }
  .bg-layer-2 { background-color: hsl(var(--layer-2-bg)); }
  .bg-layer-3 { background-color: hsl(var(--layer-3-bg)); }
  .bg-layer-4 { background-color: hsl(var(--layer-4-bg)); }

  .text-layer-1 { color: hsl(var(--layer-1-fg)); }
  .text-layer-2 { color: hsl(var(--layer-2-fg)); }
  .text-layer-3 { color: hsl(var(--layer-3-fg)); }
  .text-layer-4 { color: hsl(var(--layer-4-fg)); }

  /* Gradient Shine Utilities */
  .gradient-shine-subtle {
    background: var(--gradient-shine-subtle);
    box-shadow: inset 0 1px 0 rgba(255,255,255,0.2);
  }

  .gradient-shine-medium {
    background: var(--gradient-shine-medium);
    box-shadow:
      inset 0 1px 0 rgba(255,255,255,0.3),
      0 2px 4px rgba(0,0,0,0.1);
  }
}
```

---

## COMPONENT ASSIGNMENTS

| Component | Shadow | Background | Hover State | Active State |
|-----------|--------|------------|-------------|--------------|
| **Page Background** | none | `layer-1` | - | - |
| **Cards (static)** | none | `layer-2` | - | - |
| **Cards (elevated)** | `shadow-sm` | `layer-2` | `shadow-md` | - |
| **Buttons (default)** | `shadow-sm` | `layer-3` | `shadow-md` | `shadow-md` |
| **Buttons (primary)** | `shadow-sm` + `gradient-shine-medium` | primary-500 | `shadow-md` | `shadow-md` |
| **Navigation (base)** | none | `layer-2` | - | - |
| **Navigation (active tab)** | none | `layer-3` + `text-layer-3` | - | - |
| **Dropdowns** | `shadow-md` | `layer-3` | - | - |
| **Modals** | `shadow-lg` + `.shadow-critical` | `layer-3` | - | - |
| **Tables** | none | `layer-1` | - | - |
| **Form Inputs** | `shadow-sm` | `layer-2` | - | `shadow-md` (focus) |

---

## SUCCESS CRITERIA

✅ **Performance**:
- 60fps scrolling on Pixel 6 and iPhone 13
- GPU memory < 100MB
- No thermal throttling after 5min use

✅ **WCAG Compliance**:
- All layer combinations pass automated validation
- 100% AA compliance maintained (4.5:1 contrast)

✅ **Visual Quality**:
- Designer approval on both dark and light modes
- Shadows look crisp (not muddy) in light mode
- Gradients render without banding

✅ **Code Quality**:
- Build passes with automated contrast validation
- Feature flag allows rollback
- Documentation complete in Colors.md

---

**Next Steps**: Implement Phase 1 CSS foundation.
