import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Colors, Radius, Spacing, Typography } from '@/constants/tokens';
import { login } from '@/services/auth-service';

/**
 * Driver sign-in. Built from mobile_wireframes/driver_login/code.html.
 *
 * The wireframe labels the identifier field "Driver ID", but
 * POST /v1/auth/login only accepts { email, password } (see
 * server/src/modules/auth/schema.js) — no driver-ID-based lookup exists.
 * Reconciled by keeping the wireframe's layout/styling but labeling the
 * field "Email" so sign-in actually works against the real endpoint.
 */

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Pre-fills the demo driver seeded by server/scripts/seed-mobile-driver.js
// (see server/docs/mobile UI/seed-credentials.md) — dev-only convenience,
// never shipped in a production build.
const DEV_DEFAULT_EMAIL = __DEV__ ? 'driver@opendispatch.test' : '';
const DEV_DEFAULT_PASSWORD = __DEV__ ? 'DriverPass123!' : '';

export default function LoginScreen() {
  const [email, setEmail] = useState(DEV_DEFAULT_EMAIL);
  const [password, setPassword] = useState(DEV_DEFAULT_PASSWORD);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberDevice, setRememberDevice] = useState(true);
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function validate(): boolean {
    const errors: { email?: string; password?: string } = {};
    if (!email.trim()) {
      errors.email = 'Email is required';
    } else if (!EMAIL_PATTERN.test(email.trim())) {
      errors.email = 'Enter a valid email address';
    }
    if (!password) {
      errors.password = 'Password is required';
    }
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleSignIn() {
    setFormError(null);
    if (!validate()) return;

    setSubmitting(true);
    try {
      await login(email.trim(), password);
      router.replace('/(tabs)');
    } catch (error) {
      setFormError(resolveErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
            <View style={styles.logoBadge}>
              <Image
                source={require('@/assets/images/open-dispatch-logo.png')}
                style={styles.logoImage}
                contentFit="contain"
              />
            </View>
            <Text style={styles.eyebrow}>OPEN DISPATCH MOBILE</Text>
            <Text style={styles.title}>Welcome back</Text>
            <Text style={styles.subtitle}>Sign in to continue your assigned deliveries.</Text>
          </View>

          <View style={styles.form}>
            <View style={styles.field}>
              <Text style={styles.label}>EMAIL</Text>
              <View style={[styles.inputWrapper, fieldErrors.email && styles.inputWrapperError]}>
                <Text style={styles.inputIcon}>@</Text>
                <TextInput
                  value={email}
                  onChangeText={(text) => {
                    setEmail(text);
                    if (fieldErrors.email) setFieldErrors((prev) => ({ ...prev, email: undefined }));
                  }}
                  placeholder="you@company.com"
                  placeholderTextColor={Colors.disabled}
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="email-address"
                  textContentType="emailAddress"
                  style={styles.input}
                  editable={!submitting}
                />
              </View>
              {fieldErrors.email && <Text style={styles.fieldError}>{fieldErrors.email}</Text>}
            </View>

            <View style={styles.field}>
              <View style={styles.labelRow}>
                <Text style={styles.label}>PASSWORD</Text>
                <Pressable disabled={submitting} hitSlop={8}>
                  <Text style={styles.forgotLink}>Forgot Password?</Text>
                </Pressable>
              </View>
              <View
                style={[styles.inputWrapper, fieldErrors.password && styles.inputWrapperError]}>
                <Text style={styles.inputIcon}>🔒</Text>
                <TextInput
                  value={password}
                  onChangeText={(text) => {
                    setPassword(text);
                    if (fieldErrors.password) {
                      setFieldErrors((prev) => ({ ...prev, password: undefined }));
                    }
                  }}
                  placeholder="••••••••"
                  placeholderTextColor={Colors.disabled}
                  secureTextEntry={!showPassword}
                  textContentType="password"
                  style={[styles.input, styles.inputWithTrailingButton]}
                  editable={!submitting}
                />
                <Pressable
                  onPress={() => setShowPassword((v) => !v)}
                  hitSlop={8}
                  style={styles.visibilityToggle}>
                  <Text style={styles.visibilityToggleText}>
                    {showPassword ? 'Hide' : 'Show'}
                  </Text>
                </Pressable>
              </View>
              {fieldErrors.password && (
                <Text style={styles.fieldError}>{fieldErrors.password}</Text>
              )}
            </View>

            <View style={styles.rememberRow}>
              <Text style={styles.rememberLabel}>Remember Device</Text>
              <Switch
                value={rememberDevice}
                onValueChange={setRememberDevice}
                trackColor={{ true: Colors.primary, false: Colors.border }}
                thumbColor={Colors.surface}
                disabled={submitting}
              />
            </View>

            {formError && (
              <View style={styles.formErrorBox}>
                <Text style={styles.formErrorText}>{formError}</Text>
              </View>
            )}

            <Pressable
              onPress={handleSignIn}
              disabled={submitting}
              style={({ pressed }) => [
                styles.submitButton,
                pressed && styles.submitButtonPressed,
                submitting && styles.submitButtonDisabled,
              ]}>
              {submitting ? (
                <ActivityIndicator color={Colors.onPrimary} />
              ) : (
                <>
                  <Text style={styles.submitButtonText}>Sign In</Text>
                  <Text style={styles.submitButtonIcon}>→</Text>
                </>
              )}
            </Pressable>
          </View>

          <View style={styles.footer}>
            <View style={styles.secureBadge}>
              <Text style={styles.secureBadgeDot}>●</Text>
              <Text style={styles.secureBadgeText}>SECURE CONNECTION</Text>
            </View>
            <Text style={styles.footerMeta}>App Version: v1.0.0</Text>
            <View style={styles.footerServerRow}>
              <View style={styles.serverDot} />
              <Text style={styles.footerMeta}>Server: {serverEnvironmentLabel()}</Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function serverEnvironmentLabel(): string {
  return process.env.EXPO_PUBLIC_API_URL ? 'Configured' : 'Local Dev';
}

function resolveErrorMessage(error: unknown): string {
  const status = (error as { response?: { status?: number } })?.response?.status;
  if (status === 401) return 'Invalid email or password.';
  if (status === 400) return 'Please check your email and password.';
  if (status !== undefined) return 'Something went wrong. Please try again.';
  return 'Unable to reach the server. Check your connection and try again.';
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  flex: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: Spacing['2xl'],
    paddingVertical: Spacing['3xl'],
    justifyContent: 'center',
    gap: Spacing['3xl'],
  },
  header: {
    alignItems: 'center',
    gap: Spacing.xs,
  },
  logoBadge: {
    width: 64,
    height: 64,
    borderRadius: Radius.button,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.lg,
    overflow: 'hidden',
  },
  logoImage: {
    width: 44,
    height: 44,
  },
  eyebrow: {
    ...Typography.smallLabel,
    color: Colors.primary,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: Spacing.xs,
  },
  title: {
    ...Typography.h1,
    color: Colors.heading,
  },
  subtitle: {
    ...Typography.body,
    color: Colors.muted,
    textAlign: 'center',
    marginTop: Spacing.xs,
  },
  form: {
    gap: Spacing.lg,
  },
  field: {
    gap: Spacing.xs,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  label: {
    ...Typography.smallLabel,
    color: Colors.muted,
    letterSpacing: 0.5,
  },
  forgotLink: {
    ...Typography.smallLabel,
    color: Colors.primary,
    fontWeight: '600',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 56,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.input,
    backgroundColor: Colors.surface,
    paddingHorizontal: Spacing.lg,
    gap: Spacing.sm,
  },
  inputWrapperError: {
    borderColor: Colors.danger,
  },
  inputIcon: {
    fontSize: 16,
    color: Colors.muted,
  },
  input: {
    flex: 1,
    height: '100%',
    ...Typography.bodyLarge,
    color: Colors.heading,
  },
  inputWithTrailingButton: {
    paddingRight: Spacing.sm,
  },
  visibilityToggle: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  visibilityToggleText: {
    ...Typography.smallLabel,
    color: Colors.muted,
    fontWeight: '600',
  },
  fieldError: {
    ...Typography.caption,
    color: Colors.danger,
    marginLeft: Spacing.xs,
  },
  rememberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.xs,
  },
  rememberLabel: {
    ...Typography.bodyLarge,
    color: Colors.heading,
  },
  formErrorBox: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: Radius.input,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  formErrorText: {
    ...Typography.body,
    color: Colors.danger,
  },
  submitButton: {
    height: 56,
    borderRadius: Radius.button,
    backgroundColor: Colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  submitButtonPressed: {
    backgroundColor: Colors.primaryPressed,
  },
  submitButtonDisabled: {
    opacity: 0.8,
  },
  submitButtonText: {
    ...Typography.button,
    color: Colors.onPrimary,
    fontSize: 17,
  },
  submitButtonIcon: {
    color: Colors.onPrimary,
    fontSize: 18,
    fontWeight: '600',
  },
  footer: {
    alignItems: 'center',
    gap: Spacing.sm,
    marginTop: Spacing.lg,
  },
  secureBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.chip,
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#D1FAE5',
  },
  secureBadgeDot: {
    color: Colors.success,
    fontSize: 8,
  },
  secureBadgeText: {
    ...Typography.smallLabel,
    color: Colors.success,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  footerMeta: {
    ...Typography.caption,
    color: Colors.muted,
  },
  footerServerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  serverDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.success,
  },
});
