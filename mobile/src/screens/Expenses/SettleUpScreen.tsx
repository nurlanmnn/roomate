import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Modal, KeyboardAvoidingView, Platform, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { useHousehold } from '../../context/HouseholdContext';
import { useAuth } from '../../context/AuthContext';
import { expensesApi, PairwiseBalance } from '../../api/expensesApi';
import { settlementsApi } from '../../api/settlementsApi';
import { BalanceSummary } from '../../components/BalanceSummary';
import { FormTextInput } from '../../components/FormTextInput';
import { PrimaryButton } from '../../components/PrimaryButton';
import { formatCurrency } from '../../utils/formatCurrency';
import * as Sharing from 'expo-sharing';
import { ScreenHeader } from '../../components/ui/ScreenHeader';
import { Avatar } from '../../components/ui/Avatar';
import { EmptyState } from '../../components/ui/EmptyState';
import { Ionicons } from '@expo/vector-icons';
import { colors, fontSizes, fontWeights, radii, spacing, shadows } from '../../theme';

export const SettleUpScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { selectedHousehold } = useHousehold();
  const { user } = useAuth();
  const [balances, setBalances] = useState<PairwiseBalance[]>([]);
  const [loading, setLoading] = useState(false);
  const [settleModalVisible, setSettleModalVisible] = useState(false);
  const [selectedBalance, setSelectedBalance] = useState<PairwiseBalance | null>(null);
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('');
  const [note, setNote] = useState('');
  const [proofImage, setProofImage] = useState<string | null>(null);

  useEffect(() => {
    if (selectedHousehold) {
      loadBalances();
    }
  }, [selectedHousehold]);

  const loadBalances = async () => {
    if (!selectedHousehold) return;

    setLoading(true);
    try {
      const data = await expensesApi.getBalances(selectedHousehold._id);
      setBalances(data);
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

  const handlePayExternally = async (balance: PairwiseBalance) => {
    const toUserName = getUserName(balance.toUserId);
    const message = `Hey ${toUserName}, I owe you ${formatCurrency(balance.amount)} for our apartment expenses.`;

    try {
      const isAvailable = await Sharing.isAvailableAsync();
      if (isAvailable) {
        await Sharing.shareAsync(message);
      } else {
        Alert.alert('Share', message);
      }
    } catch (error) {
      console.error('Failed to share:', error);
    }
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
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'We need access to your photos to add proof of payment.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
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
      Alert.alert('Error', 'Failed to pick image');
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
      Alert.alert('Error', 'No mutual debt found to net');
      return;
    }

    const otherUserName = getUserName(balance.toUserId);
    const userOwes = balance.amount;
    const otherOwes = reverseBalance.amount;
    const netAmount = Math.abs(userOwes - otherOwes);

    Alert.alert(
      'Net Balance',
      `You owe ${otherUserName} ${formatCurrency(userOwes)} and ${otherUserName} owes you ${formatCurrency(otherOwes)}.\n\nThis will create a settlement to simplify the balance. After netting, ${userOwes >= otherOwes ? 'you' : otherUserName} will owe ${formatCurrency(netAmount)} to ${userOwes >= otherOwes ? otherUserName : 'you'}.\n\nContinue?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Net Balance',
          onPress: async () => {
            try {
              await settlementsApi.netBalance({
                householdId: selectedHousehold._id,
                otherUserId: balance.toUserId,
              });
              Alert.alert('Success', 'Balance has been netted successfully!');
              loadBalances();
            } catch (error: any) {
              Alert.alert('Error', error.response?.data?.error || 'Failed to net balance');
            }
          },
        },
      ]
    );
  };

  const handleSubmitSettlement = async () => {
    if (!selectedHousehold || !user || !selectedBalance) return;

    if (!amount || !method) {
      Alert.alert('Error', 'Please fill in amount and method');
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
      Alert.alert('Error', error.response?.data?.error || 'Failed to create settlement');
    }
  };

  if (!selectedHousehold || !user) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <View style={styles.emptyContainer}>
          <Text>Please select a household</Text>
        </View>
      </SafeAreaView>
    );
  }

  const userOwedBalances = balances.filter(b => b.fromUserId === user._id);
  
  // Find mutual debts (where user owes someone AND that person owes user)
  const mutualDebts = balances.filter(b => {
    if (b.fromUserId === user._id) {
      // User owes this person - check if this person also owes user
      return balances.some(other => other.fromUserId === b.toUserId && other.toUserId === user._id);
    }
    return false;
  });

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView
        style={styles.keyboardAvoid}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <ScrollView 
          style={styles.scrollView}
          keyboardShouldPersistTaps="handled"
        >
      <ScreenHeader title="Settle Up" subtitle={selectedHousehold.name} />

      <View style={styles.historyButtonContainer}>
        <TouchableOpacity
          style={styles.historyButton}
          onPress={() => navigation.navigate('SettlementHistory')}
        >
          <Ionicons name="receipt-outline" size={20} color={colors.primary} />
          <Text style={styles.historyButtonText}>View Settlement History</Text>
        </TouchableOpacity>
      </View>

      {userOwedBalances.length === 0 ? (
        <EmptyState
          icon="checkmark-circle-outline"
          title="All settled up! 🎉"
          message="You're all caught up with your roommates. No outstanding balances to settle."
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
                      You owe <Text style={styles.userName}>{toUserName}</Text>{' '}
                      <Text style={styles.amount}>{formatCurrency(balance.amount)}</Text>
                    </Text>
                  </View>
                </View>
                {hasMutualDebt && (
                  <Text style={styles.mutualDebtNote}>
                    💡 {toUserName} also owes you money. You can net the balances.
                  </Text>
                )}
                <View style={styles.actions}>
                  {hasMutualDebt && (
                    <TouchableOpacity
                      style={[styles.actionButton, styles.netButton]}
                      onPress={() => handleNetBalance(balance)}
                    >
                      <Text style={styles.actionButtonText}>Net Balance</Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity
                    style={[styles.actionButton, styles.externalButton]}
                    onPress={() => handlePayExternally(balance)}
                  >
                    <Text style={styles.actionButtonText}>Pay Externally</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.markButton]}
                    onPress={() => handleMarkAsPaid(balance)}
                  >
                    <Text style={styles.actionButtonText}>Mark as Paid</Text>
                  </TouchableOpacity>
                </View>
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
            <Text style={styles.modalTitle}>Mark as Paid</Text>
            {selectedBalance && (
              <Text style={styles.modalSubtitle}>
                Paying {getUserName(selectedBalance.toUserId)}
              </Text>
            )}
            <FormTextInput
              label="Amount"
              value={amount}
              onChangeText={setAmount}
              placeholder="0.00"
              keyboardType="numeric"
            />
            <FormTextInput
              label="Method"
              value={method}
              onChangeText={setMethod}
              placeholder="e.g., Venmo, Zelle, Cash"
            />
            <FormTextInput
              label="Note (Optional)"
              value={note}
              onChangeText={setNote}
              placeholder="Add a note"
              multiline
            />
            <View style={styles.proofSection}>
              <Text style={styles.proofLabel}>Proof of Payment (Optional)</Text>
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
                  <Text style={styles.addProofText}>Add Photo</Text>
                </TouchableOpacity>
              )}
            </View>
            <View style={styles.modalActions}>
              <PrimaryButton
                title="Cancel"
                onPress={() => setSettleModalVisible(false)}
              />
              <View style={styles.spacer} />
              <PrimaryButton
                title="Save"
                onPress={handleSubmitSettlement}
              />
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </ScrollView>
    </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
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
  externalButton: {
    backgroundColor: colors.accent,
  },
  markButton: {
    backgroundColor: colors.primary,
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
});

