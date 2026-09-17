import {alpha, createTheme, type Theme, type ThemeOptions} from '@mui/material/styles'
// Augments @mui/material/styles' Components/ComponentsProps/ComponentsOverrides
// interfaces with @mui/x-chat's own components (MuiChatConversation etc.) so
// getComponents below can theme them like any built-in MUI component.
import type {} from '@mui/x-chat/themeAugmentation'
import {palette, type ThemeMode} from './palette'

// Typography scale, ported from digicher_webinterface's src/lib/theme.ts.
// fontFamily references the CSS variables fonts.ts exposes via next/font —
// this file doesn't import fonts.ts directly, it just names the variables.
const typography: ThemeOptions['typography'] = {
    fontFamily: 'var(--font-inter), "Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    allVariants: {letterSpacing: '0.3px'},
    h1: {
        fontFamily: 'var(--font-eb-garamond), "EB Garamond", "Georgia", "Times New Roman", serif',
        fontWeight: 500,
        letterSpacing: '0.5px',
        lineHeight: 1.3,
    },
    h2: {
        fontFamily: 'var(--font-eb-garamond), "EB Garamond", "Georgia", "Times New Roman", serif',
        fontWeight: 500,
        letterSpacing: '0.4px',
        lineHeight: 1.3,
    },
    h3: {
        fontFamily: 'var(--font-eb-garamond), "EB Garamond", "Georgia", "Times New Roman", serif',
        fontWeight: 500,
        letterSpacing: '0.3px',
        lineHeight: 1.35,
    },
    h4: {
        fontFamily: 'var(--font-eb-garamond), "EB Garamond", "Georgia", "Times New Roman", serif',
        fontWeight: 500,
        letterSpacing: '0.3px',
        lineHeight: 1.4,
    },
    h5: {
        fontFamily: 'var(--font-eb-garamond), "EB Garamond", "Georgia", "Times New Roman", serif',
        fontWeight: 500,
        letterSpacing: '0.2px',
        lineHeight: 1.4,
    },
    h6: {
        fontFamily: 'var(--font-eb-garamond), "EB Garamond", "Georgia", "Times New Roman", serif',
        fontWeight: 500,
        letterSpacing: '0.2px',
        lineHeight: 1.4,
    },
    body1: {lineHeight: 1.4, letterSpacing: '0.3px'},
    body2: {lineHeight: 1.4, letterSpacing: '0.3px'},
    button: {letterSpacing: '0.5px', textTransform: 'none'},
}

// Each variant's default HTML tag — lets `Text` skip `component` in the
// common case while still allowing a per-instance override for correct
// heading hierarchy (variant="h1" component="h2").
const variantMapping = {
    h1: 'h1',
    h2: 'h2',
    h3: 'h3',
    h4: 'h4',
    h5: 'h5',
    h6: 'h6',
    subtitle1: 'h6',
    subtitle2: 'h6',
    body1: 'p',
    body2: 'p',
    caption: 'span',
    overline: 'span',
    button: 'span',
    inherit: 'p',
}

function getComponents(mode: ThemeMode): ThemeOptions['components'] {
    const tokens = palette[mode]
    return {
        MuiCssBaseline: {
            styleOverrides: {
                // Tells the browser to render *native* UI — scrollbars, form
                // controls (checkboxes, selects, etc.) — using this mode's
                // colors. MUI's own components already follow the theme;
                // color-scheme is what makes the browser-drawn scrollbar
                // match instead of staying stuck light in dark mode.
                html: {colorScheme: mode},
                body: {lineHeight: 1.4, letterSpacing: '0.3px'},
            },
        },
        MuiTypography: {
            defaultProps: {variantMapping},
        },
        MuiButton: {
            styleOverrides: {
                root: {borderRadius: 8, textTransform: 'none', fontWeight: 500},
            },
            defaultProps: {disableElevation: true},
        },
        MuiCard: {
            styleOverrides: {
                root: {borderRadius: 12, border: `1px solid ${tokens.border}`},
            },
            defaultProps: {elevation: 0},
        },
        MuiPaper: {
            styleOverrides: {root: {borderRadius: 12}},
            defaultProps: {elevation: 0},
        },
        MuiTextField: {
            styleOverrides: {
                root: {'& .MuiOutlinedInput-root': {borderRadius: 8}},
            },
        },
        MuiChip: {
            styleOverrides: {root: {borderRadius: 8}},
        },
        MuiDialog: {
            styleOverrides: {paper: {borderRadius: 16}},
        },
        MuiMenu: {
            styleOverrides: {
                paper: {borderRadius: 8, border: `1px solid ${tokens.border}`},
            },
        },
        MuiTooltip: {
            styleOverrides: {tooltip: {borderRadius: 6}},
        },
        MuiAlert: {
            styleOverrides: {root: {borderRadius: 8}},
        },
        MuiLink: {
            defaultProps: {underline: 'hover'},
            styleOverrides: {root: {color: tokens.link}},
        },
        // @mui/x-chat's ChatConversationHeader doesn't expose an sx prop
        // (see LlmChatBox), so its border can only be retargeted via theme
        // component overrides. Same fraction of divider as Navbar's own
        // border (NAVBAR_BORDER_COLOR in Navbar.tsx) — kept as a literal
        // here rather than imported to avoid a component -> theme -> component
        // import cycle; keep the 0.5 factor in sync with Navbar.tsx by hand.
        MuiChatConversation: {
            styleOverrides: {
                header: ({theme}: {theme: Theme}) => ({
                    borderBottomColor: alpha(theme.palette.divider, 0.5),
                }),
            },
        },
    }
}

function buildTheme(mode: ThemeMode): Theme {
    const tokens = palette[mode]
    return createTheme({
        palette: {
            mode,
            primary: {
                main: tokens.primary,
                light: tokens.primaryLight,
                dark: tokens.primaryDark,
                contrastText: '#ffffff',
            },
            secondary: {
                main: tokens.secondary,
                light: tokens.secondaryLight,
                dark: tokens.secondaryDark,
                contrastText: mode === 'light' ? '#ffffff' : '#1a1a1a',
            },
            background: {default: tokens.background, paper: tokens.paper},
            text: {primary: tokens.text, secondary: tokens.textSecondary},
            divider: tokens.divider,
            warning: {
                main: tokens.warning,
                light: tokens.warningLight,
                dark: tokens.warningDark,
                contrastText: '#ffffff',
            },
        },
        typography,
        shape: {borderRadius: 8},
        components: getComponents(mode),
    })
}

export const lightTheme = buildTheme('light')
export const darkTheme = buildTheme('dark')
