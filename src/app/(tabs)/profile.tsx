import { useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Colors, Radius, Spacing, Typography } from '@/constants/tokens';
import { useMe } from '@/hooks/use-me';
import { logActivity } from '@/services/activity-log';
import { logout } from '@/services/auth-service';
import { listDeliveries } from '@/services/deliveries-service';
import { kv } from '@/services/storage';
import type { Delivery } from '@/types/api';

const APP_VERSION = '1.0.0'; // mirrors mobile/app.json "version"
const NOTIFICATIONS_PREF_KEY = 'openDispatch.notificationsEnabled';

function isToday(isoDate: string): boolean {
  const date = new Date(isoDate);
  const now = new Date();
  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  );
}

function initialsFor(email: string): string {
  const [name] = email.split('@');
  return name.slice(0, 2).toUpperCase();
}

/**
 * Driver profile. Built from mobile_wireframes/driver_profile/code.html,
 * reconciled to what the API actually has:
 *
 *  - No name, photo, or employee-ID field exists on User/Driver — the
 *    wireframe's "Alex Rivera" / photo / "DRV-5120-X" are fabricated data
 *    this app doesn't have. Shown instead: an initials avatar derived
 *    from the driver's email, the email itself as the identity line, and
 *    the driver profile's own `id` (real) where the wireframe had a
 *    fake badge number.
 *  - Vehicle number and on-trip/idle status ARE real (`/v1/auth/me`,
 *    Phase 4) and are shown as-is.
 *  - "Distance" and "Hours" stat cards are dropped — there's no location
 *    tracking or shift-clock feature in this app to source them from
 *    (Sync screen's "Location Tracking" row is honestly marked "Not
 *    enabled" for the same reason). Completed/Pending counts are real,
 *    computed from this driver's own deliveries for today
 *    (GET /v1/deliveries?driverId=...&status=..., driverId filter added
 *    in Phase 4).
 *  - No "Edit Profile" button — there's no update-user/update-driver
 *    endpoint to save to.
 *  - Settings section: Notifications is a genuine persisted local
 *    preference (MMKV), but isn't wired to any push-notification service
 *    yet — noted here, not silently faked. "Dark Mode" is omitted
 *    entirely: constants/tokens.ts is a single light palette with no
 *    dark variant, so a toggle would be a no-op lie. "Security" shows
 *    real, static info about how tokens are stored.
 */
export default function ProfileScreen() {
  const queryClient = useQueryClient();
  const { data: me, isLoading: meLoading, isError: meError } = useMe();
  const [notificationsEnabled, setNotificationsEnabled] = useState(
    () => kv.getJson<boolean>(NOTIFICATIONS_PREF_KEY) ?? true,
  );
  const [signingOut, setSigningOut] = useState(false);

  const driverId = me?.driver?.id;

  const { data: driverDeliveries } = useQuery({
    queryKey: ['jobs', 'driverAll', driverId],
    enabled: Boolean(driverId),
    queryFn: async (): Promise<Delivery[]> => {
      const { items } = await listDeliveries({ driverId, limit: 100 });
      return items;
    },
  });

  const todaySummary = useMemo(() => {
    const todayItems = (driverDeliveries ?? []).filter((item) => isToday(item.createdAt));
    const completed = todayItems.filter((item) => item.status === 'DELIVERED').length;
    const pending = todayItems.filter(
      (item) => item.status === 'PENDING' || item.status === 'IN_TRANSIT',
    ).length;
    return { completed, pending };
  }, [driverDeliveries]);

  function handleToggleNotifications(value: boolean) {
    setNotificationsEnabled(value);
    kv.setJson(NOTIFICATIONS_PREF_KEY, value);
    logActivity(`Notifications ${value ? 'enabled' : 'disabled'}`, 'neutral');
  }

  async function handleLogout() {
    setSigningOut(true);
    try {
      await logout();
      queryClient.clear();
      router.replace('/(auth)/login');
    } finally {
      setSigningOut(false);
    }
  }

  if (meLoading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centerFill}>
          <ActivityIndicator color={Colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (meError || !me) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centerFill}>
          <Text style={styles.errorTitle}>Couldn&apos;t load your profile</Text>
          <Text style={styles.errorSubtitle}>Check your connection and try again.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const driver = me.driver;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.screenTitle}>Driver Profile</Text>

        <View style={styles.hero}>
          <View style={styles.avatarWrap}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{initialsFor(me.email)}</Text>
            </View>
            {driver && (
              <View
                style={[
                  styles.presenceDot,
                  { backgroundColor: driver.status === 'ON_TRIP' ? Colors.success : Colors.disabled },
                ]}
              />
            )}
          </View>
          <Text style={styles.heroEmail}>{me.email}</Text>
          <Text style={styles.heroRole}>{me.role}</Text>

          {driver && (
            <View style={styles.heroMetaRow}>
              <View style={styles.heroMetaItem}>
                <Text style={styles.heroMetaIcon}>🪪</Text>
                <Text style={styles.heroMetaText} numberOfLines={1}>
                  {driver.id}
                </Text>
              </View>
              <View style={styles.heroMetaItem}>
                <Text style={styles.heroMetaIcon}>🚚</Text>
                <Text style={styles.heroMetaText}>{driver.vehicleNo}</Text>
              </View>
            </View>
          )}
        </View>

        {driver && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>TODAY&apos;S SUMMARY</Text>
            <View style={styles.summaryGrid}>
              <View style={styles.summaryCard}>
                <Text style={styles.summaryIcon}>✅</Text>
                <Text style={styles.summaryLabel}>Completed</Text>
                <Text style={styles.summaryValue}>{todaySummary.completed}</Text>
              </View>
              <View style={styles.summaryCard}>
                <Text style={styles.summaryIcon}>⏳</Text>
                <Text style={styles.summaryLabel}>Pending</Text>
                <Text style={styles.summaryValue}>{todaySummary.pending}</Text>
              </View>
            </View>
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>SETTINGS</Text>
          <View style={styles.settingsCard}>
            <View style={styles.settingsRow}>
              <View style={styles.settingsRowText}>
                <Text style={styles.settingsRowTitle}>Notifications</Text>
                <Text style={styles.settingsRowSubtitle}>Local preference only, not yet wired to push</Text>
              </View>
              <Switch
                value={notificationsEnabled}
                onValueChange={handleToggleNotifications}
                trackColor={{ true: Colors.primary, false: Colors.border }}
                thumbColor={Colors.surface}
              />
            </View>
            <View style={[styles.settingsRow, styles.settingsRowLast]}>
              <View style={styles.settingsRowText}>
                <Text style={styles.settingsRowTitle}>Security</Text>
                <Text style={styles.settingsRowSubtitle}>Session tokens stored in device Secure Storage</Text>
              </View>
              <Text style={styles.settingsRowMuted}>🔒</Text>
            </View>
          </View>
        </View>

        <View style={styles.logoutSection}>
          <Pressable
            onPress={handleLogout}
            disabled={signingOut}
            style={({ pressed }) => [styles.logoutButton, pressed && styles.logoutButtonPressed]}>
            {signingOut ? (
              <ActivityIndicator color={Colors.danger} />
            ) : (
              <Text style={styles.logoutButtonText}>Logout</Text>
            )}
          </Pressable>
          <Text style={styles.versionText}>Open Dispatch Mobile v{APP_VERSION}</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
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
    gap: Spacing.xs,
    paddingHorizontal: Spacing['2xl'],
  },
  errorTitle: {
    ...Typography.bodyLarge,
    color: Colors.heading,
  },
  errorSubtitle: {
    ...Typography.body,
    color: Colors.muted,
    textAlign: 'center',
  },
  scrollContent: {
    padding: Spacing.lg,
    paddingBottom: Spacing['3xl'],
    gap: Spacing['2xl'],
  },
  screenTitle: {
    ...Typography.h2,
    color: Colors.heading,
  },
  hero: {
    alignItems: 'center',
    gap: Spacing.xs,
  },
  avatarWrap: {
    marginBottom: Spacing.sm,
  },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: Colors.heading,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    ...Typography.h1,
    color: Colors.onPrimary,
  },
  presenceDot: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: Colors.background,
  },
  heroEmail: {
    ...Typography.h3,
    color: Colors.heading,
  },
  heroRole: {
    ...Typography.smallLabel,
    color: Colors.muted,
    letterSpacing: 1,
  },
  heroMetaRow: {
    flexDirection: 'row',
    gap: Spacing.lg,
    marginTop: Spacing.sm,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  heroMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    maxWidth: 200,
  },
  heroMetaIcon: {
    fontSize: 14,
  },
  heroMetaText: {
    ...Typography.caption,
    color: Colors.muted,
  },
  section: {
    gap: Spacing.sm,
  },
  sectionTitle: {
    ...Typography.smallLabel,
    color: Colors.muted,
    letterSpacing: 1,
  },
  summaryGrid: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.card,
    padding: Spacing.lg,
  },
  summaryIcon: {
    fontSize: 18,
    marginBottom: Spacing.xs,
  },
  summaryLabel: {
    ...Typography.caption,
    color: Colors.muted,
  },
  summaryValue: {
    ...Typography.h2,
    color: Colors.heading,
    marginTop: 2,
  },
  settingsCard: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.card,
    overflow: 'hidden',
  },
  settingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
    gap: Spacing.md,
  },
  settingsRowLast: {
    borderBottomWidth: 0,
  },
  settingsRowText: {
    flex: 1,
  },
  settingsRowTitle: {
    ...Typography.body,
    color: Colors.heading,
    fontWeight: '600',
  },
  settingsRowSubtitle: {
    ...Typography.caption,
    color: Colors.muted,
    marginTop: 1,
  },
  settingsRowMuted: {
    fontSize: 16,
  },
  logoutSection: {
    alignItems: 'center',
    gap: Spacing.md,
    paddingTop: Spacing.lg,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 48,
    paddingHorizontal: Spacing['2xl'],
    borderRadius: Radius.button,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  logoutButtonPressed: {
    backgroundColor: '#FEF2F2',
  },
  logoutButtonText: {
    ...Typography.button,
    color: Colors.danger,
  },
  versionText: {
    ...Typography.caption,
    color: Colors.disabled,
  },
});
