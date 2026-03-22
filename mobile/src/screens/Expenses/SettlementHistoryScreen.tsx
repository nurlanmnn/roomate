import React, { useEffect, useState, useMemo } from 'react';
import { View, StyleSheet, ScrollView, Image, TouchableOpacity, Modal, RefreshControl } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useHousehold } from '../../context/HouseholdContext';
import { useAuth } from '../../context/AuthContext';
import { settlementsApi, Settlement } from '../../api/settlementsApi';
import { Avatar } from '../../components/ui/Avatar';
import { EmptyState } from '../../components/ui/EmptyState';
import { AppText } from '../../components/AppText';
import { SettingsSection } from '../../components/Settings/SettingsSection';
import { SettingsGroupCard } from '../../components/Settings/SettingsGroupCard';
import { formatCurrency } from '../../utils/formatCurrency';
import { formatDate } from '../../utils/dateHelpers';
import { useThemeColors, fontSizes, fontWeights, radii, spacing } from '../../theme';
import { Ionicons } from '@expo/vector-icons';
import { parseISO, subMonths, startOfMonth, startOfYear } from 'date-fns';
import { useLanguage } from '../../context/LanguageContext';

type DateFilter = 'all' | 'month' | '3months' | '6months' | 'year';

export const SettlementHistoryScreen: React.FC<{ navigation: any }> = () => {
  const { selectedHousehold } = useHousehold();
  const { user } = useAuth();
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  const { t } = useLanguage();
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
        filterRow: {
          flexDirection: 'row',
          padding: spacing.xxs,
          gap: spacing.xxs,
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
      }),
    [colors]
  );
  const [settlements, setSettlements] = useState<Settlement[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedProofImage, setSelectedProofImage] = useState<string | null>(null);
  const [dateFilter, setDateFilter] = useState<DateFilter>('all');

  useEffect(() => {
    if (selectedHousehold) {
      loadSettlements();
    }
  }, [selectedHousehold]);

  const loadSettlements = async () => {
    if (!selectedHousehold) return;

    setLoading(true);
    try {
      const data = await settlementsApi.getSettlements(selectedHousehold._id);
      setSettlements(data || []);
    } catch (error) {
      if (__DEV__) console.error('Failed to load settlements', error);
      setSettlements([]);
    } finally {
      setLoading(false);
    }
  };

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

  // Filter settlements by date range
  const filteredSettlements = useMemo(() => {
    if (dateFilter === 'all') {
      return settlements;
    }

    const now = new Date();
    let cutoffDate: Date;

    switch (dateFilter) {
      case 'month':
        cutoffDate = startOfMonth(now);
        break;
      case '3months':
        cutoffDate = subMonths(now, 3);
        break;
      case '6months':
        cutoffDate = subMonths(now, 6);
        break;
      case 'year':
        cutoffDate = startOfYear(now);
        break;
      default:
        return settlements;
    }

    return settlements.filter((settlement) => {
      const settlementDate = parseISO(settlement.date);
      return settlementDate >= cutoffDate;
    });
  }, [settlements, dateFilter]);

  if (!selectedHousehold || !user) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <View style={styles.emptyContainer}>
          <AppText>{t('alerts.selectHousehold')}</AppText>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
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
        ) : filteredSettlements.length === 0 ? (
          <View style={styles.emptyContainer}>
            <EmptyState
              icon="receipt-outline"
              title={
                settlements.length === 0
                  ? t('settlementHistory.noSettlements')
                  : t('settlementHistory.noSettlementsInPeriod')
              }
              message={
                settlements.length === 0
                  ? t('settlementHistory.noSettlementsDescription')
                  : t('settlementHistory.tryDifferentPeriod')
              }
              variant="minimal"
            />
          </View>
        ) : (
          <SettingsSection title={t('settlementHistory.sectionList')}>
            {filteredSettlements.map((settlement, index) => {
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
                    marginBottom: index < filteredSettlements.length - 1 ? spacing.md : 0,
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
                      <AppText style={styles.amount}>{formatCurrency(settlement.amount)}</AppText>
                    </View>

                    <View style={styles.settlementDetails}>
                      <View style={styles.detailRow}>
                        <Ionicons name="calendar-outline" size={16} color={colors.textSecondary} />
                        <AppText style={styles.detailText}>{formatDate(settlement.date)}</AppText>
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
    </SafeAreaView>
  );
};

