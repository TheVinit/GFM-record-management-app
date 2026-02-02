export const COLORS = {
  primary: '#1A237E',
  primaryLight: '#3949AB',
  primaryDark: '#0D1642',
  secondary: '#00897B',
  secondaryLight: '#4DB6AC',
  accent: '#FF6F00',
  accentLight: '#FFB300',
  success: '#2E7D32',
  successLight: '#81C784',
  warning: '#F57C00',
  warningLight: '#FFB74D',
  error: '#C62828',
  errorLight: '#EF5350',
  info: '#0288D1',
  infoLight: '#E1F5FE',
  background: '#F5F7FA',
  backgroundDark: '#E8EDF2',
  card: '#FFFFFF',
  cardHover: '#FAFBFC',
  text: '#1C2331',
  textSecondary: '#546E7A',
  textLight: '#90A4AE',
  textMuted: '#B0BEC5',
  border: '#E0E6ED',
  borderLight: '#F0F4F8',
  divider: '#ECEFF1',
  white: '#FFFFFF',
  black: '#000000',
  shadow: 'rgba(26, 35, 126, 0.08)',
  shadowDark: 'rgba(0, 0, 0, 0.15)',
  overlay: 'rgba(0, 0, 0, 0.5)',
  gradient: {
    primary: ['#1A237E', '#3949AB'],
    secondary: ['#00897B', '#4DB6AC'],
    accent: ['#FF6F00', '#FFB300'],
  },
};

// Spacing Scale (8pt grid system)
export const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

// Border Radius
export const RADIUS = {
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  xxl: 24,
  full: 9999,
};

// Typography Scale
export const TYPOGRAPHY = {
  h1: {
    fontSize: 32,
    fontWeight: '700' as const,
    lineHeight: 40,
  },
  h2: {
    fontSize: 24,
    fontWeight: '700' as const,
    lineHeight: 32,
  },
  h3: {
    fontSize: 20,
    fontWeight: '600' as const,
    lineHeight: 28,
  },
  h4: {
    fontSize: 18,
    fontWeight: '600' as const,
    lineHeight: 24,
  },
  body: {
    fontSize: 16,
    fontWeight: '400' as const,
    lineHeight: 24,
  },
  bodySmall: {
    fontSize: 14,
    fontWeight: '400' as const,
    lineHeight: 20,
  },
  caption: {
    fontSize: 12,
    fontWeight: '400' as const,
    lineHeight: 16,
  },
  button: {
    fontSize: 16,
    fontWeight: '600' as const,
    lineHeight: 24,
  },
};

// Shadow Elevations
export const SHADOWS = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  xl: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
};
