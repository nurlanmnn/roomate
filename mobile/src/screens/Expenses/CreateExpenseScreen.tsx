import React, { useMemo, useRef, useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, TouchableOpacity, Platform, KeyboardAvoidingView, Modal, Animated, PanResponder, Dimensions } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useHousehold } from '../../context/HouseholdContext';
import { useAuth } from '../../context/AuthContext';
import { expensesApi, Expense, ExpenseShare } from '../../api/expensesApi';
import { expenseTemplatesApi, ExpenseTemplate } from '../../api/expenseTemplatesApi';
import { FormTextInput } from '../../components/FormTextInput';
import { PrimaryButton } from '../../components/PrimaryButton';
import { formatCurrency } from '../../utils/formatCurrency';
import { ScreenHeader } from '../../components/ui/ScreenHeader';
import { Avatar } from '../../components/ui/Avatar';
import { useThemeColors, useTheme, fontSizes, fontWeights, radii, spacing, shadows } from '../../theme';
import { CategoryPicker } from '../../components/CategoryPicker';
import { EXPENSE_CATEGORIES, getCategoryById } from '../../constants/expenseCategories';
import { Ionicons } from '@expo/vector-icons';
import { AppText } from '../../components/AppText';
import { useRoute } from '@react-navigation/native';
import { useLanguage } from '../../context/LanguageContext';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const EDGE_SWIPE_WIDTH = 24; // iOS-like left edge swipe region
const EDGE_SWIPE_THRESHOLD = 80; // distance to trigger dismiss

export const CreateExpenseScreen: React.FC<{ navigation: any; route: any }> = ({ navigation, route }) => {
  const { selectedHousehold } = useHousehold();
  const { user } = useAuth();
  const colors = useThemeColors();
  const { theme } = useTheme();
  const { t } = useLanguage();
  const editingExpense: Expense | undefined = route?.params?.expense;
  const isEditing = !!editingExpense;
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
  const [showEditTemplateModal, setShowEditTemplateModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<ExpenseTemplate | null>(null);
  const [templateName, setTemplateName] = useState('');
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [deletingTemplateId, setDeletingTemplateId] = useState<string | null>(null);

  // Prefill when editing
  useEffect(() => {
    if (!editingExpense || !selectedHousehold) return;

    setDescription(editingExpense.description || '');
    setTotalAmount(editingExpense.totalAmount ? String(editingExpense.totalAmount) : '');
    setPaidBy(
      typeof (editingExpense.paidBy as any) === 'string'
        ? (editingExpense.paidBy as any)
        : (editingExpense.paidBy as any)?._id || ''
    );
    setDate(new Date(editingExpense.date));

    const matchedCategory = EXPENSE_CATEGORIES.find(
      (c) => c.name === editingExpense.category || c.id === editingExpense.category
    );
    setCategory(matchedCategory?.id || '');

    const participantIds = editingExpense.participants.map((p: any) =>
      typeof p === 'string' ? p : p._id
    );
    // Fallback: ensure we include any share userIds (in case participants array is partial)
    const shareIds = editingExpense.shares
      .map((s: any) => (typeof s.userId === 'string' ? s.userId : s.userId?._id))
      .filter(Boolean) as string[];
    const allIds = Array.from(new Set([...(participantIds || []), ...shareIds]));
    setSelectedParticipants(allIds);

    setSplitMethod(editingExpense.splitMethod);
    if (editingExpense.splitMethod === 'manual') {
      const sharesMap: Record<string, string> = {};
      editingExpense.shares.forEach((s) => {
        const uid = typeof s.userId === 'string' ? s.userId : (s.userId as any)?._id;
        if (uid) {
          sharesMap[uid] = s.amount.toString();
        }
      });
      setManualShares(sharesMap);
    } else {
      setManualShares({});
    }
  }, [editingExpense, selectedHousehold]);

  // Swipe-to-dismiss for the Load Template modal (matches iOS "swipe back" feel)
  const templateModalTranslateX = useRef(new Animated.Value(0)).current;
  const templateModalCurrentX = useRef(0);
  useEffect(() => {
    // Reset translation whenever the modal is opened
    if (showTemplatesModal) {
      templateModalTranslateX.setValue(0);
      templateModalCurrentX.current = 0;
    }
  }, [showTemplatesModal, templateModalTranslateX]);

  const dismissTemplatesModal = () => {
    Animated.timing(templateModalTranslateX, {
      toValue: SCREEN_WIDTH,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      templateModalTranslateX.setValue(0);
      templateModalCurrentX.current = 0;
      setShowTemplatesModal(false);
    });
  };

  const templatesModalPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: (evt) => {
        // Only start tracking if touch begins near the left edge (iOS back gesture)
        const x = evt.nativeEvent.pageX ?? evt.nativeEvent.locationX ?? 9999;
        return x <= EDGE_SWIPE_WIDTH;
      },
      onMoveShouldSetPanResponder: (evt, gestureState) => {
        const x0 = evt.nativeEvent.pageX ?? 9999;
        if (x0 > EDGE_SWIPE_WIDTH) return false;
        const { dx, dy } = gestureState;
        // Horizontal intent only; avoid fighting vertical scroll
        return dx > 10 && Math.abs(dy) < 10;
      },
      onPanResponderGrant: () => {
        templateModalTranslateX.setOffset(templateModalCurrentX.current);
        templateModalTranslateX.setValue(0);
      },
      onPanResponderMove: (_evt, gestureState) => {
        const dx = Math.max(0, gestureState.dx); // only allow swipe right
        templateModalTranslateX.setValue(dx);
      },
      onPanResponderRelease: (_evt, gestureState) => {
        const { dx, vx } = gestureState;
        templateModalTranslateX.flattenOffset();
        templateModalCurrentX.current = (templateModalTranslateX as any)._value ?? 0;

        const shouldDismiss = dx > EDGE_SWIPE_THRESHOLD || vx > 0.5;
        if (shouldDismiss) {
          dismissTemplatesModal();
        } else {
          Animated.spring(templateModalTranslateX, {
            toValue: 0,
            useNativeDriver: true,
            tension: 120,
            friction: 10,
          }).start(() => {
            templateModalCurrentX.current = 0;
          });
        }
      },
      onPanResponderTerminate: () => {
        templateModalTranslateX.flattenOffset();
        Animated.spring(templateModalTranslateX, {
          toValue: 0,
          useNativeDriver: true,
          tension: 120,
          friction: 10,
        }).start(() => {
          templateModalCurrentX.current = 0;
        });
      },
    })
  ).current;

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
      borderWidth: 2,
      borderColor: colors.textSecondary,
      borderRadius: radii.lg,
      marginBottom: spacing.xs,
      backgroundColor: colors.surface,
    },
    radioSelected: {
      backgroundColor: colors.primarySoft,
      borderColor: colors.primary,
    },
    radioText: {
      fontSize: fontSizes.md,
      fontWeight: fontWeights.medium,
      color: colors.text,
    },
    radioTextSelected: {
      color: colors.primary,
      fontWeight: fontWeights.bold,
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
    templateCardContainer: {
      marginBottom: spacing.md,
    },
    templateCardActions: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      gap: spacing.md,
      marginTop: spacing.xs,
      paddingTop: spacing.xs,
    },
    templateActionButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xxs,
      paddingVertical: spacing.xs,
      paddingHorizontal: spacing.sm,
    },
    templateActionText: {
      fontSize: fontSizes.sm,
      fontWeight: fontWeights.medium,
      color: colors.primary,
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

  // Only set default paidBy and participants when creating new (not editing)
  useEffect(() => {
    if (isEditing) return; // Skip for edit mode
    if (selectedHousehold && user) {
      setPaidBy(user._id);
      setSelectedParticipants([user._id]);
    }
  }, [selectedHousehold, user, isEditing]);

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
      Alert.alert(t('common.error'), t('alerts.enterTemplateName'));
      return;
    }

    if (!description.trim() || selectedParticipants.length === 0) {
      Alert.alert(t('common.error'), t('alerts.fillDescriptionAndParticipants'));
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

      Alert.alert(t('common.success'), t('expenses.templateSaved'));
      setShowSaveTemplateModal(false);
      setTemplateName('');
      await loadTemplates();
    } catch (error: any) {
      Alert.alert(t('common.error'), error.response?.data?.error || t('alerts.somethingWentWrong'));
    }
  };

  const handleEditTemplate = (template: ExpenseTemplate) => {
    setEditingTemplate(template);
    setTemplateName(template.name);
    // Close templates modal first, then open edit modal after a short delay
    setShowTemplatesModal(false);
    setTimeout(() => {
      setShowEditTemplateModal(true);
    }, 100);
  };

  const handleUpdateTemplate = async () => {
    if (!editingTemplate || !templateName.trim()) {
      Alert.alert(t('common.error'), t('alerts.enterTemplateName'));
      return;
    }

    try {
      await expenseTemplatesApi.updateTemplate(editingTemplate._id, {
        name: templateName.trim(),
      });
      Alert.alert(t('common.success'), t('expenses.templateUpdated'));
      setShowEditTemplateModal(false);
      setEditingTemplate(null);
      setTemplateName('');
      await loadTemplates();
    } catch (error: any) {
      Alert.alert(t('common.error'), error.response?.data?.error || t('alerts.somethingWentWrong'));
    }
  };

  const handleDeleteTemplate = (template: ExpenseTemplate) => {
    Alert.alert(
      t('expenses.deleteTemplate'),
      t('alerts.deleteTemplateConfirm', { name: template.name }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: async () => {
            setDeletingTemplateId(template._id);
            try {
              await expenseTemplatesApi.deleteTemplate(template._id);
              await loadTemplates();
            } catch (error: any) {
              Alert.alert(t('common.error'), error.response?.data?.error || t('alerts.somethingWentWrong'));
            } finally {
              setDeletingTemplateId(null);
            }
          },
        },
      ]
    );
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

  const allMemberIds = useMemo(
    () => (selectedHousehold ? selectedHousehold.members.map(m => m._id) : []),
    [selectedHousehold]
  );

  const allSelected = useMemo(() => {
    if (allMemberIds.length === 0) return false;
    if (selectedParticipants.length !== allMemberIds.length) return false;
    const selectedSet = new Set(selectedParticipants);
    return allMemberIds.every(id => selectedSet.has(id));
  }, [allMemberIds, selectedParticipants]);

  const toggleSelectAll = () => {
    if (!selectedHousehold) return;
    if (allSelected) {
      setSelectedParticipants([]);
      setManualShares({});
      return;
    }
    setSelectedParticipants(allMemberIds);
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
      Alert.alert(t('common.error'), t('alerts.fillRequiredFields'));
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
        Alert.alert(t('common.error'), t('alerts.sharesMustMatch', { amount: formatCurrency(remaining) }));
        return;
      }
    }

    setLoading(true);
    try {
      if (isEditing && editingExpense) {
        await expensesApi.updateExpense(editingExpense._id, {
          description,
          totalAmount: parseFloat(totalAmount),
          paidBy,
          participants: selectedParticipants,
          splitMethod,
          shares,
          date: date.toISOString(),
          category: category ? getCategoryById(category)?.name : undefined,
        });
      } else {
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
      }
      navigation.goBack();
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.error || 'Failed to save expense');
    } finally {
      setLoading(false);
    }
  };

  if (!selectedHousehold) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <View style={styles.emptyContainer}>
          <Text>{t('alerts.selectHousehold')}</Text>
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
      <ScreenHeader title={isEditing ? t('expenses.editExpense') : t('expenses.addExpense')} subtitle={selectedHousehold.name} />

      <View style={styles.templateActions}>
        <TouchableOpacity
          style={styles.templateButton}
          onPress={() => setShowTemplatesModal(true)}
          disabled={loadingTemplates}
        >
          <Ionicons name="document-text-outline" size={20} color={colors.primary} />
          <AppText style={styles.templateButtonText}>
            {templates.length > 0 ? `${t('expenses.loadTemplate')} (${templates.length})` : t('expenses.loadTemplate')}
          </AppText>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.templateButton}
          onPress={() => setShowSaveTemplateModal(true)}
        >
          <Ionicons name="bookmark-outline" size={20} color={colors.accent} />
          <AppText style={styles.templateButtonText}>{t('expenses.saveAsTemplate')}</AppText>
        </TouchableOpacity>
      </View>

      <View style={styles.form}>
        <FormTextInput
          label={t('expenses.description')}
          value={description}
          onChangeText={setDescription}
          placeholder={t('expenses.descriptionPlaceholder')}
        />

        <FormTextInput
          label={t('expenses.totalAmount')}
          value={totalAmount}
          onChangeText={setTotalAmount}
          placeholder="0.00"
          keyboardType="numeric"
        />

        <View style={styles.field}>
          <Text style={styles.label}>{t('expenses.paidBy')}</Text>
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
          <Text style={styles.label}>{t('expenses.date')}</Text>
          <TouchableOpacity
            style={styles.dateButton}
            onPress={() => setShowDatePicker((prev) => !prev)}
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
              themeVariant={theme}
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
                <Text style={styles.datePickerButtonText}>{t('common.done')}</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>{t('expenses.categoryOptional')}</Text>
          <CategoryPicker
            selectedCategory={category}
            onSelectCategory={setCategory}
            onClear={() => setCategory('')}
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>{t('expenses.participants')}</Text>
          <TouchableOpacity onPress={toggleSelectAll} style={styles.selectAllButton}>
            <Text style={styles.selectAllText}>{allSelected ? t('common.deselectAll') : t('common.selectAll')}</Text>
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
          <Text style={styles.label}>{t('expenses.splitMethod')}</Text>
          <TouchableOpacity
            style={[styles.radioOption, splitMethod === 'even' && styles.radioSelected]}
            onPress={() => setSplitMethod('even')}
          >
            <Text style={[styles.radioText, splitMethod === 'even' && styles.radioTextSelected]}>{t('expenses.splitEvenly')}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.radioOption, splitMethod === 'manual' && styles.radioSelected]}
            onPress={() => setSplitMethod('manual')}
          >
            <Text style={[styles.radioText, splitMethod === 'manual' && styles.radioTextSelected]}>{t('expenses.splitManually')}</Text>
          </TouchableOpacity>
        </View>

        {splitMethod === 'even' && selectedParticipants.length > 0 && totalAmount && (
          <View style={styles.sharesPreview}>
            <Text style={styles.sharesTitle}>{t('expenses.shares')} ({t('expenses.evenSplit')}):</Text>
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
            <Text style={styles.label}>{t('expenses.manualShares')}</Text>
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
              {t('expenses.remainingToAssign')}: {formatCurrency(remaining)}
            </Text>
          </View>
        )}

        <PrimaryButton
          title={isEditing ? t('expenses.updateExpense') : t('expenses.saveExpense')}
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
      <View style={styles.modalContainer}>
        <Animated.View
          style={{ flex: 1, transform: [{ translateX: templateModalTranslateX }] }}
          {...templatesModalPanResponder.panHandlers}
        >
          <ScreenHeader
            title={t('expenses.loadTemplate')}
            onBackPress={dismissTemplatesModal}
            showBackButton
            variant="stack"
          />
          <ScrollView style={styles.modalContent}>
          {templates.length === 0 ? (
            <View style={styles.emptyTemplates}>
              <Ionicons name="document-text-outline" size={48} color={colors.textTertiary} />
              <AppText style={styles.emptyTemplatesText}>{t('expenses.noTemplates')}</AppText>
              <AppText style={styles.emptyTemplatesSubtext}>
                {t('expenses.noTemplatesDescription')}
              </AppText>
            </View>
          ) : (
            templates.map((template) => {
              const isCreator = user && template.userId === user._id;
              return (
                <View key={template._id} style={styles.templateCardContainer}>
                  <TouchableOpacity
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
                        {template.splitMethod === 'even' ? t('expenses.evenSplit') : t('expenses.splitManually')} • {template.defaultParticipants.length} {template.defaultParticipants.length !== 1 ? t('expenses.participantPlural') : t('expenses.participant')}
                      </AppText>
                    </View>
                  </TouchableOpacity>
                  {isCreator && (
                    <View style={styles.templateCardActions}>
                      <TouchableOpacity
                        style={styles.templateActionButton}
                        onPress={() => handleEditTemplate(template)}
                      >
                        <Ionicons name="pencil-outline" size={18} color={colors.primary} />
                        <AppText style={styles.templateActionText}>{t('common.edit')}</AppText>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.templateActionButton}
                        onPress={() => handleDeleteTemplate(template)}
                        disabled={deletingTemplateId === template._id}
                      >
                        <Ionicons name="trash-outline" size={18} color={colors.danger} />
                        <AppText style={[styles.templateActionText, { color: colors.danger }]}>
                          {deletingTemplateId === template._id ? t('expenses.deleting') : t('common.delete')}
                        </AppText>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              );
            })
          )}
          </ScrollView>
        </Animated.View>
      </View>
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
          <AppText style={styles.saveTemplateModalTitle}>{t('expenses.saveAsTemplate')}</AppText>
          <AppText style={styles.saveTemplateModalDescription}>
            {t('expenses.saveTemplateDescription')}
          </AppText>
          <FormTextInput
            label={t('expenses.templateName')}
            value={templateName}
            onChangeText={setTemplateName}
            placeholder={t('expenses.templateNamePlaceholder')}
          />
          <View style={styles.saveTemplateModalActions}>
            <PrimaryButton
              title={t('common.cancel')}
              onPress={() => {
                setShowSaveTemplateModal(false);
                setTemplateName('');
              }}
              variant="secondary"
            />
            <View style={styles.spacer} />
            <PrimaryButton
              title={t('expenses.saveAsTemplate')}
              onPress={handleSaveTemplate}
            />
          </View>
        </View>
      </View>
    </Modal>

    {/* Edit Template Modal */}
    <Modal
      visible={showEditTemplateModal}
      animationType="slide"
      transparent={true}
      onRequestClose={() => {
        setShowEditTemplateModal(false);
        setEditingTemplate(null);
        setTemplateName('');
      }}
    >
      <View style={styles.saveTemplateModalOverlay}>
        <View style={styles.saveTemplateModalContent}>
          <AppText style={styles.saveTemplateModalTitle}>{t('expenses.editTemplate')}</AppText>
          <AppText style={styles.saveTemplateModalDescription}>
            {t('expenses.updateTemplateDescription')}
          </AppText>
          <FormTextInput
            label={t('expenses.templateName')}
            value={templateName}
            onChangeText={setTemplateName}
            placeholder={t('expenses.templateNamePlaceholder')}
          />
          <View style={styles.saveTemplateModalActions}>
            <PrimaryButton
              title={t('common.cancel')}
              onPress={() => {
                setShowEditTemplateModal(false);
                setEditingTemplate(null);
                setTemplateName('');
              }}
              variant="secondary"
            />
            <View style={styles.spacer} />
            <PrimaryButton
              title={t('common.update')}
              onPress={handleUpdateTemplate}
            />
          </View>
        </View>
      </View>
    </Modal>
    </SafeAreaView>
  );
};

