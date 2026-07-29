import { FlashList } from '@shopify/flash-list';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { JobCard } from '@/components/job-card';
import { Colors, Radius, Spacing, Typography } from '@/constants/tokens';
import { useAssignedJobs } from '@/hooks/use-assigned-jobs';
import type { Delivery, DeliveryStatus } from '@/types/api';

type FilterKey = 'ALL' | DeliveryStatus;

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: 'ALL', label: 'All' },
  { key: 'PENDING', label: 'Pending' },
  { key: 'IN_TRANSIT', label: 'In Transit' },
  { key: 'DELIVERED', label: 'Delivered' },
];

/**
 * Assigned jobs feed. Built from
 * mobile_wireframes/assigned_jobs_hero/code.html: greeting header, search
 * + status filter chips, a summary card, and an infinite-scrolling
 * FlashList of job cards.
 *
 * The wireframe's bottom nav bar and driver avatar photo aren't
 * reproduced here — the bottom nav is the real native tab bar from
 * (tabs)/_layout.tsx, and there's no driver photo/name field in the
 * `/v1/auth/me` response yet (Phase 4 added driver vehicle/status only,
 * not a display name or photo — see Phase 9 profile screen for how that's
 * handled).
 */
export default function AssignedJobsScreen() {
  const [filter, setFilter] = useState<FilterKey>('ALL');
  const [search, setSearch] = useState('');

  const { items, isLoading, isRefetching, refetch, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useAssignedJobs(filter === 'ALL' ? {} : { status: filter });

  const filteredItems = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return items;
    return items.filter(
      (item) =>
        item.trackingNumber.toLowerCase().includes(query) ||
        item.pickupAddress.toLowerCase().includes(query) ||
        item.deliveryAddress.toLowerCase().includes(query),
    );
  }, [items, search]);

  const summary = useMemo(() => {
    const completed = items.filter((item) => item.status === 'DELIVERED').length;
    const pending = items.filter((item) => item.status === 'PENDING' || item.status === 'IN_TRANSIT')
      .length;
    return { completed, pending };
  }, [items]);

  function handlePressDetails(delivery: Delivery) {
    router.push(`/job/${delivery.id}`);
  }

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  }, []);

  const dateLabel = useMemo(
    () => new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' }),
    [],
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.dateLabel}>{dateLabel}</Text>
        <Text style={styles.greeting}>{greeting}</Text>
      </View>

      <View style={styles.searchWrap}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search by tracking # or address"
          placeholderTextColor={Colors.disabled}
          style={styles.searchInput}
        />
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterRow}
        contentContainerStyle={styles.filterListContent}>
        {FILTERS.map((item) => (
          <Pressable key={item.key} onPress={() => setFilter(item.key)}>
            <Text style={[styles.filterChip, filter === item.key && styles.filterChipActive]}>
              {item.label}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      <View style={styles.summaryCard}>
        <View style={styles.summaryHeaderRow}>
          <Text style={styles.summaryTitle}>Today&apos;s Deliveries</Text>
        </View>
        <View style={styles.summaryStatsRow}>
          <View style={styles.summaryStat}>
            <Text style={styles.summaryStatLabel}>COMPLETED</Text>
            <Text style={styles.summaryStatValue}>{summary.completed}</Text>
          </View>
          <View style={styles.summaryStat}>
            <Text style={styles.summaryStatLabel}>PENDING</Text>
            <Text style={styles.summaryStatValue}>{summary.pending}</Text>
          </View>
          <View style={styles.summaryStat}>
            <Text style={styles.summaryStatLabel}>TOTAL</Text>
            <Text style={styles.summaryStatValue}>{items.length}</Text>
          </View>
        </View>
      </View>

      <View style={styles.listSectionHeader}>
        <Text style={styles.listSectionTitle}>ASSIGNED JOBS</Text>
        <Text style={styles.listSectionCount}>{filteredItems.length} jobs</Text>
      </View>

      <View style={styles.listWrap}>
        {isLoading ? (
          <View style={styles.centerFill}>
            <ActivityIndicator color={Colors.primary} />
          </View>
        ) : filteredItems.length === 0 ? (
          <View style={styles.centerFill}>
            <Text style={styles.emptyTitle}>No jobs found</Text>
            <Text style={styles.emptySubtitle}>
              {search ? 'Try a different search term.' : 'You have no assigned deliveries yet.'}
            </Text>
          </View>
        ) : (
          <FlashList
            data={filteredItems}
            keyExtractor={(item) => item.id}
            estimatedItemSize={180}
            contentContainerStyle={styles.listContent}
            renderItem={({ item }) => (
              <JobCard delivery={item} onPressDetails={handlePressDetails} />
            )}
            onRefresh={refetch}
            refreshing={isRefetching}
            onEndReachedThreshold={0.4}
            onEndReached={() => {
              if (hasNextPage && !isFetchingNextPage) fetchNextPage();
            }}
            ListFooterComponent={
              isFetchingNextPage ? (
                <View style={styles.footerLoading}>
                  <ActivityIndicator color={Colors.primary} />
                </View>
              ) : null
            }
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.md,
  },
  dateLabel: {
    ...Typography.caption,
    color: Colors.muted,
  },
  greeting: {
    ...Typography.h2,
    color: Colors.heading,
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
    paddingHorizontal: Spacing.md,
    height: 48,
    borderRadius: Radius.input,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
    gap: Spacing.sm,
  },
  searchIcon: {
    fontSize: 14,
  },
  searchInput: {
    flex: 1,
    ...Typography.body,
    color: Colors.heading,
    height: '100%',
  },
  filterRow: {
    height: 40,
    maxHeight: 40,
    marginBottom: Spacing.md,
  },
  filterListContent: {
    paddingHorizontal: Spacing.lg,
    gap: Spacing.sm,
  },
  filterChip: {
    ...Typography.smallLabel,
    color: Colors.body,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.chip,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    marginRight: Spacing.sm,
    overflow: 'hidden',
  },
  filterChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
    color: Colors.onPrimary,
  },
  summaryCard: {
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
    padding: Spacing.lg,
    borderRadius: Radius.card,
    backgroundColor: Colors.heading,
  },
  summaryHeaderRow: {
    marginBottom: Spacing.md,
  },
  summaryTitle: {
    ...Typography.sectionTitle,
    color: Colors.onPrimary,
  },
  summaryStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  summaryStat: {
    gap: 4,
  },
  summaryStatLabel: {
    ...Typography.smallLabel,
    fontSize: 10,
    color: 'rgba(255,255,255,0.6)',
  },
  summaryStatValue: {
    ...Typography.h2,
    color: Colors.onPrimary,
  },
  listSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  listSectionTitle: {
    ...Typography.smallLabel,
    color: Colors.muted,
    letterSpacing: 1,
  },
  listSectionCount: {
    ...Typography.smallLabel,
    color: Colors.primary,
    fontWeight: '700',
  },
  listWrap: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing['6xl'],
    marginBottom: Spacing['6xl'],
  },
  centerFill: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing['2xl'],
  },
  emptyTitle: {
    ...Typography.bodyLarge,
    color: Colors.heading,
  },
  emptySubtitle: {
    ...Typography.body,
    color: Colors.muted,
    textAlign: 'center',
  },
  footerLoading: {
    paddingVertical: Spacing.lg,
  },
});
