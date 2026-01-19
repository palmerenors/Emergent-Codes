import React, { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { useAuthStore } from '../src/store/authStore';
import { authAPI } from '../src/services/api';
import { storage } from '../src/utils/storage';
import { ActivityIndicator, View } from 'react-native';
import * as Notifications from 'expo-notifications';
import { setupNotificationChannels } from '../src/utils/notifications';

export default function RootLayout() {
  const router = useRouter();
  const segments = useSegments();
  const { isAuthenticated, isLoading, setUser, setToken, setLoading } = useAuthStore();

  useEffect(() => {
    async function loadAuth() {
      try {
        const token = await storage.getItem('auth_token');
        if (token) {
          setToken(token);
          const response = await authAPI.getMe();
          setUser(response.data);
        }
      } catch (error) {
        console.error('Error loading auth:', error);
        try {
          await storage.deleteItem('auth_token');
        } catch (e) {
          console.log('Could not delete token from storage');
        }
      } finally {
        setLoading(false);
      }
    }

    loadAuth();
    setupNotificationChannels();
  }, []);

  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = segments[0] === '(auth)';
    const inTabsGroup = segments[0] === '(tabs)';

    if (!isAuthenticated && !inAuthGroup) {
      router.replace('/');
    } else if (isAuthenticated && !inTabsGroup && segments[0] !== 'post' && segments[0] !== 'forum' && segments[0] !== 'group' && segments[0] !== 'resources' && segments[0] !== 'premium') {
      router.replace('/(tabs)');
    }
  }, [isAuthenticated, segments, isLoading]);

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#FF69B4" />
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="post/[id]" options={{ presentation: 'modal' }} />
      <Stack.Screen name="forum/[id]" />
      <Stack.Screen name="group/[id]" />
      <Stack.Screen name="resources" />
      <Stack.Screen name="premium" />
    </Stack>
  );
}
