import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, TouchableOpacity, Platform, KeyboardAvoidingView, Modal } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useHousehold } from '../../context/HouseholdContext';
import { useAuth } from '../../context/AuthContext';
import { expensesApi, ExpenseShare } from '../../api/expensesApi';
import { expenseTemplatesApi, ExpenseTemplate } from '../../api/expenseTemplatesApi';
import { FormTextInput } from '../../components/FormTextInput';
import { PrimaryButton } from '../../components/PrimaryButton';
import { formatCurrency } from '../../utils/formatCurrency';
import { ScreenHeader } from '../../components/ui/ScreenHeader';
import { Avatar } from '../../components/ui/Avatar';
import { useThemeColors, fontSizes, fontWeights, radii, spacing, shadows } from '../../theme';
import { CategoryPicker } from '../../components/CategoryPicker';
import { EXPENSE_CATEGORIES, getCategoryById } from '../../constants/expenseCategories';
import { Ionicons } from '@expo/vector-icons';
import { AppText } from '../../components/AppText';

export const CreateExpenseScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { selectedHousehold } = useHousehold();
  const { user } = useAuth();
  const colors = useThemeColors();
  const [description, setDescription] = useState('');
  const [totalAmount, setTotalAmount] = useState('');
  const [paidBy, setPaidBy] = useState('');
  const [date, setDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [category, setCategory] = useState<string>('');
  const [selectedParticipants, setSelectedParticipants] = useState<string[]>([]);
  const [splitMethod, setSplitMethod] = useState<'even' | 'manual'>('even');
  const [manualShares, setManualShares] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [templates, setTemplates] = useState<ExpenseTemplate[]>([]);
  const [showTemplatesModal, setShowTemplatesModal] = useState(false);
  const [showSaveTemplateModal, setShowSaveTemplateModal] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [loadingTemplates, setLoadingTemplates] = useState(false);

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
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    form: {
      paddingHorizontal: spacing.md,
      paddingTop: spacing.md,
      paddingBottom: spacing.xxl,
    },
    field: {
      marginBottom: spacing.md,
    },
    label: {
      fontSize: fontSizes.sm,
      fontWeight: fontWeights.semibold,
      marginBottom: spacing.xs,
      color: colors.textSecondary,
    },
    radioOption: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.md,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radii.lg,
      marginBottom: spacing.xs,
      backgroundColor: colors.surface,
      ...(shadows.sm as object),
    },
    radioSelected: {
      backgroundColor: colors.accentSoft,
      borderColor: colors.accent,
    },
    radioText: {
      fontSize: fontSizes.md,
      color: colors.text,
    },
    checkboxOption: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.md,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radii.lg,
      marginBottom: spacing.xs,
      backgroundColor: colors.surface,
      ...(shadows.sm as object),
    },
    checkboxSelected: {
      backgroundColor: colors.primarySoft,
      borderColor: colors.primary,
    },
    checkboxText: {
      fontSize: fontSizes.md,
      color: colors.text,
    },
    selectAllButton: {
      alignSelf: 'flex-end',
      padding: spacing.xs,
    },
    selectAllText: {
      color: colors.primary,
      fontWeight: fontWeights.semibold,
    },
    sharesPreview: {
      backgroundColor: colors.surface,
      padding: spacing.lg,
      borderRadius: radii.lg,
      marginBottom: spacing.md,
      borderWidth: 1,
      borderColor: colors.border,
      ...(shadows.sm as object),
    },
    sharesTitle: {
      fontSize: fontSizes.md,
      fontWeight: fontWeights.semibold,
      marginBottom: spacing.xs,
      color: colors.text,
    },
    shareItem: {
      fontSize: fontSizes.sm,
      marginBottom: spacing.xxs,
      color: colors.textSecondary,
    },
    manualShareRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: spacing.xs,
    },
    manualShareLabel: {
      width: 100,
      fontSize: fontSizes.sm,
      color: colors.textSecondary,
    },
    remaining: {
      marginTop: spacing.xs,
      fontSize: fontSizes.sm,
      fontWeight: fontWeights.semibold,
      color: colors.success,
    },
    remainingError: {
      color: colors.danger,
    },
    dateButton: {
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.md,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radii.lg,
      backgroundColor: colors.surface,
      ...(shadows.sm as object),
    },
    dateText: {
      fontSize: fontSizes.md,
      color: colors.text,
    },
    datePickerActions: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      marginTop: spacing.md,
      paddingTop: spacing.md,
      borderTopWidth: 1,
      borderTopColor: colors.borderLight,
    },
    datePickerButton: {
      backgroundColor: colors.primary,
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.xl,
      borderRadius: radii.md,
      minWidth: 80,
      alignItems: 'center',
      ...(shadows.xs as object),
    },
    datePickerButtonText: {
      color: colors.surface,
      fontSize: fontSizes.md,
      fontWeight: fontWeights.semibold,
      letterSpacing: 0.2,
    },
    templateActions: {
      flexDirection: 'row',
      gap: spacing.sm,
      paddingHorizontal: spacing.md,
      paddingTop: spacing.sm,
      paddingBottom: spacing.md,
    },
    templateButton: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.xs,
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.md,
      backgroundColor: colors.surface,
      borderRadius: radii.md,
      borderWidth: 1,
      borderColor: colors.borderLight,
      ...(shadows.xs as object),
    },
    templateButtonText: {
      fontSize: fontSizes.sm,
      fontWeight: fontWeights.semibold,
      color: colors.text,
    },
    modalContainer: {
      flex: 1,
      backgroundColor: colors.background,
    },
    modalContent: {
      flex: 1,
      padding: spacing.md,
    },
    emptyTemplates: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingVertical: spacing.xxl,
    },
    emptyTemplatesText: {
      fontSize: fontSizes.lg,
      fontWeight: fontWeights.semibold,
      color: colors.text,
      marginTop: spacing.md,
    },
    emptyTemplatesSubtext: {
      fontSize: fontSizes.md,
      color: colors.textSecondary,
      textAlign: 'center',
      marginTop: spacing.sm,
      paddingHorizontal: spacing.lg,
    },
    templateCard: {
      backgroundColor: colors.surface,
      borderRadius: radii.lg,
      padding: spacing.lg,
      marginBottom: spacing.md,
      borderWidth: 1,
      borderColor: colors.borderLight,
      ...(shadows.sm as object),
    },
    templateCardHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: spacing.xs,
    },
    templateCardName: {
      fontSize: fontSizes.lg,
      fontWeight: fontWeights.bold,
      color: colors.text,
      flex: 1,
    },
    templateCategoryBadge: {
      backgroundColor: colors.primaryUltraSoft,
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.xs,
      borderRadius: radii.sm,
    },
    templateCategoryText: {
      fontSize: fontSizes.xs,
      fontWeight: fontWeights.semibold,
      color: colors.primary,
    },
    templateCardDescription: {
      fontSize: fontSizes.md,
      color: colors.textSecondary,
      marginBottom: spacing.sm,
    },
    templateCardFooter: {
      marginTop: spacing.xs,
    },
    templateCardInfo: {
      fontSize: fontSizes.sm,
      color: colors.textTertiary,
    },
    saveTemplateModalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.6)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    saveTemplateModalContent: {
      backgroundColor: colors.background,
      borderRadius: radii.xl,
      padding: spacing.xl,
      width: '90%',
      maxWidth: 400,
      ...(shadows.lg as object),
    },
    saveTemplateModalTitle: {
      fontSize: fontSizes.xl,
      fontWeight: fontWeights.bold,
      color: colors.text,
      marginBottom: spacing.sm,
    },
    saveTemplateModalDescription: {
      fontSize: fontSizes.md,
      color: colors.textSecondary,
      marginBottom: spacing.lg,
      lineHeight: 20,
    },
    saveTemplateModalActions: {
      flexDirection: 'row',
      marginTop: spacing.lg,
    },
    spacer: {
      width: spacing.sm,
    },
  }), [colors]);

  useEffect(() => {
    if (selectedHousehold && user) {
      setPaidBy(user._id);
      setSelectedParticipants([user._id]);
    }
  }, [selectedHousehold, user]);

  useEffect(() => {
    if (selectedHousehold) {
      loadTemplates();
    }
  }, [selectedHousehold]);

  const loadTemplates = async () => {
    if (!selectedHousehold) return;
    setLoadingTemplates(true);
    try {
      const data = await expenseTemplatesApi.getTemplates(selectedHousehold._id);
      setTemplates(data);
    } catch (error) {
      console.error('Failed to load templates:', error);
    } finally {
      setLoadingTemplates(false);
    }
  };

  const handleLoadTemplate = (template: ExpenseTemplate) => {
    setDescription(template.description || '');
    setCategory(template.category || '');
    setSplitMethod(template.splitMethod);
    setSelectedParticipants(template.defaultParticipants.map(p => p._id));
    
    if (template.splitMethod === 'manual' && template.defaultShares) {
      const shares: Record<string, string> = {};
      template.defaultShares.forEach(share => {
        if (share.amount !== undefined) {
          shares[share.userId] = share.amount.toString();
        }
      });
      setManualShares(shares);
    } else {
      setManualShares({});
    }

    // Set paidBy to current user if they're in participants, otherwise first participant
    const participantIds = template.defaultParticipants.map(p => p._id);
    if (user && participantIds.includes(user._id)) {
      setPaidBy(user._id);
    } else if (participantIds.length > 0) {
      setPaidBy(participantIds[0]);
    }

    setShowTemplatesModal(false);
  };

  const handleSaveTemplate = async () => {
    if (!templateName.trim()) {
      Alert.alert('Error', 'Please enter a template name');
      return;
    }

    if (!description.trim() || selectedParticipants.length === 0) {
      Alert.alert('Error', 'Please fill in description and select participants before saving as template');
      return;
    }

    try {
      const defaultShares = splitMethod === 'manual' 
        ? selectedParticipants.map(userId => ({
            userId,
            amount: parseFloat(manualShares[userId] || '0'),
          }))
        : undefined;

      await expenseTemplatesApi.createTemplate({
        householdId: selectedHousehold?._id,
        name: templateName.trim(),
        description: description.trim(),
        category: category || undefined,
        splitMethod,
        defaultParticipants: selectedParticipants,
        defaultShares,
      });

      Alert.alert('Success', 'Template saved successfully');
      setShowSaveTemplateModal(false);
      setTemplateName('');
      await loadTemplates();
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.error || 'Failed to save template');
    }
  };


  const toggleParticipant = (memberId: string) => {
    if (selectedParticipants.includes(memberId)) {
      setSelectedParticipants(selectedParticipants.filter(id => id !== memberId));
      const newShares = { ...manualShares };
      delete newShares[memberId];
      setManualShares(newShares);
    } else {
      setSelectedParticipants([...selectedParticipants, memberId]);
      if (splitMethod === 'even' && selectedParticipants.length > 0) {
        // Recalculate even split
      }
    }
  };

  const selectAll = () => {
    if (!selectedHousehold) return;
    const allIds = selectedHousehold.members.map(m => m._id);
    setSelectedParticipants(allIds);
  };

  const calculateEvenShares = (): ExpenseShare[] => {
    if (!totalAmount || selectedParticipants.length === 0) return [];
    const amount = parseFloat(totalAmount);
    const shareAmount = amount / selectedParticipants.length;
    return selectedParticipants.map(userId => ({
      userId,
      amount: Math.round(shareAmount * 100) / 100, // Round to 2 decimals
    }));
  };

  const getRemainingAmount = (): number => {
    if (!totalAmount) return 0;
    const total = parseFloat(totalAmount);
    const sumShares = Object.values(manualShares).reduce((sum, val) => {
      return sum + (parseFloat(val) || 0);
    }, 0);
    return total - sumShares;
  };

  const handleSubmit = async () => {
    if (!selectedHousehold || !user) return;

    if (!description.trim() || !totalAmount || selectedParticipants.length === 0) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    let shares: ExpenseShare[] = [];
    if (splitMethod === 'even') {
      shares = calculateEvenShares();
    } else {
      shares = selectedParticipants.map(userId => ({
        userId,
        amount: parseFloat(manualShares[userId] || '0'),
      }));

      const remaining = getRemainingAmount();
      if (Math.abs(remaining) > 0.01) {
        Alert.alert('Error', `Share amounts must add up to total. Remaining: ${formatCurrency(remaining)}`);
        return;
      }
    }

    setLoading(true);
    try {
      await expensesApi.createExpense({
        householdId: selectedHousehold._id,
        description,
        totalAmount: parseFloat(totalAmount),
        paidBy,
        participants: selectedParticipants,
        splitMethod,
        shares,
        date: date.toISOString(),
        category: category ? getCategoryById(category)?.name : undefined,
      });
      navigation.goBack();
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.error || 'Failed to create expense');
    } finally {
      setLoading(false);
    }
  };

  if (!selectedHousehold) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <View style={styles.emptyContainer}>
          <Text>Please select a household</Text>
        </View>
      </SafeAreaView>
    );
  }

  const remaining = getRemainingAmount();
  const canSubmit = splitMethod === 'even' || Math.abs(remaining) < 0.01;

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
      <ScreenHeader title="Add Expense" subtitle={selectedHousehold.name} />

      <View style={styles.templateActions}>
        <TouchableOpacity
          style={styles.templateButton}
          onPress={() => setShowTemplatesModal(true)}
          disabled={loadingTemplates}
        >
          <Ionicons name="document-text-outline" size={20} color={colors.primary} />
          <AppText style={styles.templateButtonText}>
            {templates.length > 0 ? `Load Template (${templates.length})` : 'Load Template'}
          </AppText>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.templateButton}
          onPress={() => setShowSaveTemplateModal(true)}
        >
          <Ionicons name="bookmark-outline" size={20} color={colors.accent} />
          <AppText style={styles.templateButtonText}>Save as Template</AppText>
        </TouchableOpacity>
      </View>

      <View style={styles.form}>
        <FormTextInput
          label="Description"
          value={description}
          onChangeText={setDescription}
          placeholder="e.g., WiFi - January"
        />

        <FormTextInput
          label="Total Amount"
          value={totalAmount}
          onChangeText={setTotalAmount}
          placeholder="0.00"
          keyboardType="numeric"
        />

        <View style={styles.field}>
          <Text style={styles.label}>Paid By</Text>
          {selectedHousehold.members.map((member) => (
            <TouchableOpacity
              key={member._id}
              style={[styles.radioOption, paidBy === member._id && styles.radioSelected]}
              onPress={() => setPaidBy(member._id)}
            >
              <Avatar name={member.name} uri={member.avatarUrl} size={32} />
              <Text style={styles.radioText}>{member.name}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Date</Text>
          <TouchableOpacity
            style={styles.dateButton}
            onPress={() => setShowDatePicker(true)}
          >
            <Text style={styles.dateText}>
              {date.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </Text>
          </TouchableOpacity>
          {showDatePicker && (
            <DateTimePicker
              value={date}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              maximumDate={new Date()}
              onChange={(event, selectedDate) => {
                setShowDatePicker(Platform.OS === 'ios');
                if (selectedDate) {
                  setDate(selectedDate);
                }
              }}
            />
          )}
          {Platform.OS === 'ios' && showDatePicker && (
            <View style={styles.datePickerActions}>
              <TouchableOpacity
                style={styles.datePickerButton}
                onPress={() => setShowDatePicker(false)}
                activeOpacity={0.7}
              >
                <Text style={styles.datePickerButtonText}>Done</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Category (Optional)</Text>
          <CategoryPicker
            selectedCategory={category}
            onSelectCategory={setCategory}
            onClear={() => setCategory('')}
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Participants</Text>
          <TouchableOpacity onPress={selectAll} style={styles.selectAllButton}>
            <Text style={styles.selectAllText}>Select All</Text>
          </TouchableOpacity>
          {selectedHousehold.members.map((member) => (
            <TouchableOpacity
              key={member._id}
              style={[styles.checkboxOption, selectedParticipants.includes(member._id) && styles.checkboxSelected]}
              onPress={() => toggleParticipant(member._id)}
            >
              <Avatar name={member.name} uri={member.avatarUrl} size={32} />
              <Text style={styles.checkboxText}>{member.name}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Split Method</Text>
          <TouchableOpacity
            style={[styles.radioOption, splitMethod === 'even' && styles.radioSelected]}
            onPress={() => setSplitMethod('even')}
          >
            <Text>Split Evenly</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.radioOption, splitMethod === 'manual' && styles.radioSelected]}
            onPress={() => setSplitMethod('manual')}
          >
            <Text>Split Manually</Text>
          </TouchableOpacity>
        </View>

        {splitMethod === 'even' && selectedParticipants.length > 0 && totalAmount && (
          <View style={styles.sharesPreview}>
            <Text style={styles.sharesTitle}>Shares (Even Split):</Text>
            {calculateEvenShares().map((share, index) => {
              const member = selectedHousehold.members.find(m => m._id === share.userId);
              return (
                <Text key={index} style={styles.shareItem}>
                  {member?.name}: {formatCurrency(share.amount)}
                </Text>
              );
            })}
          </View>
        )}

        {splitMethod === 'manual' && (
          <View style={styles.field}>
            <Text style={styles.label}>Manual Shares</Text>
            {selectedParticipants.map((userId) => {
              const member = selectedHousehold.members.find(m => m._id === userId);
              return (
                <View key={userId} style={styles.manualShareRow}>
                  <Text style={styles.manualShareLabel}>{member?.name}:</Text>
                  <FormTextInput
                    value={manualShares[userId] || ''}
                    onChangeText={(text) => setManualShares({ ...manualShares, [userId]: text })}
                    placeholder="0.00"
                    keyboardType="numeric"
                  />
                </View>
              );
            })}
            <Text style={[styles.remaining, remaining !== 0 && styles.remainingError]}>
              Remaining to assign: {formatCurrency(remaining)}
            </Text>
          </View>
        )}

        <PrimaryButton
          title="Save Expense"
          onPress={handleSubmit}
          loading={loading}
          disabled={!canSubmit}
        />
      </View>
    </ScrollView>
    </KeyboardAvoidingView>

    {/* Templates Modal */}
    <Modal
      visible={showTemplatesModal}
      animationType="slide"
      transparent={false}
      onRequestClose={() => setShowTemplatesModal(false)}
    >
      <SafeAreaView style={styles.modalContainer} edges={['top']}>
        <ScreenHeader
          title="Load Template"
          onBackPress={() => setShowTemplatesModal(false)}
          showBackButton
        />
        <ScrollView style={styles.modalContent}>
          {templates.length === 0 ? (
            <View style={styles.emptyTemplates}>
              <Ionicons name="document-text-outline" size={48} color={colors.textTertiary} />
              <AppText style={styles.emptyTemplatesText}>No templates available</AppText>
              <AppText style={styles.emptyTemplatesSubtext}>
                Save an expense as a template to quickly reuse it later
              </AppText>
            </View>
          ) : (
            templates.map((template) => (
              <TouchableOpacity
                key={template._id}
                style={styles.templateCard}
                onPress={() => handleLoadTemplate(template)}
              >
                <View style={styles.templateCardHeader}>
                  <AppText style={styles.templateCardName}>{template.name}</AppText>
                  {template.category && (
                    <View style={styles.templateCategoryBadge}>
                      <AppText style={styles.templateCategoryText}>{template.category}</AppText>
                    </View>
                  )}
                </View>
                {template.description && (
                  <AppText style={styles.templateCardDescription}>{template.description}</AppText>
                )}
                <View style={styles.templateCardFooter}>
                  <AppText style={styles.templateCardInfo}>
                    {template.splitMethod === 'even' ? 'Even split' : 'Manual split'} • {template.defaultParticipants.length} participant{template.defaultParticipants.length !== 1 ? 's' : ''}
                  </AppText>
                </View>
              </TouchableOpacity>
            ))
          )}
        </ScrollView>
      </SafeAreaView>
    </Modal>

    {/* Save Template Modal */}
    <Modal
      visible={showSaveTemplateModal}
      animationType="slide"
      transparent={true}
      onRequestClose={() => setShowSaveTemplateModal(false)}
    >
      <View style={styles.saveTemplateModalOverlay}>
        <View style={styles.saveTemplateModalContent}>
          <AppText style={styles.saveTemplateModalTitle}>Save as Template</AppText>
          <AppText style={styles.saveTemplateModalDescription}>
            Save the current expense configuration as a template for quick reuse
          </AppText>
          <FormTextInput
            label="Template Name"
            value={templateName}
            onChangeText={setTemplateName}
            placeholder="e.g., Monthly WiFi Bill"
          />
          <View style={styles.saveTemplateModalActions}>
            <PrimaryButton
              title="Cancel"
              onPress={() => {
                setShowSaveTemplateModal(false);
                setTemplateName('');
              }}
              variant="secondary"
            />
            <View style={styles.spacer} />
            <PrimaryButton
              title="Save Template"
              onPress={handleSaveTemplate}
            />
          </View>
        </View>
      </View>
    </Modal>
    </SafeAreaView>
  );
};

