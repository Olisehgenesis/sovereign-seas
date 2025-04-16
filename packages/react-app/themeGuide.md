

# Sovereign Seas Theme Migration Guide

## Color Palette

### Primary Colors
- **Blue Primary**: `#3B82F6` (blue-500) - Main actions, buttons, active states
- **Blue Secondary**: `#93C5FD` (blue-300) - Highlights, secondary elements
- **Blue Dark**: `#1E40AF` (blue-800) - Text emphasis, headers
- **Indigo Accent**: `#4F46E5` (indigo-600) - Gradients, accents
- **Sky Light**: `#E0F2FE` (sky-100) - Backgrounds, light elements

### Neutral Colors
- **Gray Dark**: `#1F2937` (gray-800) - Primary text
- **Gray Medium**: `#6B7280` (gray-500) - Secondary text, inactive elements
- **Gray Light**: `#F3F4F6` (gray-100) - Backgrounds, dividers
- **White**: `#FFFFFF` - Card backgrounds, content areas

### Status Colors
- **Success**: `#10B981` (emerald-500) - Success messages, confirmations
- **Warning**: `#F59E0B` (amber-500) - Warnings, alerts
- **Error**: `#EF4444` (red-500) - Error messages
- **Info**: `#3B82F6` (blue-500) - Information messages

## Typography

### Font Hierarchy
- **Primary Font**: 'Inter', sans-serif (Body text, UI elements)
- **Accent Font**: 'Playfair Display' or 'Tilt Neon' (Headings, branding elements)

### Font Sizes
- **Headings**:
  - H1: `text-4xl md:text-5xl lg:text-6xl font-bold`
  - H2: `text-2xl md:text-3xl font-bold`
  - H3: `text-xl font-bold`
  - H4: `text-lg font-semibold`
- **Body**:
  - Large: `text-lg md:text-xl`
  - Regular: `text-base`
  - Small: `text-sm`
  - Extra small: `text-xs`

## UI Components

### Buttons

#### Primary Button
```jsx
<button 
  className="px-6 py-3 rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-medium hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex items-center group border border-blue-400/30 relative overflow-hidden"
>
  <Icon className="h-4 w-4 mr-2 group-hover:rotate-12 transition-transform duration-300" />
  Button Text
  <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></span>
</button>
```

#### Secondary Button
```jsx
<button 
  className="px-6 py-3 rounded-full bg-white text-blue-600 font-medium border border-blue-200 hover:border-blue-300 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex items-center group relative overflow-hidden"
>
  <Icon className="h-4 w-4 mr-2 group-hover:translate-x-1 transition-transform duration-300" />
  Button Text
  <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-blue-100/50 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></span>
</button>
```

### Cards

#### Standard Card
```jsx
<div className="bg-white/90 backdrop-blur-sm rounded-xl p-6 shadow-lg border border-blue-100 group hover:shadow-xl transition-all hover:-translate-y-2 duration-300 relative overflow-hidden">
  <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-xl opacity-0 group-hover:opacity-20 blur-sm transition-all duration-500"></div>
  <div className="relative z-10">
    {/* Card content */}
  </div>
</div>
```

#### Feature Card
```jsx
<div className="bg-white/90 backdrop-blur-sm rounded-xl p-6 shadow-xl border border-blue-100 relative overflow-hidden group hover:shadow-2xl transition-all hover:-translate-y-2 duration-500">
  <div className="absolute top-0 right-0 h-24 w-24 bg-blue-100/50 rounded-bl-full opacity-50 group-hover:bg-blue-200/50 transition-colors"></div>
  <div className="relative z-10">
    {/* Card content */}
  </div>
</div>
```

### Token Badges
```jsx
<div className="flex items-center px-3 py-1 bg-gradient-to-r from-green-100 to-green-200 rounded-full text-green-800 text-sm font-medium border border-green-300/50 shadow-sm transform hover:scale-105 transition-transform duration-300">
  <div className="w-4 h-4 rounded-full bg-green-500 mr-1.5 flex items-center justify-center">
    <span className="text-white text-xs font-bold">$</span>
  </div>
  CELO
</div>
```

## Animations and Effects

### Animation Classes
Add these to your global CSS:

```css
@keyframes float {
  0% { transform: translateY(0px); }
  50% { transform: translateY(-8px); }
  100% { transform: translateY(0px); }
}

.animate-float {
  animation: float 4s ease-in-out infinite;
}

.animate-float-slow {
  animation: float 6s ease-in-out infinite;
}

.animate-float-slower {
  animation: float 8s ease-in-out infinite;
}

.animate-float-1 {
  animation: float 5s ease-in-out infinite;
}

.animate-float-2 {
  animation: float 5s ease-in-out infinite 0.8s;
}

.animate-float-3 {
  animation: float 5s ease-in-out infinite 1.6s;
}

.animate-float-delay-1 {
  animation: float 4s ease-in-out infinite 0.2s;
}

.animate-float-delay-2 {
  animation: float 4s ease-in-out infinite 0.4s;
}

.animate-float-delay-3 {
  animation: float 4s ease-in-out infinite 0.6s;
}

.animate-float-delay-4 {
  animation: float 4s ease-in-out infinite 0.8s;
}

@keyframes gradient-x {
  0% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
}

.animate-gradient-x {
  background-size: 200% 200%;
  animation: gradient-x 15s ease infinite;
}

@keyframes blink {
  0%, 100% { opacity: 0; }
  50% { opacity: 1; }
}

.animate-blink {
  animation: blink 1s step-end infinite;
}

@keyframes pulse-slow {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.7; }
}

.animate-pulse-slow {
  animation: pulse-slow 3s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}
```

### Glassmorphism
For glass-like effects:
```jsx
<div className="bg-white/80 backdrop-blur-sm rounded-xl border border-blue-100/50">
  {/* Content */}
</div>
```

### Gradient Text
```jsx
<span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-500 to-indigo-600">
  Gradient Text
</span>
```

## Layout Elements

### Background Elements
For decorative backgrounds:
```jsx
<div className="fixed inset-0 overflow-hidden pointer-events-none">
  <div className="absolute top-1/4 left-1/4 w-32 h-32 rounded-full bg-gradient-to-r from-blue-400/10 to-indigo-400/10 animate-float-slower blur-2xl"></div>
  <div className="absolute top-1/2 right-1/5 w-48 h-48 rounded-full bg-gradient-to-r from-cyan-400/10 to-blue-400/10 animate-float-slow blur-2xl"></div>
  <div className="absolute bottom-1/4 left-1/3 w-40 h-40 rounded-full bg-gradient-to-r from-indigo-400/10 to-purple-400/10 animate-float blur-2xl"></div>
</div>
```

### Section Headers
```jsx
<div className="text-center mb-12">
  <span className="inline-block px-3 py-1 bg-blue-100 text-blue-700 text-sm font-medium rounded-full mb-3">Section Label</span>
  <h2 className="text-3xl md:text-4xl font-bold text-gray-800 mb-4">Section Title</h2>
  <p className="text-gray-600 max-w-2xl mx-auto">Section description text goes here</p>
</div>
```

## Page-Specific Migration Notes

### Campaign Detail Pages
- Use the same card styling as featured campaigns
- Add token badges to the campaign details section
- Implement the floating animation on the main campaign image
- Use progress bars with gradient backgrounds for funding status

### Profile/Dashboard Pages
- Convert all buttons to match the new gradient style
- Use the glassmorphism effect for statistic cards 
- Add subtle floating animations to key elements
- Replace any emerald/green colors with the new blue palette

### Form Pages
- Style input fields with the blue border and focus states
- Add subtle transitions to form elements
- Implement the primary/secondary button styles for form actions
- Consider adding glassmorphism to form containers

## Best Practices

1. **Maintain Consistency**: Apply the same styling rules across all pages
2. **Use Container Queries**: Make sure content is responsive with proper container constraints
3. **Layer Animations**: Don't overuse animations, but strategically place them on important elements
4. **Optimize Performance**: Use will-change for animated elements and ensure smooth transitions
5. **Accessibility**: Ensure proper contrast ratios despite the glassmorphism effects

---
