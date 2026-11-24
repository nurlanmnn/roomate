import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import {
  AccessibilityInfo,
  TextInput,
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
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
import { Group, GroupRow, SectionHeading } from '../../components/ui/Group';
import { Amount } from '../../components/ui/Amount';
import { PrimaryButton } from '../../components/PrimaryButton';
import { formatCurrency } from '../../utils/formatCurrency';
import { useHouseholdCurrency } from '../../utils/useHouseholdCurrency';
import { dedupedFetch, getCached, invalidateCache } from '../../utils/queryCache';
import {
  alertOpenSettingsForPhotoLibrary,
  ensureMediaLibraryPermission,
} from '../../utils/mediaLibraryPermission';
import { Avatar } from '../../components/ui/Avatar';
import { AmountField } from '../../components/ui/AmountField';
import { getCurrencyOption } from '../../constants/currencies';
import { EmptyState } from '../../components/ui/EmptyState';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors, fontSizes, fontWeights, radii, spacing, fonts } from '../../theme';
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
  const [reduceMotion, setReduceMotion] = useState(false);
  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => subscription.remove();
  }, []);
  const { t } = useLanguage();
  const currency = useHouseholdCurrency();
  const [balances, setBalances] = useState<PairwiseBalance[]>([]);
  const [settlements, setSettlements] = useState<Settlement[]>([]);
  const [receivedSettlementsTotal, setReceivedSettlementsTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const loadBalancesGenRef = useRef(0);
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
    container: { flex: 1, backgroundColor: colors.background },
    scrollView: { flex: 1 },
    scrollContent: { paddingTop: spacing.sm, paddingBottom: spacing.xxl },
    emptyContainer: { padding: spacing.xxl, alignItems: 'center' },
    loadingPad: { padding: spacing.xxl, alignItems: 'center' },
    loadingText: { fontSize: fontSizes.sm, color: colors.textSecondary },
    mutedLine: { fontSize: fontSizes.sm, color: colors.textSecondary },
    cardPad: { padding: spacing.md },
    balanceGroup: { marginBottom: spacing.sm },
    payee: { alignItems: 'center', gap: spacing.xs, paddingTop: spacing.sm },
    payeeText: { fontSize: fontSizes.md, fontWeight: fontWeights.semibold, color: colors.text, textAlign: 'center' },
    balanceItem: { paddingBottom: spacing.xs },
    inlineActions: {
      flexDirection: 'row', flexWrap: 'wrap', gap: spacing.lg,
      paddingLeft: spacing.md + 40 + spacing.sm, paddingRight: spacing.md, marginTop: -spacing.xs,
    },
    historyGroup: { marginTop: spacing.xl },
    actions: {
      gap: spacing.xs, paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    },
    actionButton: {
      minHeight: 44, paddingVertical: spacing.xs, paddingHorizontal: spacing.sm,
      borderRadius: radii.md, flexDirection: 'row', alignItems: 'center',
      justifyContent: 'center', gap: spacing.xs, flexShrink: 1, maxWidth: '100%',
    },
    actionText: { fontSize: fontSizes.sm, fontWeight: fontWeights.semibold, color: colors.primary, flexShrink: 1 },
    mutualDebtNote: {
      flexDirection: 'row', alignItems: 'center', gap: spacing.xs,
      marginHorizontal: spacing.md, marginBottom: spacing.sm,
    },
    mutualDebtNoteText: { fontSize: fontSizes.sm, color: colors.textSecondary, flex: 1 },
    modalOverlay: { flex: 1, backgroundColor: colors.shadowStrong, justifyContent: 'flex-end' },
    modalContent: {
      height: '90%', backgroundColor: colors.background,
      borderTopLeftRadius: radii.xl, borderTopRightRadius: radii.xl, overflow: 'hidden',
    },
    modalHeader: {
      flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
      paddingHorizontal: spacing.lg, paddingVertical: spacing.sm,
      borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.borderLight,
    },
    modalTitle: { flex: 1, fontSize: 20, fontWeight: fontWeights.bold, color: colors.text },
    cancelButton: { minHeight: 44, justifyContent: 'center', maxWidth: '40%' },
    cancelText: { fontSize: fontSizes.md, color: colors.primary },
    modalSubtitle: { fontSize: fontSizes.md, color: colors.textSecondary, padding: spacing.lg },
    formScroll: { flex: 1 },
    formContent: { paddingBottom: spacing.lg },
    fieldLabel: { fontSize: fontSizes.sm, fontWeight: fontWeights.semibold, color: colors.textSecondary },
    currencyLabel: { fontSize: fontSizes.md, color: colors.textSecondary, marginTop: spacing.xs },
    amountInput: {
      minHeight: 72, fontFamily: fonts.displayBold, fontSize: 48,
      fontVariant: ['tabular-nums'], color: colors.text, paddingVertical: spacing.xs,
    },
    modalActions: {
      paddingHorizontal: spacing.md, paddingTop: spacing.sm,
      paddingBottom: Math.max(insets.bottom, spacing.md),
      backgroundColor: colors.background, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.borderLight,
    },
    proofImageContainer: { position: 'relative', height: 200, borderRadius: radii.md, overflow: 'hidden' },
    proofImage: { width: '100%', height: '100%', resizeMode: 'cover' },
    removeProofButton: {
      position: 'absolute', top: spacing.xs, right: spacing.xs, minWidth: 44, minHeight: 44,
      alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface, borderRadius: radii.pill,
    },
    viewReceiptButton: {
      minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: spacing.xs,
      paddingHorizontal: spacing.md, paddingVertical: spacing.xs,
    },
    viewReceiptText: { flexShrink: 1, fontSize: fontSizes.md, color: colors.primary, fontWeight: fontWeights.medium },
    proofModalOverlay: { flex: 1, backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' },
    proofModalClose: {
      position: 'absolute', right: spacing.lg, zIndex: 10, minWidth: 44, minHeight: 44,
      justifyContent: 'center', alignItems: 'center', backgroundColor: colors.surface, borderRadius: radii.pill,
    },
    proofModalImage: { width: '100%', height: '80%' },
    forgiveAmountOption: {
      minHeight: 60, flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
      paddingVertical: spacing.sm, paddingHorizontal: spacing.md,
    },
    forgiveAmountOptionSelected: { backgroundColor: colors.primaryUltraSoft },
    forgiveAmountOptionText: { flex: 1, minWidth: 0, fontSize: fontSizes.md, color: colors.text },
    forgiveWarning: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, padding: spacing.lg },
    forgiveWarningText: { flex: 1, fontSize: fontSizes.sm, color: colors.textSecondary },
    loadMoreReceipts: { minHeight: 44, alignItems: 'center', justifyContent: 'center', padding: spacing.md },
    loadMoreReceiptsText: { textAlign: 'center', fontSize: fontSizes.sm, fontWeight: fontWeights.semibold, color: colors.primary },
  }), [colors, insets.bottom]);

  useEffect(() => {
    if (selectedHousehold && user) {
      loadBalances();
    }
  }, [selectedHousehold, user]);

  const loadBalances = async () => {
    if (!selectedHousehold || !user) return;
    const gen = ++loadBalancesGenRef.current;

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
            includeProof: true,
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
      if (gen !== loadBalancesGenRef.current) return;
      setBalances(snapshot.balances);
      setSettlements(snapshot.receivedSettlements);
      setReceivedSettlementsTotal(snapshot.receivedSettlementsTotal);
    } catch (error) {
      if (gen !== loadBalancesGenRef.current) return;
      if (__DEV__) console.error('Failed to load balances:', error);
    } finally {
      if (gen === loadBalancesGenRef.current) {
        setLoading(false);
      }
    }
  };

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
        includeProof: true,
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
      <SanctuaryScreenShell edges={['bottom']} innerStyle={styles.container}>
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
    <SanctuaryScreenShell edges={['bottom']} innerStyle={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        contentInsetAdjustmentBehavior="automatic"
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={loadBalances} tintColor={colors.primary} />}
      >
        {showInitialLoading ? (
          <View style={styles.loadingPad} accessibilityLiveRegion="polite">
            <AppText style={styles.loadingText}>{t('settlementHistory.loading')}</AppText>
          </View>
        ) : showGlobalEmpty ? (
          <EmptyState icon="checkmark-circle-outline" title={t('home.allSettled')}
            message={t('settleUp.noBalances')} variant="minimal" />
        ) : (
          <>
            <SectionHeading title={t('settleUp.sectionYouOwe')} />
            {userOwedBalances.length > 0 ? (
              <Group>
                {userOwedBalances.map((balance) => {
                  const toUserName = getUserName(balance.toUserId);
                  const hasMutualDebt = mutualDebts.some(b => b.toUserId === balance.toUserId);
                  return (
                    <View key={`${balance.fromUserId}-${balance.toUserId}`} style={styles.balanceItem}>
                      <GroupRow title={toUserName} titleLines={0}
                        subtitle={hasMutualDebt ? `${toUserName} ${t('settleUp.alsoOwesYou')}` : t('settleUp.youOwe')}
                        leading={<Avatar name={toUserName} uri={getUserAvatar(balance.toUserId)} size={40} />}
                        trailing={<Amount value={balance.amount} currency={currency} direction="owe" size={22} fit
                          accessibilityLabel={`${t('home.youOwe')} ${toUserName}: −${formatCurrency(balance.amount, currency)}`} />} />
                      <View style={styles.inlineActions}>
                        <InlineAction icon="checkmark-circle-outline" label={t('settleUp.markAsPaid')}
                          onPress={() => handleMarkAsPaid(balance)} />
                        {hasMutualDebt ? (
                          <InlineAction icon="swap-horizontal-outline" label={t('settleUp.netBalance')}
                            onPress={() => handleNetBalance(balance)} />
                        ) : null}
                      </View>
                    </View>
                  );
                })}
              </Group>
            ) : (
              <Group><GroupRow title={t('settleUp.nothingToPayNow')} titleLines={0} /></Group>
            )}
            {userOwedToBalances.length > 0 ? (
              <>
                <SectionHeading title={t('home.youAreOwed')} />
                <Group>
                  {userOwedToBalances.map((balance) => {
                    const fromUserName = getUserName(balance.fromUserId);
                    return (
                      <View key={`${balance.fromUserId}-${balance.toUserId}`} style={styles.balanceItem}>
                        <GroupRow title={fromUserName} titleLines={0} subtitle={t('settleUp.owesYou')}
                          leading={<Avatar name={fromUserName} uri={getUserAvatar(balance.fromUserId)} size={40} />}
                          trailing={<Amount value={balance.amount} currency={currency} direction="owed" size={22} fit
                            accessibilityLabel={`${fromUserName} ${t('settleUp.owesYou')}: +${formatCurrency(balance.amount, currency)}`} />} />
                        <View style={styles.inlineActions}>
                          <InlineAction icon="close-circle-outline" label={t('settleUp.forgiveDebt')}
                            onPress={() => handleForgiveDebt(balance)} />
                        </View>
                      </View>
                    );
                  })}
                </Group>
              </>
            ) : null}
            {receivedSettlementsAll.length > 0 ? (
              <>
                <SectionHeading title={t('settleUp.receivedSettlements')} />
                {receivedSettlements.map((settlement) => {
                  const fromUserId = typeof settlement.fromUserId === 'object' && settlement.fromUserId !== null
                    ? settlement.fromUserId._id : settlement.fromUserId;
                  const fromUserName = fromUserId ? getUserName(fromUserId) : t('common.someone');
                  return (
                    <Group key={settlement._id} style={styles.balanceGroup}>
                      <GroupRow title={`${fromUserName} ${t('settleUp.paidYou')}`} titleLines={0}
                        subtitle={settlement.method || undefined}
                        leading={<Avatar name={fromUserName} uri={fromUserId ? getUserAvatar(fromUserId) : undefined} size={32} />}
                        trailing={<Amount value={settlement.amount} currency={currency} size={22} fit />} />
                      {settlement.proofImageUrl ? (
                        <TouchableOpacity accessibilityRole="button" style={styles.viewReceiptButton}
                          onPress={() => setSelectedProofImage(settlement.proofImageUrl || null)} activeOpacity={0.75}>
                          <Ionicons name="receipt-outline" size={22} color={colors.primary} />
                          <AppText style={styles.viewReceiptText}>{t('settleUp.viewReceipt')}</AppText>
                        </TouchableOpacity>
                      ) : null}
                    </Group>
                  );
                })}
                {hasMoreReceipts ? (
                  <TouchableOpacity accessibilityRole="button" accessibilityLabel={t('common.loadMore')}
                    accessibilityState={{ disabled: loadingMoreReceipts, busy: loadingMoreReceipts }}
                    style={styles.loadMoreReceipts} onPress={loadMoreReceipts} disabled={loadingMoreReceipts} activeOpacity={0.75}>
                    {loadingMoreReceipts ? <ActivityIndicator color={colors.primary} /> : (
                      <AppText style={styles.loadMoreReceiptsText}>{t('common.loadMore')} ({receivedSettlements.length}/{receivedSettlementsTotal})</AppText>
                    )}
                  </TouchableOpacity>
                ) : null}
              </>
            ) : null}
          </>
        )}
        <Group style={styles.historyGroup}>
          <GroupRow title={t('expenses.viewSettlementHistory')}
            titleLines={0} chevron onPress={() => navigation.navigate('SettlementHistory')} />
        </Group>
      </ScrollView>

      <Modal visible={settleModalVisible} animationType={reduceMotion ? 'none' : 'slide'} transparent
        onRequestClose={() => setSettleModalVisible(false)}>
        <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <Pressable accessibilityRole="button" accessibilityLabel={t('common.close')} style={StyleSheet.absoluteFillObject}
            onPress={() => { Keyboard.dismiss(); setSettleModalVisible(false); }} />
          <View style={styles.modalContent} accessibilityViewIsModal>
            <View style={styles.modalHeader}>
              <AppText accessibilityRole="header" style={styles.modalTitle}>{t('settleUp.markAsPaid')}</AppText>
              <TouchableOpacity accessibilityRole="button" style={styles.cancelButton}
                onPress={() => { Keyboard.dismiss(); setSettleModalVisible(false); }}>
                <AppText style={styles.cancelText}>{t('common.cancel')}</AppText>
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.formScroll} contentContainerStyle={styles.formContent}
              keyboardShouldPersistTaps="handled" keyboardDismissMode="interactive">
              {selectedBalance ? (
                <View style={styles.payee}>
                  <Avatar name={getUserName(selectedBalance.toUserId)} uri={getUserAvatar(selectedBalance.toUserId)} size={44} />
                  <AppText style={styles.payeeText}>{t('settleUp.paying')} {getUserName(selectedBalance.toUserId)}</AppText>
                </View>
              ) : null}
              <AmountField value={amount} onChangeText={setAmount} currency={currency}
                symbol={getCurrencyOption(currency).symbol} label={t('expenses.amount')} />
              <Group>
                <FormTextInput variant="inset" label={t('settleUp.method')} value={method} onChangeText={setMethod}
                  placeholder={t('settleUp.methodPlaceholder')} autoCapitalize="sentences" />
                <FormTextInput variant="inset" label={t('settleUp.note')} value={note} onChangeText={setNote}
                  placeholder={t('settleUp.notePlaceholder')} autoCapitalize="sentences" multiline />
              </Group>
              <SectionHeading title={t('settleUp.proofOptional')} />
              <Group>
                {proofImage ? (
                  <View style={styles.cardPad}>
                    <View style={styles.proofImageContainer}>
                      <Image source={{ uri: proofImage }} style={styles.proofImage} accessibilityLabel={t('settleUp.proofOptional')} />
                      <TouchableOpacity accessibilityRole="button" accessibilityLabel={`${t('common.delete')}: ${t('settleUp.proofOptional')}`}
                        style={styles.removeProofButton} onPress={handleRemoveProofImage}>
                        <Ionicons name="close-circle-outline" size={24} color={colors.danger} />
                      </TouchableOpacity>
                    </View>
                  </View>
                ) : <GroupRow title={t('settleUp.addProof')} titleLines={0} action onPress={handlePickProofImage} />}
              </Group>
            </ScrollView>
            <View style={styles.modalActions}><PrimaryButton title={t('common.save')} onPress={handleSubmitSettlement} /></View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <Modal visible={forgiveModalVisible} animationType={reduceMotion ? 'none' : 'slide'} transparent
        onRequestClose={() => setForgiveModalVisible(false)}>
        <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <Pressable accessibilityRole="button" accessibilityLabel={t('common.close')} style={StyleSheet.absoluteFillObject}
            onPress={() => { Keyboard.dismiss(); setForgiveModalVisible(false); }} />
          <View style={styles.modalContent} accessibilityViewIsModal>
            <View style={styles.modalHeader}>
              <AppText accessibilityRole="header" style={styles.modalTitle}>{t('settleUp.forgiveDebt')}</AppText>
              <TouchableOpacity accessibilityRole="button" style={styles.cancelButton}
                onPress={() => { Keyboard.dismiss(); setForgiveModalVisible(false); }}>
                <AppText style={styles.cancelText}>{t('common.cancel')}</AppText>
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.formScroll} contentContainerStyle={styles.formContent}
              keyboardShouldPersistTaps="handled" keyboardDismissMode="interactive">
              {selectedForgiveBalance ? (
                <>
                  <AppText style={styles.modalSubtitle}>{getUserName(selectedForgiveBalance.fromUserId)} {t('settleUp.owesYou').toLowerCase()}</AppText>
                  <Group>
                    <GroupRow title={t('settleUp.moneyOwedToYou')} titleLines={0}
                      trailing={<Amount value={selectedForgiveBalance.amount} currency={currency} direction="owed" size={22} fit />} />
                  </Group>
                  <SectionHeading title={t('expenses.amount')} />
                  <Group>
                    <TouchableOpacity accessibilityRole="radio"
                      accessibilityState={{ selected: forgiveAmount === selectedForgiveBalance.amount.toFixed(2), checked: forgiveAmount === selectedForgiveBalance.amount.toFixed(2) }}
                      style={[styles.forgiveAmountOption, forgiveAmount === selectedForgiveBalance.amount.toFixed(2) && styles.forgiveAmountOptionSelected]}
                      onPress={() => setForgiveAmount(selectedForgiveBalance.amount.toFixed(2))}>
                      <AppText style={styles.forgiveAmountOptionText}>{t('settleUp.fullAmount')}</AppText>
                      <Amount value={selectedForgiveBalance.amount} currency={currency} size={20} fit style={{ maxWidth: '45%', flexShrink: 1 }} />
                      {forgiveAmount === selectedForgiveBalance.amount.toFixed(2) ? <Ionicons name="checkmark-circle-outline" size={22} color={colors.primary} /> : null}
                    </TouchableOpacity>
                    {selectedForgiveBalance.amount > 1 ? (
                      <TouchableOpacity accessibilityRole="radio"
                        accessibilityState={{ selected: forgiveAmount === (selectedForgiveBalance.amount / 2).toFixed(2), checked: forgiveAmount === (selectedForgiveBalance.amount / 2).toFixed(2) }}
                        style={[styles.forgiveAmountOption, forgiveAmount === (selectedForgiveBalance.amount / 2).toFixed(2) && styles.forgiveAmountOptionSelected]}
                        onPress={() => setForgiveAmount((selectedForgiveBalance.amount / 2).toFixed(2))}>
                        <AppText style={styles.forgiveAmountOptionText}>{t('settleUp.halfAmount')}</AppText>
                        <Amount value={selectedForgiveBalance.amount / 2} currency={currency} size={20} fit style={{ maxWidth: '45%', flexShrink: 1 }} />
                        {forgiveAmount === (selectedForgiveBalance.amount / 2).toFixed(2) ? <Ionicons name="checkmark-circle-outline" size={22} color={colors.primary} /> : null}
                      </TouchableOpacity>
                    ) : null}
                  </Group>
                </>
              ) : null}
              <AmountField value={forgiveAmount} onChangeText={setForgiveAmount} currency={currency}
                symbol={getCurrencyOption(currency).symbol} label={t('settleUp.customAmount')} />
              <View style={styles.forgiveWarning}>
                <Ionicons name="warning-outline" size={22} color={colors.warning} />
                <AppText style={styles.forgiveWarningText}>{t('alerts.forgiveWarning')}</AppText>
              </View>
            </ScrollView>
            <View style={styles.modalActions}><PrimaryButton title={t('settleUp.forgive')} onPress={handleSubmitForgive} variant="danger" /></View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <Modal visible={selectedProofImage !== null} transparent animationType={reduceMotion ? 'none' : 'fade'}
        onRequestClose={() => setSelectedProofImage(null)}>
        <View style={styles.proofModalOverlay} accessibilityViewIsModal>
          <TouchableOpacity accessibilityRole="button" accessibilityLabel={t('common.close')}
            style={[styles.proofModalClose, { top: insets.top + spacing.md }]} onPress={() => setSelectedProofImage(null)}>
            <Ionicons name="close-circle-outline" size={32} color={colors.text} />
          </TouchableOpacity>
          {selectedProofImage ? <Image source={{ uri: selectedProofImage }} style={styles.proofModalImage}
            resizeMode="contain" accessibilityLabel={t('settleUp.viewReceipt')} /> : null}
        </View>
      </Modal>
    </SanctuaryScreenShell>
  );
};

/** A text command under a balance row: cobalt glyph and label, 44pt tall, no fill. */
const InlineAction: React.FC<{ icon: keyof typeof Ionicons.glyphMap; label: string; onPress: () => void }> = ({ icon, label, onPress }) => {
  const colors = useThemeColors();
  return (
    <Pressable accessibilityRole="button" onPress={onPress} hitSlop={4}
      style={({ pressed }) => [{ minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: spacing.xs, opacity: pressed ? 0.6 : 1 }]}>
      <Ionicons name={icon} size={20} color={colors.primary} />
      <AppText style={{ color: colors.primary, fontSize: fontSizes.md - 1, fontWeight: fontWeights.semibold }}>{label}</AppText>
    </Pressable>
  );
};
