import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { groupAPI } from '../../src/services/api';
import { useAuthStore } from '../../src/store/authStore';
import { Ionicons } from '@expo/vector-icons';

export default function GroupDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { user } = useAuthStore();
  const [group, setGroup] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isMember, setIsMember] = useState(false);

  useEffect(() => {
    fetchGroup();
  }, [id]);

  const fetchGroup = async () => {
    try {
      const response = await groupAPI.getAll();
      const foundGroup = response.data.find((g: any) => g.group_id === id);
      setGroup(foundGroup);
      setIsMember(foundGroup?.members?.includes(user?.user_id));
    } catch (error) {
      console.error('Error fetching group:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleJoinGroup = async () => {
    try {
      await groupAPI.join(id as string);
      setIsMember(true);
      Alert.alert('Success', 'You have joined the support group!');
    } catch (error) {
      Alert.alert('Error', 'Failed to join group');
    }
  };

  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#FF69B4" />
      </View>
    );
  }

  if (!group) {
    return (
      <View style={styles.centerContainer}>
        <Text>Group not found</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Support Group</Text>
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.groupInfo}>
          <Ionicons name="heart" size={48} color="#FF69B4" />
          <Text style={styles.groupName}>{group.name}</Text>
          <Text style={styles.groupDescription}>{group.description}</Text>
          
          <View style={styles.stats}>
            <View style={styles.stat}>
              <Ionicons name="people" size={24} color="#666" />
              <Text style={styles.statText}>{group.members.length} Members</Text>
            </View>
          </View>

          {!isMember && (
            <TouchableOpacity style={styles.joinButton} onPress={handleJoinGroup}>
              <Ionicons name="add-circle" size={20} color="white" />
              <Text style={styles.joinButtonText}>Join Group</Text>
            </TouchableOpacity>
          )}

          {isMember && (
            <View style={styles.memberBadge}>
              <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
              <Text style={styles.memberText}>You are a member</Text>
            </View>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Group Discussions</Text>
          <Text style={styles.comingSoon}>Coming soon - group messages will appear here</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    backgroundColor: '#FF69B4',
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    paddingTop: 48,
  },
  backButton: {
    marginRight: 16,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
  },
  content: {
    flex: 1,
  },
  groupInfo: {
    backgroundColor: 'white',
    padding: 24,
    alignItems: 'center',
    marginBottom: 16,
  },
  groupName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
  },
  groupDescription: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
  },
  stats: {
    marginBottom: 24,
  },
  stat: {
    alignItems: 'center',
  },
  statText: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
  },
  joinButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF69B4',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
  },
  joinButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  memberBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
  },
  memberText: {
    color: '#4CAF50',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  section: {
    backgroundColor: 'white',
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  comingSoon: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    padding: 32,
  },
});
