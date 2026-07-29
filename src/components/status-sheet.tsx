import { BottomSheetBackdrop, BottomSheetModal, BottomSheetTextInput } from '@gorhom/bottom-sheet';
import type { ComponentProps } from 'react';
import { forwardRef, useCallback, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { Colors, Radius, Spacing, Typography } from '@/constants/tokens';

export interface StatusSheetOptions {
  title: string;
  description: string;
  confirmLabel: string;
  tone?: 'primary' | 'danger';
  /** Shown as a placeholder in an optional notes field. Omit to hide it. */
  notesPlaceholder?: string;
  onConfirm: (notes: string) => Promise<void> | void;
}

export interface StatusSheetHandle {
  present: (options: StatusSheetOptions) => void;
  dismiss: () => void;
}

/**
 * Generic confirm-and-act bottom sheet, reused for both the "Start
 * Delivery" / "Mark as Delivered" status transition and the "Report an
 * Issue" (cancel) action on the job detail screen (Phase 7).
 *
 * The optional notes field is UI-only — there's no `notes` column on the
 * Delivery model, so text entered here isn't persisted anywhere yet. It's
 * kept as a staged interaction (matches the wireframe's "add notes"
 * affordance) rather than removed, since a future backend field would slot
 * in here without changing this component's shape.
 */
export const StatusSheet = forwardRef<StatusSheetHandle>(function StatusSheet(_props, ref) {
  const [options, setOptions] = useState<StatusSheetOptions | null>(null);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const sheetRef = useRef<BottomSheetModal | null>(null);

  const snapPoints = useMemo(() => ['1%', '45%'], []);

  useImperativeHandle(ref, () => ({
    present: (nextOptions) => {
      setOptions(nextOptions);
      setNotes('');
      sheetRef.current?.present();
    },
    dismiss: () => sheetRef.current?.dismiss(),
  }));

  const renderBackdrop = useCallback(
    (props: ComponentProps<typeof BottomSheetBackdrop>) => (
      <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={1} />
    ),
    [],
  );

  async function handleConfirm() {
    if (!options) return;
    setSubmitting(true);
    try {
      await options.onConfirm(notes);
      sheetRef.current?.dismiss();
    } finally {
      setSubmitting(false);
    }
  }

  const tone = options?.tone ?? 'primary';

  return (
    <BottomSheetModal
      ref={sheetRef}
      snapPoints={snapPoints}
      index={1}
      enablePanDownToClose
      backdropComponent={renderBackdrop}
      backgroundStyle={styles.sheetBackground}
      handleIndicatorStyle={styles.handleIndicator}>
      <View style={styles.content}>
        <Text style={styles.title}>{options?.title}</Text>
        <Text style={styles.description}>{options?.description}</Text>

        {options?.notesPlaceholder && (
          <BottomSheetTextInput
            value={notes}
            onChangeText={setNotes}
            placeholder={options.notesPlaceholder}
            placeholderTextColor={Colors.disabled}
            multiline
            style={styles.notesInput}
          />
        )}

        <View style={styles.actionRow}>
          <Pressable
            onPress={() => sheetRef.current?.dismiss()}
            disabled={submitting}
            style={({ pressed }) => [
              styles.secondaryButton,
              pressed && styles.secondaryButtonPressed,
            ]}>
            <Text style={styles.secondaryButtonText}>Cancel</Text>
          </Pressable>
          <Pressable
            onPress={handleConfirm}
            disabled={submitting}
            style={({ pressed }) => [
              styles.primaryButton,
              tone === 'danger' && styles.primaryButtonDanger,
              pressed && styles.primaryButtonPressed,
            ]}>
            {submitting ? (
              <ActivityIndicator color={Colors.onPrimary} />
            ) : (
              <Text style={styles.primaryButtonText}>{options?.confirmLabel}</Text>
            )}
          </Pressable>
        </View>
      </View>
    </BottomSheetModal>
  );
});

const styles = StyleSheet.create({
  sheetBackground: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: Radius.bottomSheet,
    borderTopRightRadius: Radius.bottomSheet,
  },
  handleIndicator: {
    backgroundColor: Colors.border,
    width: 40,
  },
  content: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing['2xl'],
    gap: Spacing.md,
  },
  title: {
    ...Typography.h3,
    color: Colors.heading,
  },
  description: {
    ...Typography.body,
    color: Colors.muted,
  },
  notesInput: {
    minHeight: 80,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.input,
    padding: Spacing.md,
    ...Typography.body,
    color: Colors.heading,
    textAlignVertical: 'top',
  },
  actionRow: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginTop: Spacing.sm,
  },
  secondaryButton: {
    flex: 1,
    height: 52,
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
  primaryButton: {
    flex: 1,
    height: 52,
    borderRadius: Radius.button,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonDanger: {
    backgroundColor: Colors.danger,
  },
  primaryButtonPressed: {
    opacity: 0.9,
  },
  primaryButtonText: {
    ...Typography.button,
    color: Colors.onPrimary,
  },
});
