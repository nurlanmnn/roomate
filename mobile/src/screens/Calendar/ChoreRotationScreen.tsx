import React, { useEffect, useState, useMemo } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  RefreshControl,
} from 'react-native';
import { SanctuaryScreenShell } from '../../components/sanctuary/SanctuaryScreenShell';
import { useFocusEffect } from '@react-navigation/native';
import { useHousehold } from '../../context/HouseholdContext';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { choresApi, ChoreRotation } from '../../api/choresApi';
import { PrimaryButton } from '../../components/PrimaryButton';
import { EmptyState } from '../../components/ui/EmptyState';
import { ScreenHeader } from '../../components/ui/ScreenHeader';
import { useThemeColors, fontSizes, fontWeights, spacing, radii, shadows, TAB_BAR_HEIGHT } from '../../theme';
import { Ionicons } from '@expo/vector-icons';
import { format, startOfWeek } from 'date-fns';
import { getDateFnsLocale } from '../../utils/dateLocales';

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

  const loadChores = async () => {
    if (!selectedHousehold) return;
    setLoading(true);
    try {
      const data = await choresApi.getChores(selectedHousehold._id, weekKey);
      setChores(data);
    } catch (error: any) {
      if (__DEV__) console.error('Failed to load chores:', error);
      if (error?.response?.status === 403) {
        // handled by guard
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedHousehold) loadChores();
  }, [selectedHousehold]);

  useFocusEffect(
    React.useCallback(() => {
      if (selectedHousehold) loadChores();
    }, [selectedHousehold])
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

        {chores.length === 0 ? (
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
              {chores.map((chore) => (
                <View key={chore._id} style={styles.choreCard}>
                  <View style={styles.choreRow}>
                    <View style={styles.choreIconWrap}>
                      <Ionicons name="sparkles-outline" size={22} color={colors.primary} />
                    </View>
                    <View style={styles.choreContent}>
                      <Text style={styles.choreName}>{chore.name}</Text>
                      <Text style={styles.choreAssignee}>
                        {chore.currentAssignee
                          ? t('chores.assignedTo', { name: chore.currentAssignee.name })
                          : t('chores.noAssignee')}
                      </Text>
                      <Text style={styles.choreFrequency}>
                        {chore.frequency === 'biweekly' ? t('chores.biweekly') : t('chores.weekly')}
                      </Text>
                    </View>
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
                </View>
              ))}
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
      padding: spacing.lg,
      marginBottom: spacing.md,
      borderWidth: 1,
      borderColor: colors.borderLight,
      ...(shadows.sm as object),
    },
    choreRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    choreIconWrap: {
      width: 44,
      height: 44,
      borderRadius: radii.md,
      backgroundColor: colors.primaryUltraSoft,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: spacing.md,
    },
    choreContent: {
      flex: 1,
    },
    choreName: {
      fontSize: fontSizes.lg,
      fontWeight: fontWeights.semibold,
      color: colors.text,
      marginBottom: 2,
    },
    choreAssignee: {
      fontSize: fontSizes.sm,
      color: colors.textSecondary,
      marginBottom: 2,
    },
    choreFrequency: {
      fontSize: fontSizes.xs,
      color: colors.muted,
    },
    choreActions: {
      flexDirection: 'row',
      gap: spacing.sm,
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
