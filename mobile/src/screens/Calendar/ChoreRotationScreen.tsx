import React, { useEffect, useState, useMemo, useCallback } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
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
import { ScreenHeader } from '../../components/ui/ScreenHeader';
import { useThemeColors, fontSizes, spacing, radii, shadows, TAB_BAR_HEIGHT } from '../../theme';
import { Ionicons } from '@expo/vector-icons';
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
      <SanctuaryScreenShell edges={['top', 'bottom']} innerStyle={styles.container}>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>{t('alerts.selectHousehold')}</Text>
        </View>
      </SanctuaryScreenShell>
    );
  }

  return (
    <SanctuaryScreenShell edges={['top']} innerStyle={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={{ paddingBottom: TAB_BAR_HEIGHT + spacing.xl }}
        contentInsetAdjustmentBehavior="automatic"
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        refreshControl={<RefreshControl refreshing={loading} onRefresh={loadChores} />}
      >
        <ScreenHeader
          title={t('chores.title')}
          showTitle={false}
          subtitle={`${t('chores.thisWeek')} · ${format(weekStart, 'MMM d', { locale: dateFnsLocale })}`}
        />

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
                <View key={chore._id} style={styles.choreCard}>
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
                  />
                  {upcoming.length > 0 && (
                    <AppText style={styles.upcomingText}>
                      {t('chores.upcoming', { list: upcoming.map((u) => u.label).join(', ') })}
                    </AppText>
                  )}
                  <View style={styles.choreActions}>
                    <TouchableOpacity
                      style={styles.editButton}
                      onPress={() => navigation.navigate('CreateChore', { editingChore: chore })}
                    >
                      <Ionicons name="pencil-outline" size={20} color={colors.primary} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.deleteButton}
                      onPress={() => handleDeleteChore(chore)}
                    >
                      <Ionicons name="trash-outline" size={20} color={colors.danger} />
                    </TouchableOpacity>
                  </View>
                </View>
                );
              })}
            </View>
            <View style={styles.addButtonWrap}>
              <PrimaryButton
                title={`+ ${t('chores.addChore')}`}
                onPress={() => navigation.navigate('CreateChore')}
              />
            </View>
          </>
        )}
      </ScrollView>
    </SanctuaryScreenShell>
  );
};

const createStyles = (colors: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: 'transparent',
    },
    scrollView: {
      flex: 1,
    },
    emptyContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: spacing.xxl,
    },
    emptyText: {
      fontSize: fontSizes.md,
      color: colors.muted,
    },
    choreList: {
      paddingHorizontal: spacing.xl,
      paddingTop: spacing.sm,
    },
    choreCard: {
      backgroundColor: colors.surface,
      borderRadius: radii.lg,
      padding: spacing.md,
      marginBottom: spacing.md,
      borderWidth: 1,
      borderColor: colors.borderLight,
      ...(shadows.sm as object),
    },
    upcomingText: {
      fontSize: fontSizes.xs,
      color: colors.textTertiary,
      marginTop: spacing.xs,
    },
    choreActions: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      gap: spacing.sm,
      marginTop: spacing.sm,
      paddingTop: spacing.sm,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.borderLight,
    },
    editButton: {
      padding: spacing.sm,
    },
    deleteButton: {
      padding: spacing.sm,
    },
    addButtonWrap: {
      paddingHorizontal: spacing.xl,
      paddingTop: spacing.lg,
    },
  });
