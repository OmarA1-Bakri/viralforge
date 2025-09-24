# CreatorKit AI Design Guidelines

## Design Approach
**Reference-Based Approach**: Drawing inspiration from TikTok's addictive vertical feed UI, Linear's clean productivity interface, and Notion's intuitive mobile experience. The app should feel like a native mobile utility that creators can't live without.

## Core Design Principles
- **Mobile-First**: Every interaction optimized for thumb navigation
- **Automation-Focused**: UI should fade into background while AI works
- **Creator-Centric**: Interface that understands the creator mindset and workflow

## Color Palette

### ACTUAL IMPLEMENTED COLORS (from index.css)

**Light Mode:**
- Background: 0 0% 98% (Clean white)
- Card: 0 0% 95% (Subtle gray surface)
- Primary: 280 100% 70% (Vibrant purple)
- Text: 0 0% 10% (Near black)
- Border: 0 0% 88% (Light gray borders)

**Dark Mode:**
- Background: 0 0% 3% (Deep black)
- Card: 0 0% 8% (Dark charcoal surface) 
- Primary: 180 100% 50% (Bright cyan/turquoise)
- Text: 0 0% 98% (Near white)
- Border: 17 8% 15% (Dark gray borders)

### Accent Colors
- Success: 142 69% 45% (Growth green)
- Warning: 25 85% 55% (Trend orange)
- AI Active: 280 60% 75% (Soft purple glow)

### Gradients
- Hero backgrounds: Purple to deep blue gradients (280 100% 65% to 240 80% 40%)
- Card overlays: Subtle purple fade for automation status indicators

## Typography (Implemented)
- **Primary**: Open Sans - Clean, modern readability (from index.css --font-sans)
- **Monospace**: Menlo - For technical data and processing states (from index.css --font-mono)
- **Sizes**: text-sm, text-base, text-lg, text-xl for mobile hierarchy

## Layout System
**Tailwind Spacing**: Consistently use units of 2, 4, 6, and 8
- Micro spacing: p-2, gap-2
- Standard spacing: p-4, m-4, gap-4
- Section spacing: p-6, mb-6
- Major spacing: p-8, mt-8

## Component Library

### Navigation
- **Bottom Tab Bar**: Three distinct icons for Idea Lab, Launch Pad, Multiplier
- **Floating Action Button**: For quick actions like "New Idea" or "Process Video"

### Core Components
- **Trend Cards**: TikTok-style vertical swipeable cards with automation status indicators
- **Processing States**: Animated progress indicators showing AI work in background
- **Smart Notifications**: Inline alerts when AI discovers relevant trends
- **Quick Actions**: One-tap buttons for "Save Idea," "Remix," "Process Video"

### Data Displays
- **AI Scores**: Large, colorful score displays with visual progress rings
- **Processing Queue**: Minimal list showing background automation tasks
- **Trend Indicators**: Small badges showing "Hot," "Rising," "Relevant to You"

### Forms
- **URL Input**: Large, prominent paste field for YouTube links
- **Profile Setup**: Simple niche and tone-of-voice selection during onboarding
- **Quick Settings**: Minimal preference toggles for AI automation behavior

## Images
**No Large Hero Image**: This is a utility app focused on automation efficiency rather than marketing appeal. Instead use:
- **AI Processing Animations**: Subtle, ambient animations showing AI working
- **Trend Preview Thumbnails**: Small preview images in idea cards
- **Video Clip Previews**: Generated thumbnail previews of processed clips
- **Background Patterns**: Subtle geometric patterns suggesting AI/automation

## Animations
**Minimal and Purposeful**:
- Loading states for AI processing
- Smooth card transitions in vertical feed
- Subtle glow effects when AI completes tasks
- Progress indicators for background automation

## Mobile-Specific Considerations
- **Thumb-Friendly**: All primary actions within easy thumb reach
- **Swipe Gestures**: Natural swipe patterns for browsing ideas and clips
- **Haptic Feedback**: Subtle vibrations when AI completes tasks
- **Battery Conscious**: Dark mode by default to preserve battery during heavy AI usage