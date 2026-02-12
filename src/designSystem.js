// Design System - Consistent styling tokens across the application

export const colors = {
  // Status colors
  success: '#10b981',      // Green - completed, on track
  successLight: '#d1fae5', // Light green background
  successDark: '#059669',  // Dark green text
  successDarker: '#047857',
  
  warning: '#f59e0b',      // Orange - urgent (< 24h)
  warningLight: '#fef3c7', // Light orange background
  warningDark: '#d97706',  // Dark orange text
  warningDarker: '#92400e',
  
  error: '#ef4444',        // Red - overdue
  errorLight: '#fee2e2',   // Light red background
  errorDark: '#dc2626',    // Dark red text
  errorDarker: '#991b1b',
  
  primary: '#3b82f6',      // Blue - primary actions, pending
  primaryLight: '#dbeafe',
  primaryDark: '#2563eb',
  
  // Text colors (from CSS variables)
  text: 'var(--text-color)',
  textSecondary: 'var(--text-secondary)',
  
  // Glass morphism
  glass: 'var(--glass-bg)',
  glassHover: 'var(--glass-hover)',
  glassBorder: 'var(--glass-border)',
}

export const spacing = {
  xs: '0.25rem',   // 4px
  sm: '0.5rem',    // 8px
  md: '0.75rem',   // 12px
  lg: '1rem',      // 16px
  xl: '1.5rem',    // 24px
  '2xl': '2rem',   // 32px
  '3xl': '3rem',   // 48px
  '4xl': '4rem',   // 64px
}

export const fontSize = {
  xs: '0.75rem',   // 12px
  sm: '0.875rem',  // 14px
  base: '1rem',    // 16px
  lg: '1.125rem',  // 18px
  xl: '1.25rem',   // 20px
  '2xl': '1.5rem', // 24px
  '3xl': '2rem',   // 32px
  '4xl': '4rem',   // 64px
}

export const fontWeight = {
  normal: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
}

export const borderRadius = {
  sm: '0.25rem',   // 4px
  md: '0.5rem',    // 8px
  lg: '0.75rem',   // 12px
  xl: '1rem',      // 16px
}

export const buttons = {
  primary: {
    padding: `${spacing.md} ${spacing.xl}`,
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
    color: 'white',
    backgroundColor: colors.primary,
    border: 'none',
    borderRadius: borderRadius.md,
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  
  secondary: {
    padding: `${spacing.md} ${spacing.xl}`,
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    backgroundColor: colors.glass,
    border: `1px solid ${colors.glassBorder}`,
    borderRadius: borderRadius.md,
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  
  danger: {
    padding: `${spacing.md} ${spacing.xl}`,
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
    color: 'white',
    backgroundColor: colors.error,
    border: 'none',
    borderRadius: borderRadius.md,
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  
  small: {
    padding: `${spacing.sm} ${spacing.lg}`,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
  },
}

export const badges = {
  success: {
    padding: `${spacing.xs} ${spacing.md}`,
    borderRadius: borderRadius.md,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
    backgroundColor: `${colors.success}20`,
    color: colors.success,
  },
  
  warning: {
    padding: `${spacing.xs} ${spacing.md}`,
    borderRadius: borderRadius.md,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
    backgroundColor: `${colors.warning}20`,
    color: colors.warning,
  },
  
  error: {
    padding: `${spacing.xs} ${spacing.md}`,
    borderRadius: borderRadius.md,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
    backgroundColor: `${colors.error}20`,
    color: colors.error,
  },
  
  primary: {
    padding: `${spacing.xs} ${spacing.md}`,
    borderRadius: borderRadius.md,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
    backgroundColor: `${colors.primary}20`,
    color: colors.primary,
  },
}

export const alerts = {
  success: {
    backgroundColor: colors.successLight,
    border: `2px solid ${colors.success}`,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    color: colors.successDark,
  },
  
  warning: {
    backgroundColor: colors.warningLight,
    border: `2px solid ${colors.warning}`,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    color: colors.warningDark,
  },
  
  error: {
    backgroundColor: colors.errorLight,
    border: `2px solid ${colors.error}`,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    color: colors.errorDark,
  },
}

export const cards = {
  glass: {
    padding: spacing.xl,
    borderRadius: borderRadius.xl,
    backgroundColor: colors.glass,
  },
  
  glassLarge: {
    padding: spacing['2xl'],
    borderRadius: borderRadius.xl,
    backgroundColor: colors.glass,
  },
}
