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
import { resourceAPI } from '../src/services/api';
import { useAuthStore } from '../src/store/authStore';
import { Ionicons } from '@expo/vector-icons';

interface Resource {
  resource_id: string;
  title: string;
  content: string;
  resource_type: string;
  category: string;
  author: string;
  tags: string[];
  is_premium: boolean;
}

export default function ResourcesScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [resources, setResources] = useState<Resource[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string | undefined>(undefined);

  const categories = [
    { key: undefined, label: 'All' },
    { key: 'pregnancy', label: 'Pregnancy' },
    { key: 'childbirth', label: 'Childbirth' },
    { key: 'postpartum', label: 'Postpartum' },
    { key: 'baby_milestones', label: 'Baby' },
  ];

  useEffect(() => {
    fetchResources();
  }, [selectedCategory]);

  const fetchResources = async () => {
    try {
      const response = await resourceAPI.getAll({
        category: selectedCategory,
      });
      setResources(response.data);
    } catch (error) {
      console.error('Error fetching resources:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const renderResource = ({ item }: { item: Resource }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Ionicons
          name={item.resource_type === 'article' ? 'document-text' : 'play-circle'}
          size={24}
          color="#FF69B4"
        />
        {item.is_premium && (
          <View style={styles.premiumBadge}>
            <Ionicons name="star" size={12} color="#FFD700" />
            <Text style={styles.premiumText}>Premium</Text>
          </View>
        )}
      </View>
      <Text style={styles.cardTitle}>{item.title}</Text>
      <Text style={styles.cardContent} numberOfLines={3}>
        {item.content}
      </Text>
      <View style={styles.cardFooter}>
        <Text style={styles.author}>By {item.author}</Text>
        <View style={styles.tags}>
          {item.tags.slice(0, 2).map((tag) => (
            <View key={tag} style={styles.tag}>
              <Text style={styles.tagText}>{tag}</Text>
            </View>
          ))}
        </View>
      </View>
    </View>
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
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Resources</Text>
      </View>

      <View style={styles.categoriesContainer}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={categories}
          keyExtractor={(item) => item.key || 'all'}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[
                styles.categoryChip,
                selectedCategory === item.key && styles.categoryChipActive,
              ]}
              onPress={() => setSelectedCategory(item.key)}
            >
              <Text
                style={[
                  styles.categoryChipText,
                  selectedCategory === item.key && styles.categoryChipTextActive,
                ]}
              >
                {item.label}
              </Text>
            </TouchableOpacity>
          )}
        />
      </View>

      <FlatList
        data={resources}
        renderItem={renderResource}
        keyExtractor={(item) => item.resource_id}
        contentContainerStyle={styles.list}
      />
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
  categoriesContainer: {
    backgroundColor: 'white',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  categoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginHorizontal: 4,
    borderRadius: 20,
    backgroundColor: '#F0F0F0',
  },
  categoryChipActive: {
    backgroundColor: '#FF69B4',
  },
  categoryChipText: {
    fontSize: 14,
    color: '#666',
  },
  categoryChipTextActive: {
    color: 'white',
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
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  premiumBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF9E5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  premiumText: {
    fontSize: 10,
    color: '#FFD700',
    fontWeight: '600',
    marginLeft: 4,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  cardContent: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 12,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  author: {
    fontSize: 12,
    color: '#999',
  },
  tags: {
    flexDirection: 'row',
  },
  tag: {
    backgroundColor: '#FFE5F1',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginLeft: 4,
  },
  tagText: {
    fontSize: 10,
    color: '#FF69B4',
  },
});
