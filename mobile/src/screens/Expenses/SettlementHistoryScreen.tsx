import { Ionicons } from '@expo/vector-icons';
import { startOfMonth, startOfYear, subMonths } from 'date-fns';
import { Image as ExpoImage } from 'expo-image';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Modal, RefreshControl, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Settlement, settlementsApi } from '../../api/settlementsApi';
import { AppText } from '../../components/AppText';
import { SanctuaryScreenShell } from '../../components/sanctuary/SanctuaryScreenShell';
import { Amount } from '../../components/ui/Amount';
import { Avatar } from '../../components/ui/Avatar';
import { EmptyState } from '../../components/ui/EmptyState';
import { ChipRow } from '../../components/ui/ChipRow';
import { Group, GroupRow, SectionHeading } from '../../components/ui/Group';
import { useAuth } from '../../context/AuthContext';
import { useHousehold } from '../../context/HouseholdContext';
import { useLanguage } from '../../context/LanguageContext';
import { fontSizes, fontWeights, radii, spacing, useThemeColors } from '../../theme';
import { formatDate } from '../../utils/dateHelpers';
import { getDateFnsLocale } from '../../utils/dateLocales';
import { dedupedFetch, getCached } from '../../utils/queryCache';
import { useHouseholdCurrency } from '../../utils/useHouseholdCurrency';

type DateFilter = 'all' | 'month' | '3months' | '6months' | 'year';

const SETTLEMENTS_PAGE_SIZE = 5;

type SettlementsSnapshot = {
  settlements: Settlement[];
  total: number;
};

const settlementHistoryKey = (householdId: string, dateFilter: DateFilter) =>
  `settlements:${householdId}:history:${dateFilter}:page0`;

const getDateFilterStart = (dateFilter: DateFilter): string | undefined => {
  const now = new Date();
  switch (dateFilter) {
    case 'month':
      return startOfMonth(now).toISOString();
    case '3months':
      return subMonths(now, 3).toISOString();
    case '6months':
      return subMonths(now, 6).toISOString();
    case 'year':
      return startOfYear(now).toISOString();
    case 'all':
    default:
      return undefined;
  }
};

export const SettlementHistoryScreen: React.FC<{ navigation: any; }> = () => {
  const { selectedHousehold } = useHousehold();
  const { user } = useAuth();
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  const { t, language } = useLanguage();
  const dateFnsLocale = useMemo(() => getDateFnsLocale(language), [language]);
  const relativeDayLabels = useMemo(
    () => ({
      today: t('time.today'),
      yesterday: t('time.yesterday'),
      tomorrow: t('time.tomorrow'),
    }),
    [t]
  );
  const currency = useHouseholdCurrency();
  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          flex: 1,
          backgroundColor: colors.background,
        },
        scrollView: {
          flex: 1,
        },
        scrollContent: {
          flexGrow: 1,
          paddingBottom: spacing.xxl,
        },
        householdLine: {
          fontSize: fontSizes.md,
          fontWeight: fontWeights.semibold,
          color: colors.text,
        },
        emptyContainer: {
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          padding: spacing.xl,
          minHeight: 400,
        },
        loadingText: {
          fontSize: fontSizes.md,
          color: colors.textSecondary,
          textAlign: 'center',
          marginTop: spacing.xl,
        },
        cardPad: {
          padding: spacing.lg,
        },
        settlementDetails: {
          gap: spacing.xs,
        },
        detailRow: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.xs,
        },
        detailText: {
          fontSize: fontSizes.sm,
          color: colors.textSecondary,
          flex: 1,
        },
        proofButton: {
          minHeight: 44,
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.xs,
          marginTop: spacing.xs,
          paddingVertical: spacing.xs,
        },
        proofButtonText: {
          flexShrink: 1,
          fontSize: fontSizes.sm,
          color: colors.primary,
          fontWeight: fontWeights.medium,
        },
        proofModalOverlay: {
          flex: 1,
          backgroundColor: colors.background,
          justifyContent: 'center',
          alignItems: 'center',
        },
        proofModalClose: {
          minWidth: 44,
          minHeight: 44,
          alignItems: 'center',
          justifyContent: 'center',
          position: 'absolute',
          right: spacing.lg,
          zIndex: 10,
          padding: spacing.xs,
          backgroundColor: colors.surface,
          borderRadius: radii.pill,
        },
        proofModalImage: {
          width: '90%',
          height: '80%',
        },
        loadMoreButton: {
          alignItems: 'center',
          paddingVertical: spacing.md,
          paddingHorizontal: spacing.lg,
        },
        loadMoreText: {
          fontSize: fontSizes.sm,
          fontWeight: fontWeights.semibold,
          color: colors.primary,
        },
      }),
    [colors]
  );
  const [settlements, setSettlements] = useState<Settlement[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [selectedProofImage, setSelectedProofImage] = useState<string | null>(null);
  const [dateFilter, setDateFilter] = useState<DateFilter>('all');
  const loadRequestIdRef = useRef(0);

  const loadSettlements = useCallback(async () => {
    if (!selectedHousehold) return;

    const requestId = ++loadRequestIdRef.current;
    const key = settlementHistoryKey(selectedHousehold._id, dateFilter);
    const cached = getCached<SettlementsSnapshot>(key);
    if (cached) {
      setSettlements(cached.settlements);
      setTotalCount(cached.total);
    } else {
      setSettlements([]);
      setTotalCount(0);
      setLoading(true);
    }

    try {
      const snapshot = await dedupedFetch<SettlementsSnapshot>(key, async () => {
        const raw = await settlementsApi.getSettlements(selectedHousehold._id, {
          limit: SETTLEMENTS_PAGE_SIZE,
          skip: 0,
          fromDate: getDateFilterStart(dateFilter),
          includeProof: true,
        });
        if (Array.isArray(raw)) {
          return { settlements: raw, total: raw.length };
        }
        return { settlements: raw.items, total: raw.total };
      });
      if (requestId !== loadRequestIdRef.current) return;
      setSettlements(snapshot.settlements);
      setTotalCount(snapshot.total);
    } catch (error) {
      if (requestId !== loadRequestIdRef.current) return;
      if (__DEV__) console.error('Failed to load settlements', error);
      if (!cached) {
        setSettlements([]);
        setTotalCount(0);
      }
    } finally {
      if (requestId === loadRequestIdRef.current) setLoading(false);
    }
  }, [selectedHousehold, dateFilter]);

  useEffect(() => {
    if (selectedHousehold) {
      loadSettlements();
    }
  }, [selectedHousehold, dateFilter, loadSettlements]);

  const getUserName = (userId: string): string => {
    if (!selectedHousehold) return t('common.someone');
    const member = selectedHousehold.members.find(m => m._id === userId);
    return member?.name || t('common.someone');
  };

  const getUserAvatar = (userId: string): string | undefined => {
    if (!selectedHousehold) return undefined;
    const member = selectedHousehold.members.find(m => m._id === userId);
    return member?.avatarUrl;
  };

  const visibleSettlements = settlements;
  const hasMoreSettlements = settlements.length < totalCount;

  const loadMoreSettlements = useCallback(async () => {
    if (!selectedHousehold || loadingMore || !hasMoreSettlements) return;
    setLoadingMore(true);
    try {
      const raw = await settlementsApi.getSettlements(selectedHousehold._id, {
        limit: SETTLEMENTS_PAGE_SIZE,
        skip: settlements.length,
        fromDate: getDateFilterStart(dateFilter),
        includeProof: true,
      });
      if (Array.isArray(raw)) return;
      setSettlements((prev) => [...prev, ...raw.items]);
      setTotalCount(raw.total);
    } catch (error) {
      if (__DEV__) console.error('Failed to load more settlements', error);
    } finally {
      setLoadingMore(false);
    }
  }, [selectedHousehold, loadingMore, hasMoreSettlements, settlements.length, dateFilter]);

  if (!selectedHousehold || !user) {
    return (
      <SanctuaryScreenShell edges={['bottom']} innerStyle={styles.container}>
        <View style={styles.emptyContainer}>
          <AppText>{t('alerts.selectHousehold')}</AppText>
        </View>
      </SanctuaryScreenShell>
    );
  }

  return (
    <SanctuaryScreenShell edges={['bottom']} innerStyle={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        contentInsetAdjustmentBehavior="automatic"
        refreshControl={<RefreshControl refreshing={loading} onRefresh={loadSettlements} />}
        showsVerticalScrollIndicator={false}
      >
        <View><SectionHeading title={t('settlementHistory.sectionHousehold')} />
          <Group>
            <View style={styles.cardPad}>
              <AppText style={styles.householdLine}>{selectedHousehold.name}</AppText>
            </View>
          </Group>
        </View>

        <View><SectionHeading title={t('settlementHistory.sectionPeriod')} />
          <ChipRow
            options={(['all', 'month', '3months', '6months', 'year'] as DateFilter[]).map((filter) => ({
              value: filter,
              label:
                filter === 'all'
                  ? t('time.all')
                  : filter === 'month'
                    ? t('time.month')
                    : filter === '3months'
                      ? t('monthlyTrend.lastNMonths', { count: 3 })
                      : filter === '6months'
                        ? t('monthlyTrend.lastNMonths', { count: 6 })
                        : t('time.year'),
            }))}
            selected={dateFilter}
            onSelect={setDateFilter}
          />
        </View>

        {loading ? (
          <View style={styles.emptyContainer}>
            <AppText style={styles.loadingText}>{t('settlementHistory.loading')}</AppText>
          </View>
        ) : settlements.length === 0 ? (
          <View style={styles.emptyContainer}>
            <EmptyState
              icon="receipt-outline"
              title={
                totalCount === 0
                  ? t('settlementHistory.noSettlements')
                  : t('settlementHistory.noSettlementsInPeriod')
              }
              message={
                totalCount === 0
                  ? t('settlementHistory.noSettlementsDescription')
                  : t('settlementHistory.tryDifferentPeriod')
              }
              variant="minimal"
            />
          </View>
        ) : (
          <View><SectionHeading title={t('settlementHistory.sectionList')} />
            <Group>
              {visibleSettlements.map((settlement) => {
                const fromUserId =
                  typeof settlement.fromUserId === 'object' && settlement.fromUserId !== null
                    ? settlement.fromUserId._id
                    : (settlement.fromUserId as string);
                const toUserId =
                  typeof settlement.toUserId === 'object' && settlement.toUserId !== null
                    ? settlement.toUserId._id
                    : (settlement.toUserId as string);

                const fromUserName = fromUserId
                  ? getUserName(fromUserId)
                  : typeof settlement.fromUserId === 'object' && settlement.fromUserId !== null
                    ? settlement.fromUserId.name || t('common.someone')
                    : t('common.someone');
                const toUserName = toUserId
                  ? getUserName(toUserId)
                  : typeof settlement.toUserId === 'object' && settlement.toUserId !== null
                    ? settlement.toUserId.name || t('common.someone')
                    : t('common.someone');

                const fromUserAvatar = fromUserId ? getUserAvatar(fromUserId) : undefined;

                return (
                  <View key={settlement._id}>
                    <GroupRow
                      title={`${fromUserName} ${t('settlementHistory.paid')} ${toUserName}`}
                      titleLines={0}
                      leading={<Avatar name={fromUserName} uri={fromUserAvatar} size={32} />}
                      trailing={<Amount value={settlement.amount} currency={currency} size={22} fit />}
                    />
                    <View style={{ paddingHorizontal: spacing.md, paddingBottom: spacing.md }}>
                      <View style={styles.settlementDetails}>
                        <View style={styles.detailRow}>
                          <Ionicons name="calendar-outline" size={16} color={colors.textSecondary} />
                          <AppText style={styles.detailText}>
                            {formatDate(settlement.date, dateFnsLocale, relativeDayLabels)}
                          </AppText>
                        </View>
                        {settlement.method ? (
                          <View style={styles.detailRow}>
                            <Ionicons name="card-outline" size={16} color={colors.textSecondary} />
                            <AppText style={styles.detailText}>{settlement.method}</AppText>
                          </View>
                        ) : null}
                        {settlement.note ? (
                          <View style={styles.detailRow}>
                            <Ionicons name="document-text-outline" size={16} color={colors.textSecondary} />
                            <AppText style={styles.detailText}>{settlement.note}</AppText>
                          </View>
                        ) : null}
                        {settlement.proofImageUrl ? (
                          <TouchableOpacity
                            accessibilityRole="button"
                            style={styles.proofButton}
                            onPress={() => setSelectedProofImage(settlement.proofImageUrl || null)}
                            activeOpacity={0.75}
                          >
                            <Ionicons name="image-outline" size={16} color={colors.primary} />
                            <AppText style={styles.proofButtonText}>{t('settlementHistory.viewProof')}</AppText>
                          </TouchableOpacity>
                        ) : null}
                      </View>
                    </View>
                  </View>
                );
              })}
            </Group>
            {hasMoreSettlements ? (
              <TouchableOpacity
                accessibilityRole="button"
                style={styles.loadMoreButton}
                onPress={loadMoreSettlements}
                activeOpacity={0.75}
              >
                {loadingMore ? (
                  <AppText style={styles.loadMoreText}>{t('settlementHistory.loading')}</AppText>
                ) : (
                  <AppText style={styles.loadMoreText}>
                    {t('common.loadMore')} ({visibleSettlements.length}/{totalCount})
                  </AppText>
                )}
              </TouchableOpacity>
            ) : null}
          </View>
        )}
      </ScrollView>

      {/* Proof Image Modal */}
      <Modal
        visible={selectedProofImage !== null}
        transparent
        animationType="none"
        onRequestClose={() => setSelectedProofImage(null)}
      >
        <View style={styles.proofModalOverlay}>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={t('common.close')}
            style={[styles.proofModalClose, { top: insets.top + spacing.md }]}
            onPress={() => setSelectedProofImage(null)}
          >
            <Ionicons name="close-outline" size={24} color={colors.text} />
          </TouchableOpacity>
          {selectedProofImage && (
            <ExpoImage
              source={{ uri: selectedProofImage }}
              style={styles.proofModalImage}
              accessible
              accessibilityLabel={t('settlementHistory.viewProof')}
              contentFit="contain"
              cachePolicy="memory-disk"
              transition={0}
            />
          )}
        </View>
      </Modal>
    </SanctuaryScreenShell>
  );
};
