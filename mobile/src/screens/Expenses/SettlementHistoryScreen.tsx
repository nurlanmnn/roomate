import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { View, StyleSheet, ScrollView, Image, TouchableOpacity, Modal, RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SanctuaryScreenShell } from '../../components/sanctuary/SanctuaryScreenShell';
import { useHousehold } from '../../context/HouseholdContext';
import { useAuth } from '../../context/AuthContext';
import { settlementsApi, Settlement } from '../../api/settlementsApi';
import { Avatar } from '../../components/ui/Avatar';
import { EmptyState } from '../../components/ui/EmptyState';
import { AppText } from '../../components/AppText';
import { SettingsSection } from '../../components/Settings/SettingsSection';
import { SettingsGroupCard } from '../../components/Settings/SettingsGroupCard';
import { formatCurrency } from '../../utils/formatCurrency';
import { useHouseholdCurrency } from '../../utils/useHouseholdCurrency';
import { formatDate } from '../../utils/dateHelpers';
import { getDateFnsLocale } from '../../utils/dateLocales';
import { useThemeColors, fontSizes, fontWeights, radii, spacing } from '../../theme';
import { Ionicons } from '@expo/vector-icons';
import { subMonths, startOfMonth, startOfYear } from 'date-fns';
import { useLanguage } from '../../context/LanguageContext';
import { dedupedFetch, getCached } from '../../utils/queryCache';

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

export const SettlementHistoryScreen: React.FC<{ navigation: any }> = () => {
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
          backgroundColor: 'transparent',
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
        filterRow: {
          flexDirection: 'row',
          padding: spacing.xxs,
          gap: spacing.xxs,
          backgroundColor: colors.primaryUltraSoft,
          borderRadius: radii.md,
        },
        filterButton: {
          flex: 1,
          paddingVertical: spacing.xs,
          paddingHorizontal: spacing.sm,
          borderRadius: radii.sm,
          alignItems: 'center',
          justifyContent: 'center',
          minWidth: 50,
        },
        filterButtonActive: {
          backgroundColor: colors.primary,
        },
        filterButtonText: {
          fontSize: fontSizes.xs,
          fontWeight: fontWeights.medium,
          color: colors.textSecondary,
        },
        filterButtonTextActive: {
          color: colors.surface,
          fontWeight: fontWeights.semibold,
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
        settlementHeader: {
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: spacing.md,
        },
        userInfo: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.sm,
          flex: 1,
        },
        settlementText: {
          fontSize: fontSizes.md,
          color: colors.text,
          flex: 1,
        },
        userName: {
          fontWeight: fontWeights.semibold,
        },
        amount: {
          fontSize: fontSizes.lg,
          fontWeight: fontWeights.extrabold,
          color: colors.primary,
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
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.xs,
          marginTop: spacing.xs,
          paddingVertical: spacing.xs,
        },
        proofButtonText: {
          fontSize: fontSizes.sm,
          color: colors.primary,
          fontWeight: fontWeights.medium,
        },
        proofModalOverlay: {
          flex: 1,
          backgroundColor: 'rgba(0, 0, 0, 0.9)',
          justifyContent: 'center',
          alignItems: 'center',
        },
        proofModalClose: {
          position: 'absolute',
          right: spacing.lg,
          zIndex: 10,
          padding: spacing.xs,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          borderRadius: 20,
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
    if (!selectedHousehold) return 'Unknown';
    const member = selectedHousehold.members.find(m => m._id === userId);
    return member?.name || 'Unknown';
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
      <SanctuaryScreenShell edges={['top', 'bottom']} innerStyle={styles.container}>
        <View style={styles.emptyContainer}>
          <AppText>{t('alerts.selectHousehold')}</AppText>
        </View>
      </SanctuaryScreenShell>
    );
  }

  return (
    <SanctuaryScreenShell edges={['top']} innerStyle={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        contentInsetAdjustmentBehavior="automatic"
        refreshControl={<RefreshControl refreshing={loading} onRefresh={loadSettlements} />}
        showsVerticalScrollIndicator={false}
      >
        <SettingsSection title={t('settlementHistory.sectionHousehold')}>
          <SettingsGroupCard>
            <View style={styles.cardPad}>
              <AppText style={styles.householdLine}>{selectedHousehold.name}</AppText>
            </View>
          </SettingsGroupCard>
        </SettingsSection>

        <SettingsSection title={t('settlementHistory.sectionPeriod')}>
          <SettingsGroupCard>
            <View style={styles.filterRow}>
              {(['all', 'month', '3months', '6months', 'year'] as DateFilter[]).map((filter) => (
                <TouchableOpacity
                  key={filter}
                  style={[
                    styles.filterButton,
                    dateFilter === filter && styles.filterButtonActive,
                  ]}
                  onPress={() => setDateFilter(filter)}
                  activeOpacity={0.85}
                >
                  <AppText
                    style={[
                      styles.filterButtonText,
                      dateFilter === filter && styles.filterButtonTextActive,
                    ]}
                  >
                    {filter === 'all'
                      ? t('time.all')
                      : filter === 'month'
                        ? '1M'
                        : filter === '3months'
                          ? '3M'
                          : filter === '6months'
                            ? '6M'
                            : '1Y'}
                  </AppText>
                </TouchableOpacity>
              ))}
            </View>
          </SettingsGroupCard>
        </SettingsSection>

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
          <SettingsSection title={t('settlementHistory.sectionList')}>
            {visibleSettlements.map((settlement, index) => {
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
                  ? settlement.fromUserId.name || 'Unknown User'
                  : 'Unknown User';
              const toUserName = toUserId
                ? getUserName(toUserId)
                : typeof settlement.toUserId === 'object' && settlement.toUserId !== null
                  ? settlement.toUserId.name || 'Unknown User'
                  : 'Unknown User';

              const fromUserAvatar = fromUserId ? getUserAvatar(fromUserId) : undefined;

              return (
                <SettingsGroupCard
                  key={settlement._id}
                  style={{
                    marginBottom: index < visibleSettlements.length - 1 ? spacing.md : 0,
                  }}
                >
                  <View style={styles.cardPad}>
                    <View style={styles.settlementHeader}>
                      <View style={styles.userInfo}>
                        <Avatar name={fromUserName} uri={fromUserAvatar} size={32} />
                        <AppText style={styles.settlementText}>
                          <AppText style={styles.userName}>{fromUserName}</AppText>
                          {` ${t('settlementHistory.paid')} `}
                          <AppText style={styles.userName}>{toUserName}</AppText>
                        </AppText>
                      </View>
                      <AppText style={styles.amount}>{formatCurrency(settlement.amount, currency)}</AppText>
                    </View>

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
                </SettingsGroupCard>
              );
            })}
            {hasMoreSettlements ? (
              <TouchableOpacity
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
          </SettingsSection>
        )}
      </ScrollView>

      {/* Proof Image Modal */}
      <Modal
        visible={selectedProofImage !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedProofImage(null)}
      >
        <View style={styles.proofModalOverlay}>
          <TouchableOpacity
            style={[styles.proofModalClose, { top: insets.top + spacing.md }]}
            onPress={() => setSelectedProofImage(null)}
          >
            <Ionicons name="close-circle" size={40} color="#FFFFFF" />
          </TouchableOpacity>
          {selectedProofImage && (
            <Image source={{ uri: selectedProofImage }} style={styles.proofModalImage} resizeMode="contain" />
          )}
        </View>
      </Modal>
    </SanctuaryScreenShell>
  );
};

