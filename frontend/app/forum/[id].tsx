import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { forumAPI } from '../../src/services/api';
import { Ionicons } from '@expo/vector-icons';

export default function ForumDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const [forum, setForum] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchForum();
  }, [id]);

  const fetchForum = async () => {
    try {
      const response = await forumAPI.getById(id as string);
      setForum(response.data);
    } catch (error) {
      console.error('Error fetching forum:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#FF69B4" />
      </View>
    );
  }

  if (!forum) {
    return (
      <View style={styles.centerContainer}>
        <Text>Forum not found</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Forum</Text>
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.forumInfo}>
          <Ionicons name="chatbubbles" size={48} color="#FF69B4" />
          <Text style={styles.forumName}>{forum.name}</Text>
          <Text style={styles.forumDescription}>{forum.description}</Text>
          
          <View style={styles.stats}>
            <View style={styles.stat}>
              <Ionicons name="people" size={24} color="#666" />
              <Text style={styles.statText}>{forum.members_count} Members</Text>
            </View>
            <View style={styles.stat}>
              <Ionicons name="document-text" size={24} color="#666" />
              <Text style={styles.statText}>{forum.posts_count} Posts</Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Discussions</Text>
          <Text style={styles.comingSoon}>Coming soon - forum posts will appear here</Text>
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
  forumInfo: {
    backgroundColor: 'white',
    padding: 24,
    alignItems: 'center',
    marginBottom: 16,
  },
  forumName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
  },
  forumDescription: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
  },
  stats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
  },
  stat: {
    alignItems: 'center',
  },
  statText: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
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
