import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./client/index.html", "./client/src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      borderRadius: {
        lg: ".5625rem", /* 9px */
        md: ".375rem", /* 6px */
        sm: ".1875rem", /* 3px */
      },
      colors: {
        // Flat / base colors (regular buttons)
        background: "hsl(var(--background) / <alpha-value>)",
        foreground: "hsl(var(--foreground) / <alpha-value>)",
        border: "hsl(var(--border) / <alpha-value>)",
        input: "hsl(var(--input) / <alpha-value>)",
        card: {
          DEFAULT: "hsl(var(--card) / <alpha-value>)",
          foreground: "hsl(var(--card-foreground) / <alpha-value>)",
          border: "hsl(var(--card-border) / <alpha-value>)",
        },
        popover: {
          DEFAULT: "hsl(var(--popover) / <alpha-value>)",
          foreground: "hsl(var(--popover-foreground) / <alpha-value>)",
          border: "hsl(var(--popover-border) / <alpha-value>)",
        },
        
        // =============================================================================
        // 10-SHADE COLOR SYSTEM (Colors.md Requirements)
        // =============================================================================
        
        // PRIMARY (Cyan Brand) - 10 shades
        primary: {
          50: "hsl(var(--primary-50) / <alpha-value>)",
          100: "hsl(var(--primary-100) / <alpha-value>)",
          200: "hsl(var(--primary-200) / <alpha-value>)",
          300: "hsl(var(--primary-300) / <alpha-value>)",
          400: "hsl(var(--primary-400) / <alpha-value>)",
          500: "hsl(var(--primary-500) / <alpha-value>)",
          600: "hsl(var(--primary-600) / <alpha-value>)",
          700: "hsl(var(--primary-700) / <alpha-value>)",
          800: "hsl(var(--primary-800) / <alpha-value>)",
          900: "hsl(var(--primary-900) / <alpha-value>)",
          DEFAULT: "hsl(var(--primary) / <alpha-value>)", // Backward compat
          foreground: "hsl(var(--primary-foreground) / <alpha-value>)",
          border: "var(--primary-border)",
        },
        
        // ACCENT (Pink Secondary) - 10 shades
        accent: {
          50: "hsl(var(--accent-50) / <alpha-value>)",
          100: "hsl(var(--accent-100) / <alpha-value>)",
          200: "hsl(var(--accent-200) / <alpha-value>)",
          300: "hsl(var(--accent-300) / <alpha-value>)",
          400: "hsl(var(--accent-400) / <alpha-value>)",
          500: "hsl(var(--accent-500) / <alpha-value>)",
          600: "hsl(var(--accent-600) / <alpha-value>)",
          700: "hsl(var(--accent-700) / <alpha-value>)",
          800: "hsl(var(--accent-800) / <alpha-value>)",
          900: "hsl(var(--accent-900) / <alpha-value>)",
          DEFAULT: "hsl(var(--accent) / <alpha-value>)", // Backward compat
          foreground: "hsl(var(--accent-foreground) / <alpha-value>)",
          border: "var(--accent-border)",
        },
        
        // GRAY/NEUTRAL (60% of interface) - 10 shades
        gray: {
          50: "hsl(var(--gray-50) / <alpha-value>)",
          100: "hsl(var(--gray-100) / <alpha-value>)",
          200: "hsl(var(--gray-200) / <alpha-value>)",
          300: "hsl(var(--gray-300) / <alpha-value>)",
          400: "hsl(var(--gray-400) / <alpha-value>)",
          500: "hsl(var(--gray-500) / <alpha-value>)",
          600: "hsl(var(--gray-600) / <alpha-value>)",
          700: "hsl(var(--gray-700) / <alpha-value>)",
          800: "hsl(var(--gray-800) / <alpha-value>)",
          900: "hsl(var(--gray-900) / <alpha-value>)",
        },
        
        // SEMANTIC COLORS (Status Communication)
        
        // SUCCESS (Green) - 10 shades
        success: {
          50: "hsl(var(--success-50) / <alpha-value>)",
          100: "hsl(var(--success-100) / <alpha-value>)",
          200: "hsl(var(--success-200) / <alpha-value>)",
          300: "hsl(var(--success-300) / <alpha-value>)",
          400: "hsl(var(--success-400) / <alpha-value>)",
          500: "hsl(var(--success-500) / <alpha-value>)",
          600: "hsl(var(--success-600) / <alpha-value>)",
          700: "hsl(var(--success-700) / <alpha-value>)",
          800: "hsl(var(--success-800) / <alpha-value>)",
          900: "hsl(var(--success-900) / <alpha-value>)",
        },
        
        // WARNING (Yellow/Amber) - 10 shades
        warning: {
          50: "hsl(var(--warning-50) / <alpha-value>)",
          100: "hsl(var(--warning-100) / <alpha-value>)",
          200: "hsl(var(--warning-200) / <alpha-value>)",
          300: "hsl(var(--warning-300) / <alpha-value>)",
          400: "hsl(var(--warning-400) / <alpha-value>)",
          500: "hsl(var(--warning-500) / <alpha-value>)",
          600: "hsl(var(--warning-600) / <alpha-value>)",
          700: "hsl(var(--warning-700) / <alpha-value>)",
          800: "hsl(var(--warning-800) / <alpha-value>)",
          900: "hsl(var(--warning-900) / <alpha-value>)",
        },
        
        // INFO (Blue) - 10 shades
        info: {
          50: "hsl(var(--info-50) / <alpha-value>)",
          100: "hsl(var(--info-100) / <alpha-value>)",
          200: "hsl(var(--info-200) / <alpha-value>)",
          300: "hsl(var(--info-300) / <alpha-value>)",
          400: "hsl(var(--info-400) / <alpha-value>)",
          500: "hsl(var(--info-500) / <alpha-value>)",
          600: "hsl(var(--info-600) / <alpha-value>)",
          700: "hsl(var(--info-700) / <alpha-value>)",
          800: "hsl(var(--info-800) / <alpha-value>)",
          900: "hsl(var(--info-900) / <alpha-value>)",
        },
        
        // ERROR (Red) - 10 shades
        error: {
          50: "hsl(var(--error-50) / <alpha-value>)",
          100: "hsl(var(--error-100) / <alpha-value>)",
          200: "hsl(var(--error-200) / <alpha-value>)",
          300: "hsl(var(--error-300) / <alpha-value>)",
          400: "hsl(var(--error-400) / <alpha-value>)",
          500: "hsl(var(--error-500) / <alpha-value>)",
          600: "hsl(var(--error-600) / <alpha-value>)",
          700: "hsl(var(--error-700) / <alpha-value>)",
          800: "hsl(var(--error-800) / <alpha-value>)",
          900: "hsl(var(--error-900) / <alpha-value>)",
        },
        
        // =============================================================================
        // BACKWARD COMPATIBILITY (Legacy Semantic Names)
        // =============================================================================
        
        secondary: {
          DEFAULT: "hsl(var(--secondary) / <alpha-value>)",
          foreground: "hsl(var(--secondary-foreground) / <alpha-value>)",
          border: "var(--secondary-border)",
        },
        muted: {
          DEFAULT: "hsl(var(--muted) / <alpha-value>)",
          foreground: "hsl(var(--muted-foreground) / <alpha-value>)",
          border: "var(--muted-border)",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive) / <alpha-value>)",
          foreground: "hsl(var(--destructive-foreground) / <alpha-value>)",
          border: "var(--destructive-border)",
        },
        ring: "hsl(var(--ring) / <alpha-value>)",
        chart: {
          "1": "hsl(var(--chart-1) / <alpha-value>)",
          "2": "hsl(var(--chart-2) / <alpha-value>)",
          "3": "hsl(var(--chart-3) / <alpha-value>)",
          "4": "hsl(var(--chart-4) / <alpha-value>)",
          "5": "hsl(var(--chart-5) / <alpha-value>)",
        },
        sidebar: {
          ring: "hsl(var(--sidebar-ring) / <alpha-value>)",
          DEFAULT: "hsl(var(--sidebar) / <alpha-value>)",
          foreground: "hsl(var(--sidebar-foreground) / <alpha-value>)",
          border: "hsl(var(--sidebar-border) / <alpha-value>)",
        },
        "sidebar-primary": {
          DEFAULT: "hsl(var(--sidebar-primary) / <alpha-value>)",
          foreground: "hsl(var(--sidebar-primary-foreground) / <alpha-value>)",
          border: "var(--sidebar-primary-border)",
        },
        "sidebar-accent": {
          DEFAULT: "hsl(var(--sidebar-accent) / <alpha-value>)",
          foreground: "hsl(var(--sidebar-accent-foreground) / <alpha-value>)",
          border: "var(--sidebar-accent-border)"
        },
        status: {
          online: "rgb(34 197 94)",
          away: "rgb(245 158 11)",
          busy: "rgb(239 68 68)",
          offline: "rgb(156 163 175)",
        },
      },
      fontFamily: {
        sans: ["Inter", "var(--font-sans)"],
        serif: ["var(--font-serif)"],
        mono: ["JetBrains Mono", "var(--font-mono)"],
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate"), require("@tailwindcss/typography")],
} satisfies Config;
