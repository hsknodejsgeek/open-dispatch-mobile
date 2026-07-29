import { router, useLocalSearchParams } from 'expo-router';
import { useRef } from 'react';
import {
  ActivityIndicator,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { StatusSheet, type StatusSheetHandle } from '@/components/status-sheet';
import { Colors, Radius, Spacing, Typography, priorityColor, statusColor } from '@/constants/tokens';
import { useJob } from '@/hooks/use-job';
import { useUpdateJobStatus } from '@/hooks/use-update-job-status';
import type { Delivery, DeliveryStatus } from '@/types/api';

const STATUS_LABEL: Record<DeliveryStatus, string> = {
  PENDING: 'Pending',
  IN_TRANSIT: 'In Transit',
  DELIVERED: 'Delivered',
  CANCELLED: 'Cancelled',
};

// Mirrors server VALID_STATUS_TRANSITIONS (src/modules/deliveries/controller.js)
// so the UI never offers a transition the API would reject with 409.
const PROGRESS_STEPS: DeliveryStatus[] = ['PENDING', 'IN_TRANSIT', 'DELIVERED'];

function nextStatusFor(status: DeliveryStatus): DeliveryStatus | null {
  if (status === 'PENDING') return 'IN_TRANSIT';
  if (status === 'IN_TRANSIT') return 'DELIVERED';
  return null;
}

function primaryActionLabel(status: DeliveryStatus): string | null {
  if (status === 'PENDING') return 'Start Delivery';
  if (status === 'IN_TRANSIT') return 'Mark as Delivered';
  return null;
}

/**
 * Job detail + status action sheet. Built from
 * mobile_wireframes/job_details/code.html, adapted to the fields the
 * Delivery model actually has.
 *
 * Dropped from the wireframe (no backing data): cargo weight/dimensions,
 * distance, ETA, and the live map preview — none of those exist on the
 * Delivery model or anywhere in the API. Also dropped the "Call" action
 * (no customer phone number in the data). The "Internal Metadata" section
 * is kept using real fields (id, createdAt, updatedAt, driverId) instead
 * of the wireframe's fabricated ones.
 */
export default function JobDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: delivery, isLoading } = useJob(id);
  const updateStatus = useUpdateJobStatus();
  const sheetRef = useRef<StatusSheetHandle>(null);

  function handleNavigate(address: string) {
    const query = encodeURIComponent(address);
    Linking.openURL(`https://maps.apple.com/?daddr=${query}`).catch(() => {
      Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${query}`);
    });
  }

  function handlePrimaryAction(current: Delivery) {
    const next = nextStatusFor(current.status);
    if (!next) return;

    sheetRef.current?.present({
      title: next === 'IN_TRANSIT' ? 'Start this delivery?' : 'Mark as delivered?',
      description:
        next === 'IN_TRANSIT'
          ? `Tracking ${current.trackingNumber} will move to In Transit.`
          : `Tracking ${current.trackingNumber} will be marked Delivered.`,
      confirmLabel: next === 'IN_TRANSIT' ? 'Start Delivery' : 'Mark Delivered',
      notesPlaceholder: 'Add a note (optional)',
      onConfirm: async () => {
        await updateStatus.mutateAsync({ id: current.id, status: next });
      },
    });
  }

  function handleReportIssue(current: Delivery) {
    sheetRef.current?.present({
      title: 'Report an issue',
      description: `This will cancel delivery ${current.trackingNumber}. This can't be undone.`,
      confirmLabel: 'Cancel Delivery',
      tone: 'danger',
      notesPlaceholder: 'What went wrong?',
      onConfirm: async () => {
        await updateStatus.mutateAsync({ id: current.id, status: 'CANCELLED' });
      },
    });
  }

  if (isLoading || !delivery) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centerFill}>
          <ActivityIndicator color={Colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  const progressIndex = PROGRESS_STEPS.indexOf(delivery.status);
  const isCancelled = delivery.status === 'CANCELLED';
  const isTerminal = delivery.status === 'DELIVERED' || isCancelled;
  const canCancel = delivery.status === 'PENDING' || delivery.status === 'IN_TRANSIT';
  const primaryLabel = primaryActionLabel(delivery.status);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={styles.backButton}>
          <Text style={styles.backButtonText}>←</Text>
        </Pressable>
        <Text style={styles.headerTitle}>Job Details</Text>
        <View style={styles.backButton} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.statusHeader}>
          <View>
            <Text style={styles.eyebrow}>TRACKING NUMBER</Text>
            <Text style={styles.trackingNumber}>{delivery.trackingNumber}</Text>
          </View>
          <View style={styles.statusHeaderRight}>
            <View style={styles.statusChip}>
              <View style={[styles.statusDot, { backgroundColor: statusColor[delivery.status] }]} />
              <Text style={[styles.statusChipText, { color: statusColor[delivery.status] }]}>
                {STATUS_LABEL[delivery.status].toUpperCase()}
              </Text>
            </View>
            <Text style={[styles.priorityChip, { color: priorityColor[delivery.priority] }]}>
              {delivery.priority} PRIORITY
            </Text>
          </View>
        </View>

        {!isCancelled && (
          <View style={styles.progressSection}>
            <View style={styles.progressTrack}>
              <View
                style={[
                  styles.progressFill,
                  { width: `${(Math.max(progressIndex, 0) / (PROGRESS_STEPS.length - 1)) * 100}%` },
                ]}
              />
            </View>
            <View style={styles.progressLabelsRow}>
              {PROGRESS_STEPS.map((step, index) => (
                <Text
                  key={step}
                  style={[
                    styles.progressLabel,
                    index <= progressIndex && styles.progressLabelActive,
                  ]}>
                  {STATUS_LABEL[step]}
                </Text>
              ))}
            </View>
          </View>
        )}

        {isCancelled && (
          <View style={styles.cancelledBanner}>
            <Text style={styles.cancelledBannerText}>This delivery was cancelled.</Text>
          </View>
        )}

        <View style={styles.addressSection}>
          <Pressable
            onPress={() => handleNavigate(delivery.pickupAddress)}
            style={({ pressed }) => [styles.addressCard, pressed && styles.addressCardPressed]}>
            <View style={styles.addressIconBadge}>
              <Text style={styles.addressIconText}>📍</Text>
            </View>
            <View style={styles.addressCardText}>
              <Text style={styles.addressCardLabel}>PICKUP ADDRESS</Text>
              <Text style={styles.addressCardValue}>{delivery.pickupAddress}</Text>
            </View>
          </Pressable>

          <View style={styles.connector} />

          <Pressable
            onPress={() => handleNavigate(delivery.deliveryAddress)}
            style={({ pressed }) => [styles.addressCard, pressed && styles.addressCardPressed]}>
            <View style={[styles.addressIconBadge, styles.addressIconBadgeFilled]}>
              <Text style={[styles.addressIconText, styles.addressIconTextLight]}>🏁</Text>
            </View>
            <View style={styles.addressCardText}>
              <Text style={styles.addressCardLabel}>DELIVERY ADDRESS</Text>
              <Text style={styles.addressCardValue}>{delivery.deliveryAddress}</Text>
            </View>
          </Pressable>
        </View>

        <View style={styles.metadataSection}>
          <Text style={styles.sectionTitle}>INTERNAL METADATA</Text>
          <View style={styles.metadataCard}>
            <MetadataRow label="Internal ID" value={delivery.id} />
            <MetadataRow label="Created At" value={new Date(delivery.createdAt).toLocaleString()} />
            <MetadataRow
              label="Last Updated"
              value={new Date(delivery.updatedAt).toLocaleString()}
            />
            <MetadataRow label="Driver ID" value={delivery.driverId ?? 'Unassigned'} last />
          </View>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        {primaryLabel && (
          <Pressable
            onPress={() => handlePrimaryAction(delivery)}
            disabled={updateStatus.isPending}
            style={({ pressed }) => [
              styles.primaryButton,
              pressed && styles.primaryButtonPressed,
              updateStatus.isPending && styles.primaryButtonDisabled,
            ]}>
            {updateStatus.isPending ? (
              <ActivityIndicator color={Colors.onPrimary} />
            ) : (
              <Text style={styles.primaryButtonText}>{primaryLabel}</Text>
            )}
          </Pressable>
        )}

        {isTerminal && (
          <View style={styles.terminalBadge}>
            <Text style={[styles.terminalBadgeText, { color: statusColor[delivery.status] }]}>
              {STATUS_LABEL[delivery.status]}
            </Text>
          </View>
        )}

        <View style={styles.secondaryRow}>
          <Pressable
            onPress={() => handleNavigate(delivery.deliveryAddress)}
            style={({ pressed }) => [styles.secondaryButton, pressed && styles.secondaryButtonPressed]}>
            <Text style={styles.secondaryButtonText}>↗ NAV</Text>
          </Pressable>
          {canCancel && (
            <Pressable
              onPress={() => handleReportIssue(delivery)}
              style={({ pressed }) => [
                styles.secondaryButton,
                styles.secondaryButtonDanger,
                pressed && styles.secondaryButtonPressed,
              ]}>
              <Text style={[styles.secondaryButtonText, styles.secondaryButtonDangerText]}>
                ⚠ ISSUE
              </Text>
            </Pressable>
          )}
        </View>
      </View>

      <StatusSheet ref={sheetRef} />
    </SafeAreaView>
  );
}

function MetadataRow({ label, value, last }: { label: string; value: string; last?: boolean }) {
  return (
    <View style={[styles.metadataRow, !last && styles.metadataRowBorder]}>
      <Text style={styles.metadataLabel}>{label}</Text>
      <Text style={styles.metadataValue} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  centerFill: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    height: 56,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backButtonText: {
    fontSize: 20,
    color: Colors.heading,
  },
  headerTitle: {
    ...Typography.sectionTitle,
    color: Colors.heading,
  },
  scrollContent: {
    padding: Spacing.lg,
    paddingBottom: Spacing['3xl'],
    gap: Spacing['2xl'],
  },
  statusHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  eyebrow: {
    ...Typography.smallLabel,
    color: Colors.muted,
    letterSpacing: 1,
    marginBottom: 2,
  },
  trackingNumber: {
    ...Typography.h1,
    color: Colors.heading,
  },
  statusHeaderRight: {
    alignItems: 'flex-end',
    gap: Spacing.xs,
  },
  statusChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: Radius.button,
    backgroundColor: Colors.divider,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusChipText: {
    ...Typography.smallLabel,
    fontWeight: '700',
  },
  priorityChip: {
    ...Typography.smallLabel,
    fontSize: 10,
    fontWeight: '700',
  },
  progressSection: {
    gap: Spacing.sm,
  },
  progressTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.border,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.primary,
    borderRadius: 3,
  },
  progressLabelsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  progressLabel: {
    ...Typography.caption,
    color: Colors.disabled,
  },
  progressLabelActive: {
    color: Colors.heading,
    fontWeight: '600',
  },
  cancelledBanner: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: Radius.input,
    padding: Spacing.md,
  },
  cancelledBannerText: {
    ...Typography.body,
    color: Colors.danger,
  },
  addressSection: {},
  addressCard: {
    flexDirection: 'row',
    gap: Spacing.md,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.card,
    padding: Spacing.lg,
  },
  addressCardPressed: {
    backgroundColor: Colors.divider,
  },
  addressIconBadge: {
    width: 40,
    height: 40,
    borderRadius: Radius.button,
    backgroundColor: Colors.divider,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addressIconBadgeFilled: {
    backgroundColor: Colors.heading,
  },
  addressIconText: {
    fontSize: 16,
  },
  addressIconTextLight: {
    opacity: 0.9,
  },
  addressCardText: {
    flex: 1,
    justifyContent: 'center',
  },
  addressCardLabel: {
    ...Typography.smallLabel,
    color: Colors.muted,
    marginBottom: 2,
  },
  addressCardValue: {
    ...Typography.bodyLarge,
    color: Colors.heading,
  },
  connector: {
    width: 1,
    height: 20,
    backgroundColor: Colors.border,
    marginLeft: 20 + Spacing.lg,
  },
  metadataSection: {
    gap: Spacing.sm,
  },
  sectionTitle: {
    ...Typography.smallLabel,
    color: Colors.muted,
    letterSpacing: 1,
  },
  metadataCard: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.card,
    overflow: 'hidden',
  },
  metadataRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    gap: Spacing.md,
  },
  metadataRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
  },
  metadataLabel: {
    ...Typography.body,
    color: Colors.muted,
  },
  metadataValue: {
    ...Typography.smallLabel,
    color: Colors.heading,
    fontWeight: '600',
    flexShrink: 1,
    textAlign: 'right',
  },
  footer: {
    padding: Spacing.lg,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    gap: Spacing.sm,
    backgroundColor: Colors.surface,
  },
  primaryButton: {
    height: 56,
    borderRadius: Radius.button,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonPressed: {
    backgroundColor: Colors.primaryPressed,
  },
  primaryButtonDisabled: {
    opacity: 0.8,
  },
  primaryButtonText: {
    ...Typography.button,
    fontSize: 16,
    color: Colors.onPrimary,
  },
  terminalBadge: {
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  terminalBadgeText: {
    ...Typography.bodyLarge,
    fontWeight: '700',
  },
  secondaryRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  secondaryButton: {
    flex: 1,
    height: 48,
    borderRadius: Radius.button,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButtonPressed: {
    backgroundColor: Colors.divider,
  },
  secondaryButtonDanger: {
    borderColor: '#FECACA',
  },
  secondaryButtonText: {
    ...Typography.smallLabel,
    color: Colors.heading,
    fontWeight: '700',
  },
  secondaryButtonDangerText: {
    color: Colors.danger,
  },
});
