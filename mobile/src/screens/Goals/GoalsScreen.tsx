import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useHousehold } from '../../context/HouseholdContext';
import { useAuth } from '../../context/AuthContext';
import { goalsApi, Goal } from '../../api/goalsApi';
import { GoalCard } from '../../components/GoalCard';
import { PrimaryButton } from '../../components/PrimaryButton';
import { ScreenHeader } from '../../components/ui/ScreenHeader';
import { SearchBar } from '../../components/ui/SearchBar';
import { colors, fontSizes, fontWeights, spacing } from '../../theme';

export const GoalsScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { selectedHousehold } = useHousehold();
  const { user } = useAuth();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeStatus, setActiveStatus] = useState<'idea' | 'planned' | 'in_progress' | 'done'>('idea');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (selectedHousehold) loadGoals();
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

  const handleUpvote = async (goal: Goal) => {
    try {
      await goalsApi.upvoteGoal(goal._id);
      loadGoals();
    } catch (error) {
      console.error('Failed to upvote:', error);
    }
  };

  const handleUpdateStatus = async (goal: Goal, newStatus: Goal['status']) => {
    try {
      await goalsApi.updateGoal(goal._id, { status: newStatus });
      loadGoals();
    } catch (error) {
      console.error('Failed to update goal:', error);
    }
  };

  if (!selectedHousehold || !user) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>Please select a household</Text>
        </View>
      </SafeAreaView>
    );
  }

  const goalsByStatus: Record<Goal['status'], Goal[]> = {
    idea: [],
    planned: [],
    in_progress: [],
    done: [],
  };
  goals.forEach((g) => goalsByStatus[g.status].push(g));

  const q = searchQuery.trim().toLowerCase();
  const visibleGoals = q
    ? goalsByStatus[activeStatus].filter((g) => `${g.title} ${g.description || ''}`.toLowerCase().includes(q))
    : goalsByStatus[activeStatus];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView style={styles.scrollView}>
        <ScreenHeader title="Goals" subtitle={selectedHousehold.name} />
        <View style={styles.topActions}>
          <PrimaryButton title="+ New Goal" onPress={() => navigation.navigate('CreateGoal')} />
        </View>
        <View style={styles.searchWrap}>
          <SearchBar value={searchQuery} onChangeText={setSearchQuery} placeholder="Search goals" />
        </View>

        <View style={styles.filterRow}>
          {(['idea', 'planned', 'in_progress', 'done'] as const).map((s) => (
            <TouchableOpacity
              key={s}
              style={[styles.filterPill, activeStatus === s && styles.filterPillActive]}
              onPress={() => setActiveStatus(s)}
            >
              <Text style={[styles.filterText, activeStatus === s && styles.filterTextActive]}>
                {s.replace('_', ' ')}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.section}>
          {visibleGoals.map((goal) => (
            <View key={goal._id} style={styles.goalWrapper}>
              <GoalCard goal={goal} onUpvote={() => handleUpvote(goal)} currentUserId={user._id} />
              <Text style={styles.moveToLabel}>Move to:</Text>
              <View style={styles.statusActions}>
                {(['idea', 'planned', 'in_progress', 'done'] as const).map((s) => (
                  <TouchableOpacity
                    key={s}
                    style={[styles.statusButton, goal.status === s && styles.statusButtonActive]}
                    onPress={() => handleUpdateStatus(goal, s)}
                  >
                    <Text style={[styles.statusButtonText, goal.status === s && styles.statusButtonTextActive]}>
                      {s.replace('_', ' ')}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          ))}
        </View>

        {visibleGoals.length === 0 && (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No goals in this section</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scrollView: { flex: 1 },
  topActions: { paddingHorizontal: spacing.md, paddingBottom: spacing.md },
  searchWrap: { paddingHorizontal: spacing.md, paddingBottom: spacing.md },
  emptyContainer: { padding: spacing.xxl, alignItems: 'center' },
  emptyText: { fontSize: fontSizes.md, color: colors.muted },
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  filterPill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 18,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterPillActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  filterText: { fontSize: 14, color: colors.textSecondary, textTransform: 'capitalize' },
  filterTextActive: { color: colors.surface, fontWeight: fontWeights.bold },
  section: { paddingHorizontal: spacing.md, paddingVertical: spacing.md },
  goalWrapper: { marginBottom: spacing.md },
  moveToLabel: { marginTop: spacing.xs, marginBottom: spacing.xs, color: colors.textSecondary, fontSize: 12 },
  statusActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  statusButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 14,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
  },
  statusButtonActive: { backgroundColor: colors.primarySoft, borderColor: colors.primary },
  statusButtonText: { fontSize: 12, color: colors.textSecondary, textTransform: 'capitalize' },
  statusButtonTextActive: { color: colors.primaryDark, fontWeight: fontWeights.semibold },
});


