# Retro Theme Design System Guide

## Overview
This guide explains how to apply the retro card theme consistently across all pages in the application. The theme features bold borders, shadow effects, pattern overlays, and a distinctive retro aesthetic.

---

## 🎨 Design Principles

### Core Visual Elements
1. **Bold Borders**: `border-[0.35em] border-[#050505]` (thick black borders)
2. **Shadow Effects**: `shadow-[0.7em_0.7em_0_#000000]` (offset black shadows)
3. **Pattern Overlays**: Grid and dots that appear on hover
4. **Accent Corners**: Rotated squares in top-right corner
5. **Decorative Elements**: Corner slices, stamps, accent shapes

### Color Scheme

#### Primary Colors
- **Blue** (`#2563eb`): Primary actions, campaigns
- **Green** (`#10b981`): Success states, engagement, active
- **Purple** (`#a855f7`): Projects, secondary actions
- **Gray** (`#6b7280`): Secondary buttons, neutral
- **Red** (`#ef4444`): Errors, destructive actions
- **Orange** (`#f59e0b`): Warnings, pending states

#### Neutral Colors
- **Black** (`#050505`): Borders, text
- **White** (`#ffffff`): Backgrounds
- **Gray Scale**: Various shades for text and backgrounds

---

## 📦 Component Patterns

### 1. Card Container Pattern

```tsx
<div className="group relative w-full max-w-[22em] cursor-pointer">
  {/* Pattern Grid Overlay */}
  <div 
    className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-50 transition-opacity duration-[400ms] z-[1]"
    style={{
      backgroundImage: 'linear-gradient(to right, rgba(0, 0, 0, 0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(0, 0, 0, 0.05) 1px, transparent 1px)',
      backgroundSize: '0.5em 0.5em'
    }}
  />
  
  {/* Dots Overlay */}
  <div 
    className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-[400ms] z-[1]"
    style={{
      backgroundImage: 'radial-gradient(#cfcfcf 1px, transparent 1px)',
      backgroundSize: '1em 1em',
      backgroundPosition: '-0.5em -0.5em'
    }}
  />

  {/* Main Card */}
  <div 
    className="relative bg-white border-[0.35em] border-[#050505] rounded-[0.6em] shadow-[0.7em_0.7em_0_#000000] transition-all duration-[400ms] overflow-hidden origin-center z-[2] group-hover:shadow-[1em_1em_0_#000000] group-hover:-translate-x-[0.4em] group-hover:-translate-y-[0.4em] group-hover:scale-[1.02] active:translate-x-[0.1em] active:translate-y-[0.1em] active:scale-[0.98] active:shadow-[0.5em_0.5em_0_#000000]"
    style={{ boxShadow: 'inset 0 0 0 0.15em rgba(0, 0, 0, 0.05)' }}
  >
    {/* Card content here */}
  </div>
</div>
```

### 2. Title Area Pattern

```tsx
{/* Title Area */}
<div 
  className="relative px-[1.4em] py-[1.4em] text-white font-extrabold flex justify-between items-center border-b-[0.35em] border-[#050505] uppercase tracking-[0.05em] z-[2] overflow-hidden"
  style={{ 
    background: '#2563eb', // Use appropriate color
    backgroundImage: 'repeating-linear-gradient(45deg, rgba(0, 0, 0, 0.1), rgba(0, 0, 0, 0.1) 0.5em, transparent 0.5em, transparent 1em)',
    backgroundBlendMode: 'overlay'
  }}
>
  <span className="flex-1 pr-2 break-words">
    Title Text
  </span>
  <span className="bg-white text-[#050505] text-[0.6em] font-extrabold px-[0.8em] py-[0.4em] border-[0.15em] border-[#050505] rounded-[0.3em] shadow-[0.2em_0.2em_0_#000000] uppercase tracking-[0.1em] rotate-[3deg] transition-all duration-300 group-hover:rotate-[-2deg] group-hover:scale-110 group-hover:shadow-[0.25em_0.25em_0_#000000] flex-shrink-0 ml-2">
    Status Tag
  </span>
</div>
```

### 3. Accent Corner Pattern

```tsx
{/* Accent Corner */}
<div 
  className="absolute -top-[1em] -right-[1em] w-[4em] h-[4em] bg-[#00e0b0] rotate-45 z-[1]"
/>
<div className="absolute top-[0.4em] right-[0.4em] text-[#050505] text-[1.2em] font-bold z-[2]">★</div>
```

### 4. Feature Grid Pattern

```tsx
<div className="grid grid-cols-2 gap-[1em] mb-[1.5em]">
  <div className="flex items-center gap-[0.6em] transition-transform duration-200 hover:translate-x-[0.3em]">
    <div className="w-[1.4em] h-[1.4em] flex items-center justify-center bg-[#4d61ff] border-[0.12em] border-[#050505] rounded-[0.3em] shadow-[0.2em_0.2em_0_rgba(0,0,0,0.2)] transition-all duration-200 hover:bg-[#5e70ff] hover:rotate-[-5deg]">
      <Icon className="w-[0.9em] h-[0.9em] text-white" />
    </div>
    <span className="text-[0.85em] font-semibold text-[#050505]">Feature Text</span>
  </div>
</div>
```

### 5. Button Pattern (ButtonCool)

```tsx
import { ButtonCool } from '@/components/ui/button-cool';

<ButtonCool
  onClick={handleAction}
  text="Button Text"
  bgColor="#2563eb"        // Primary: #2563eb, Secondary: #6b7280, Success: #10b981
  hoverBgColor="#1d4ed8"   // Darker shade of bgColor
  borderColor="#050505"    // Always black
  textColor="#ffffff"      // White for colored backgrounds
  size="sm"                // sm, md, lg
  className="optional-classes"
>
  <Icon className="w-4 h-4" />
</ButtonCool>
```

### 6. Decorative Elements

```tsx
{/* Accent Shape */}
<div className="absolute w-[2.5em] h-[2.5em] bg-[#4d61ff] border-[0.15em] border-[#050505] rounded-[0.3em] rotate-45 -bottom-[1.2em] right-[2em] z-0 transition-transform duration-300 group-hover:rotate-[55deg] group-hover:scale-110" />

{/* Corner Slice */}
<div className="absolute bottom-0 left-0 w-[1.5em] h-[1.5em] bg-white border-r-[0.25em] border-t-[0.25em] border-[#050505] rounded-tl-[0.5em] z-[1]" />

{/* Stamp */}
<div className="absolute bottom-[1.5em] left-[1.5em] w-[4em] h-[4em] flex items-center justify-center border-[0.15em] border-black/30 rounded-full rotate-[-15deg] opacity-20 z-[1]">
  <span className="text-[0.6em] font-extrabold uppercase tracking-[0.05em]">Verified</span>
</div>
```

---

## 🎯 Color Usage by Context

### Campaigns
- **Primary Color**: `#2563eb` (Blue)
- **Accent Corner**: `#00e0b0` (Teal) or `#10b981` (Green)
- **Status Colors**:
  - Active: `#10b981` (Green)
  - Upcoming: `#3b82f6` (Blue)
  - Ended: `#6b7280` (Gray)

### Projects
- **Primary Color**: `#a855f7` (Purple)
- **Accent Corner**: `#ec4899` (Pink)
- **Status Colors**:
  - Active: `#a855f7` (Purple)
  - Inactive: `#6b7280` (Gray)

### Engagement/Claims
- **Primary Color**: `#10b981` (Green)
- **Accent Corner**: `#10b981` (Green)
- **Buttons**: Green for actions, Blue for primary

### Errors/Warnings
- **Error**: `#ef4444` (Red)
- **Warning**: `#f59e0b` (Orange)
- **Success**: `#10b981` (Green)

---

## 📝 Step-by-Step: Converting a Page to Retro Theme

### Step 1: Identify Components to Update
- Cards
- Buttons
- Modals/Dialogs
- Status indicators
- Feature lists

### Step 2: Replace Standard Cards
```tsx
// OLD
<div className="bg-white rounded-lg shadow-md p-4">
  <h3>Title</h3>
  <p>Description</p>
</div>

// NEW - Retro Card
<div className="group relative w-full max-w-[22em]">
  {/* Pattern overlays */}
  <div className="relative bg-white border-[0.35em] border-[#050505] rounded-[0.6em] shadow-[0.7em_0.7em_0_#000000]">
    {/* Card content */}
  </div>
</div>
```

### Step 3: Replace Buttons
```tsx
// OLD
<button className="bg-primary text-white px-4 py-2 rounded">
  Click Me
</button>

// NEW
<ButtonCool
  text="Click Me"
  bgColor="#2563eb"
  hoverBgColor="#1d4ed8"
  borderColor="#050505"
  textColor="#ffffff"
  size="sm"
/>
```

### Step 4: Update Modals
- Add border and shadow to DialogContent
- Add accent corner
- Use ButtonCool for actions
- Add pattern overlays

### Step 5: Update Status Indicators
```tsx
// OLD
<span className="px-2 py-1 bg-green-100 text-green-800 rounded">
  Active
</span>

// NEW
<span className="bg-white text-[#050505] text-[0.6em] font-extrabold px-[0.8em] py-[0.4em] border-[0.15em] border-[#050505] rounded-[0.3em] shadow-[0.2em_0.2em_0_#000000] uppercase tracking-[0.1em] rotate-[3deg]">
  Active
</span>
```

---

## 🔧 Common Patterns

### Dynamic Title Sizing
```tsx
const titleLength = title.length;
const calculateTitleSize = () => {
  const preferredSize = Math.max(0.7, Math.min(1.4, 1.4 - (titleLength - 5) * 0.015));
  return `clamp(0.7em, ${preferredSize}em, 1.4em)`;
};
const titleFontSize = calculateTitleSize();

<span style={{ fontSize: titleFontSize }}>
  {title}
</span>
```

### Icon Boxes
```tsx
<div className="w-[1.4em] h-[1.4em] flex items-center justify-center bg-[#4d61ff] border-[0.12em] border-[#050505] rounded-[0.3em] shadow-[0.2em_0.2em_0_rgba(0,0,0,0.2)] transition-all duration-200 hover:bg-[#5e70ff] hover:rotate-[-5deg]">
  <Icon className="w-[0.9em] h-[0.9em] text-white" />
</div>
```

### Info Boxes
```tsx
<div className="p-3 bg-[#d1fae5] border-[0.15em] border-[#10b981] rounded-[0.4em] shadow-[0.2em_0.2em_0_#000000]">
  <div className="text-sm text-[#065f46] font-semibold">
    Information text
  </div>
</div>
```

---

## 📋 Checklist for Page Updates

- [ ] Replace all standard buttons with ButtonCool
- [ ] Update card containers with retro styling
- [ ] Add pattern overlays (grid + dots)
- [ ] Add accent corners to cards/modals
- [ ] Update title areas with colored headers
- [ ] Replace status badges with retro style
- [ ] Add decorative elements (corner slice, accent shape)
- [ ] Update color scheme to match context
- [ ] Ensure hover effects are consistent
- [ ] Test responsive behavior

---

## 🎨 Color Reference Quick Guide

| Context | Primary | Accent | Status Active | Status Inactive |
|---------|---------|--------|---------------|-----------------|
| Campaigns | `#2563eb` | `#00e0b0` | `#10b981` | `#6b7280` |
| Projects | `#a855f7` | `#ec4899` | `#a855f7` | `#6b7280` |
| Engagement | `#10b981` | `#10b981` | `#10b981` | `#6b7280` |
| Buttons (Primary) | `#2563eb` | - | - | - |
| Buttons (Secondary) | `#6b7280` | - | - | - |
| Errors | `#ef4444` | - | - | - |
| Warnings | `#f59e0b` | - | - | - |

---

## 💡 Tips & Best Practices

1. **Consistency**: Always use the same border width (`0.35em`), shadow offset (`0.7em`), and corner radius (`0.6em`)
2. **Color Context**: Match colors to the content type (blue for campaigns, purple for projects)
3. **Hover States**: Always include hover effects (translate, scale, shadow changes)
4. **Spacing**: Use consistent padding (`1.4em` for headers, `1.5em` for body)
5. **Typography**: Use `font-extrabold` for titles, `font-semibold` for labels
6. **Icons**: Keep icon sizes consistent (`w-[0.9em] h-[0.9em]` in boxes, `w-4 h-4` in buttons)
7. **Z-index**: Use z-index layers: `z-[1]` for overlays, `z-[2]` for content, `z-[3]` for buttons

---

## 📚 Example: Complete Card Component

```tsx
import { ButtonCool } from '@/components/ui/button-cool';
import { Icon } from 'lucide-react';

export const RetroCard = ({ title, description, status, color = '#2563eb' }) => {
  return (
    <div className="group relative w-full max-w-[22em] cursor-pointer">
      {/* Pattern Overlays */}
      <div className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-50 transition-opacity duration-[400ms] z-[1]"
        style={{
          backgroundImage: 'linear-gradient(to right, rgba(0, 0, 0, 0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(0, 0, 0, 0.05) 1px, transparent 1px)',
          backgroundSize: '0.5em 0.5em'
        }}
      />
      
      {/* Main Card */}
      <div className="relative bg-white border-[0.35em] border-[#050505] rounded-[0.6em] shadow-[0.7em_0.7em_0_#000000] transition-all duration-[400ms] overflow-hidden z-[2] group-hover:shadow-[1em_1em_0_#000000] group-hover:-translate-x-[0.4em] group-hover:-translate-y-[0.4em] group-hover:scale-[1.02]"
        style={{ boxShadow: 'inset 0 0 0 0.15em rgba(0, 0, 0, 0.05)' }}
      >
        {/* Accent Corner */}
        <div className="absolute -top-[1em] -right-[1em] w-[4em] h-[4em] bg-[#00e0b0] rotate-45 z-[1]" />
        <div className="absolute top-[0.4em] right-[0.4em] text-[#050505] text-[1.2em] font-bold z-[2]">★</div>

        {/* Title Area */}
        <div className="relative px-[1.4em] py-[1.4em] text-white font-extrabold flex justify-between items-center border-b-[0.35em] border-[#050505] uppercase tracking-[0.05em] z-[2]"
          style={{ 
            background: color,
            backgroundImage: 'repeating-linear-gradient(45deg, rgba(0, 0, 0, 0.1), rgba(0, 0, 0, 0.1) 0.5em, transparent 0.5em, transparent 1em)',
            backgroundBlendMode: 'overlay'
          }}
        >
          <span className="flex-1">{title}</span>
          <span className="bg-white text-[#050505] text-[0.6em] font-extrabold px-[0.8em] py-[0.4em] border-[0.15em] border-[#050505] rounded-[0.3em] shadow-[0.2em_0.2em_0_#000000] uppercase tracking-[0.1em] rotate-[3deg] flex-shrink-0 ml-2">
            {status}
          </span>
        </div>

        {/* Body */}
        <div className="relative px-[1.5em] py-[1.5em] z-[2]">
          <p className="text-[#050505] text-[0.95em] leading-[1.4] font-medium mb-[1.5em]">
            {description}
          </p>
          
          <ButtonCool
            text="View Details"
            bgColor={color}
            hoverBgColor={darkenColor(color, 20)}
            borderColor="#050505"
            textColor="#ffffff"
            size="sm"
          />
        </div>

        {/* Decorative Elements */}
        <div className="absolute w-[2.5em] h-[2.5em] bg-[#4d61ff] border-[0.15em] border-[#050505] rounded-[0.3em] rotate-45 -bottom-[1.2em] right-[2em] z-0" />
        <div className="absolute bottom-0 left-0 w-[1.5em] h-[1.5em] bg-white border-r-[0.25em] border-t-[0.25em] border-[#050505] rounded-tl-[0.5em] z-[1]" />
      </div>
    </div>
  );
};

// Helper to darken colors
const darkenColor = (hex: string, amount: number): string => {
  const color = hex.replace('#', '');
  const num = parseInt(color, 16);
  const r = Math.max(0, Math.min(255, (num >> 16) - amount));
  const g = Math.max(0, Math.min(255, ((num >> 8) & 0x00FF) - amount));
  const b = Math.max(0, Math.min(255, (num & 0x0000FF) - amount));
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
};
```

---

## 🚀 Quick Start Template

Copy this template for new retro-themed components:

```tsx
'use client';

import { ButtonCool } from '@/components/ui/button-cool';

export const YourComponent = () => {
  return (
    <div className="group relative w-full max-w-[22em]">
      {/* Pattern Overlays */}
      <div className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-50 transition-opacity duration-[400ms] z-[1]"
        style={{
          backgroundImage: 'linear-gradient(to right, rgba(0, 0, 0, 0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(0, 0, 0, 0.05) 1px, transparent 1px)',
          backgroundSize: '0.5em 0.5em'
        }}
      />
      
      {/* Main Card */}
      <div className="relative bg-white border-[0.35em] border-[#050505] rounded-[0.6em] shadow-[0.7em_0.7em_0_#000000] transition-all duration-[400ms] overflow-hidden z-[2] group-hover:shadow-[1em_1em_0_#000000] group-hover:-translate-x-[0.4em] group-hover:-translate-y-[0.4em] group-hover:scale-[1.02]"
        style={{ boxShadow: 'inset 0 0 0 0.15em rgba(0, 0, 0, 0.05)' }}
      >
        {/* Your content here */}
      </div>
    </div>
  );
};
```

---

## 📖 Reference Files

- **Card Examples**: 
  - `src/components/cards/CampaignCard.tsx`
  - `src/components/cards/ProjectCard.tsx`
  - `src/components/cards/EngagementRewardsCard.tsx`

- **Button Component**: 
  - `src/components/ui/button-cool.tsx`

- **Modal Example**: 
  - `src/components/modals/ClaimModal.tsx`

---

## ✅ Testing Checklist

After applying the theme:
- [ ] Hover effects work correctly
- [ ] Cards have proper shadows and borders
- [ ] Buttons use ButtonCool component
- [ ] Colors match the context (campaign/project/etc)
- [ ] Text is readable and bold
- [ ] Mobile responsive
- [ ] Pattern overlays appear on hover
- [ ] Decorative elements are positioned correctly

---

This guide provides everything needed to consistently apply the retro theme across all pages!

---

## 🔍 Common Page Types & Examples

### Campaign Detail Page
- Use blue color scheme (`#2563eb`)
- Hero section with retro card styling
- Stats in retro icon boxes
- Voting buttons use ButtonCool
- Project list items in retro cards

### Project Detail Page
- Use purple color scheme (`#a855f7`)
- Similar structure to campaign page
- Milestone cards in retro style
- Action buttons use ButtonCool

### Profile Page
- Mix of card types (campaigns, projects)
- Use appropriate colors per card type
- Stats in retro boxes
- Edit buttons use ButtonCool

### Explorer/List Pages
- Grid of retro cards
- Filter/search in retro style
- Pagination buttons use ButtonCool

### Modal/Dialog Pages
- Full retro card styling
- ButtonCool for all actions
- Status indicators in retro boxes
- Pattern overlays

---

## 🎯 Migration Priority

1. **High Priority** (User-facing pages):
   - Campaign detail pages
   - Project detail pages
   - Profile pages
   - Explorer/list pages

2. **Medium Priority**:
   - Modals and dialogs
   - Forms and inputs
   - Status displays

3. **Low Priority**:
   - Admin pages
   - Settings pages
   - Internal tools

---

## 📐 Spacing & Sizing Standards

- **Card Padding**: `px-[1.5em] py-[1.5em]` (body), `px-[1.4em] py-[1.4em]` (header)
- **Border Width**: `0.35em` (main), `0.15em` (small elements), `0.2em` (buttons)
- **Border Radius**: `0.6em` (cards), `0.4em` (buttons), `0.3em` (boxes)
- **Shadow Offset**: `0.7em 0.7em 0` (default), `1em 1em 0` (hover), `0.5em 0.5em 0` (active)
- **Font Sizes**: `1.2em` (titles), `0.95em` (body), `0.85em` (features), `0.6em` (tags)

---

## 🚨 Common Mistakes to Avoid

1. ❌ **Don't mix old and new styles** - Fully convert or don't convert
2. ❌ **Don't use rounded-full** - Use `rounded-[0.6em]` or `rounded-[0.4em]`
3. ❌ **Don't use standard shadows** - Always use offset shadows
4. ❌ **Don't forget hover states** - All interactive elements need hover effects
5. ❌ **Don't skip pattern overlays** - They're essential for the retro feel
6. ❌ **Don't use light borders** - Always use `#050505` (black) for borders
7. ❌ **Don't forget z-index** - Proper layering is crucial

---

## 💻 Code Snippets Library

### Copy-Paste Ready Components

#### Basic Retro Card
```tsx
<div className="group relative w-full max-w-[22em]">
  <div className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-50 transition-opacity duration-[400ms] z-[1]"
    style={{
      backgroundImage: 'linear-gradient(to right, rgba(0, 0, 0, 0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(0, 0, 0, 0.05) 1px, transparent 1px)',
      backgroundSize: '0.5em 0.5em'
    }}
  />
  <div className="relative bg-white border-[0.35em] border-[#050505] rounded-[0.6em] shadow-[0.7em_0.7em_0_#000000] transition-all duration-[400ms] overflow-hidden z-[2] group-hover:shadow-[1em_1em_0_#000000] group-hover:-translate-x-[0.4em] group-hover:-translate-y-[0.4em] group-hover:scale-[1.02]"
    style={{ boxShadow: 'inset 0 0 0 0.15em rgba(0, 0, 0, 0.05)' }}
  >
    {/* Content */}
  </div>
</div>
```

#### Status Badge
```tsx
<span className="bg-white text-[#050505] text-[0.6em] font-extrabold px-[0.8em] py-[0.4em] border-[0.15em] border-[#050505] rounded-[0.3em] shadow-[0.2em_0.2em_0_#000000] uppercase tracking-[0.1em] rotate-[3deg] transition-all duration-300 group-hover:rotate-[-2deg] group-hover:scale-110 group-hover:shadow-[0.25em_0.25em_0_#000000]">
  Status
</span>
```

#### Info Box
```tsx
<div className="p-3 bg-[#d1fae5] border-[0.15em] border-[#10b981] rounded-[0.4em] shadow-[0.2em_0.2em_0_#000000]">
  <div className="text-sm text-[#065f46] font-semibold">
    Information message
  </div>
</div>
```

#### Icon Feature Item
```tsx
<div className="flex items-center gap-[0.6em] transition-transform duration-200 hover:translate-x-[0.3em]">
  <div className="w-[1.4em] h-[1.4em] flex items-center justify-center bg-[#4d61ff] border-[0.12em] border-[#050505] rounded-[0.3em] shadow-[0.2em_0.2em_0_rgba(0,0,0,0.2)] transition-all duration-200 hover:bg-[#5e70ff] hover:rotate-[-5deg]">
    <Icon className="w-[0.9em] h-[0.9em] text-white" />
  </div>
  <span className="text-[0.85em] font-semibold text-[#050505]">Label</span>
</div>
```

---

## 📱 Responsive Considerations

- Cards should maintain `max-w-[22em]` on desktop
- On mobile, cards can be full width but keep styling
- Buttons should scale appropriately (`sm` for mobile, `md` for desktop)
- Pattern overlays work on all screen sizes
- Hover effects may need touch-friendly alternatives on mobile

---

## 🎨 Visual Hierarchy

1. **Primary**: Title areas with colored backgrounds
2. **Secondary**: Feature grids and info boxes
3. **Tertiary**: Decorative elements (accent shapes, stamps)
4. **Interactive**: Buttons and clickable elements

---

## 🔗 Integration Checklist

When updating a page:
1. ✅ Identify all card components
2. ✅ List all buttons to convert
3. ✅ Note status indicators
4. ✅ Check for modals/dialogs
5. ✅ Review color scheme needs
6. ✅ Plan hover interactions
7. ✅ Test on mobile
8. ✅ Verify accessibility

---

**Happy Theming! 🎨**

