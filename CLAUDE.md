# KrillTube UI Style Guide

This document outlines the design system and styling patterns used across KrillTube. Follow these guidelines when creating or updating UI components.

## Design Philosophy

KrillTube uses a **neomorphic/brutalist design** aesthetic with:
- Heavy black outlines and borders
- Consistent drop shadows
- Vibrant gradients and solid colors
- Clear visual hierarchy
- Playful, bold interactions

## Color Palette

### Primary Colors
- **Blue Gradient Background**: `bg-gradient-to-br from-[#0668A6] via-[#0668A6] to-[#1AAACE]`
- **Peach/Cream Accent**: `#FFEEE5` - Used for card backgrounds and hover states
- **Red Accent**: `#EF4330` - Used for active states and highlights
- **Cyan Accent**: `#1AAACE` - Used in gradients and secondary elements
- **Black**: `#000000` - Text and outlines
- **White**: `#FFFFFF` - Text on dark backgrounds and card backgrounds

### Walrus Brand Colors (from globals.css)
- **Walrus Mint**: `#97F0E5` (--walrus-mint)
- **Walrus Grape**: `#C584F6` (--walrus-grape)
- **Secondary Colors**: Lime (#8CF28A), Guava (#F946AC), Blueberry (#613DFF), Banana (#F9D546)

### Background Colors
- **Main Background**: Blue gradient (see Primary Colors)
- **Card Background**: `bg-white` or `bg-[#FFEEE5]`
- **Sidebar Background**: `bg-[#0668A6]`
- **Input Background**: `bg-cyan-500/30` (with 30% opacity)

## Typography

### Fonts
- **Primary Font**: 'Outfit' (imported from Google Fonts)
  - Weights: 100-900 available
  - Most common: 400 (normal), 500 (medium), 600 (semibold), 700 (bold)
- **Accent Font**: 'Fredoka' (for special elements)
- **Display Font**: 'PP NeueBit' (brand font for headers, with Outfit fallback)

### Font Usage
- **Page Titles**: `text-2xl font-semibold font-['Outfit']` or `text-3xl font-bold`
- **Section Headers**: `text-xl font-bold font-['Outfit']`
- **Card Titles**: `text-lg font-bold font-['Outfit']` or `text-xl font-bold`
- **Body Text**: `text-base font-normal font-['Outfit']` or `text-base font-medium`
- **Small Text**: `text-sm font-semibold font-['Outfit']` or `text-xs font-medium`
- **Button Text**: `text-base font-bold font-['Outfit']` or `text-base font-semibold`

### Text Colors
- **On Light Backgrounds**: `text-black`
- **On Dark Backgrounds**: `text-white`
- **Muted Text**: `text-text-muted` or use opacity like `text-black/70`

### Text Shadows
Some elements use text shadows for depth:
```css
[text-shadow:_0px_3px_7px_rgb(0_0_0_/_0.25)]
[text-shadow:_0px_4px_7px_rgb(0_0_0_/_0.25)]
```

## Borders & Outlines

### Standard Pattern
Almost all interactive elements use the **neomorphic border pattern**:

```jsx
outline outline-[3px] outline-offset-[-3px] outline-black
// or
border-[3px] border-black
// or
outline outline-2 outline-offset-[-2px] outline-black
```

### Variations
- **Thick outline**: `outline-[3px]`
- **Medium outline**: `outline-2`
- **Thin outline**: `outline-1` or `border-[1.34px]`
- **White outline** (on dark backgrounds): `outline-white`

## Shadows & Depth

### Standard Shadow Pattern
The signature shadow style for cards and buttons:

```jsx
shadow-[3px_3px_0px_0px_rgba(0,0,0,1.00)]
```

### Variations
- **Larger shadow**: `shadow-[5px_5px_0px_1px_rgba(0,0,0,1.00)]`
- **Medium shadow**: `shadow-[3px_3px_0px_0px_rgba(0,0,0,1.00)]`
- **Small shadow**: `shadow-[2px_2px_0px_0px_rgba(0,0,0,1.00)]`

### Hover States
Shadows reduce and elements translate slightly on hover:

```jsx
hover:shadow-[2px_2px_0_0_black]
hover:translate-x-[1px]
hover:translate-y-[1px]
transition-all
```

## Border Radius

### Standard Radii
- **Extra Large**: `rounded-[32px]` - Buttons, pills, major containers
- **Large**: `rounded-3xl` or `rounded-2xl` - Cards, sections
- **Medium**: `rounded-xl` - Images, thumbnails
- **Small**: `rounded-lg` - Minor elements
- **Circle**: `rounded-full` - Icon buttons, avatars

## Buttons

### Primary Button (Upload, CTA)
```jsx
className="bg-white text-black font-bold h-14 px-6 rounded-[32px]
  outline outline-[3px] outline-black
  shadow-[3px_3px_0px_0px_rgba(0,0,0,1.00)]
  hover:shadow-[2px_2px_0_0_black]
  hover:translate-x-[1px]
  hover:translate-y-[1px]
  transition-all"
```

### Secondary Button (Categories)
```jsx
className="px-6 py-2.5 rounded-full
  shadow-[3px_3px_0_0_black]
  outline outline-[3px] outline-offset-[-3px]
  bg-[#0668A6] outline-black text-white
  hover:shadow-[2px_2px_0_0_black]
  hover:translate-x-[1px]
  hover:translate-y-[1px]
  transition-all"
```

### Active State
```jsx
bg-black outline-white text-white
```

### Icon Buttons (Round)
```jsx
className="w-14 h-14 rounded-full
  border-[3px] border-white
  bg-gradient-to-br from-[#EF4330]/70 to-[#1AAACE]/70
  shadow-[3px_3px_0px_0px_rgba(0,0,0,1.00)]
  flex items-center justify-center
  hover:opacity-80
  transition-opacity"
```

### Subscribe Button
```jsx
className="px-6 py-2.5 bg-white rounded-[32px]
  shadow-[3px_3px_0px_0px_rgba(0,0,0,1.00)]
  outline outline-2 outline-offset-[-2px] outline-black
  hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1.00)]
  hover:translate-x-[1px]
  hover:translate-y-[1px]
  transition-all"
```

## Cards

### Video Card (Standard)
```jsx
className="w-full p-4 bg-white rounded-2xl
  shadow-[3px_3px_0px_0px_rgba(0,0,0,1.00)]
  outline outline-[1.34px] outline-offset-[-1.34px] outline-black
  flex flex-col gap-1.5 overflow-hidden
  hover:bg-[#FFEEE5]
  hover:shadow-[5px_5px_0_0_black]
  hover:translate-x-[-2px]
  hover:translate-y-[-2px]
  hover:scale-105
  transition-all
  cursor-pointer"
```

### Section Card (Gaming, DeFi)
```jsx
className="w-full p-4 bg-[#FFEEE5] rounded-[32px]
  shadow-[5px_5px_0px_1px_rgba(0,0,0,1.00)]
  outline outline-[3px] outline-offset-[-3px] outline-black
  flex flex-col gap-2.5"
```

### Comment Card
```jsx
className="p-4 bg-white rounded-2xl
  outline outline-[3px] outline-offset-[-3px] outline-black
  flex flex-col gap-2.5"
```

## Thumbnails & Images

### Video Thumbnail
```jsx
className="w-full h-56 rounded-xl
  shadow-[2px_2px_0px_0px_rgba(0,0,0,1.00)]
  border-[1.34px] border-black
  object-cover"
```

### Play Button Overlay
```jsx
<div className="w-8 h-8 p-2 absolute top-1/2 left-1/2
  -translate-x-1/2 -translate-y-1/2
  bg-white/80 rounded-2xl
  inline-flex justify-center items-center">
  <svg className="w-4 h-4 text-black" fill="currentColor" viewBox="0 0 20 20">
    <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
  </svg>
</div>
```

### Duration Badge
```jsx
<div className="p-1 absolute bottom-2 right-2
  bg-white rounded
  outline outline-1 outline-offset-[-1px] outline-black
  inline-flex justify-center items-center">
  <div className="text-black text-sm font-semibold font-['Outfit']
    [text-shadow:_0px_3px_7px_rgb(0_0_0_/_0.25)]">
    5:36
  </div>
</div>
```

## Forms & Inputs

### Search Bar
```jsx
<div className="w-full h-14 p-2
  bg-cyan-500/30 rounded-[32px]
  shadow-[3px_3px_0px_0px_rgba(0,0,0,1.00)]
  outline outline-2 outline-offset-[-2px] outline-black">
  <input type="text"
    placeholder="Search by handle...."
    className="flex-1 bg-transparent text-white placeholder-white
      outline-none text-base font-medium font-['Outfit']"
  />
</div>
```

### Text Input (Upload Page - old style, needs updating)
```jsx
<input type="text"
  className="w-full px-4 py-3
    bg-background-elevated border border-border rounded-lg
    text-foreground placeholder-text-muted/50
    focus:outline-none focus:ring-2 focus:ring-walrus-mint"
/>
```

## Layout

### Sidebar
- **Width**: `w-72` (288px)
- **Background**: `bg-[#0668A6]`
- **Position**: `fixed top-0 left-0 bottom-0`
- **Border**: `border-r-[3px] border-black`

### Main Content Area
- **Padding Left** (with sidebar): `pl-20` (80px) or use margin `lg:ml-72` (288px)
- **Padding Right**: `pr-12` (48px)
- **Padding Top**: `pt-12` (48px) or `pt-[51px]`
- **Padding Bottom**: `pb-4` or `pb-6`

### Header
- **Height**: Varies, typically `h-14` or auto
- **Background**: `bg-[#0668A6]`
- **Position**: `fixed top-0 left-0 right-0 z-50`
- **Padding**: `px-12 py-5 lg:ml-72`

### Grids
- **Video Grid**: `grid grid-cols-3 gap-6`
- **Responsive**: Consider mobile with `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3`

## Spacing

### Common Gaps
- **Extra Small**: `gap-1` (4px), `gap-1.5` (6px), `gap-2` (8px)
- **Small**: `gap-2.5` (10px), `gap-3` (12px)
- **Medium**: `gap-4` (16px), `gap-5` (20px), `gap-6` (24px)
- **Large**: `gap-8` (32px)

### Padding
- **Cards**: `p-4` (16px) or `p-3` (12px) for smaller cards
- **Sections**: `p-6` (24px) or `p-8` (32px)
- **Buttons**: `px-6 py-2.5` or `px-4 py-3`

## Icons

### Size Standards
- **Small**: `w-4 h-4` (16px)
- **Medium**: `w-5 h-5` (20px), `w-6 h-6` (24px)
- **Large**: `w-8 h-8` (32px), `w-10 h-10` (40px)

### Icon Buttons
Icon containers typically use:
```jsx
className="w-12 h-12 bg-white rounded-full
  shadow-[3px_3px_0px_0px_rgba(0,0,0,1.00)]
  outline outline-2 outline-offset-[-2px] outline-black
  inline-flex justify-center items-center"
```

## Hover & Interaction States

### Standard Hover Pattern
```jsx
hover:bg-[#FFEEE5]
hover:shadow-[2px_2px_0_0_black]
hover:translate-x-[1px]
hover:translate-y-[1px]
transition-all
```

### Scale on Hover
```jsx
hover:scale-105
transition-all
```

### Background Change
```jsx
hover:bg-white/50
transition-colors
```

## Specific Components

### Category Pills (Home Page)
```jsx
<button className="px-6 py-2.5 rounded-full
  shadow-[3px_3px_0_0_black]
  outline outline-[3px] outline-offset-[-3px]
  bg-[#0668A6] outline-black text-white
  hover:shadow-[2px_2px_0_0_black]
  hover:translate-x-[1px]
  hover:translate-y-[1px]
  transition-all">
  <div className="text-base font-semibold font-['Outfit']">Gaming</div>
</button>
```

Active state:
```jsx
bg-black outline-white text-white
```

### Show More Button
```jsx
<button className="px-4 py-3
  bg-gradient-to-br from-[#0668A6] via-[#0668A6] to-[#1AAACE]
  rounded-[32px]
  shadow-[3px_3px_0px_0px_rgba(0,0,0,1.00)]
  outline outline-2 outline-offset-[-2px] outline-black
  inline-flex items-center gap-4
  hover:shadow-[2px_2px_0_0_black]
  hover:translate-x-[1px]
  hover:translate-y-[1px]
  transition-all">
  <div className="text-white text-xl font-bold font-['Montserrat']">Show more</div>
  <div className="w-10 h-10 p-2 bg-black rounded-full flex justify-center items-center">
    {/* Icon */}
  </div>
</button>
```

### Sidebar Menu Item
```jsx
// Default state
<Link className="self-stretch px-4 py-2
  inline-flex justify-start items-center gap-2.5
  hover:bg-white/50 transition-colors rounded-lg">
  <Image src="/icon.svg" width={24} height={24} />
  <div className="text-black text-base font-semibold font-['Outfit']">Menu Item</div>
</Link>

// Active state
<Link className="self-stretch px-4 py-2
  bg-[#EF4330] rounded-[32px]
  outline outline-[3px] outline-offset-[-3px] outline-black
  inline-flex justify-start items-center gap-2.5">
  <Image src="/icon.svg" width={24} height={24} />
  <div className="text-white text-base font-semibold font-['Outfit']">Active Item</div>
</Link>
```

### User Profile (Sidebar)
```jsx
<div className="inline-flex justify-start items-center gap-3">
  <div className="w-12 h-12 bg-black rounded-full
    shadow-[3px_3px_0_0_black]
    outline outline-1 outline-offset-[-1px] outline-white">
    <Image src="/avatar.svg" width={50} height={50} />
  </div>
  <div className="flex-1 p-2 bg-black rounded-[32px]
    outline outline-1 outline-offset-[-1px] outline-white">
    <div className="text-white text-base font-semibold font-['Montserrat']">
      @Username
    </div>
  </div>
</div>
```

## Video Player Container
```jsx
<div className="w-full max-w-[970px] rounded-[32px]
  shadow-[3px_3px_0px_0px_rgba(0,0,0,1.00)]
  border-[3px] border-black
  overflow-hidden
  bg-black">
  {/* Video player component */}
</div>
```

## Loading States

### Spinner
```jsx
<div className="w-16 h-16
  border-4 border-white border-t-transparent
  rounded-full animate-spin">
</div>
```

## Empty States

### No Videos
```jsx
<div className="flex items-center justify-center py-24">
  <div className="text-center max-w-md">
    <div className="w-24 h-24 bg-white/20 rounded-full
      flex items-center justify-center mx-auto mb-6">
      {/* Icon */}
    </div>
    <h3 className="text-2xl font-bold text-white mb-2">No videos yet</h3>
    <p className="text-white/80 mb-6">Be the first to upload a video</p>
    <Link href="/upload"
      className="inline-block px-6 py-3
        bg-[#FFEEE5] text-black font-bold
        rounded-[32px]
        shadow-[3px_3px_0_0_rgba(0,0,0,1)]
        outline outline-2 outline-black
        hover:shadow-[2px_2px_0_0_rgba(0,0,0,1)]
        hover:translate-x-[1px]
        hover:translate-y-[1px]
        transition-all">
      Upload Video
    </Link>
  </div>
</div>
```

## Best Practices

1. **Consistency**: Always use the standard shadow and outline patterns
2. **Spacing**: Maintain consistent gaps (4, 6, 8px increments)
3. **Colors**: Stick to the defined color palette
4. **Typography**: Use Outfit font with standard weights
5. **Hover States**: Include translation and shadow reduction for interactive elements
6. **Accessibility**: Ensure sufficient contrast ratios
7. **Responsive**: Consider mobile breakpoints (sm:, md:, lg:)

## Differences from Upload Page (Current)

The current upload page uses a **different, older design system**:
- Uses `bg-background` (dark theme) instead of blue gradient
- Uses semantic color tokens (`bg-walrus-mint`, `text-foreground`)
- Lacks the neomorphic shadows and outlines
- Different spacing and layout patterns
- No peach accent colors

**The upload page should be updated to match the home/watch page style** with:
- Blue gradient background
- Neomorphic cards with shadows and outlines
- Peach hover states
- Consistent spacing and typography

## Database Migrations

When making changes to the Prisma schema (`prisma/schema.prisma`), use the following command to sync the database:

```bash
npx prisma db push
```

This command:
- Pushes schema changes directly to the database
- Automatically generates Prisma Client
- Does not create migration files (use `npx prisma migrate dev` for production migrations)

**Note**: Use `npx prisma db push` for development. For production, use `npx prisma migrate dev` to create migration files that can be version controlled.

## Task Master AI Instructions
**Import Task Master's development workflow commands and guidelines, treat as if import is in the main CLAUDE.md file.**
@./.taskmaster/CLAUDE.md
