import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Goal } from '../api/goalsApi';
import { formatDate } from '../utils/dateHelpers';

interface GoalCardProps {
  goal: Goal;
  onUpvote: () => void;
  currentUserId: string;
}

export const GoalCard: React.FC<GoalCardProps> = ({ goal, onUpvote, currentUserId }) => {
  const isUpvoted = goal.upvotes.some(u => u._id === currentUserId);
  const statusColors: Record<string, string> = {
    idea: '#9E9E9E',
    planned: '#2196F3',
    in_progress: '#FF9800',
    done: '#4CAF50',
  };

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.title}>{goal.title}</Text>
        <View style={[styles.statusBadge, { backgroundColor: statusColors[goal.status] }]}>
          <Text style={styles.statusText}>{goal.status.replace('_', ' ')}</Text>
        </View>
      </View>
      {goal.description && (
        <Text style={styles.description}>{goal.description}</Text>
      )}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.upvoteButton, isUpvoted && styles.upvoteButtonActive]}
          onPress={onUpvote}
        >
          <Text style={styles.upvoteText}>👍 {goal.upvotes.length}</Text>
        </TouchableOpacity>
        {goal.targetDate && (
          <Text style={styles.targetDate}>
            Target: {formatDate(goal.targetDate)}
          </Text>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    flex: 1,
    marginRight: 8,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  description: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  upvoteButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#f0f0f0',
  },
  upvoteButtonActive: {
    backgroundColor: '#E3F2FD',
  },
  upvoteText: {
    fontSize: 14,
    fontWeight: '600',
  },
  targetDate: {
    fontSize: 12,
    color: '#999',
  },
});

