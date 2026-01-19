import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { premiumAPI } from '../src/services/api';
import { Ionicons } from '@expo/vector-icons';

export default function PremiumScreen() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const handleSubscribe = async () => {
    try {
      setIsLoading(true);
      await premiumAPI.subscribe();
      Alert.alert(
        'Success!',
        'You are now a premium member! Enjoy exclusive features.',
        [{ text: 'OK', onPress: () => router.back() }]
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to activate premium membership');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Premium Membership</Text>
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.hero}>
          <Ionicons name="star" size={64} color="#FFD700" />
          <Text style={styles.heroTitle}>Upgrade to Premium</Text>
          <Text style={styles.heroSubtitle}>
            Unlock exclusive features and support our community
          </Text>
        </View>

        <View style={styles.featuresContainer}>
          <Text style={styles.sectionTitle}>Premium Features</Text>

          <FeatureItem
            icon="book"
            title="Exclusive Resources"
            description="Access premium articles, guides, and expert content"
          />
          <FeatureItem
            icon="sparkles"
            title="Ad-Free Experience"
            description="Browse without interruptions"
          />
          <FeatureItem
            icon="heart"
            title="Priority Support"
            description="Get faster responses from our support team"
          />
          <FeatureItem
            icon="ribbon"
            title="Premium Badge"
            description="Stand out in the community with your premium badge"
          />
          <FeatureItem
            icon="notifications"
            title="Early Access"
            description="Be the first to try new features"
          />
          <FeatureItem
            icon="people"
            title="Exclusive Groups"
            description="Join premium-only support groups"
          />
        </View>

        <View style={styles.pricingContainer}>
          <View style={styles.priceCard}>
            <Text style={styles.priceAmount}>$9.99</Text>
            <Text style={styles.pricePeriod}>/ month</Text>
          </View>
          <Text style={styles.priceNote}>
            Cancel anytime. No commitments.
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.subscribeButton, isLoading && styles.buttonDisabled]}
          onPress={handleSubscribe}
          disabled={isLoading}
        >
          <Text style={styles.subscribeButtonText}>
            {isLoading ? 'Processing...' : 'Start Free Trial'}
          </Text>
        </TouchableOpacity>

        <Text style={styles.disclaimer}>
          Note: This is a demo. No actual payment will be charged.
        </Text>
      </ScrollView>
    </View>
  );
}

function FeatureItem({
  icon,
  title,
  description,
}: {
  icon: string;
  title: string;
  description: string;
}) {
  return (
    <View style={styles.featureItem}>
      <View style={styles.featureIcon}>
        <Ionicons name={icon as any} size={24} color="#FF69B4" />
      </View>
      <View style={styles.featureContent}>
        <Text style={styles.featureTitle}>{title}</Text>
        <Text style={styles.featureDescription}>{description}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
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
  hero: {
    backgroundColor: 'white',
    padding: 32,
    alignItems: 'center',
    marginBottom: 16,
  },
  heroTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
  },
  heroSubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  featuresContainer: {
    backgroundColor: 'white',
    padding: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  featureItem: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  featureIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FFE5F1',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  featureContent: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  featureDescription: {
    fontSize: 14,
    color: '#666',
  },
  pricingContainer: {
    backgroundColor: 'white',
    padding: 24,
    alignItems: 'center',
    marginBottom: 16,
  },
  priceCard: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: 8,
  },
  priceAmount: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#FF69B4',
  },
  pricePeriod: {
    fontSize: 18,
    color: '#999',
    marginBottom: 8,
  },
  priceNote: {
    fontSize: 14,
    color: '#999',
  },
  subscribeButton: {
    backgroundColor: '#FF69B4',
    padding: 18,
    borderRadius: 12,
    marginHorizontal: 16,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  subscribeButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
  },
  disclaimer: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 32,
  },
});
