import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Modal } from 'react-native';
import { useHousehold } from '../../context/HouseholdContext';
import { useAuth } from '../../context/AuthContext';
import { goalsApi, Goal } from '../../api/goalsApi';
import { GoalCard } from '../../components/GoalCard';
import { FormTextInput } from '../../components/FormTextInput';
import { PrimaryButton } from '../../components/PrimaryButton';

export const GoalsScreen: React.FC = () => {
  const { selectedHousehold } = useHousehold();
  const { user } = useAuth();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(false);
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<'idea' | 'planned' | 'in_progress' | 'done'>('idea');
  const [targetDate, setTargetDate] = useState('');

  useEffect(() => {
    if (selectedHousehold) {
      loadGoals();
    }
  }, [selectedHousehold]);

  const loadGoals = async () => {
    if (!selectedHousehold) return;

    setLoading(true);
    try {
      const data = await goalsApi.getGoals(selectedHousehold._id);
      setGoals(data);
    } catch (error) {
      console.error('Failed to load goals:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateGoal = async () => {
    if (!selectedHousehold || !title.trim()) {
      Alert.alert('Error', 'Please enter a title');
      return;
    }

    try {
      await goalsApi.createGoal({
        householdId: selectedHousehold._id,
        title: title.trim(),
        description: description || undefined,
        status,
        targetDate: targetDate || undefined,
      });
      setCreateModalVisible(false);
      setTitle('');
      setDescription('');
      setStatus('idea');
      setTargetDate('');
      loadGoals();
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.error || 'Failed to create goal');
    }
  };

  const handleUpvote = async (goal: Goal) => {
    try {
      await goalsApi.upvoteGoal(goal._id);
      loadGoals();
    } catch (error) {
      console.error('Failed to upvote:', error);
    }
  };

  const handleUpdateStatus = async (goal: Goal, newStatus: typeof status) => {
    try {
      await goalsApi.updateGoal(goal._id, { status: newStatus });
      loadGoals();
    } catch (error) {
      console.error('Failed to update goal:', error);
    }
  };

  if (!selectedHousehold || !user) {
    return (
      <View style={styles.container}>
        <Text style={styles.emptyText}>Please select a household</Text>
      </View>
    );
  }

  // Group goals by status
  const goalsByStatus: Record<string, Goal[]> = {
    idea: [],
    planned: [],
    in_progress: [],
    done: [],
  };

  goals.forEach((goal) => {
    goalsByStatus[goal.status].push(goal);
  });

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Goals</Text>
        <PrimaryButton
          title="+ New Goal"
          onPress={() => setCreateModalVisible(true)}
        />
      </View>

      {Object.entries(goalsByStatus).map(([statusKey, statusGoals]) => {
        if (statusGoals.length === 0) return null;
        return (
          <View key={statusKey} style={styles.section}>
            <Text style={styles.sectionTitle}>
              {statusKey.charAt(0).toUpperCase() + statusKey.replace('_', ' ').slice(1)}
            </Text>
            {statusGoals.map((goal) => (
              <View key={goal._id} style={styles.goalWrapper}>
                <GoalCard
                  goal={goal}
                  onUpvote={() => handleUpvote(goal)}
                  currentUserId={user._id}
                />
                <View style={styles.statusActions}>
                  {(['idea', 'planned', 'in_progress', 'done'] as const).map((s) => (
                    <TouchableOpacity
                      key={s}
                      style={[
                        styles.statusButton,
                        goal.status === s && styles.statusButtonActive,
                      ]}
                      onPress={() => handleUpdateStatus(goal, s)}
                    >
                      <Text
                        style={[
                          styles.statusButtonText,
                          goal.status === s && styles.statusButtonTextActive,
                        ]}
                      >
                        {s.replace('_', ' ')}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            ))}
          </View>
        );
      })}

      {goals.length === 0 && (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No goals yet</Text>
        </View>
      )}

      {/* Create Goal Modal */}
      <Modal
        visible={createModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setCreateModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <ScrollView style={styles.modalContent}>
            <Text style={styles.modalTitle}>New Goal</Text>
            <FormTextInput
              label="Title"
              value={title}
              onChangeText={setTitle}
              placeholder="e.g., Get a big living room rug"
            />
            <FormTextInput
              label="Description (Optional)"
              value={description}
              onChangeText={setDescription}
              placeholder="Add details"
              multiline
            />
            <View style={styles.field}>
              <Text style={styles.label}>Status</Text>
              {(['idea', 'planned', 'in_progress', 'done'] as const).map((s) => (
                <TouchableOpacity
                  key={s}
                  style={[styles.radioOption, status === s && styles.radioSelected]}
                  onPress={() => setStatus(s)}
                >
                  <Text>{s.charAt(0).toUpperCase() + s.replace('_', ' ').slice(1)}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <FormTextInput
              label="Target Date (Optional)"
              value={targetDate}
              onChangeText={setTargetDate}
              placeholder="YYYY-MM-DD"
            />
            <View style={styles.modalActions}>
              <PrimaryButton
                title="Cancel"
                onPress={() => setCreateModalVisible(false)}
              />
              <View style={styles.spacer} />
              <PrimaryButton title="Create" onPress={handleCreateGoal} />
            </View>
          </ScrollView>
        </View>
      </Modal>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    padding: 24,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#333',
    marginBottom: 16,
  },
  section: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 12,
    color: '#333',
  },
  goalWrapper: {
    marginBottom: 12,
  },
  statusActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  statusButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#f0f0f0',
  },
  statusButtonActive: {
    backgroundColor: '#4CAF50',
  },
  statusButtonText: {
    fontSize: 12,
    color: '#666',
  },
  statusButtonTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  emptyContainer: {
    padding: 32,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    width: '90%',
    maxWidth: 400,
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 24,
  },
  field: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    color: '#333',
  },
  radioOption: {
    padding: 12,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    marginBottom: 8,
    backgroundColor: '#fff',
  },
  radioSelected: {
    backgroundColor: '#E3F2FD',
    borderColor: '#2196F3',
  },
  modalActions: {
    flexDirection: 'row',
    marginTop: 16,
  },
  spacer: {
    width: 12,
  },
});

