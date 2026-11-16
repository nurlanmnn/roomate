import React, { useEffect, useState, useMemo, useCallback } from 'react';
import {
  Pressable,
  Alert,
  ScrollView,
  StyleSheet,
  View,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { SanctuaryScreenShell } from '../../components/sanctuary/SanctuaryScreenShell';
import { useFocusEffect } from '@react-navigation/native';
import { useHousehold } from '../../context/HouseholdContext';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { choresApi, ChoreRotation } from '../../api/choresApi';
import { getCached, dedupedFetch, invalidateCache, DEFAULT_STALE_TIME_MS } from '../../utils/queryCache';
import { AppText } from '../../components/AppText';
import { ChoreRotationRow } from '../../components/ChoreRotationRow';
import { useChoreCompletion } from '../../hooks/useChoreCompletion';
import { PrimaryButton } from '../../components/PrimaryButton';
import { EmptyState } from '../../components/ui/EmptyState';
import { Group, SectionHeading } from '../../components/ui/Group';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors, fontSizes, fontWeights, spacing } from '../../theme';
import { format, startOfWeek } from 'date-fns';
import { getDateFnsLocale } from '../../utils/dateLocales';
import { getChorePeriodStart, getUpcomingAssignees } from '../../utils/choreSchedule';

export const ChoreRotationScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { selectedHousehold } = useHousehold();
  const { user } = useAuth();
  const { t, language } = useLanguage();
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const dateFnsLocale = useMemo(() => getDateFnsLocale(language), [language]);
  const [chores, setChores] = useState<ChoreRotation[]>([]);
  const [loading, setLoading] = useState(false);

  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
  const weekKey = format(weekStart, 'yyyy-MM-dd');

  const { handleToggleChoreComplete } = useChoreCompletion({
    selectedHousehold,
    user,
    setChores,
    t,
    cacheKeyPrefix: 'chores',
  });

  const loadChores = useCallback(async (opts?: { allowStale?: boolean }) => {
    if (!selectedHousehold) return;
    const key = `chores:${selectedHousehold._id}:${weekKey}`;

    const cached = getCached<ChoreRotation[]>(key);
    if (cached) {
      setChores(cached);
    } else {
      setLoading(true);
    }
    try {
      const data = await dedupedFetch<ChoreRotation[]>(
        key,
        () => choresApi.getChores(selectedHousehold._id, weekKey),
        { staleTime: opts?.allowStale ? DEFAULT_STALE_TIME_MS : 0 }
      );
      setChores(data);
    } catch (error: any) {
      if (__DEV__) console.error('Failed to load chores:', error);
    } finally {
      setLoading(false);
    }
  }, [selectedHousehold, weekKey]);

  const handleGiveToChore = useCallback(
    (chore: ChoreRotation, referenceDate: Date) => {
      if (!selectedHousehold || !user) return;

      const periodStart = getChorePeriodStart(chore, referenceDate);
      if (!periodStart) return;

      const otherMembers = chore.rotationOrder.filter((m) => m._id !== user._id);
      if (otherMembers.length === 0) return;

      const periodStartIso = periodStart.toISOString();

      Alert.alert(
        t('chores.giveTo'),
        undefined,
        [
          { text: t('common.cancel'), style: 'cancel' },
          ...otherMembers.map((member) => ({
            text: t('chores.swapWeek', { name: member.name }),
            onPress: () => {
              Alert.alert(
                t('chores.giveTo'),
                t('chores.overrideConfirm', { name: member.name }),
                [
                  { text: t('common.cancel'), style: 'cancel' },
                  {
                    text: t('common.confirm'),
                    onPress: async () => {
                      try {
                        await choresApi.setOverride(chore._id, periodStartIso, member._id);
                        invalidateCache(`chores:${selectedHousehold._id}`);
                        invalidateCache(`calendar:${selectedHousehold._id}`);
                        invalidateCache(`home:dashboard:${selectedHousehold._id}`);
                        loadChores();
                      } catch (e: any) {
                        Alert.alert(
                          t('common.error'),
                          e.response?.data?.error || t('alerts.somethingWentWrong')
                        );
                      }
                    },
                  },
                ]
              );
            },
          })),
        ],
        { cancelable: true }
      );
    },
    [selectedHousehold, user, t, loadChores]
  );

  useEffect(() => {
    if (selectedHousehold) loadChores();
  }, [selectedHousehold, loadChores]);

  useFocusEffect(
    React.useCallback(() => {
      if (selectedHousehold) loadChores({ allowStale: true });
    }, [selectedHousehold, loadChores])
  );

  const handleDeleteChore = (chore: ChoreRotation) => {
    Alert.alert(
      t('common.delete'),
      t('chores.deleteChoreConfirm', { name: chore.name }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: async () => {
            try {
              await choresApi.deleteChore(chore._id);
              if (selectedHousehold) {
                invalidateCache(`chores:${selectedHousehold._id}`);
                invalidateCache(`calendar:${selectedHousehold._id}`);
              }
              loadChores();
            } catch (e: any) {
              Alert.alert(t('common.error'), e.response?.data?.error || t('alerts.somethingWentWrong'));
            }
          },
        },
      ]
    );
  };

  if (!selectedHousehold) {
    return (
      <SanctuaryScreenShell edges={['bottom']} innerStyle={styles.container}>
        <View style={styles.emptyContainer}>
          <AppText style={styles.emptyText}>{t('alerts.selectHousehold')}</AppText>
        </View>
      </SanctuaryScreenShell>
    );
  }

  return (
    <SanctuaryScreenShell edges={['bottom']} innerStyle={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={{ paddingBottom: spacing.xxl }}
        contentInsetAdjustmentBehavior="automatic"
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        refreshControl={<RefreshControl refreshing={loading} onRefresh={loadChores} tintColor={colors.primary} />}
      >
        <SectionHeading title={`${t('chores.thisWeek')} · ${format(weekStart, 'MMM d', { locale: dateFnsLocale })}`} />

        {loading && chores.length === 0 ? (
          <View style={{ paddingVertical: spacing.xxl, alignItems: 'center' }}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : chores.length === 0 ? (
          <EmptyState
            icon="repeat-outline"
            title={t('chores.noChores')}
            message={t('chores.noChoresDescription')}
            actionLabel={t('chores.addChore')}
            onAction={() => navigation.navigate('CreateChore')}
            variant="minimal"
          />
        ) : (
          <>
            <View style={styles.choreList}>
              {chores.map((chore) => {
                const upcoming = getUpcomingAssignees(chore, new Date(), 3, dateFnsLocale);
                return (
                  <Group key={chore._id} style={styles.choreCard}>
                    <ChoreRotationRow
                      chore={chore}
                      user={user}
                      referenceDate={new Date()}
                      onToggleComplete={handleToggleChoreComplete}
                      onGiveTo={handleGiveToChore}
                      dateFnsLocale={dateFnsLocale}
                      t={t}
                      colors={colors}
                      showPeriodRange
                      showFrequency
                      variant="compact"
                      isLast
                    />
                    {upcoming.length > 0 && (
                      <AppText style={styles.upcomingText}>
                        {t('chores.upcoming', { list: upcoming.map((u) => u.label).join(', ') })}
                      </AppText>
                    )}
                    <View style={styles.choreActions}>
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={`${t('common.edit')}: ${chore.name}`}
                        onPress={() => navigation.navigate('CreateChore', { editingChore: chore })}
                        style={({ pressed }) => [styles.choreAction, pressed && { opacity: 0.6 }]}
                      >
                        <Ionicons name="pencil-outline" size={18} color={colors.primary} />
                        <AppText style={[styles.choreActionText, { color: colors.primary }]}>{t('common.edit')}</AppText>
                      </Pressable>
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={`${t('common.delete')}: ${chore.name}`}
                        onPress={() => handleDeleteChore(chore)}
                        style={({ pressed }) => [styles.choreAction, pressed && { opacity: 0.6 }]}
                      >
                        <Ionicons name="trash-outline" size={18} color={colors.danger} />
                        <AppText style={[styles.choreActionText, { color: colors.danger }]}>{t('common.delete')}</AppText>
                      </Pressable>
                    </View>
                  </Group>
                );
              })}
            </View>
            <View style={styles.addButtonWrap}>
              <PrimaryButton
                title={t('chores.addChore')}
                icon="add-outline"
                onPress={() => navigation.navigate('CreateChore')}
              />
            </View>
          </>
        )}
      </ScrollView>
    </SanctuaryScreenShell>
  );
};

const createStyles = (colors: ReturnType<typeof useThemeColors>) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  choreActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    flexWrap: 'wrap',
    gap: spacing.md,
    paddingHorizontal: spacing.md,
  },
  choreAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxs,
    minHeight: 44,
    paddingHorizontal: spacing.xs,
  },
  choreActionText: { fontSize: fontSizes.md - 1, fontWeight: fontWeights.semibold },
  scrollView: { flex: 1 },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xxl
  },
  emptyText: { fontSize: fontSizes.md, color: colors.textSecondary },
  choreList: { paddingTop: spacing.xs },
  choreCard: { marginBottom: spacing.md },
  upcomingText: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
  },
  addButtonWrap: { paddingHorizontal: spacing.md, paddingTop: spacing.md },
});
