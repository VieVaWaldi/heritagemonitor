// Shared sizing so independent fixed-position mobile elements line up
// visually without being the same component — HMMenu's "fab" trigger and
// /search's bottom pane switcher (modules/search/entity/MobilePaneSwitcher)
// read as one bar only because both reference these same numbers, and
// Lucy's mobile panel opens at the same width as HMMenu's for the same
// reason (LlmChatRuntime, HMMenu).

/** Height of the fixed bottom switcher bar on /search's mobile layout. */
export const MOBILE_BOTTOM_BAR_HEIGHT = 56

/** Gap between the switcher bar's right edge and HMMenu's fab circle. */
export const MOBILE_BOTTOM_BAR_GUTTER = 8

/** Diameter of HMMenu's mobile fab trigger. */
export const MOBILE_FAB_SIZE = 48

/** Width of a mobile SideMenu-based panel (HMMenu, Lucy) — never full width. */
export const MOBILE_SIDE_MENU_WIDTH = '88%'
