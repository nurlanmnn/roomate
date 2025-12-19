import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Goal } from '../api/goalsApi';
import { formatDate } from '../utils/dateHelpers';
import { colors, fontSizes, fontWeights, radii, spacing, shadows } from '../theme';

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
    backgroundColor: colors.surface,
    padding: spacing.lg,
    borderRadius: radii.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    ...(shadows.sm as object),
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.xs,
  },
  title: {
    fontSize: fontSizes.lg,
    fontWeight: fontWeights.semibold,
    color: colors.text,
    flex: 1,
    marginRight: spacing.sm,
  },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radii.pill,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: fontWeights.semibold,
    textTransform: 'capitalize',
  },
  description: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  upvoteButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radii.pill,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
  },
  upvoteButtonActive: {
    backgroundColor: colors.accentSoft,
    borderColor: colors.accent,
  },
  upvoteText: {
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.semibold,
    color: colors.text,
  },
  targetDate: {
    fontSize: fontSizes.xs,
    color: colors.muted,
  },
});

