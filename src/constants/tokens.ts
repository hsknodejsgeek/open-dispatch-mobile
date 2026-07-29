/**
 * Design tokens for Open Dispatch Mobile — Driver / Field Agent Companion.
 *
 * Sourced from `mobile_wireframes/design.md` (Executive Intelligence palette)
 * and `server/docs/mobile UI/design.md` (Open Dispatch Mobile design system).
 *
 * Deliberately NOT NativeWind/Tailwind — plain `StyleSheet.create` + these
 * tokens, using only core React Native components. See
 * docs/MOBILE_IMPLEMENTATION_PHASES.md, Phase 0 notes.
 */
import { Platform } from 'react-native';

export const Colors = {
  primary: '#2563EB',
  primaryPressed: '#1D4ED8',
  success: '#16A34A',
  warning: '#F59E0B',
  danger: '#DC2626',
  info: '#0EA5E9',

  background: '#F8FAFC',
  surface: '#FFFFFF',
  card: '#FFFFFF',
  border: '#E5E7EB',
  divider: '#EEF2F7',

  heading: '#111827',
  body: '#374151',
  muted: '#6B7280',
  disabled: '#9CA3AF',
  onPrimary: '#FFFFFF',

  // Delivery status colors
  statusPending: '#F59E0B',
  statusAccepted: '#2563EB',
  statusInTransit: '#2563EB',
  statusDelivered: '#16A34A',
  statusCancelled: '#DC2626',
  statusOffline: '#6B7280',

  // Priority badge colors
  priorityHigh: '#DC2626',
  priorityMedium: '#F59E0B',
  priorityLow: '#6B7280',
} as const;

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  '3xl': 32,
  '4xl': 40,
  '5xl': 48,
  '6xl': 64,
} as const;

export const Radius = {
  card: 16,
  button: 14,
  input: 14,
  bottomSheet: 24,
  chip: 999,
} as const;

export const FontFamily = Platform.select({
  ios: 'Inter',
  android: 'Inter',
  default: 'Inter',
});

export const Typography = {
  display: { fontSize: 32, fontWeight: '700' as const, lineHeight: 40 },
  h1: { fontSize: 28, fontWeight: '700' as const, lineHeight: 36 },
  h2: { fontSize: 24, fontWeight: '600' as const, lineHeight: 32 },
  h3: { fontSize: 20, fontWeight: '600' as const, lineHeight: 28 },
  sectionTitle: { fontSize: 18, fontWeight: '600' as const, lineHeight: 24 },
  bodyLarge: { fontSize: 16, fontWeight: '500' as const, lineHeight: 24 },
  body: { fontSize: 15, fontWeight: '400' as const, lineHeight: 22 },
  caption: { fontSize: 13, fontWeight: '400' as const, lineHeight: 18 },
  smallLabel: { fontSize: 12, fontWeight: '500' as const, lineHeight: 16 },
  button: { fontSize: 15, fontWeight: '600' as const, lineHeight: 20 },
} as const;

/** Very subtle elevation — no heavy shadows, per design.md. */
export const Shadow = {
  card: Platform.select({
    ios: {
      shadowColor: '#0F172A',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.06,
      shadowRadius: 3,
    },
    android: { elevation: 2 },
    default: {},
  }),
} as const;

export type DeliveryStatus = 'PENDING' | 'IN_TRANSIT' | 'DELIVERED' | 'CANCELLED';
export type Priority = 'HIGH' | 'MEDIUM' | 'LOW';

export const statusColor: Record<DeliveryStatus, string> = {
  PENDING: Colors.statusPending,
  IN_TRANSIT: Colors.statusInTransit,
  DELIVERED: Colors.statusDelivered,
  CANCELLED: Colors.statusCancelled,
};

export const priorityColor: Record<Priority, string> = {
  HIGH: Colors.priorityHigh,
  MEDIUM: Colors.priorityMedium,
  LOW: Colors.priorityLow,
};
