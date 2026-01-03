import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, Modal, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useHousehold } from '../../context/HouseholdContext';
import { useAuth } from '../../context/AuthContext';
import { settlementsApi, Settlement } from '../../api/settlementsApi';
import { ScreenHeader } from '../../components/ui/ScreenHeader';
import { Avatar } from '../../components/ui/Avatar';
import { EmptyState } from '../../components/ui/EmptyState';
import { formatCurrency } from '../../utils/formatCurrency';
import { formatDate, formatDateTime } from '../../utils/dateHelpers';
import { useThemeColors, fontSizes, fontWeights, radii, spacing, shadows } from '../../theme';
import { Ionicons } from '@expo/vector-icons';
import { parseISO, subMonths, subYears, startOfMonth, startOfYear } from 'date-fns';

type DateFilter = 'all' | 'month' | '3months' | '6months' | 'year';

export const SettlementHistoryScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { selectedHousehold } = useHousehold();
  const { user } = useAuth();
  const colors = useThemeColors();
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
        },
        subtitleContainer: {
          paddingHorizontal: spacing.xl,
          paddingTop: spacing.sm,
          paddingBottom: spacing.xs,
        },
        subtitle: {
          fontSize: fontSizes.sm,
          color: colors.textSecondary,
          fontWeight: fontWeights.medium,
        },
        filterContainer: {
          paddingHorizontal: spacing.xl,
          paddingTop: spacing.md,
          paddingBottom: spacing.sm,
        },
        filterRow: {
          flexDirection: 'row',
          backgroundColor: colors.background,
          borderRadius: radii.md,
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
        section: {
          padding: spacing.lg,
        },
        settlementCard: {
          backgroundColor: colors.surface,
          padding: spacing.lg,
          borderRadius: radii.lg,
          marginBottom: spacing.md,
          borderWidth: 1,
          borderColor: colors.borderLight,
          ...(shadows.sm as object),
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
          top: spacing.xl,
          right: spacing.xl,
          zIndex: 1,
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
      // Log count only, not full data (proofImageUrl contains large base64 strings)
      console.log(`Loaded ${data?.length || 0} settlements`);
      if (data && data.length > 0) {
        // Log first settlement structure for debugging (without proofImageUrl)
        const first = data[0];
        console.log('First settlement structure:', {
          _id: first._id,
          fromUserId: first.fromUserId,
          toUserId: first.toUserId,
          fromUserIdType: typeof first.fromUserId,
          toUserIdType: typeof first.toUserId,
          amount: first.amount,
        });
      }
      setSettlements(data || []);
    } catch (error) {
      console.error('Failed to load settlements:', error);
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
          <Text>Please select a household</Text>
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
      >
        {/* Subtitle */}
        <View style={styles.subtitleContainer}>
          <Text style={styles.subtitle}>{selectedHousehold.name}</Text>
        </View>

        {/* Date Filter */}
        <View style={styles.filterContainer}>
          <View style={styles.filterRow}>
            {(['all', 'month', '3months', '6months', 'year'] as DateFilter[]).map((filter) => (
              <TouchableOpacity
                key={filter}
                style={[
                  styles.filterButton,
                  dateFilter === filter && styles.filterButtonActive,
                ]}
                onPress={() => setDateFilter(filter)}
              >
                <Text
                  style={[
                    styles.filterButtonText,
                    dateFilter === filter && styles.filterButtonTextActive,
                  ]}
                >
                  {filter === 'all' ? 'All' : filter === 'month' ? '1M' : filter === '3months' ? '3M' : filter === '6months' ? '6M' : '1Y'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {loading ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.loadingText}>Loading settlements...</Text>
          </View>
        ) : filteredSettlements.length === 0 ? (
          <View style={styles.emptyContainer}>
            <EmptyState
              icon="receipt-outline"
              title={settlements.length === 0 ? "No settlements yet" : "No settlements in this period"}
              message={settlements.length === 0 
                ? "When you mark payments as paid in the Settle Up screen, they'll appear here with all the details."
                : "Try selecting a different time period to see more settlements."}
              variant="minimal"
            />
          </View>
        ) : (
          <View style={styles.section}>
            {filteredSettlements.map((settlement) => {
              // Handle cases where fromUserId or toUserId might be null or not populated
              // Backend populates them as objects, but handle both cases
              const fromUserId = typeof settlement.fromUserId === 'object' && settlement.fromUserId !== null
                ? settlement.fromUserId._id
                : (settlement.fromUserId as any);
              const toUserId = typeof settlement.toUserId === 'object' && settlement.toUserId !== null
                ? settlement.toUserId._id
                : (settlement.toUserId as any);
              
              // Handle null users (deleted users) - use fallback names
              const fromUserName = fromUserId 
                ? getUserName(fromUserId)
                : (typeof settlement.fromUserId === 'object' && settlement.fromUserId !== null
                    ? settlement.fromUserId.name || 'Unknown User'
                    : 'Unknown User');
              const toUserName = toUserId
                ? getUserName(toUserId)
                : (typeof settlement.toUserId === 'object' && settlement.toUserId !== null
                    ? settlement.toUserId.name || 'Unknown User'
                    : 'Unknown User');
              
              const fromUserAvatar = fromUserId ? getUserAvatar(fromUserId) : undefined;
              const toUserAvatar = toUserId ? getUserAvatar(toUserId) : undefined;
              const isCurrentUser = user._id === fromUserId;

              return (
                <View key={settlement._id} style={styles.settlementCard}>
                  <View style={styles.settlementHeader}>
                    <View style={styles.userInfo}>
                      <Avatar name={fromUserName} uri={fromUserAvatar} size={32} />
                      <Text style={styles.settlementText}>
                        <Text style={styles.userName}>{fromUserName}</Text>
                        {' paid '}
                        <Text style={styles.userName}>{toUserName}</Text>
                      </Text>
                    </View>
                    <Text style={styles.amount}>{formatCurrency(settlement.amount)}</Text>
                  </View>

                  <View style={styles.settlementDetails}>
                    <View style={styles.detailRow}>
                      <Ionicons name="calendar-outline" size={16} color={colors.textSecondary} />
                      <Text style={styles.detailText}>{formatDate(settlement.date)}</Text>
                    </View>
                    {settlement.method && (
                      <View style={styles.detailRow}>
                        <Ionicons name="card-outline" size={16} color={colors.textSecondary} />
                        <Text style={styles.detailText}>{settlement.method}</Text>
                      </View>
                    )}
                    {settlement.note && (
                      <View style={styles.detailRow}>
                        <Ionicons name="document-text-outline" size={16} color={colors.textSecondary} />
                        <Text style={styles.detailText}>{settlement.note}</Text>
                      </View>
                    )}
                    {settlement.proofImageUrl && (
                      <TouchableOpacity
                        style={styles.proofButton}
                        onPress={() => setSelectedProofImage(settlement.proofImageUrl || null)}
                      >
                        <Ionicons name="image-outline" size={16} color={colors.primary} />
                        <Text style={styles.proofButtonText}>View Proof</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
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
            style={styles.proofModalClose}
            onPress={() => setSelectedProofImage(null)}
          >
            <Ionicons name="close-circle" size={32} color={colors.surface} />
          </TouchableOpacity>
          {selectedProofImage && (
            <Image source={{ uri: selectedProofImage }} style={styles.proofModalImage} resizeMode="contain" />
          )}
        </View>
      </Modal>
    </SafeAreaView>
  );
};

