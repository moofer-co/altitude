/**
 * Altitude Design Tokens
 *
 * Single source of truth for colors, spacing, typography, radii, motion, and layout.
 * Every visual decision flows from here — no magic numbers in components.
 *
 * Aligned with docs/DESIGN_TOKENS.md. If you change a value here, update the doc.
 */

// ─── Colors ──────────────────────────────────────────────

export const palette = {
  // Neutral
  white: '#FFFFFF',
  gray50: '#FAFAFA',
  gray100: '#F5F5F5',
  gray200: '#E5E5E5',
  gray300: '#D4D4D4',
  gray400: '#A3A3A3',
  gray500: '#737373',
  gray600: '#525252',
  gray700: '#404040',
  gray800: '#262626',
  gray900: '#171717',
  black: '#000000',

  // Purple (brand)
  primary50: '#F5F3FF',
  primary100: '#EDE9FE',
  primary200: '#DDD6FE',
  primary300: '#C4B5FD',
  primary400: '#A78BFA',
  primary500: '#7C3AED',
  primary600: '#6D28D9',
  primary700: '#5B21B6',
  primary800: '#4C1D95',
  primary900: '#3B0764',

  // Semantic
  successLight: '#DCFCE7',
  success: '#16A34A',
  successDark: '#166534',

  warningLight: '#FEF3C7',
  warning: '#F59E0B',
  warningDark: '#92400E',

  errorLight: '#FEE2E2',
  error: '#DC2626',
  errorDark: '#991B1B',

  infoLight: '#DBEAFE',
  info: '#2563EB',
  infoDark: '#1E40AF',
} as const;

export const colors = {
  // Surface
  bg: palette.gray50,
  surface: palette.white,
  surfaceRaised: palette.white,
  overlay: 'rgba(0,0,0,0.5)',
  border: palette.gray200,
  borderLight: palette.gray100,

  // Text
  text: palette.gray900,
  textSecondary: palette.gray600,
  textTertiary: palette.gray500,
  textDisabled: palette.gray400,
  textInverse: palette.white,

  // Interactive
  primary: palette.primary500,
  primaryPressed: palette.primary600,
  primarySoft: palette.primary50,
  primarySoftPressed: palette.primary100,

  // Semantic
  success: palette.success,
  successSoft: palette.successLight,
  warning: palette.warning,
  warningSoft: palette.warningLight,
  error: palette.error,
  errorSoft: palette.errorLight,
  info: palette.info,
  infoSoft: palette.infoLight,

  // Recommendation tags
  bestValue: palette.primary500,
  cheapest: palette.warning,          // orange in screens, not green
  cheapestSoft: palette.warningLight,
  fastest: palette.info,
  fastestSoft: palette.infoLight,

  // Deal/savings highlighting (prices, cheapest dates)
  deal: palette.warning,
  dealSoft: palette.warningLight,
} as const;

// ─── Spacing ─────────────────────────────────────────────
// 8pt grid. Micro spacing uses 4pt increments.

export const spacing = {
  xs: 4,
  sm: 8,
  '3': 12,
  md: 16,
  '5': 20,
  lg: 24,
  xl: 32,
  '10': 40,
  xxl: 48,
  '3xl': 64,
} as const;

// ─── Layout ──────────────────────────────────────────────

export const layout = {
  /** Left/right inset for screens, sheets, and page chrome. */
  screenPadding: 16,
  sectionGap: 32,
  componentGap: 24,
  cardGap: 16,
  listGap: 8,
  safeAreaTop: 16,
  safeAreaBottom: 16,
} as const;

// ─── Border Radius ───────────────────────────────────────

export const radii = {
  none: 0,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
} as const;

// ─── Typography ──────────────────────────────────────────
// Font: Inter (system UI fallback)

export const typography = {
  display: {
    fontSize: 32,
    lineHeight: 40,
    fontWeight: '700' as const,
    letterSpacing: -0.5,
  },
  h1: {
    fontSize: 24,
    lineHeight: 32,
    fontWeight: '600' as const,
    letterSpacing: -0.3,
  },
  h2: {
    fontSize: 20,
    lineHeight: 28,
    fontWeight: '600' as const,
  },
  bodyLarge: {
    fontSize: 18,
    lineHeight: 28,
    fontWeight: '400' as const,
  },
  body: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '400' as const,
  },
  bodyMedium: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '500' as const,
  },
  bodySmall: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '400' as const,
  },
  caption: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '400' as const,
  },
  label: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '500' as const,
    letterSpacing: 0.2,
  },
} as const;

// ─── Motion ──────────────────────────────────────────────

export const motion = {
  instant: 100,
  fast: 150,
  normal: 250,
  slow: 350,
  extraSlow: 500,
  easing: 'ease-out',
} as const;

// ─── Elevation ───────────────────────────────────────────

export const shadows = {
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  floating: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  sheet: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.1,
    shadowRadius: 24,
    elevation: 8,
  },
  dialog: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 32,
    elevation: 12,
  },
} as const;

// ─── Z-Index ─────────────────────────────────────────────

export const zIndex = {
  base: 0,
  header: 10,
  fab: 20,
  sheet: 30,
  dialog: 40,
  toast: 50,
  tooltip: 60,
} as const;

// ─── Opacity ─────────────────────────────────────────────

export const opacity = {
  disabled: 0.38,
  secondary: 0.6,
  overlay: 0.5,
} as const;

// ─── Touch ───────────────────────────────────────────────

export const touch = {
  minTarget: 48,
  preferredTarget: 56,
} as const;

// ─── Icons ───────────────────────────────────────────────

export const iconSize = {
  xs: 12,
  sm: 16,
  md: 20,
  lg: 24,
  xl: 32,
  xxl: 40,
} as const;
