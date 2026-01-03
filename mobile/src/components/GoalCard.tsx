import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { AppText } from './AppText';
import { Goal } from '../api/goalsApi';
import { formatDate } from '../utils/dateHelpers';
import { useThemeColors, fontSizes, fontWeights, radii, spacing, shadows } from '../theme';
import { scaleFont } from '../utils/scaling';
import { SwipeableRow } from './SwipeableRow';

interface GoalCardProps {
  goal: Goal;
  onUpvote: () => void;
  onStatusChange?: (newStatus: 'idea' | 'planned' | 'in_progress' | 'done') => void;
  currentUserId: string;
}

export const GoalCard: React.FC<GoalCardProps> = ({ goal, onUpvote, onStatusChange, currentUserId }) => {
  const colors = useThemeColors();
  const isUpvoted = goal.upvotes.some(u => u._id === currentUserId);
  const statusColors: Record<string, string> = {
    idea: '#9E9E9E',
    planned: '#2196F3',
    in_progress: '#FF9800',
    done: '#4CAF50',
  };

  const statusOrder: Array<'idea' | 'planned' | 'in_progress' | 'done'> = ['idea', 'planned', 'in_progress', 'done'];
  const currentIndex = statusOrder.indexOf(goal.status);
  const nextStatus = statusOrder[(currentIndex + 1) % statusOrder.length];

  const handleSwipe = () => {
    if (onStatusChange && nextStatus) {
      onStatusChange(nextStatus);
    }
  };

  const styles = React.useMemo(() => StyleSheet.create({
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
      marginBottom: spacing.sm,
    },
    title: {
      flex: 1,
      fontSize: fontSizes.lg,
      fontWeight: fontWeights.bold,
      color: colors.text,
      marginRight: spacing.sm,
    },
    statusBadge: {
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.xs,
      borderRadius: radii.sm,
    },
    statusText: {
      fontSize: fontSizes.xs,
      fontWeight: fontWeights.semibold,
      color: '#FFFFFF',
      textTransform: 'capitalize',
    },
    description: {
      fontSize: fontSizes.md,
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
      borderRadius: radii.sm,
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
      fontSize: fontSizes.sm,
      color: colors.muted,
    },
  }), [colors]);

  return (
    <SwipeableRow
      onSwipeRight={onStatusChange ? handleSwipe : undefined}
      rightActionLabel={`Move to ${nextStatus.replace('_', ' ')}`}
      rightActionIcon="arrow-forward-circle-outline"
    >
      <View style={styles.card}>
      <View style={styles.header}>
        <AppText style={styles.title} numberOfLines={2} ellipsizeMode="tail">{goal.title}</AppText>
        <View style={[styles.statusBadge, { backgroundColor: statusColors[goal.status] }]}>
          <AppText style={styles.statusText}>{goal.status.replace('_', ' ')}</AppText>
        </View>
      </View>
      {goal.description && (
        <AppText style={styles.description}>{goal.description}</AppText>
      )}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.upvoteButton, isUpvoted && styles.upvoteButtonActive]}
          onPress={onUpvote}
        >
          <AppText style={styles.upvoteText}>👍 {goal.upvotes.length}</AppText>
        </TouchableOpacity>
        {goal.targetDate && (
          <AppText style={styles.targetDate}>
            Target: {formatDate(goal.targetDate)}
          </AppText>
        )}
      </View>
      </View>
    </SwipeableRow>
  );
};

