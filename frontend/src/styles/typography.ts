// frontend/src/styles/typography.ts
import { StyleSheet } from 'react-native';
import { COLORS } from './colors';

export const TYPOGRAPHY = StyleSheet.create({
  screenTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.textPrimary,
    letterSpacing: 0.3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  cardLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  cardSubLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.textSecondary,
  },
  body: {
    fontSize: 14,
    fontWeight: '400',
    color: COLORS.textPrimary,
  },
  bodyMedium: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.textPrimary,
  },
  bodyBold: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  caption: {
    fontSize: 12,
    fontWeight: '400',
    color: COLORS.textMuted,
  },
  captionBold: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textMuted,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  amount: {
    fontSize: 28,
    fontWeight: '800',
    color: COLORS.textPrimary,
    letterSpacing: -0.5,
  },
  amountSmall: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  buttonText: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.white,
    letterSpacing: 0.3,
  },
  linkText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary,
  },
  errorText: {
    fontSize: 12,
    fontWeight: '500',
    color: COLORS.error,
  },
});
