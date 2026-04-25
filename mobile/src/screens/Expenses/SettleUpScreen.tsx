import React, { useEffect, useState, useMemo, useCallback } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Pressable,
  Alert,
  Modal,
  KeyboardAvoidingView,
  Platform,
  Image,
  Keyboard,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SanctuaryScreenShell } from '../../components/sanctuary/SanctuaryScreenShell';
import * as ImagePicker from 'expo-image-picker';
import { useHousehold } from '../../context/HouseholdContext';
import { useAuth } from '../../context/AuthContext';
import { expensesApi, PairwiseBalance } from '../../api/expensesApi';
import { settlementsApi, Settlement } from '../../api/settlementsApi';
import { FormTextInput } from '../../components/FormTextInput';
import { AppText } from '../../components/AppText';
import { SettingsSection } from '../../components/Settings/SettingsSection';
import { SettingsGroupCard } from '../../components/Settings/SettingsGroupCard';
import { SettingsRow } from '../../components/Settings/SettingsRow';
import { PrimaryButton } from '../../components/PrimaryButton';
import { formatCurrency } from '../../utils/formatCurrency';
import { useHouseholdCurrency } from '../../utils/useHouseholdCurrency';
import { dedupedFetch, getCached, invalidateCache } from '../../utils/queryCache';
import {
  alertOpenSettingsForPhotoLibrary,
  ensureMediaLibraryPermission,
} from '../../utils/mediaLibraryPermission';
import { Avatar } from '../../components/ui/Avatar';
import { EmptyState } from '../../components/ui/EmptyState';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors, fontSizes, fontWeights, radii, spacing, shadows } from '../../theme';
import { useLanguage } from '../../context/LanguageContext';

const RECEIPTS_WITH_PROOF_PAGE_SIZE = 5;

type SettleUpSnapshot = {
  balances: PairwiseBalance[];
  receivedSettlements: Settlement[];
  receivedSettlementsTotal: number;
};

const settleUpKey = (householdId: string, userId: string) => `settle-up:${householdId}:${userId}`;
const settlementsInvalidatePrefix = (householdId: string) => `settlements:${householdId}`;

export const SettleUpScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { selectedHousehold } = useHousehold();
  const { user } = useAuth();
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  const { t } = useLanguage();
  const currency = useHouseholdCurrency();
  const [balances, setBalances] = useState<PairwiseBalance[]>([]);
  const [settlements, setSettlements] = useState<Settlement[]>([]);
  const [receivedSettlementsTotal, setReceivedSettlementsTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [loadingMoreReceipts, setLoadingMoreReceipts] = useState(false);
  const [settleModalVisible, setSettleModalVisible] = useState(false);
  const [forgiveModalVisible, setForgiveModalVisible] = useState(false);
  const [selectedBalance, setSelectedBalance] = useState<PairwiseBalance | null>(null);
  const [selectedForgiveBalance, setSelectedForgiveBalance] = useState<PairwiseBalance | null>(null);
  const [selectedProofImage, setSelectedProofImage] = useState<string | null>(null);
  const [amount, setAmount] = useState('');
  const [forgiveAmount, setForgiveAmount] = useState('');
  const [method, setMethod] = useState('');
  const [note, setNote] = useState('');
  const [proofImage, setProofImage] = useState<string | null>(null);

  const styles = useMemo(() => StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: 'transparent',
    },
    keyboardAvoid: {
      flex: 1,
    },
    scrollView: {
      flex: 1,
    },
    emptyContainer: {
      padding: spacing.xxl,
      alignItems: 'center',
    },
    loadingPad: {
      paddingHorizontal: spacing.xl,
      paddingVertical: spacing.xxl,
      alignItems: 'center',
    },
    loadingText: {
      fontSize: fontSizes.sm,
      color: colors.textSecondary,
    },
    cardPad: {
      padding: spacing.md,
    },
    mutedLine: {
      fontSize: fontSizes.sm,
      color: colors.textSecondary,
      lineHeight: 20,
    },
    balanceHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
    },
    balanceTextContainer: {
      flex: 1,
      minWidth: 0,
    },
    balanceText: {
      fontSize: fontSizes.md,
      color: colors.text,
      lineHeight: 20,
    },
    userName: {
      fontWeight: fontWeights.semibold,
    },
    amountBlock: {
      alignItems: 'flex-end',
    },
    amount: {
      color: colors.danger,
      fontWeight: fontWeights.extrabold,
      fontSize: fontSizes.lg,
    },
    amountPositive: {
      color: colors.success,
    },
    actionsDivider: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: colors.borderLight,
      marginTop: spacing.md,
      marginBottom: spacing.sm,
      marginHorizontal: -spacing.md,
    },
    actions: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      alignItems: 'center',
      gap: spacing.xs,
    },
    actionButton: {
      paddingVertical: spacing.xs,
      paddingHorizontal: spacing.md,
      borderRadius: radii.pill,
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row',
      gap: spacing.xxs,
      minHeight: 34,
    },
    netButton: {
      backgroundColor: colors.warningSoft,
      borderWidth: 1,
      borderColor: colors.warningSoft,
    },
    netButtonText: {
      color: colors.warning,
      fontWeight: fontWeights.semibold,
      fontSize: fontSizes.sm,
    },
    markButton: {
      backgroundColor: colors.primary,
    },
    markButtonText: {
      color: colors.surface,
      fontWeight: fontWeights.semibold,
      fontSize: fontSizes.sm,
    },
    forgiveButton: {
      backgroundColor: colors.primarySoft,
      borderWidth: 1,
      borderColor: colors.primarySoft,
    },
    forgiveButtonText: {
      color: colors.primary,
      fontWeight: fontWeights.semibold,
      fontSize: fontSizes.sm,
    },
    mutualDebtNote: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
      marginTop: spacing.sm,
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.xs,
      borderRadius: radii.md,
      backgroundColor: colors.warningUltraSoft,
    },
    mutualDebtNoteText: {
      fontSize: fontSizes.xs,
      color: colors.warning,
      fontWeight: fontWeights.medium,
      flex: 1,
    },
    actionButtonText: {
      color: colors.surface,
      fontWeight: fontWeights.semibold,
    },
    emptyText: {
      fontSize: fontSizes.lg,
      color: colors.muted,
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    modalContent: {
      backgroundColor: colors.surface,
      borderRadius: radii.lg,
      padding: spacing.xl,
      width: '90%',
      maxWidth: 400,
      borderWidth: 1,
      borderColor: colors.border,
    },
    modalTitle: {
      fontSize: fontSizes.xl,
      fontWeight: fontWeights.extrabold,
      marginBottom: spacing.xs,
      color: colors.text,
    },
    modalSubtitle: {
      fontSize: fontSizes.sm,
      color: colors.textSecondary,
      marginBottom: spacing.md,
    },
    modalActions: {
      flexDirection: 'row',
      marginTop: spacing.md,
    },
    spacer: {
      width: spacing.sm,
    },
    proofSection: {
      marginBottom: spacing.md,
    },
    proofLabel: {
      fontSize: fontSizes.sm,
      fontWeight: fontWeights.semibold,
      color: colors.text,
      marginBottom: spacing.xs,
    },
    proofImageContainer: {
      position: 'relative',
      width: '100%',
      height: 200,
      borderRadius: radii.md,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: colors.border,
    },
    proofImage: {
      width: '100%',
      height: '100%',
      resizeMode: 'cover',
    },
    removeProofButton: {
      position: 'absolute',
      top: spacing.xs,
      right: spacing.xs,
      backgroundColor: colors.surface,
      borderRadius: radii.pill,
      padding: spacing.xxs,
    },
    addProofButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.xs,
      padding: spacing.md,
      borderWidth: 2,
      borderColor: colors.border,
      borderStyle: 'dashed',
      borderRadius: radii.md,
      backgroundColor: colors.primaryUltraSoft,
    },
    addProofText: {
      fontSize: fontSizes.sm,
      color: colors.primary,
      fontWeight: fontWeights.medium,
    },
    scrollContent: {
      paddingBottom: spacing.xxl,
    },
    receivedSettlementHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      marginBottom: spacing.xs,
    },
    receivedSettlementInfo: {
      flex: 1,
    },
    receivedSettlementText: {
      fontSize: fontSizes.sm,
      color: colors.text,
    },
    receivedSettlementMethod: {
      fontSize: fontSizes.xs,
      color: colors.textSecondary,
      marginTop: spacing.xxs,
    },
    viewReceiptButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
      marginTop: spacing.xs,
      paddingVertical: spacing.xs,
    },
    viewReceiptText: {
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
    forgiveAmountOptions: {
      flexDirection: 'row',
      gap: spacing.sm,
      marginBottom: spacing.md,
    },
    forgiveAmountOption: {
      flex: 1,
      padding: spacing.md,
      borderRadius: radii.md,
      borderWidth: 2,
      borderColor: colors.border,
      alignItems: 'center',
    },
    forgiveAmountOptionSelected: {
      borderColor: colors.primary,
      backgroundColor: colors.primaryUltraSoft,
    },
    forgiveAmountOptionText: {
      fontSize: fontSizes.sm,
      fontWeight: fontWeights.semibold,
      color: colors.text,
    },
    forgiveAmountOptionTextSelected: {
      color: colors.primary,
    },
    forgiveAmountOptionValue: {
      fontSize: fontSizes.xs,
      color: colors.textSecondary,
      marginTop: spacing.xxs,
    },
    customAmountContainer: {
      marginBottom: spacing.md,
    },
    forgiveWarning: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      padding: spacing.md,
      backgroundColor: colors.warningUltraSoft,
      borderRadius: radii.md,
      marginBottom: spacing.md,
    },
    forgiveWarningText: {
      flex: 1,
      fontSize: fontSizes.sm,
      color: colors.text,
    },
    loadMoreReceipts: {
      alignItems: 'center',
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.lg,
    },
    loadMoreReceiptsText: {
      fontSize: fontSizes.sm,
      fontWeight: fontWeights.semibold,
      color: colors.primary,
    },
  }), [colors]);

  useEffect(() => {
    if (selectedHousehold && user) {
      loadBalances();
    }
  }, [selectedHousehold, user]);

  const loadBalances = async () => {
    if (!selectedHousehold || !user) return;

    const key = settleUpKey(selectedHousehold._id, user._id);
    const cached = getCached<SettleUpSnapshot>(key);
    if (cached) {
      setBalances(cached.balances);
      setSettlements(cached.receivedSettlements);
      setReceivedSettlementsTotal(cached.receivedSettlementsTotal);
    } else {
      setLoading(true);
    }

    try {
      const snapshot = await dedupedFetch<SettleUpSnapshot>(key, async () => {
        const [balancesData, settlementsRaw] = await Promise.all([
          expensesApi.getBalances(selectedHousehold._id),
          settlementsApi.getSettlements(selectedHousehold._id, {
            limit: RECEIPTS_WITH_PROOF_PAGE_SIZE,
            skip: 0,
            toUserId: user._id,
            proofOnly: true,
          }),
        ]);
        const receivedSettlements = Array.isArray(settlementsRaw)
          ? settlementsRaw
          : settlementsRaw.items;
        const receivedSettlementsTotal = Array.isArray(settlementsRaw)
          ? settlementsRaw.length
          : settlementsRaw.total;
        return {
          balances: balancesData,
          receivedSettlements,
          receivedSettlementsTotal,
        };
      });
      setBalances(snapshot.balances);
      setSettlements(snapshot.receivedSettlements);
      setReceivedSettlementsTotal(snapshot.receivedSettlementsTotal);
    } catch (error) {
      if (__DEV__) console.error('Failed to load balances:', error);
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

  const handleMarkAsPaid = (balance: PairwiseBalance) => {
    setSelectedBalance(balance);
    setAmount(balance.amount.toFixed(2));
    setMethod('');
    setNote('');
    setProofImage(null);
    setSettleModalVisible(true);
  };

  const handlePickProofImage = async () => {
    // Dismiss keyboard before opening image picker
    Keyboard.dismiss();
    
    try {
      const allowed = await ensureMediaLibraryPermission();
      if (!allowed) {
        alertOpenSettingsForPhotoLibrary(t, 'alerts.permissionDenied');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
        base64: true,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        if (asset.base64) {
          // Construct data URL
          const mimeType = asset.type === 'image' ? 'image/jpeg' : 'image/png';
          const dataUrl = `data:${mimeType};base64,${asset.base64}`;
          setProofImage(dataUrl);
        }
      }
    } catch (error) {
      if (__DEV__) console.error('Error picking image:', error);
      Alert.alert(t('common.error'), t('alerts.somethingWentWrong'));
    }
  };

  const handleRemoveProofImage = () => {
    setProofImage(null);
  };

  const handleNetBalance = async (balance: PairwiseBalance) => {
    if (!selectedHousehold || !user) return;

    // Find the reverse balance
    const reverseBalance = balances.find(
      b => b.fromUserId === balance.toUserId && b.toUserId === user._id
    );

    if (!reverseBalance) {
      Alert.alert(t('common.error'), t('alerts.noMutualDebt'));
      return;
    }

    const otherUserName = getUserName(balance.toUserId);
    const userOwes = balance.amount;
    const otherOwes = reverseBalance.amount;
    const netAmount = Math.abs(userOwes - otherOwes);
    const debtor = userOwes >= otherOwes ? t('home.youOwe').split(' ')[0] : otherUserName;
    const creditor = userOwes >= otherOwes ? otherUserName : t('home.youOwe').split(' ')[0];

    Alert.alert(
      t('settleUp.netBalance'),
      `${t('home.youOwe')} ${otherUserName} ${formatCurrency(userOwes, currency)} ${t('common.and')} ${otherUserName} ${t('settleUp.owesYou').toLowerCase()} ${formatCurrency(otherOwes, currency)}.\n\n${debtor} ${t('settleUp.willOwe')} ${formatCurrency(netAmount, currency)} ${t('common.to')} ${creditor}.\n\n${t('common.continue')}?`,
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('settleUp.netBalance'),
          onPress: async () => {
            try {
              await settlementsApi.netBalance({
                householdId: selectedHousehold._id,
                otherUserId: balance.toUserId,
              });
              invalidateCache(`settle-up:${selectedHousehold._id}`);
              invalidateCache(settlementsInvalidatePrefix(selectedHousehold._id));
              invalidateCache(`expenses:${selectedHousehold._id}`);
              invalidateCache(`home:dashboard:${selectedHousehold._id}`);
              invalidateCache(`household:${selectedHousehold._id}:transaction-count`);
              Alert.alert(t('common.success'), t('alerts.balanceNetted'));
              loadBalances();
            } catch (error: any) {
              Alert.alert(t('common.error'), error.response?.data?.error || t('alerts.somethingWentWrong'));
            }
          },
        },
      ]
    );
  };

  const handleSubmitSettlement = async () => {
    if (!selectedHousehold || !user || !selectedBalance) return;

    if (!amount || !method) {
      Alert.alert(t('common.error'), t('alerts.fillRequiredFields'));
      return;
    }

    try {
      await settlementsApi.createSettlement({
        householdId: selectedHousehold._id,
        fromUserId: selectedBalance.fromUserId,
        toUserId: selectedBalance.toUserId,
        amount: parseFloat(amount),
        method,
        note: note || undefined,
        date: new Date().toISOString(),
        proofImageUrl: proofImage || undefined,
      });
      // Balances + home summary are now stale.
      invalidateCache(`expenses:${selectedHousehold._id}`);
      invalidateCache(`home:dashboard:${selectedHousehold._id}`);
      invalidateCache(`settle-up:${selectedHousehold._id}`);
      invalidateCache(settlementsInvalidatePrefix(selectedHousehold._id));
      invalidateCache(`household:${selectedHousehold._id}:transaction-count`);
      setSettleModalVisible(false);
      setProofImage(null);
      loadBalances();
    } catch (error: any) {
      Alert.alert(t('common.error'), error.response?.data?.error || t('alerts.somethingWentWrong'));
    }
  };

  const receivedSettlementsAll = useMemo(() => {
    if (!user) return [];
    return settlements
      .filter((s) => {
        const toUserId =
          typeof s.toUserId === 'object' && s.toUserId !== null ? s.toUserId._id : s.toUserId;
        return toUserId === user._id && !!s.proofImageUrl;
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [settlements, user]);

  const receivedSettlements = receivedSettlementsAll;

  const hasMoreReceipts = receivedSettlements.length < receivedSettlementsTotal;

  const loadMoreReceipts = useCallback(async () => {
    if (!selectedHousehold || !user || loadingMoreReceipts || !hasMoreReceipts) return;
    setLoadingMoreReceipts(true);
    try {
      const raw = await settlementsApi.getSettlements(selectedHousehold._id, {
        limit: RECEIPTS_WITH_PROOF_PAGE_SIZE,
        skip: receivedSettlements.length,
        toUserId: user._id,
        proofOnly: true,
      });
      if (Array.isArray(raw)) return;
      setSettlements((prev) => [...prev, ...raw.items]);
      setReceivedSettlementsTotal(raw.total);
    } catch (error) {
      if (__DEV__) console.error('Failed to load more receipt settlements:', error);
    } finally {
      setLoadingMoreReceipts(false);
    }
  }, [
    selectedHousehold,
    user,
    loadingMoreReceipts,
    hasMoreReceipts,
    receivedSettlements.length,
  ]);

  if (!selectedHousehold || !user) {
    return (
      <SanctuaryScreenShell edges={['top', 'bottom']} innerStyle={styles.container}>
        <View style={styles.emptyContainer}>
          <AppText>{t('alerts.selectHousehold')}</AppText>
        </View>
      </SanctuaryScreenShell>
    );
  }

  const userOwedBalances = balances.filter(b => b.fromUserId === user._id);
  const userOwedToBalances = balances.filter(b => b.toUserId === user._id);
  
  // Find mutual debts (where user owes someone AND that person owes user)
  const mutualDebts = balances.filter(b => {
    if (b.fromUserId === user._id) {
      // User owes this person - check if this person also owes user
      return balances.some(other => other.fromUserId === b.toUserId && other.toUserId === user._id);
    }
    return false;
  });

  const fullySettled =
    userOwedBalances.length === 0 &&
    userOwedToBalances.length === 0 &&
    receivedSettlementsTotal === 0;
  const showInitialLoading = loading && balances.length === 0 && settlements.length === 0;
  const showGlobalEmpty = !loading && fullySettled;

  const handleForgiveDebt = (balance: PairwiseBalance) => {
    setSelectedForgiveBalance(balance);
    setForgiveAmount(balance.amount.toFixed(2)); // Default to full amount
    setForgiveModalVisible(true);
  };

  const handleSubmitForgive = async () => {
    if (!selectedHousehold || !user || !selectedForgiveBalance) return;

    const amountToForgive = parseFloat(forgiveAmount);
    if (isNaN(amountToForgive) || amountToForgive <= 0) {
      Alert.alert(t('common.error'), t('alerts.invalidAmount'));
      return;
    }

    if (amountToForgive > selectedForgiveBalance.amount) {
      Alert.alert(t('common.error'), t('alerts.amountExceedsDebt'));
      return;
    }

    const fromUserName = getUserName(selectedForgiveBalance.fromUserId);

    try {
      // Create a settlement that cancels the debt (or part of it)
      await settlementsApi.createSettlement({
        householdId: selectedHousehold._id,
        fromUserId: selectedForgiveBalance.fromUserId,
        toUserId: selectedForgiveBalance.toUserId,
        amount: amountToForgive,
        method: t('settleUp.forgiven'),
        note: amountToForgive < selectedForgiveBalance.amount 
          ? `${t('settleUp.partialDebtForgiven')} (${formatCurrency(amountToForgive, currency)} / ${formatCurrency(selectedForgiveBalance.amount, currency)})`
          : t('settleUp.debtForgivenNote'),
        date: new Date().toISOString(),
      });
      invalidateCache(`expenses:${selectedHousehold._id}`);
      invalidateCache(`home:dashboard:${selectedHousehold._id}`);
      invalidateCache(`settle-up:${selectedHousehold._id}`);
      invalidateCache(settlementsInvalidatePrefix(selectedHousehold._id));
      invalidateCache(`household:${selectedHousehold._id}:transaction-count`);
      setForgiveModalVisible(false);
      loadBalances();
      Alert.alert(t('common.success'), t('alerts.debtForgiven', { amount: formatCurrency(amountToForgive, currency), user: fromUserName }));
    } catch (error: any) {
      Alert.alert(t('common.error'), error.response?.data?.error || t('alerts.somethingWentWrong'));
    }
  };

  return (
    <SanctuaryScreenShell edges={['top']} innerStyle={styles.container}>
      <KeyboardAvoidingView
        style={styles.keyboardAvoid}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          contentInsetAdjustmentBehavior="automatic"
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={loadBalances} />}
        >
          <SettingsSection title={t('settleUp.sectionQuickLinks')}>
            <SettingsGroupCard>
              <SettingsRow
                icon="receipt-outline"
                iconBackgroundColor={colors.primaryUltraSoft}
                iconColor={colors.primary}
                title={t('expenses.viewSettlementHistory')}
                subtitle={t('expenses.settlementHistory')}
                onPress={() => navigation.navigate('SettlementHistory')}
                isLast
              />
            </SettingsGroupCard>
          </SettingsSection>

          {showInitialLoading ? (
            <View style={styles.loadingPad}>
              <AppText style={styles.loadingText}>{t('settlementHistory.loading')}</AppText>
            </View>
          ) : showGlobalEmpty ? (
            <EmptyState
              icon="checkmark-circle-outline"
              title={`${t('home.allSettled')} 🎉`}
              message={t('settleUp.noBalances')}
              variant="minimal"
            />
          ) : (
            <>
              {userOwedBalances.length > 0 ? (
                <SettingsSection title={t('settleUp.sectionYouOwe')}>
                  {userOwedBalances.map((balance, index) => {
                    const toUserName = getUserName(balance.toUserId);
                    const hasMutualDebt = mutualDebts.some(b => b.toUserId === balance.toUserId);
                    const toUserAvatar = getUserAvatar(balance.toUserId);
                    const rowKey = `${balance.fromUserId}-${balance.toUserId}`;
                    return (
                      <SettingsGroupCard
                        key={rowKey}
                        style={{
                          marginBottom: index < userOwedBalances.length - 1 ? spacing.md : 0,
                        }}
                      >
                        <View style={styles.cardPad}>
                          <View style={styles.balanceHeader}>
                            <Avatar name={toUserName} uri={toUserAvatar} size={44} />
                            <View style={styles.balanceTextContainer}>
                              <AppText style={styles.balanceText} numberOfLines={1}>
                                {t('home.youOwe')}{' '}
                                <AppText style={styles.userName}>{toUserName}</AppText>
                              </AppText>
                            </View>
                            <View style={styles.amountBlock}>
                              <AppText style={styles.amount}>
                                {formatCurrency(balance.amount, currency)}
                              </AppText>
                            </View>
                          </View>
                          {hasMutualDebt ? (
                            <View style={styles.mutualDebtNote}>
                              <Ionicons name="bulb-outline" size={14} color={colors.warning} />
                              <AppText style={styles.mutualDebtNoteText}>
                                {toUserName} {t('settleUp.alsoOwesYou')}
                              </AppText>
                            </View>
                          ) : null}
                          <View style={styles.actionsDivider} />
                          <View style={styles.actions}>
                            {hasMutualDebt ? (
                              <TouchableOpacity
                                style={[styles.actionButton, styles.netButton]}
                                onPress={() => handleNetBalance(balance)}
                                activeOpacity={0.8}
                              >
                                <Ionicons name="swap-horizontal" size={14} color={colors.warning} />
                                <AppText style={styles.netButtonText}>{t('settleUp.netBalance')}</AppText>
                              </TouchableOpacity>
                            ) : null}
                            <TouchableOpacity
                              style={[styles.actionButton, styles.markButton]}
                              onPress={() => handleMarkAsPaid(balance)}
                              activeOpacity={0.8}
                            >
                              <Ionicons name="checkmark-circle" size={14} color={colors.surface} />
                              <AppText style={styles.markButtonText}>{t('settleUp.markAsPaid')}</AppText>
                            </TouchableOpacity>
                          </View>
                        </View>
                      </SettingsGroupCard>
                    );
                  })}
                </SettingsSection>
              ) : (
                <SettingsSection title={t('settleUp.sectionYouOwe')}>
                  <SettingsGroupCard>
                    <View style={styles.cardPad}>
                      <AppText style={styles.mutedLine}>{t('settleUp.nothingToPayNow')}</AppText>
                    </View>
                  </SettingsGroupCard>
                </SettingsSection>
              )}

              {userOwedToBalances.length > 0 ? (
                <SettingsSection title={t('settleUp.moneyOwedToYou')}>
                  {userOwedToBalances.map((balance, index) => {
                    const fromUserName = getUserName(balance.fromUserId);
                    const fromUserAvatar = getUserAvatar(balance.fromUserId);
                    const rowKey = `${balance.fromUserId}-${balance.toUserId}`;
                    return (
                      <SettingsGroupCard
                        key={rowKey}
                        style={{
                          marginBottom: index < userOwedToBalances.length - 1 ? spacing.md : 0,
                        }}
                      >
                        <View style={styles.cardPad}>
                          <View style={styles.balanceHeader}>
                            <Avatar name={fromUserName} uri={fromUserAvatar} size={44} />
                            <View style={styles.balanceTextContainer}>
                              <AppText style={styles.balanceText} numberOfLines={1}>
                                <AppText style={styles.userName}>{fromUserName}</AppText>{' '}
                                {t('settleUp.owesYou').toLowerCase()}
                              </AppText>
                            </View>
                            <View style={styles.amountBlock}>
                              <AppText style={[styles.amount, styles.amountPositive]}>
                                {formatCurrency(balance.amount, currency)}
                              </AppText>
                            </View>
                          </View>
                          <View style={styles.actionsDivider} />
                          <View style={styles.actions}>
                            <TouchableOpacity
                              style={[styles.actionButton, styles.forgiveButton]}
                              onPress={() => handleForgiveDebt(balance)}
                              activeOpacity={0.8}
                            >
                              <Ionicons
                                name="heart-outline"
                                size={14}
                                color={colors.primary}
                              />
                              <AppText style={styles.forgiveButtonText}>
                                {t('settleUp.forgiveDebt')}
                              </AppText>
                            </TouchableOpacity>
                          </View>
                        </View>
                      </SettingsGroupCard>
                    );
                  })}
                </SettingsSection>
              ) : null}

              {receivedSettlementsAll.length > 0 ? (
                <SettingsSection title={t('settleUp.receivedSettlements')}>
                  {receivedSettlements.map((settlement, index) => {
                    const fromUserId =
                      typeof settlement.fromUserId === 'object' && settlement.fromUserId !== null
                        ? settlement.fromUserId._id
                        : settlement.fromUserId;
                    const fromUserName = fromUserId ? getUserName(fromUserId) : 'Unknown';
                    const fromUserAvatar = fromUserId ? getUserAvatar(fromUserId) : undefined;
                    return (
                      <SettingsGroupCard
                        key={settlement._id}
                        style={{
                          marginBottom: index < receivedSettlements.length - 1 ? spacing.md : 0,
                        }}
                      >
                        <View style={styles.cardPad}>
                          <View style={styles.receivedSettlementHeader}>
                            <Avatar name={fromUserName} uri={fromUserAvatar} size={32} />
                            <View style={styles.receivedSettlementInfo}>
                              <AppText style={styles.receivedSettlementText}>
                                <AppText style={styles.userName}>{fromUserName}</AppText>{' '}
                                {t('settleUp.paidYou')} {formatCurrency(settlement.amount, currency)}
                              </AppText>
                              {settlement.method ? (
                                <AppText style={styles.receivedSettlementMethod}>{settlement.method}</AppText>
                              ) : null}
                            </View>
                          </View>
                          {settlement.proofImageUrl ? (
                            <TouchableOpacity
                              style={styles.viewReceiptButton}
                              onPress={() => setSelectedProofImage(settlement.proofImageUrl || null)}
                              activeOpacity={0.75}
                            >
                              <Ionicons name="receipt-outline" size={18} color={colors.primary} />
                              <AppText style={styles.viewReceiptText}>{t('settleUp.viewReceipt')}</AppText>
                            </TouchableOpacity>
                          ) : null}
                        </View>
                      </SettingsGroupCard>
                    );
                  })}
                  {hasMoreReceipts ? (
                    <TouchableOpacity
                      style={styles.loadMoreReceipts}
                      onPress={loadMoreReceipts}
                      disabled={loadingMoreReceipts}
                      activeOpacity={0.75}
                    >
                      {loadingMoreReceipts ? (
                        <ActivityIndicator color={colors.primary} />
                      ) : (
                        <AppText style={styles.loadMoreReceiptsText}>
                          {t('common.loadMore')} ({receivedSettlements.length}/{receivedSettlementsTotal})
                        </AppText>
                      )}
                    </TouchableOpacity>
                  ) : null}
                </SettingsSection>
              ) : null}
            </>
          )}
        </ScrollView>

      {/* Settlement Modal */}
      <Modal
        visible={settleModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setSettleModalVisible(false)}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
        >
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('common.close')}
            style={StyleSheet.absoluteFillObject}
            onPress={() => {
              Keyboard.dismiss();
              setSettleModalVisible(false);
            }}
          />
          <View style={styles.modalContent}>
            <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
              <View>
                <AppText style={styles.modalTitle}>{t('settleUp.markAsPaid')}</AppText>
                {selectedBalance && (
                  <AppText style={styles.modalSubtitle}>
                    {t('settleUp.paying')} {getUserName(selectedBalance.toUserId)}
                  </AppText>
                )}
                <FormTextInput
                  label={t('expenses.amount')}
                  value={amount}
                  onChangeText={setAmount}
                  placeholder="0.00"
                  keyboardType="numeric"
                />
                <FormTextInput
                  label={t('settleUp.method')}
                  value={method}
                  onChangeText={setMethod}
                  placeholder={t('settleUp.methodPlaceholder')}
                />
                <FormTextInput
                  label={t('settleUp.note')}
                  value={note}
                  onChangeText={setNote}
                  placeholder={t('settleUp.notePlaceholder')}
                  multiline
                />
                <View style={styles.proofSection}>
                  <AppText style={styles.proofLabel}>{t('settleUp.proofOptional')}</AppText>
                  {proofImage ? (
                    <View style={styles.proofImageContainer}>
                      <Image source={{ uri: proofImage }} style={styles.proofImage} />
                      <TouchableOpacity
                        style={styles.removeProofButton}
                        onPress={handleRemoveProofImage}
                      >
                        <Ionicons name="close-circle" size={24} color={colors.danger} />
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <TouchableOpacity
                      style={styles.addProofButton}
                      onPress={handlePickProofImage}
                    >
                      <Ionicons name="camera-outline" size={24} color={colors.primary} />
                      <AppText style={styles.addProofText}>{t('settleUp.addProof')}</AppText>
                    </TouchableOpacity>
                  )}
                </View>
                <View style={styles.modalActions}>
                  <PrimaryButton
                    title={t('common.cancel')}
                    onPress={() => {
                      Keyboard.dismiss();
                      setSettleModalVisible(false);
                    }}
                  />
                  <View style={styles.spacer} />
                  <PrimaryButton
                    title={t('common.save')}
                    onPress={handleSubmitSettlement}
                  />
                </View>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Forgive Debt Modal */}
      <Modal
        visible={forgiveModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setForgiveModalVisible(false)}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
        >
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('common.close')}
            style={StyleSheet.absoluteFillObject}
            onPress={() => {
              Keyboard.dismiss();
              setForgiveModalVisible(false);
            }}
          />
          <View style={styles.modalContent}>
            <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
              <View>
                <AppText style={styles.modalTitle}>{t('settleUp.forgiveDebt')}</AppText>
                {selectedForgiveBalance && (
                  <AppText style={styles.modalSubtitle}>
                    {getUserName(selectedForgiveBalance.fromUserId)} {t('settleUp.owesYou').toLowerCase()}{' '}
                    {formatCurrency(selectedForgiveBalance.amount, currency)}
                  </AppText>
                )}

                {selectedForgiveBalance && (
                  <View style={styles.forgiveAmountOptions}>
                    <TouchableOpacity
                      style={[
                        styles.forgiveAmountOption,
                        forgiveAmount === selectedForgiveBalance.amount.toFixed(2) && styles.forgiveAmountOptionSelected,
                      ]}
                      onPress={() => setForgiveAmount(selectedForgiveBalance.amount.toFixed(2))}
                    >
                      <AppText style={[
                        styles.forgiveAmountOptionText,
                        forgiveAmount === selectedForgiveBalance.amount.toFixed(2) && styles.forgiveAmountOptionTextSelected,
                      ]}>{t('settleUp.fullAmount')}</AppText>
                      <AppText style={styles.forgiveAmountOptionValue}>
                        {formatCurrency(selectedForgiveBalance.amount, currency)}
                      </AppText>
                    </TouchableOpacity>

                    {selectedForgiveBalance.amount > 1 && (
                      <TouchableOpacity
                        style={[
                          styles.forgiveAmountOption,
                          forgiveAmount === (selectedForgiveBalance.amount / 2).toFixed(2) && styles.forgiveAmountOptionSelected,
                        ]}
                        onPress={() => setForgiveAmount((selectedForgiveBalance.amount / 2).toFixed(2))}
                      >
                        <AppText style={[
                          styles.forgiveAmountOptionText,
                          forgiveAmount === (selectedForgiveBalance.amount / 2).toFixed(2) && styles.forgiveAmountOptionTextSelected,
                        ]}>{t('settleUp.halfAmount')}</AppText>
                        <AppText style={styles.forgiveAmountOptionValue}>
                          {formatCurrency(selectedForgiveBalance.amount / 2, currency)}
                        </AppText>
                      </TouchableOpacity>
                    )}
                  </View>
                )}

                <View style={styles.customAmountContainer}>
                  <FormTextInput
                    label={t('settleUp.customAmount')}
                    value={forgiveAmount}
                    onChangeText={setForgiveAmount}
                    placeholder="0.00"
                    keyboardType="numeric"
                  />
                </View>

                <View style={styles.forgiveWarning}>
                  <Ionicons name="warning-outline" size={20} color={colors.warning} />
                  <AppText style={styles.forgiveWarningText}>
                    {t('alerts.forgiveWarning')}
                  </AppText>
                </View>

                <View style={styles.modalActions}>
                  <PrimaryButton
                    title={t('common.cancel')}
                    onPress={() => {
                      Keyboard.dismiss();
                      setForgiveModalVisible(false);
                    }}
                  />
                  <View style={styles.spacer} />
                  <PrimaryButton
                    title={t('settleUp.forgive')}
                    onPress={handleSubmitForgive}
                    variant="danger"
                  />
                </View>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Receipt Image Modal */}
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
    </KeyboardAvoidingView>
    </SanctuaryScreenShell>
  );
};

