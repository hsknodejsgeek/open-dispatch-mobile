import { QueryClientProvider } from '@tanstack/react-query';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState } from 'react';
import { useColorScheme } from 'react-native';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { getAccessToken } from '@/services/auth-storage';
import { queryClient } from '@/services/query-client';

SplashScreen.preventAutoHideAsync();

type AuthStatus = 'checking' | 'authed' | 'guest';

/**
 * Checks SecureStore for a token on boot, then redirects between the
 * (auth) and (tabs) route groups based on the result. Splash-screen hiding
 * stays owned by <AnimatedSplashOverlay />, unrelated to this check.
 */
function useAuthGate(): AuthStatus {
  const [status, setStatus] = useState<AuthStatus>('checking');
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    let isMounted = true;
    getAccessToken().then((token) => {
      if (isMounted) setStatus(token ? 'authed' : 'guest');
    });
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (status === 'checking') return;
    const inAuthGroup = segments[0] === '(auth)';
    if (status === 'guest' && !inAuthGroup) {
      router.replace('/(auth)/login');
    } else if (status === 'authed' && inAuthGroup) {
      router.replace('/(tabs)');
    }
  }, [status, segments, router]);

  return status;
}

export default function RootLayout() {
  const colorScheme = useColorScheme();
  useAuthGate();

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <AnimatedSplashOverlay />
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="(tabs)" />
          <Stack.Screen
            name="job/[id]"
            options={{ headerShown: true, title: 'Job Details', presentation: 'card' }}
          />
        </Stack>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
