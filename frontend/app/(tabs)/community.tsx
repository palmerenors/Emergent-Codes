import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { forumAPI, groupAPI } from '../../src/services/api';
import { Ionicons } from '@expo/vector-icons';

interface Forum {
  forum_id: string;
  name: string;
  description: string;
  category: string;
  members_count: number;
  posts_count: number;
}

interface SupportGroup {
  group_id: string;
  name: string;
  description: string;
  theme: string;
  members: string[];
}

export default function CommunityScreen() {
  const router = useRouter();
  const [forums, setForums] = useState<Forum[]>([]);
  const [groups, setGroups] = useState<SupportGroup[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'forums' | 'groups'>('forums');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [forumsRes, groupsRes] = await Promise.all([
        forumAPI.getAll(),
        groupAPI.getAll(),
      ]);
      setForums(forumsRes.data);
      setGroups(groupsRes.data);
    } catch (error: any) {
      if (error.response?.status === 401) {
        console.log('Not authenticated, skipping community data fetch');
      } else {
        console.error('Error fetching community data:', error);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const renderForum = ({ item }: { item: Forum }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => router.push(`/forum/${item.forum_id}`)}
    >
      <View style={styles.cardHeader}>
        <Ionicons name="chatbubbles" size={24} color="#FF69B4" />
        <Text style={styles.cardTitle}>{item.name}</Text>
      </View>
      <Text style={styles.cardDescription}>{item.description}</Text>
      <View style={styles.cardStats}>
        <View style={styles.stat}>
          <Ionicons name="people-outline" size={16} color="#666" />
          <Text style={styles.statText}>{item.members_count} members</Text>
        </View>
        <View style={styles.stat}>
          <Ionicons name="document-text-outline" size={16} color="#666" />
          <Text style={styles.statText}>{item.posts_count} posts</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderGroup = ({ item }: { item: SupportGroup }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => router.push(`/group/${item.group_id}`)}
    >
      <View style={styles.cardHeader}>
        <Ionicons name="heart" size={24} color="#FF69B4" />
        <Text style={styles.cardTitle}>{item.name}</Text>
      </View>
      <Text style={styles.cardDescription}>{item.description}</Text>
      <View style={styles.cardStats}>
        <View style={styles.stat}>
          <Ionicons name="people-outline" size={16} color="#666" />
          <Text style={styles.statText}>{item.members.length} members</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#FF69B4" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.tabsContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'forums' && styles.tabActive]}
          onPress={() => setActiveTab('forums')}
        >
          <Text
            style={[styles.tabText, activeTab === 'forums' && styles.tabTextActive]}
          >
            Forums
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'groups' && styles.tabActive]}
          onPress={() => setActiveTab('groups')}
        >
          <Text
            style={[styles.tabText, activeTab === 'groups' && styles.tabTextActive]}
          >
            Support Groups
          </Text>
        </TouchableOpacity>
      </View>

      {activeTab === 'forums' ? (
        <FlatList
          data={forums}
          renderItem={renderForum}
          keyExtractor={(item) => item.forum_id}
          contentContainerStyle={styles.list}
        />
      ) : (
        <FlatList
          data={groups}
          renderItem={renderGroup}
          keyExtractor={(item) => item.group_id}
          contentContainerStyle={styles.list}
        />
      )}
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
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  tab: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: '#FF69B4',
  },
  tabText: {
    fontSize: 16,
    color: '#666',
  },
  tabTextActive: {
    color: '#FF69B4',
    fontWeight: '600',
  },
  list: {
    padding: 16,
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginLeft: 12,
    flex: 1,
  },
  cardDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
  },
  cardStats: {
    flexDirection: 'row',
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
  },
  statText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 4,
  },
});
