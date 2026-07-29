import { formatDistanceToNowStrict } from 'date-fns';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';

import { Colors, Radius, Spacing, Typography, priorityColor, statusColor } from '@/constants/tokens';
import type { Delivery } from '@/types/api';

const STATUS_LABEL: Record<Delivery['status'], string> = {
  PENDING: 'Pending',
  IN_TRANSIT: 'In Transit',
  DELIVERED: 'Delivered',
  CANCELLED: 'Cancelled',
};

interface JobCardProps {
  delivery: Delivery;
  onPressDetails: (delivery: Delivery) => void;
}

/**
 * Assigned job list item. Built from
 * mobile_wireframes/assigned_jobs_hero/code.html, adapted to the fields
 * the Delivery model actually has — no customer name/phone, package
 * weight, distance, or ETA exist on the backend, so those rows from the
 * wireframe are replaced with what's real: tracking number, both
 * addresses, priority, status, and a relative "updated" timestamp.
 */
export function JobCard({ delivery, onPressDetails }: JobCardProps) {
  const updatedAgo = formatDistanceToNowStrict(new Date(delivery.updatedAt), { addSuffix: true });

  function handleNavigate() {
    const query = encodeURIComponent(delivery.deliveryAddress);
    Linking.openURL(`https://maps.apple.com/?daddr=${query}`).catch(() => {
      Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${query}`);
    });
  }

  return (
    <Pressable
      onPress={() => onPressDetails(delivery)}
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}>
      <View style={styles.body}>
        <View style={styles.topRow}>
          <View style={styles.topLeft}>
            <View
              style={[
                styles.priorityBadge,
                { backgroundColor: `${priorityColor[delivery.priority]}1A` },
              ]}>
              <Text style={[styles.priorityBadgeText, { color: priorityColor[delivery.priority] }]}>
                {delivery.priority} PRIORITY
              </Text>
            </View>
            <Text style={styles.trackingNumber}>#{delivery.trackingNumber}</Text>
          </View>
          <View style={styles.statusPill}>
            <View style={[styles.statusDot, { backgroundColor: statusColor[delivery.status] }]} />
            <Text style={[styles.statusText, { color: statusColor[delivery.status] }]}>
              {STATUS_LABEL[delivery.status]}
            </Text>
          </View>
        </View>

        <View style={styles.addressBlock}>
          <View style={styles.addressRow}>
            <Text style={styles.addressIcon}>📍</Text>
            <View style={styles.addressTextWrap}>
              <Text style={styles.addressLabel}>DELIVER TO</Text>
              <Text style={styles.addressText} numberOfLines={2}>
                {delivery.deliveryAddress}
              </Text>
            </View>
          </View>
          <View style={styles.addressRow}>
            <Text style={styles.addressIcon}>📦</Text>
            <View style={styles.addressTextWrap}>
              <Text style={styles.addressLabel}>PICKUP FROM</Text>
              <Text style={styles.addressTextMuted} numberOfLines={2}>
                {delivery.pickupAddress}
              </Text>
            </View>
          </View>
        </View>

        <Text style={styles.updatedAt}>Updated {updatedAgo}</Text>
      </View>

      <View style={styles.actionRow}>
        <Pressable
          onPress={handleNavigate}
          style={({ pressed }) => [styles.actionButton, pressed && styles.actionButtonPressed]}>
          <Text style={styles.actionButtonText}>↗ Navigate</Text>
        </Pressable>
        <View style={styles.actionDivider} />
        <Pressable
          onPress={() => onPressDetails(delivery)}
          style={({ pressed }) => [styles.actionButton, pressed && styles.actionButtonPressed]}>
          <Text style={styles.actionButtonText}>Details</Text>
        </Pressable>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.card,
    marginBottom: Spacing.md,
    overflow: 'hidden',
  },
  cardPressed: {
    backgroundColor: Colors.divider,
  },
  body: {
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  topLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    flexShrink: 1,
  },
  priorityBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: 4,
  },
  priorityBadgeText: {
    ...Typography.smallLabel,
    fontSize: 10,
    fontWeight: '700',
  },
  trackingNumber: {
    ...Typography.smallLabel,
    color: Colors.muted,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    ...Typography.caption,
    fontWeight: '600',
  },
  addressBlock: {
    gap: Spacing.sm,
  },
  addressRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  addressIcon: {
    fontSize: 14,
    marginTop: 2,
  },
  addressTextWrap: {
    flex: 1,
  },
  addressLabel: {
    ...Typography.smallLabel,
    fontSize: 10,
    color: Colors.muted,
    marginBottom: 2,
  },
  addressText: {
    ...Typography.body,
    color: Colors.heading,
  },
  addressTextMuted: {
    ...Typography.body,
    color: Colors.body,
  },
  updatedAt: {
    ...Typography.caption,
    color: Colors.muted,
  },
  actionRow: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  actionButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
  },
  actionButtonPressed: {
    backgroundColor: Colors.divider,
  },
  actionButtonText: {
    ...Typography.smallLabel,
    color: Colors.primary,
    fontWeight: '700',
  },
  actionDivider: {
    width: 1,
    backgroundColor: Colors.border,
  },
});
