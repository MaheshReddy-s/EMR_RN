import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState } from 'react';
import { Platform, View } from 'react-native';
import 'react-native-gesture-handler';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import 'react-native-reanimated';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import 'react-native-get-random-values';
import { polyfillWebCrypto } from 'expo-standard-web-crypto';
import "../global.css";

// Polyfill Web Crypto for Native
if (Platform.OS !== 'web') {
  polyfillWebCrypto();
}

import ErrorBoundary from '@/components/error-boundary';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { AuthRepository, RuntimeRepository } from '@/repositories';
import { OfflinePdfUploadQueue } from '@/services/offline-pdf-upload-queue';
import { setErrorReporter } from '@/shared/lib/error-reporter';

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [appIsReady, setAppIsReady] = useState(false);

  const router = useRouter();
  const unauthorizedHandled = useRef(false);

  // Bootstrap persisted session once globally.
  useEffect(() => {
    void AuthRepository.restoreSession();
  }, []);

  // Bootstrap offline consultation PDF upload retry queue once globally.
  useEffect(() => {
    void OfflinePdfUploadQueue.initialize();
  }, []);

  // Register 401 handler — redirect to login on expired/invalid token
  useEffect(() => {
    RuntimeRepository.setOnUnauthorized(() => {
      // Avoid multiple redirects for concurrent 401s
      if (unauthorizedHandled.current) return;
      unauthorizedHandled.current = true;
      void AuthRepository.clearLocalSession()
        .catch((e) => {
          if (__DEV__) console.error('Failed to clear local session after 401', e);
        })
        .finally(() => {
          router.replace('/(auth)/login');
          // Reset after short delay so future 401s are handled
          setTimeout(() => { unauthorizedHandled.current = false; }, 2000);
        });
    });
    return () => RuntimeRepository.setOnUnauthorized(null);
  }, [router]);

  useEffect(() => {
    RuntimeRepository.setObservabilityHooks({
      onSlowRequest: (event) => {
        if (__DEV__) return;
        // Stub for future integration (e.g. Sentry/NewRelic)
        void event;
      },
    });

    setErrorReporter((error, errorInfo, scope) => {
      if (__DEV__) return;
      // Stub for future integration (e.g. Sentry/Bugsnag)
      void error;
      void errorInfo;
      void scope;
    });

    return () => {
      RuntimeRepository.setObservabilityHooks(null);
      setErrorReporter(null);
    };
  }, []);

  useEffect(() => {
    async function prepare() {
      try {
        // Small delay to ensure CSS is loaded on web
        if (Platform.OS === 'web') {
          await new Promise(resolve => setTimeout(resolve, 50));
        }
      } catch (e) {
        if (__DEV__) console.warn(e);
      } finally {
        setAppIsReady(true);
      }
    }

    prepare();
  }, []);

  if (!appIsReady) {
    return <View style={{ flex: 1, backgroundColor: '#1B262C' }} />;
  }

  return (
    <ErrorBoundary>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaProvider>
          <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
            <StatusBar style="dark" hidden={false} />
            <Stack screenOptions={{ headerShown: false }}>
              <Stack.Screen name="index" />
              <Stack.Screen name="(auth)" />
              <Stack.Screen name="(app)" />
            </Stack>
          </ThemeProvider>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </ErrorBoundary>
  );
}
