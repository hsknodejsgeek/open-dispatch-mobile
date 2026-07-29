import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState } from 'react';
import { useColorScheme } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { onUnauthorized } from '@/services/api';
import { queryClient, queryPersister } from '@/services/query-client';
import { getAccessToken } from '@/services/storage';

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

  // If the API client's refresh flow fails (refresh token expired/invalid),
  // treat it the same as never having been logged in.
  useEffect(() => {
    return onUnauthorized(() => setStatus('guest'));
  }, []);

  return status;
}

export default function RootLayout() {
  const colorScheme = useColorScheme();
  useAuthGate();

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <PersistQueryClientProvider client={queryClient} persistOptions={{ persister: queryPersister }}>
        <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
          <BottomSheetModalProvider>
            <AnimatedSplashOverlay />
            <Stack screenOptions={{ headerShown: false }}>
              <Stack.Screen name="(auth)" />
              <Stack.Screen name="(tabs)" />
              <Stack.Screen name="job/[id]" options={{ presentation: 'card' }} />
            </Stack>
          </BottomSheetModalProvider>
        </ThemeProvider>
      </PersistQueryClientProvider>
    </GestureHandlerRootView>
  );
}
