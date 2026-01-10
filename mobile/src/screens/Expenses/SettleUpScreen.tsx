import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Modal, KeyboardAvoidingView, Platform, Image, Keyboard } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { useHousehold } from '../../context/HouseholdContext';
import { useAuth } from '../../context/AuthContext';
import { expensesApi, PairwiseBalance } from '../../api/expensesApi';
import { settlementsApi, Settlement } from '../../api/settlementsApi';
import { BalanceSummary } from '../../components/BalanceSummary';
import { FormTextInput } from '../../components/FormTextInput';
import { PrimaryButton } from '../../components/PrimaryButton';
import { formatCurrency } from '../../utils/formatCurrency';
import { Avatar } from '../../components/ui/Avatar';
import { EmptyState } from '../../components/ui/EmptyState';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors, fontSizes, fontWeights, radii, spacing, shadows } from '../../theme';
import { useLanguage } from '../../context/LanguageContext';

export const SettleUpScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { selectedHousehold } = useHousehold();
  const { user } = useAuth();
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  const { t } = useLanguage();
  const [balances, setBalances] = useState<PairwiseBalance[]>([]);
  const [settlements, setSettlements] = useState<Settlement[]>([]);
  const [loading, setLoading] = useState(false);
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

  const styles = React.useMemo(() => StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
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
    section: {
      paddingHorizontal: spacing.md,
      paddingTop: spacing.md,
      paddingBottom: spacing.xs,
    },
    balanceCard: {
      backgroundColor: colors.surface,
      padding: spacing.lg,
      borderRadius: radii.lg,
      marginBottom: spacing.md,
      borderWidth: 1,
      borderColor: colors.border,
      ...(shadows.sm as object),
    },
    balanceHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      marginBottom: spacing.md,
    },
    balanceTextContainer: {
      flex: 1,
    },
    balanceText: {
      fontSize: fontSizes.md,
      color: colors.text,
    },
    userName: {
      fontWeight: fontWeights.semibold,
    },
    amount: {
      color: colors.danger,
      fontWeight: fontWeights.extrabold,
    },
    actions: {
      flexDirection: 'row',
      gap: spacing.xs,
      flexWrap: 'wrap',
    },
    actionButton: {
      flex: 1,
      minWidth: 100,
      padding: spacing.md,
      borderRadius: radii.md,
      alignItems: 'center',
    },
    netButton: {
      backgroundColor: colors.warning,
    },
    markButton: {
      backgroundColor: colors.primary,
    },
    forgiveButton: {
      backgroundColor: colors.danger,
    },
    amountPositive: {
      color: colors.success,
      fontWeight: fontWeights.extrabold,
    },
    mutualDebtNote: {
      fontSize: fontSizes.xs,
      color: colors.warning,
      fontStyle: 'italic',
      marginBottom: spacing.xs,
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
      borderRadius: radii.full,
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
      backgroundColor: colors.background,
    },
    addProofText: {
      fontSize: fontSizes.sm,
      color: colors.primary,
      fontWeight: fontWeights.medium,
    },
    scrollContent: {
      paddingTop: spacing.md,
      paddingBottom: spacing.xl,
    },
    historyButtonContainer: {
      paddingHorizontal: spacing.lg,
      marginBottom: spacing.md,
    },
    historyButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.xs,
      padding: spacing.md,
      backgroundColor: colors.surface,
      borderRadius: radii.md,
      borderWidth: 1,
      borderColor: colors.borderLight,
    },
    historyButtonText: {
      fontSize: fontSizes.sm,
      color: colors.primary,
      fontWeight: fontWeights.semibold,
    },
    sectionTitle: {
      fontSize: fontSizes.lg,
      fontWeight: fontWeights.bold,
      color: colors.text,
      marginBottom: spacing.md,
    },
    receivedSettlementCard: {
      backgroundColor: colors.surface,
      padding: spacing.md,
      borderRadius: radii.md,
      marginBottom: spacing.sm,
      borderWidth: 1,
      borderColor: colors.borderLight,
      ...(shadows.xs as object),
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
    owedToSection: {
      paddingHorizontal: spacing.md,
      paddingTop: spacing.md,
      paddingBottom: spacing.xs,
    },
    owedToBalanceCard: {
      backgroundColor: colors.surface,
      padding: spacing.lg,
      borderRadius: radii.lg,
      marginBottom: spacing.md,
      borderWidth: 1,
      borderColor: colors.border,
      ...(shadows.sm as object),
    },
    owedToAmount: {
      fontSize: fontSizes.lg,
      fontWeight: fontWeights.extrabold,
      color: colors.success,
    },
    forgiveButton: {
      backgroundColor: colors.danger,
      padding: spacing.md,
      borderRadius: radii.md,
      alignItems: 'center',
      marginTop: spacing.sm,
    },
    forgiveButtonText: {
      color: colors.surface,
      fontSize: fontSizes.sm,
      fontWeight: fontWeights.semibold,
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
  }), [colors]);

  useEffect(() => {
    if (selectedHousehold) {
      loadBalances();
    }
  }, [selectedHousehold]);

  const loadBalances = async () => {
    if (!selectedHousehold) return;

    setLoading(true);
    try {
      const [balancesData, settlementsData] = await Promise.all([
        expensesApi.getBalances(selectedHousehold._id),
        settlementsApi.getSettlements(selectedHousehold._id),
      ]);
      setBalances(balancesData);
      setSettlements(settlementsData || []);
    } catch (error) {
      console.error('Failed to load balances:', error);
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
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(t('alerts.permissionDenied'), t('alerts.photoPermissionNeeded'));
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
      console.error('Error picking image:', error);
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
      `${t('home.youOwe')} ${otherUserName} ${formatCurrency(userOwes)} ${t('common.and')} ${otherUserName} ${t('settleUp.owesYou').toLowerCase()} ${formatCurrency(otherOwes)}.\n\n${debtor} ${t('settleUp.willOwe')} ${formatCurrency(netAmount)} ${t('common.to')} ${creditor}.\n\n${t('common.continue')}?`,
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
      setSettleModalVisible(false);
      setProofImage(null);
      loadBalances();
      navigation.goBack();
    } catch (error: any) {
      Alert.alert(t('common.error'), error.response?.data?.error || t('alerts.somethingWentWrong'));
    }
  };

  if (!selectedHousehold || !user) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <View style={styles.emptyContainer}>
          <Text>{t('alerts.selectHousehold')}</Text>
        </View>
      </SafeAreaView>
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

  // Get settlements where user received payments (user is toUserId)
  const receivedSettlements = settlements.filter(s => {
    const toUserId = typeof s.toUserId === 'object' && s.toUserId !== null ? s.toUserId._id : s.toUserId;
    return toUserId === user._id && s.proofImageUrl;
  }).slice(0, 5); // Show last 5 with receipts

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
          ? `${t('settleUp.partialDebtForgiven')} (${formatCurrency(amountToForgive)} / ${formatCurrency(selectedForgiveBalance.amount)})`
          : t('settleUp.debtForgivenNote'),
        date: new Date().toISOString(),
      });
      setForgiveModalVisible(false);
      loadBalances();
      Alert.alert(t('common.success'), t('alerts.debtForgiven', { amount: formatCurrency(amountToForgive), user: fromUserName }));
    } catch (error: any) {
      Alert.alert(t('common.error'), error.response?.data?.error || t('alerts.somethingWentWrong'));
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView
        style={styles.keyboardAvoid}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
      <View style={styles.historyButtonContainer}>
        <TouchableOpacity
          style={styles.historyButton}
          onPress={() => navigation.navigate('SettlementHistory')}
        >
          <Ionicons name="receipt-outline" size={20} color={colors.primary} />
          <Text style={styles.historyButtonText}>{t('expenses.viewSettlementHistory')}</Text>
        </TouchableOpacity>
      </View>

      {userOwedBalances.length === 0 ? (
        <EmptyState
          icon="checkmark-circle-outline"
          title={`${t('home.allSettled')} 🎉`}
          message={t('settleUp.noBalances')}
          variant="minimal"
        />
      ) : (
        <View style={styles.section}>
          {userOwedBalances.map((balance, index) => {
            const toUserName = getUserName(balance.toUserId);
            const hasMutualDebt = mutualDebts.some(b => b.toUserId === balance.toUserId);
            
            const toUserAvatar = getUserAvatar(balance.toUserId);
            
            return (
              <View key={index} style={styles.balanceCard}>
                <View style={styles.balanceHeader}>
                  <Avatar name={toUserName} uri={toUserAvatar} size={40} />
                  <View style={styles.balanceTextContainer}>
                    <Text style={styles.balanceText}>
                      {t('home.youOwe')} <Text style={styles.userName}>{toUserName}</Text>{' '}
                      <Text style={styles.amount}>{formatCurrency(balance.amount)}</Text>
                    </Text>
                  </View>
                </View>
                {hasMutualDebt && (
                  <Text style={styles.mutualDebtNote}>
                    💡 {toUserName} {t('settleUp.alsoOwesYou')}
                  </Text>
                )}
                <View style={styles.actions}>
                  {hasMutualDebt && (
                    <TouchableOpacity
                      style={[styles.actionButton, styles.netButton]}
                      onPress={() => handleNetBalance(balance)}
                    >
                      <Text style={styles.actionButtonText}>{t('settleUp.netBalance')}</Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity
                    style={[styles.actionButton, styles.markButton]}
                    onPress={() => handleMarkAsPaid(balance)}
                  >
                    <Text style={styles.actionButtonText}>{t('settleUp.markAsPaid')}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })}
        </View>
      )}

      {/* Balances where user is owed money */}
      {userOwedToBalances.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('settleUp.moneyOwedToYou')}</Text>
          {userOwedToBalances.map((balance, index) => {
            const fromUserName = getUserName(balance.fromUserId);
            const fromUserAvatar = getUserAvatar(balance.fromUserId);
            
            return (
              <View key={index} style={styles.balanceCard}>
                <View style={styles.balanceHeader}>
                  <Avatar name={fromUserName} uri={fromUserAvatar} size={40} />
                  <View style={styles.balanceTextContainer}>
                    <Text style={styles.balanceText}>
                      <Text style={styles.userName}>{fromUserName}</Text> {t('settleUp.owesYou').toLowerCase()}{' '}
                      <Text style={[styles.amount, styles.amountPositive]}>{formatCurrency(balance.amount)}</Text>
                    </Text>
                  </View>
                </View>
                <View style={styles.actions}>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.forgiveButton]}
                    onPress={() => handleForgiveDebt(balance)}
                  >
                    <Ionicons name="close-circle-outline" size={18} color={colors.surface} style={{ marginRight: spacing.xs }} />
                    <Text style={styles.actionButtonText}>{t('settleUp.forgiveDebt')}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })}
        </View>
      )}

      {/* Received Payments with Receipts */}
      {receivedSettlements.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('settleUp.receivedSettlements')}</Text>
          {receivedSettlements.map((settlement) => {
            const fromUserId = typeof settlement.fromUserId === 'object' && settlement.fromUserId !== null
              ? settlement.fromUserId._id
              : settlement.fromUserId;
            const fromUserName = fromUserId ? getUserName(fromUserId) : 'Unknown';
            const fromUserAvatar = fromUserId ? getUserAvatar(fromUserId) : undefined;

            return (
              <View key={settlement._id} style={styles.receivedSettlementCard}>
                <View style={styles.receivedSettlementHeader}>
                  <Avatar name={fromUserName} uri={fromUserAvatar} size={32} />
                  <View style={styles.receivedSettlementInfo}>
                    <Text style={styles.receivedSettlementText}>
                      <Text style={styles.userName}>{fromUserName}</Text> {t('settleUp.paidYou')} {formatCurrency(settlement.amount)}
                    </Text>
                    {settlement.method && (
                      <Text style={styles.receivedSettlementMethod}>{settlement.method}</Text>
                    )}
                  </View>
                </View>
                {settlement.proofImageUrl && (
                  <TouchableOpacity
                    style={styles.viewReceiptButton}
                    onPress={() => setSelectedProofImage(settlement.proofImageUrl || null)}
                  >
                    <Ionicons name="receipt-outline" size={18} color={colors.primary} />
                    <Text style={styles.viewReceiptText}>{t('settleUp.viewReceipt')}</Text>
                  </TouchableOpacity>
                )}
              </View>
            );
          })}
        </View>
      )}

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
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{t('settleUp.markAsPaid')}</Text>
            {selectedBalance && (
              <Text style={styles.modalSubtitle}>
                {t('settleUp.paying')} {getUserName(selectedBalance.toUserId)}
              </Text>
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
              <Text style={styles.proofLabel}>{t('settleUp.proofOptional')}</Text>
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
                  <Text style={styles.addProofText}>{t('settleUp.addProof')}</Text>
                </TouchableOpacity>
              )}
            </View>
            <View style={styles.modalActions}>
              <PrimaryButton
                title={t('common.cancel')}
                onPress={() => setSettleModalVisible(false)}
              />
              <View style={styles.spacer} />
              <PrimaryButton
                title={t('common.save')}
                onPress={handleSubmitSettlement}
              />
            </View>
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
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{t('settleUp.forgiveDebt')}</Text>
            {selectedForgiveBalance && (
              <Text style={styles.modalSubtitle}>
                {getUserName(selectedForgiveBalance.fromUserId)} {t('settleUp.owesYou').toLowerCase()} {formatCurrency(selectedForgiveBalance.amount)}
              </Text>
            )}
            
            {/* Amount options */}
            {selectedForgiveBalance && (
              <View style={styles.forgiveAmountOptions}>
                <TouchableOpacity
                  style={[
                    styles.forgiveAmountOption,
                    forgiveAmount === selectedForgiveBalance.amount.toFixed(2) && styles.forgiveAmountOptionSelected,
                  ]}
                  onPress={() => setForgiveAmount(selectedForgiveBalance.amount.toFixed(2))}
                >
                  <Text style={[
                    styles.forgiveAmountOptionText,
                    forgiveAmount === selectedForgiveBalance.amount.toFixed(2) && styles.forgiveAmountOptionTextSelected,
                  ]}>{t('settleUp.fullAmount')}</Text>
                  <Text style={styles.forgiveAmountOptionValue}>
                    {formatCurrency(selectedForgiveBalance.amount)}
                  </Text>
                </TouchableOpacity>
                
                {selectedForgiveBalance.amount > 1 && (
                  <TouchableOpacity
                    style={[
                      styles.forgiveAmountOption,
                      forgiveAmount === (selectedForgiveBalance.amount / 2).toFixed(2) && styles.forgiveAmountOptionSelected,
                    ]}
                    onPress={() => setForgiveAmount((selectedForgiveBalance.amount / 2).toFixed(2))}
                  >
                    <Text style={[
                      styles.forgiveAmountOptionText,
                      forgiveAmount === (selectedForgiveBalance.amount / 2).toFixed(2) && styles.forgiveAmountOptionTextSelected,
                    ]}>{t('settleUp.halfAmount')}</Text>
                    <Text style={styles.forgiveAmountOptionValue}>
                      {formatCurrency(selectedForgiveBalance.amount / 2)}
                    </Text>
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
              <Text style={styles.forgiveWarningText}>
                {t('alerts.forgiveWarning')}
              </Text>
            </View>
            
            <View style={styles.modalActions}>
              <PrimaryButton
                title={t('common.cancel')}
                onPress={() => setForgiveModalVisible(false)}
              />
              <View style={styles.spacer} />
              <PrimaryButton
                title={t('settleUp.forgive')}
                onPress={handleSubmitForgive}
                variant="danger"
              />
            </View>
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
    </ScrollView>
    </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

