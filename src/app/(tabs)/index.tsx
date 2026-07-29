import { Link } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Colors, Spacing, Typography } from '@/constants/tokens';

/**
 * Placeholder route. FlashList-based assigned jobs feed is built in Phase 6.
 * Links to job/[id] to verify the stack route from the tabs is wired up.
 */
export default function AssignedJobsScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Assigned Jobs</Text>
        <Text style={styles.subtitle}>FlashList feed arrives in Phase 6.</Text>
        <Link href="/job/demo-job-1" style={styles.link}>
          Preview job detail route →
        </Link>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing['2xl'],
  },
  title: {
    ...Typography.h2,
    color: Colors.heading,
  },
  subtitle: {
    ...Typography.body,
    color: Colors.muted,
    textAlign: 'center',
  },
  link: {
    ...Typography.bodyLarge,
    color: Colors.primary,
    marginTop: Spacing.lg,
  },
});
