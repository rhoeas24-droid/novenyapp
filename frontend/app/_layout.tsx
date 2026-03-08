import React, { useState, useCallback } from 'react';
import { TouchableOpacity } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import SplashScreen from '../src/components/SplashScreen';
import LanguageSelector from '../src/components/LanguageSelector';
import { LanguageProvider, useLanguage } from '../src/i18n/LanguageContext';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      retry: 2,
    },
  },
});

function HeaderLanguageButton({ onPress }: { onPress: () => void }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={{ marginRight: 8, padding: 4 }}
    >
      <Ionicons name="globe-outline" size={24} color="#fff" />
    </TouchableOpacity>
  );
}

function AppContent() {
  const [showSplash, setShowSplash] = useState(true);
  const [showLanguageSelector, setShowLanguageSelector] = useState(false);
  const { t } = useLanguage();

  const openLanguageSelector = useCallback(() => {
    setShowLanguageSelector(true);
  }, []);

  const closeLanguageSelector = useCallback(() => {
    setShowLanguageSelector(false);
  }, []);

  if (showSplash) {
    return <SplashScreen onFinish={() => setShowSplash(false)} />;
  }

  return (
    <>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerStyle: {
            backgroundColor: '#1B5E20',
          },
          headerTintColor: '#fff',
          headerTitleStyle: {
            fontWeight: '600',
          },
          contentStyle: {
            backgroundColor: '#f8f9fa',
          },
        }}
      >
        <Stack.Screen
          name="index"
          options={{
            title: t('appName'),
            headerLargeTitle: false,
            headerRight: () => <HeaderLanguageButton onPress={openLanguageSelector} />,
          }}
        />
        <Stack.Screen
          name="plant/[name]"
          getId={({ params }) => params?.name}
          options={{
            title: t('plantDetails'),
            headerBackTitle: t('back'),
          }}
        />
      </Stack>
      
      <LanguageSelector
        visible={showLanguageSelector}
        onClose={closeLanguageSelector}
      />
    </>
  );
}

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <SafeAreaProvider>
        <LanguageProvider>
          <AppContent />
        </LanguageProvider>
      </SafeAreaProvider>
    </QueryClientProvider>
  );
}
