// Might want to move that to apps/web/src/common/theme/ ? at some point,
// if we ll reuse this in other modules. Then clean up this messy comment below.

// Hero-page fluid scale: 1 unit = 16px (today's fixed sizing) at a ~992px
// tall viewport (MacBook), shrinking linearly to 12px at a ~585px tall
// viewport (measured on a Full HD Windows laptop with display scaling) so
// text, spacing, and controls shrink together instead of just clipping.
// Set on HeroDesktopLayout's root Box; consumed everywhere via fluidUnit().
export const HERO_FLUID_UNIT_DECLARATION = 'clamp(0.75rem, 0.391rem + 0.983dvh, 1rem)'
