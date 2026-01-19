import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  Switch,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../src/store/authStore';
import { Ionicons } from '@expo/vector-icons';
import { premiumAPI, notificationAPI, authAPI } from '../../src/services/api';

export default function ProfileScreen() {
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = () => {
    if (Platform.OS === 'web') {
      // Use window.confirm for web
      const confirmed = window.confirm('Are you sure you want to logout?');
      if (confirmed) {
        performLogout();
      }
    } else {
      // Use Alert.alert for native
      Alert.alert('Logout', 'Are you sure you want to logout?', [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: performLogout,
        },
      ]);
    }
  };

  const performLogout = async () => {
    try {
      setIsLoggingOut(true);
      // Call backend logout
      await authAPI.logout();
    } catch (error) {
      console.log('Backend logout error (non-critical):', error);
    } finally {
      // Always clear local state
      await logout();
      setIsLoggingOut(false);
      // Navigate to landing page
      router.replace('/');
    }
  };

  const handleUpgradePremium = () => {
    router.push('/premium');
  };

  const handleToggleNotifications = async (value: boolean) => {
    try {
      await notificationAPI.updatePreferences({
        new_posts: value,
        milestone_reminders: value,
        group_updates: value,
        premium_notifications: value,
      });
      setNotificationsEnabled(value);
    } catch (error) {
      console.error('Error updating notifications:', error);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        {user?.picture ? (
          <Image source={{ uri: user.picture }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, styles.avatarPlaceholder]}>
            <Ionicons name="person" size={48} color="#999" />
          </View>
        )}
        <Text style={styles.name}>{user?.name}</Text>
        <Text style={styles.email}>{user?.email}</Text>

        {user?.is_premium && (
          <View style={styles.premiumBadge}>
            <Ionicons name="star" size={16} color="#FFD700" />
            <Text style={styles.premiumText}>Premium Member</Text>
          </View>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Profile Info</Text>
        <InfoRow
          icon="calendar-outline"
          label="Pregnancy Stage"
          value={user?.pregnancy_stage || 'Not set'}
        />
        <InfoRow
          icon="people-outline"
          label="Children"
          value={user?.children_count.toString() || '0'}
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Settings</Text>
        
        <View style={styles.settingRow}>
          <View style={styles.settingLeft}>
            <Ionicons name="notifications-outline" size={24} color="#FF69B4" />
            <Text style={styles.settingLabel}>Notifications</Text>
          </View>
          <Switch
            value={notificationsEnabled}
            onValueChange={handleToggleNotifications}
            trackColor={{ false: '#CCC', true: '#FF69B4' }}
          />
        </View>

        <TouchableOpacity
          style={styles.settingRow}
          onPress={() => router.push('/resources')}
        >
          <View style={styles.settingLeft}>
            <Ionicons name="book-outline" size={24} color="#FF69B4" />
            <Text style={styles.settingLabel}>Resources Library</Text>
          </View>
          <Ionicons name="chevron-forward" size={24} color="#CCC" />
        </TouchableOpacity>

        {!user?.is_premium && (
          <TouchableOpacity
            style={styles.settingRow}
            onPress={handleUpgradePremium}
          >
            <View style={styles.settingLeft}>
              <Ionicons name="star-outline" size={24} color="#FFD700" />
              <Text style={styles.settingLabel}>Upgrade to Premium</Text>
            </View>
            <Ionicons name="chevron-forward" size={24} color="#CCC" />
          </TouchableOpacity>
        )}
      </View>

      <TouchableOpacity 
        style={[styles.logoutButton, isLoggingOut && styles.logoutButtonDisabled]} 
        onPress={handleLogout}
        disabled={isLoggingOut}
      >
        {isLoggingOut ? (
          <ActivityIndicator size="small" color="#FF0000" />
        ) : (
          <Ionicons name="log-out-outline" size={24} color="#FF0000" />
        )}
        <Text style={styles.logoutText}>
          {isLoggingOut ? 'Logging out...' : 'Logout'}
        </Text>
      </TouchableOpacity>

      <Text style={styles.version}>Blossom v1.0.0</Text>
    </ScrollView>
  );
}

function InfoRow({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <View style={styles.infoLeft}>
        <Ionicons name={icon as any} size={20} color="#999" />
        <Text style={styles.infoLabel}>{label}</Text>
      </View>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    backgroundColor: 'white',
    padding: 24,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 16,
  },
  avatarPlaceholder: {
    backgroundColor: '#F0F0F0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  name: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  email: {
    fontSize: 14,
    color: '#999',
  },
  premiumBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF9E5',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginTop: 12,
  },
  premiumText: {
    color: '#FFD700',
    fontWeight: '600',
    marginLeft: 4,
  },
  section: {
    backgroundColor: 'white',
    marginTop: 16,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  infoLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoLabel: {
    fontSize: 16,
    color: '#666',
    marginLeft: 12,
  },
  infoValue: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingLabel: {
    fontSize: 16,
    color: '#333',
    marginLeft: 12,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'white',
    padding: 16,
    marginTop: 16,
    marginHorizontal: 16,
    borderRadius: 12,
  },
  logoutButtonDisabled: {
    opacity: 0.6,
  },
  logoutText: {
    fontSize: 16,
    color: '#FF0000',
    marginLeft: 8,
    fontWeight: '600',
  },
  version: {
    textAlign: 'center',
    color: '#999',
    fontSize: 12,
    marginVertical: 32,
  },
});
