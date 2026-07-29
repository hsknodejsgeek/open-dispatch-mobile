import NetInfo, { useNetInfo } from '@react-native-community/netinfo';
import { useMutationState, useQueryClient } from '@tanstack/react-query';
import { formatDistanceToNowStrict } from 'date-fns';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Colors, Radius, Spacing, Typography } from '@/constants/tokens';
import { UPDATE_JOB_STATUS_MUTATION_KEY, type UpdateJobStatusInput } from '@/hooks/use-update-job-status';
import { getLatencyStats } from '@/services/api-latency';
import { getActivityLog, logActivity, type ActivityEntry } from '@/services/activity-log';
import { isBackgroundSyncEnabled, setBackgroundSyncEnabled } from '@/services/query-client';
import { kv } from '@/services/storage';

const TONE_COLOR: Record<ActivityEntry['tone'], string> = {
  success: Colors.success,
  neutral: Colors.muted,
  warning: Colors.warning,
  danger: Colors.danger,
};

/**
 * Sync & Diagnostics. Built from mobile_wireframes/offline_sync/code.html,
 * but backed by real signals instead of the wireframe's static numbers:
 *
 *  - Connection status / network quality: @react-native-community/netinfo,
 *    the same source wired into TanStack Query's onlineManager
 *    (services/query-client.ts) so this screen reflects the exact
 *    connectivity state the query/mutation layer is reacting to.
 *  - Uploads / Failed counts: live TanStack Query mutation cache state for
 *    the job-status-update mutation (useMutationState), not a fake queue.
 *    A mutation fired while offline is auto-paused by TanStack Query's
 *    default networkMode and resumes when back online — genuine offline
 *    queueing, not simulated.
 *  - API Latency: real measured round-trip times, recorded by an axios
 *    interceptor in services/api.ts.
 *  - Recent Activity: a small MMKV-backed log (services/activity-log.ts)
 *    appended to by real events (sign-in, status updates, token refresh).
 *
 * Dropped from the wireframe: "Local Database (SQLite)" — this app has no
 * SQLite, only MMKV — and "Location Tracking: ACTIVE", since no location
 * library/permission flow exists yet; shown honestly as not enabled
 * instead of faking an active state.
 */
export default function SyncStatusScreen() {
  const netInfo = useNetInfo();
  const queryClient = useQueryClient();
  const [backgroundSync, setBackgroundSyncState] = useState(isBackgroundSyncEnabled());
  const [activity, setActivity] = useState<ActivityEntry[]>(getActivityLog());
  const [, forceTick] = useState(0);

  const pendingMutations = useMutationState({
    filters: { mutationKey: UPDATE_JOB_STATUS_MUTATION_KEY, status: 'pending' },
  });
  const failedMutations = useMutationState({
    filters: { mutationKey: UPDATE_JOB_STATUS_MUTATION_KEY, status: 'error' },
  });

  const { avgMs, samples } = getLatencyStats();
  const cacheEntryCount = queryClient.getQueryCache().getAll().length;
  const mmkvSizeKb = (kv.sizeBytes() / 1024).toFixed(1);

  // Re-render every few seconds so relative "x ago" labels and cache stats
  // stay fresh even with no new events, and re-read the activity log after
  // actions that append to it.
  useEffect(() => {
    const interval = setInterval(() => forceTick((n) => n + 1), 5000);
    return () => clearInterval(interval);
  }, []);

  function refreshActivity() {
    setActivity(getActivityLog());
  }

  async function handleRetryAll() {
    const mutations = queryClient
      .getMutationCache()
      .findAll({ mutationKey: UPDATE_JOB_STATUS_MUTATION_KEY, status: 'error' });
    if (mutations.length === 0) return;
    await Promise.allSettled(
      mutations.map((mutation) => mutation.execute(mutation.state.variables as UpdateJobStatusInput)),
    );
    logActivity(`Retried ${mutations.length} failed upload${mutations.length === 1 ? '' : 's'}`, 'neutral');
    refreshActivity();
  }

  function handleClearQueue() {
    queryClient.getMutationCache().clear();
    logActivity('Cleared sync queue', 'neutral');
    refreshActivity();
  }

  function handleToggleBackgroundSync(value: boolean) {
    setBackgroundSyncState(value);
    setBackgroundSyncEnabled(value);
    logActivity(`Background sync ${value ? 'enabled' : 'disabled'}`, 'neutral');
    refreshActivity();
  }

  async function handleRefreshConnection() {
    const state = await NetInfo.fetch();
    logActivity(state.isConnected ? 'Connection check: online' : 'Connection check: offline', 'neutral');
    refreshActivity();
  }

  const isOnline = Boolean(netInfo.isConnected && netInfo.isInternetReachable !== false);
  const networkQualityLabel = describeNetworkQuality(netInfo);
  const uploadsCount = pendingMutations.length;
  const failedCount = failedMutations.length;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.screenTitle}>Sync &amp; Diagnostics</Text>

        <Pressable
          onPress={handleRefreshConnection}
          style={({ pressed }) => [styles.connectionCard, pressed && styles.cardPressed]}>
          <View style={styles.connectionRow}>
            <View
              style={[
                styles.connectionIconBadge,
                { backgroundColor: isOnline ? '#ECFDF5' : '#FEF2F2' },
              ]}>
              <Text style={styles.connectionIconText}>{isOnline ? '📶' : '📵'}</Text>
            </View>
            <View style={styles.connectionTextWrap}>
              <Text style={styles.connectionLabel}>CONNECTION STATUS</Text>
              <Text
                style={[
                  styles.connectionValue,
                  { color: isOnline ? Colors.success : Colors.danger },
                ]}>
                {isOnline ? 'Connected • Online' : 'Offline'}
              </Text>
            </View>
          </View>
          <View style={styles.connectionStatsRow}>
            <View>
              <Text style={styles.connectionLabel}>NETWORK QUALITY</Text>
              <Text style={styles.connectionStatValue}>{networkQualityLabel}</Text>
            </View>
            <View>
              <Text style={styles.connectionLabel}>LAST ACTIVITY</Text>
              <Text style={styles.connectionStatValue}>
                {activity[0] ? formatDistanceToNowStrict(new Date(activity[0].at), { addSuffix: true }) : '—'}
              </Text>
            </View>
          </View>
        </Pressable>

        <View style={styles.queueGrid}>
          <View style={styles.queueCard}>
            <View style={styles.queueCardHeader}>
              <Text style={styles.queueCardLabel}>UPLOADS</Text>
            </View>
            <Text style={styles.queueCardValue}>{uploadsCount}</Text>
            <Text style={styles.queueCardHint}>Pending items</Text>
          </View>
          <View style={styles.queueCard}>
            <View style={styles.queueCardHeader}>
              <Text style={[styles.queueCardLabel, failedCount > 0 && styles.queueCardLabelDanger]}>
                FAILED
              </Text>
            </View>
            <Text style={[styles.queueCardValue, failedCount > 0 && styles.queueCardValueDanger]}>
              {failedCount}
            </Text>
            <Text style={styles.queueCardHint}>Requiring action</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>SYSTEM HEALTH</Text>
          <View style={styles.healthCard}>
            <HealthRow title="Query Cache" subtitle="TanStack Query entries" value={`${cacheEntryCount} entries`} />
            <HealthRow title="MMKV Cache" subtitle="Fast key-value store" value={`${mmkvSizeKb} KB`} />
            <HealthRow
              title="API Latency"
              subtitle="Last 30 calls avg."
              value={avgMs !== null ? `${avgMs}ms` : 'No data yet'}
              sparkline={samples}
            />
            <View style={styles.healthRow}>
              <View style={styles.healthRowText}>
                <Text style={styles.healthRowTitle}>Background Sync</Text>
                <Text style={styles.healthRowSubtitle}>Refetch on reconnect</Text>
              </View>
              <Switch
                value={backgroundSync}
                onValueChange={handleToggleBackgroundSync}
                trackColor={{ true: Colors.primary, false: Colors.border }}
                thumbColor={Colors.surface}
              />
            </View>
            <View style={[styles.healthRow, styles.healthRowLast]}>
              <View style={styles.healthRowText}>
                <Text style={styles.healthRowTitle}>Location Tracking</Text>
                <Text style={styles.healthRowSubtitle}>Not enabled in this build</Text>
              </View>
              <Text style={styles.healthRowMuted}>—</Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>RECENT ACTIVITY</Text>
          <View style={styles.activityCard}>
            {activity.length === 0 ? (
              <Text style={styles.activityEmpty}>Nothing logged yet this session.</Text>
            ) : (
              activity.map((entry, index) => (
                <View key={entry.id} style={styles.activityRow}>
                  <View style={styles.activityRail}>
                    <View style={[styles.activityDot, { backgroundColor: TONE_COLOR[entry.tone] }]} />
                    {index < activity.length - 1 && <View style={styles.activityConnector} />}
                  </View>
                  <View style={styles.activityTextWrap}>
                    <Text style={styles.activityLabel}>{entry.label}</Text>
                    <Text style={styles.activityTime}>
                      {formatDistanceToNowStrict(new Date(entry.at), { addSuffix: true })}
                    </Text>
                  </View>
                </View>
              ))
            )}
          </View>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <Pressable
          onPress={handleRetryAll}
          disabled={failedCount === 0}
          style={({ pressed }) => [
            styles.primaryButton,
            (pressed || failedCount === 0) && styles.primaryButtonDisabled,
          ]}>
          <Text style={styles.primaryButtonText}>↻ Retry All</Text>
        </Pressable>
        <Pressable
          onPress={handleClearQueue}
          style={({ pressed }) => [styles.secondaryButton, pressed && styles.secondaryButtonPressed]}>
          <Text style={styles.secondaryButtonText}>🗑 Clear Queue</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

function HealthRow({
  title,
  subtitle,
  value,
  sparkline,
}: {
  title: string;
  subtitle: string;
  value: string;
  sparkline?: number[];
}) {
  return (
    <View style={styles.healthRow}>
      <View style={styles.healthRowText}>
        <Text style={styles.healthRowTitle}>{title}</Text>
        <Text style={styles.healthRowSubtitle}>{subtitle}</Text>
      </View>
      <View style={styles.healthRowRight}>
        {sparkline && sparkline.length > 0 && (
          <View style={styles.sparkline}>
            {sparkline.slice(-8).map((ms, index) => (
              <View
                key={index}
                style={[
                  styles.sparklineBar,
                  { height: Math.max(4, Math.min(16, ms / 20)) },
                ]}
              />
            ))}
          </View>
        )}
        <Text style={styles.healthRowValue}>{value}</Text>
      </View>
    </View>
  );
}

function describeNetworkQuality(netInfo: ReturnType<typeof useNetInfo>): string {
  if (!netInfo.isConnected) return 'Offline';
  if (netInfo.type === 'wifi') return 'Wi-Fi';
  if (netInfo.type === 'cellular') {
    const generation = netInfo.details && 'cellularGeneration' in netInfo.details
      ? netInfo.details.cellularGeneration
      : null;
    return generation ? `Cellular (${generation.toUpperCase()})` : 'Cellular';
  }
  if (netInfo.type === 'none') return 'No connection';
  return netInfo.type ?? 'Unknown';
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    padding: Spacing.lg,
    paddingBottom: Spacing['3xl'],
    gap: Spacing.lg,
  },
  screenTitle: {
    ...Typography.h2,
    color: Colors.heading,
  },
  connectionCard: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.card,
    padding: Spacing.lg,
    gap: Spacing.lg,
  },
  cardPressed: {
    backgroundColor: Colors.divider,
  },
  connectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  connectionIconBadge: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  connectionIconText: {
    fontSize: 20,
  },
  connectionTextWrap: {
    flex: 1,
  },
  connectionLabel: {
    ...Typography.smallLabel,
    color: Colors.muted,
    marginBottom: 2,
  },
  connectionValue: {
    ...Typography.bodyLarge,
    fontWeight: '700',
  },
  connectionStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: Colors.divider,
    paddingTop: Spacing.md,
  },
  connectionStatValue: {
    ...Typography.body,
    color: Colors.heading,
    fontWeight: '600',
  },
  queueGrid: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  queueCard: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.card,
    padding: Spacing.lg,
  },
  queueCardHeader: {
    marginBottom: Spacing.sm,
  },
  queueCardLabel: {
    ...Typography.smallLabel,
    color: Colors.muted,
  },
  queueCardLabelDanger: {
    color: Colors.danger,
  },
  queueCardValue: {
    ...Typography.display,
    fontSize: 28,
    color: Colors.heading,
  },
  queueCardValueDanger: {
    color: Colors.danger,
  },
  queueCardHint: {
    ...Typography.caption,
    color: Colors.muted,
    marginTop: 2,
  },
  section: {
    gap: Spacing.sm,
  },
  sectionTitle: {
    ...Typography.smallLabel,
    color: Colors.muted,
    letterSpacing: 1,
  },
  healthCard: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.card,
    overflow: 'hidden',
  },
  healthRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
  },
  healthRowLast: {
    borderBottomWidth: 0,
  },
  healthRowText: {
    flex: 1,
  },
  healthRowTitle: {
    ...Typography.body,
    color: Colors.heading,
    fontWeight: '600',
  },
  healthRowSubtitle: {
    ...Typography.caption,
    color: Colors.muted,
    marginTop: 1,
  },
  healthRowRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  healthRowValue: {
    ...Typography.smallLabel,
    color: Colors.heading,
    fontWeight: '700',
  },
  healthRowMuted: {
    ...Typography.smallLabel,
    color: Colors.disabled,
  },
  sparkline: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 2,
    height: 16,
  },
  sparklineBar: {
    width: 3,
    backgroundColor: Colors.success,
    borderRadius: 1,
  },
  activityCard: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.card,
    padding: Spacing.lg,
  },
  activityEmpty: {
    ...Typography.body,
    color: Colors.muted,
  },
  activityRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.md,
  },
  activityRail: {
    alignItems: 'center',
    width: 8,
  },
  activityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 5,
  },
  activityConnector: {
    width: 1,
    flex: 1,
    minHeight: Spacing.lg,
    backgroundColor: Colors.divider,
    marginTop: 4,
  },
  activityTextWrap: {
    flex: 1,
    paddingBottom: Spacing.md,
  },
  activityLabel: {
    ...Typography.body,
    color: Colors.heading,
    fontWeight: '600',
  },
  activityTime: {
    ...Typography.caption,
    color: Colors.muted,
    marginTop: 1,
  },
  footer: {
    flexDirection: 'row',
    gap: Spacing.md,
    padding: Spacing.lg,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  primaryButton: {
    flex: 1,
    height: 48,
    borderRadius: Radius.button,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonDisabled: {
    opacity: 0.5,
  },
  primaryButtonText: {
    ...Typography.button,
    color: Colors.onPrimary,
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
  secondaryButtonText: {
    ...Typography.button,
    color: Colors.heading,
  },
});
