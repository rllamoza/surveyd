---
name: SondeoGlass Lumina
colors:
  surface: '#10131a'
  surface-dim: '#10131a'
  surface-bright: '#363940'
  surface-container-lowest: '#0b0e14'
  surface-container-low: '#191c22'
  surface-container: '#1d2026'
  surface-container-high: '#272a31'
  surface-container-highest: '#32353c'
  on-surface: '#e0e2eb'
  on-surface-variant: '#b9cacb'
  inverse-surface: '#e0e2eb'
  inverse-on-surface: '#2d3037'
  outline: '#849495'
  outline-variant: '#3a494b'
  surface-tint: '#00dce6'
  primary: '#e0fdff'
  on-primary: '#00373a'
  primary-container: '#00f2fe'
  on-primary-container: '#006a70'
  inverse-primary: '#00696f'
  secondary: '#fbabff'
  on-secondary: '#580065'
  secondary-container: '#ae05c6'
  on-secondary-container: '#ffd8fd'
  tertiary: '#e1ffec'
  on-tertiary: '#003824'
  tertiary-container: '#67f4b7'
  on-tertiary-container: '#006e4b'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#6ff6ff'
  primary-fixed-dim: '#00dce6'
  on-primary-fixed: '#002022'
  on-primary-fixed-variant: '#004f53'
  secondary-fixed: '#ffd6fd'
  secondary-fixed-dim: '#fbabff'
  on-secondary-fixed: '#36003e'
  on-secondary-fixed-variant: '#7c008e'
  tertiary-fixed: '#6ffbbe'
  tertiary-fixed-dim: '#4edea3'
  on-tertiary-fixed: '#002113'
  on-tertiary-fixed-variant: '#005236'
  background: '#10131a'
  on-background: '#e0e2eb'
  surface-variant: '#32353c'
typography:
  display-hero:
    fontFamily: Plus Jakarta Sans
    fontSize: 56px
    fontWeight: '800'
    lineHeight: 64px
    letterSpacing: -0.03em
  display-hero-mobile:
    fontFamily: Plus Jakarta Sans
    fontSize: 36px
    fontWeight: '800'
    lineHeight: 44px
    letterSpacing: -0.02em
  headline-xl:
    fontFamily: Plus Jakarta Sans
    fontSize: 40px
    fontWeight: '700'
    lineHeight: 48px
    letterSpacing: -0.025em
  headline-xl-mobile:
    fontFamily: Plus Jakarta Sans
    fontSize: 28px
    fontWeight: '700'
    lineHeight: 36px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 28px
    fontWeight: '700'
    lineHeight: 36px
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 22px
    fontWeight: '600'
    lineHeight: 30px
    letterSpacing: -0.015em
  headline-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 26px
    letterSpacing: -0.01em
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 26px
    letterSpacing: -0.005em
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 22px
    letterSpacing: 0em
  body-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 18px
    letterSpacing: 0.005em
  label-code-lg:
    fontFamily: JetBrains Mono
    fontSize: 14px
    fontWeight: '500'
    lineHeight: 20px
    letterSpacing: -0.01em
  label-code-md:
    fontFamily: JetBrains Mono
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.02em
  label-code-sm:
    fontFamily: JetBrains Mono
    fontSize: 10px
    fontWeight: '600'
    lineHeight: 14px
    letterSpacing: 0.05em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  gutter: 1.25rem
  gutter-desktop: 1.5rem
  margin: 1rem
  margin-tablet: 2rem
  margin-desktop: 3rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2.5rem
---

## Brand & Style
The design system embodies a high-precision, spatial intelligence aesthetic tailored for next-generation pollsters, enterprise researchers, and data engineers. The visual identity bridges tactile physics with optical realism—termed *Hyper-Glass Data Spatiality*. 

The interface evokes intense clarity, authoritative control, and technological supremacy. Rather than feeling like a sterile spreadsheet or dry enterprise reporting suite, it captures the ambience of a futuristic flight deck or mission control console: deep abyss backdrops illuminated by spectral data rays, high-refraction frosted panels, and luminous feedback states.

### Core Visual Principles
- **Optical Stratification:** Information lives on explicit optical planes. Backgrounds are atmospheric and deep, while cards and interactive controls hover forward via progressive backdrop blurs, refractive edge reflections, and specular inner borders.
- **Electric Precision:** High-density statistical figures, geo-spatial ubigeo breakdowns, and dynamic survey flows are punctated by electric cyan, radiant violet, and surgical emerald lights. Glows are never decorative clutter; they indicate dynamic change, active response collection, and data validity.
- **Tactile Weight in Glass:** Buttons and interactive bento widgets exhibit sub-surface scattering, polished top-down light models, and distinct micro-depressions upon click, removing the flat, weightless feel of standard glassmorphism.

## Colors
The palette is built ground-up for pure dark-mode immersion, maximizing OLED black balance while utilizing precise wavelength lights to differentiate telemetry, sentiment clusters, and analytical trends.

### Palette Architecture
- **Base Canvas (`#080b11`) & Void Tiers:** The absolute backdrop starts at ultra-deep navy-black `#080b11`, scaling to `#0d121f` for structural underlays. It prevents black crush by infusing 3% sapphire undertones, creating atmospheric dimension.
- **Primary — Electric Cyan (`#00f2fe` to `#4facfe`):** Represents live telemetry, primary calls to action, survey active tracking, and high-confidence metrics. Used with an ambient blur radius for focused indicators.
- **Secondary — Spectral Magenta / Violet (`#d946ef` / `#8a2be2`):** Distinguishes synthetic segmentations, predictive AI survey branches, advanced demographic clustering, and high-impact actions.
- **Tertiary — Bio-Emerald (`#10b981`):** Applied strictly to validated data states, statistical quorum thresholds, successful live ingestions, and nominal system telemetry.
- **Surface Translucencies:**
  - `Surface-0 (Canvas)`: `#080b11` (solid)
  - `Surface-1 (Base Card)`: `rgba(13, 18, 31, 0.65)` with `backdrop-filter: blur(24px)`
  - `Surface-2 (Nested Glass / Hover)`: `rgba(26, 35, 60, 0.45)` with `backdrop-filter: blur(16px)`
  - `Surface-3 (Floating Overlays / Modals)`: `rgba(19, 26, 45, 0.85)` with `backdrop-filter: blur(36px)`
- **Border Specular Highlights:** 
  - Subdued structural boundary: `rgba(255, 255, 255, 0.08)`
  - Active hover boundary: `rgba(255, 255, 255, 0.22)`
  - Focused boundary: `rgba(0, 242, 254, 0.55)`

## Typography
The typographical hierarchy balances sculptural headline forms with utilitarian, high-legibility telemetry.

- **Plus Jakarta Sans (Display & Headlines):** Delivers a contemporary architectural silhouette with geometric curves. The negative tracking on large headlines locks letterforms into cohesive graphical units, matching the spatial precision of glass cards.
- **Inter (Body & Administrative Data):** Provides unambiguous neutral legibility across long survey prompts, respondent instructions, and tabular question lists. Its high x-height maintains clarity against low-transparency frosted backgrounds.
- **JetBrains Mono (Telemetry, Metadata & Code):** Powers statistical readouts, Ubigeo administrative codes, survey respondent UUIDs, sample error percentages, and formula badges. Monospacing ensures numerical tabular figures do not jitter during real-time poll polling updates.

## Layout & Spacing
The layout model is driven by a rigid, asymmetric **Bento Grid** architecture embedded within a fluid canvas shell. This enables data-heavy analytics dashboards and multi-step survey builders to exist without visual fragmentation.

### Breakpoints & Grid Scaling
- **Mobile (< 768px):** 4-column fluid layout with `1rem` margins and `1rem` gutters. Complex multi-metric Bento widgets reflow into a single-column stacked hierarchy. Floating action bars compress into bottom sheets.
- **Tablet (768px – 1199px):** 8-column layout with `2rem` margins and `1.25rem` gutters. Bento modules collapse horizontally into 2x2 modular matrix configurations.
- **Desktop (1200px+):** 12-column fixed/maximum width fluid container (`max-w-[1600px]`) centered within the `#080b11` void. Gutters expand to `1.5rem` (`24px`). Bento cells can span 3, 4, 6, 8, or 12 columns with uniform aspect-ratio balance.

### Spacing Rhythm
Interior card padding follows strict proportional tokens: compact widgets use `space-md` (`16px`), standard survey query builders use `space-lg` (`24px`), while large statistical showcases utilize `space-xl` (`40px`) to breathe against the ambient luminescence.

## Elevation & Depth
Elevation is achieved through light physics, backdrop filtration, and translucent displacement rather than traditional opaque shadows.

### Spatial Layering Paradigm
1. **Layer 0 (Canvas Void):** `#080b11` overlaid with radial mesh glows: a cyan ambient light source (`rgba(0, 242, 254, 0.05)`) anchored top-left and an ultra-violet ambient bloom (`rgba(217, 70, 239, 0.04)`) bottom-right.
2. **Layer 1 (Bento Glass Panels):** `background: rgba(13, 18, 31, 0.65)`, `backdrop-filter: blur(24px) saturate(180%)`. Rimmed with a linear gradient border: `top: rgba(255, 255, 255, 0.15)` fading to `bottom: rgba(255, 255, 255, 0.02)`. Casts an ambient shadow: `0 20px 40px -15px rgba(0, 0, 0, 0.7)`.
3. **Layer 2 (Interactive Floating Elements):** Filter dropdowns, active question blocks, and segment selectors: `background: rgba(22, 30, 52, 0.75)`, `backdrop-filter: blur(20px)`. Outer shadow: `0 12px 28px -6px rgba(0, 0, 0, 0.6)`. Inner top glow: `inset 0 1px 1px 0 rgba(255, 255, 255, 0.2)`.
4. **Layer 3 (Floating HUD & Modals):** Command bars and Excel file ingestion modals. Raised with strong electric backing glow: `0 0 0 1px rgba(0, 242, 254, 0.3)`, `0 24px 64px -12px rgba(0, 242, 254, 0.15), 0 32px 80px -20px rgba(0, 0, 0, 0.9)`.

## Shapes
A unified radius of Level 2 (`0.5rem` / `8px` for inputs and tags; `1rem` / `16px` for bento panels; `1.5rem` / `24px` for parent dashboard containers) creates continuous, high-tech curvature.

- **Bento Enclosures:** Cut with `rounded-xl` (`24px` on desktop, `16px` on mobile) to balance structural hardness with organic glass boundaries.
- **Controls & Data Tags:** Ubigeo selectors, survey badges, and response tags maintain `rounded-full` (pill shapes) or `rounded-lg` (`8px`) to distinguish actionable controls from static structural architecture.
- **Inner Nested Alignment:** Nested elements within a card must adopt a radius equal to the outer card’s radius minus the card padding, eliminating uneven optical gutters.

## Components

### Buttons
- **Primary Electric Action:** Dynamic gradient fill (`linear-gradient(135deg, #00f2fe 0%, #4facfe 100%)`), text in `#080b11` (heavy font weight `600`). Finished with top-edge inner specular highlight (`inset 0 1px 1px rgba(255, 255, 255, 0.4)`) and an exterior cyan glow (`box-shadow: 0 4px 20px -2px rgba(0, 242, 254, 0.4)`). Active state applies a scale transformation (`scale(0.98)`).
- **Secondary Glass Tactile:** `background: rgba(255, 255, 255, 0.05)`, border `1px solid rgba(255, 255, 255, 0.12)`, text `#ffffff`. Hover shifts background to `rgba(255, 255, 255, 0.1)` with border brightening to `rgba(255, 255, 255, 0.3)`.

### Cards & Bento Modules
- Surfaces sport the frosted glass formula (`backdrop-blur-xl`, `bg-[#0d121f]/65`).
- Header bars inside cards use bottom dividers made of hairline gradients (`linear-gradient(90deg, transparent, rgba(255,255,255,0.1) 50%, transparent)`).
- Stat widgets incorporate large `JetBrains Mono` values with small electric delta indicators (e.g., emerald green upward pills for confidence scores).

### Ubigeo Cascading Selectors (Country / Region / Department)
- Segmented pill triggers laid out horizontally. Active geographic nodes display an electric cyan ping dot alongside monospace location identification codes.
- Expanded picker opens as an acrylic popover panel with instant search, sub-district tree branches marked by thin glass guide lines, and keyboard arrow navigation.

### Input Fields & Excel Dropzones
- **Text & Survey Prompt Fields:** `background: rgba(8, 11, 17, 0.6)`, border `1px solid rgba(255, 255, 255, 0.1)`. Focus state illuminates the entire boundary with electric cyan (`rgba(0, 242, 254, 0.8)`) and a `4px` diffused outer glow ring (`rgba(0, 242, 254, 0.15)`).
- **Excel / CSV Import Dropzone:** Enclosed in a dashed perimeter with dynamic refraction (`border: 2px dashed rgba(0, 242, 254, 0.3)`). Hovering files triggers an animated gradient beam sweeping across the surface, turning the inner glass into a luminous drop state with emerald validation accents upon schema verification.

### Form Switches & Day/Night Mode Toggle
- Compact track with a soft concave inner shadow (`inset 0 2px 4px rgba(0, 0, 0, 0.5)`). 
- Thumb handle is a polished frosted sphere (`background: #ffffff` or `#00f2fe`) containing a subtle ambient radial glow, sliding with spring physics (`cubic-bezier(0.175, 0.885, 0.32, 1.275)`).