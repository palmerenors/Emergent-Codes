import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  TextInput,
  Modal,
} from 'react-native';
import { milestoneAPI } from '../../src/services/api';
import { Ionicons } from '@expo/vector-icons';

interface Milestone {
  milestone_id: string;
  child_name: string;
  milestone_type: string;
  title: string;
  description: string;
  age_months: number;
  completed: bool;
  completed_at?: string;
  notes?: string;
}

export default function MilestonesScreen() {
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [newMilestone, setNewMilestone] = useState({
    child_name: '',
    milestone_type: 'physical',
    title: '',
    description: '',
    age_months: 0,
  });

  useEffect(() => {
    fetchMilestones();
  }, []);

  const fetchMilestones = async () => {
    try {
      const response = await milestoneAPI.getAll();
      setMilestones(response.data);
    } catch (error) {
      console.error('Error fetching milestones:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleComplete = async (milestoneId: string) => {
    try {
      await milestoneAPI.complete(milestoneId);
      fetchMilestones();
    } catch (error) {
      Alert.alert('Error', 'Failed to mark milestone as completed');
    }
  };

  const handleAddMilestone = async () => {
    if (!newMilestone.child_name || !newMilestone.title) {
      Alert.alert('Error', 'Please fill in required fields');
      return;
    }

    try {
      await milestoneAPI.create(newMilestone);
      setModalVisible(false);
      setNewMilestone({
        child_name: '',
        milestone_type: 'physical',
        title: '',
        description: '',
        age_months: 0,
      });
      fetchMilestones();
    } catch (error) {
      Alert.alert('Error', 'Failed to create milestone');
    }
  };

  const renderMilestone = ({ item }: { item: Milestone }) => (
    <View style={[styles.card, item.completed && styles.cardCompleted]}>
      <View style={styles.cardHeader}>
        <View style={styles.iconContainer}>
          <Ionicons
            name={item.completed ? 'checkmark-circle' : 'radio-button-off'}
            size={32}
            color={item.completed ? '#4CAF50' : '#FF69B4'}
          />
        </View>
        <View style={styles.cardContent}>
          <Text style={styles.cardTitle}>{item.title}</Text>
          <Text style={styles.cardMeta}>
            {item.child_name} • {item.age_months} months
          </Text>
          <Text style={styles.cardDescription}>{item.description}</Text>
        </View>
      </View>
      {!item.completed && (
        <TouchableOpacity
          style={styles.completeButton}
          onPress={() => handleComplete(item.milestone_id)}
        >
          <Text style={styles.completeButtonText}>Mark Complete</Text>
        </TouchableOpacity>
      )}
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
      <FlatList
        data={milestones}
        renderItem={renderMilestone}
        keyExtractor={(item) => item.milestone_id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="trophy-outline" size={64} color="#CCC" />
            <Text style={styles.emptyText}>No milestones yet</Text>
            <Text style={styles.emptySubtext}>Track your baby's development!</Text>
          </View>
        }
      />

      <TouchableOpacity
        style={styles.fab}
        onPress={() => setModalVisible(true)}
      >
        <Ionicons name="add" size={32} color="white" />
      </TouchableOpacity>

      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add Milestone</Text>

            <TextInput
              style={styles.input}
              placeholder="Child's Name"
              value={newMilestone.child_name}
              onChangeText={(text) =>
                setNewMilestone({ ...newMilestone, child_name: text })
              }
            />

            <TextInput
              style={styles.input}
              placeholder="Milestone Title"
              value={newMilestone.title}
              onChangeText={(text) =>
                setNewMilestone({ ...newMilestone, title: text })
              }
            />

            <TextInput
              style={styles.input}
              placeholder="Description"
              value={newMilestone.description}
              onChangeText={(text) =>
                setNewMilestone({ ...newMilestone, description: text })
              }
              multiline
            />

            <TextInput
              style={styles.input}
              placeholder="Age in Months"
              value={newMilestone.age_months.toString()}
              onChangeText={(text) =>
                setNewMilestone({ ...newMilestone, age_months: parseInt(text) || 0 })
              }
              keyboardType="number-pad"
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, styles.addButton]}
                onPress={handleAddMilestone}
              >
                <Text style={styles.addButtonText}>Add</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  cardCompleted: {
    opacity: 0.7,
  },
  cardHeader: {
    flexDirection: 'row',
  },
  iconContainer: {
    marginRight: 12,
  },
  cardContent: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  cardMeta: {
    fontSize: 12,
    color: '#999',
    marginBottom: 8,
  },
  cardDescription: {
    fontSize: 14,
    color: '#666',
  },
  completeButton: {
    marginTop: 12,
    backgroundColor: '#4CAF50',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  completeButtonText: {
    color: 'white',
    fontWeight: '600',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingTop: 60,
  },
  emptyText: {
    fontSize: 18,
    color: '#999',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#CCC',
    marginTop: 8,
  },
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 16,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FF69B4',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 20,
  },
  input: {
    backgroundColor: '#F5F5F5',
    padding: 12,
    borderRadius: 8,
    fontSize: 16,
    marginBottom: 12,
  },
  modalButtons: {
    flexDirection: 'row',
    marginTop: 20,
  },
  modalButton: {
    flex: 1,
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 4,
  },
  cancelButton: {
    backgroundColor: '#F0F0F0',
  },
  cancelButtonText: {
    color: '#666',
    fontWeight: '600',
  },
  addButton: {
    backgroundColor: '#FF69B4',
  },
  addButtonText: {
    color: 'white',
    fontWeight: '600',
  },
});
