import React, { useMemo, useRef, useState, useEffect } from 'react';
import {
  AccessibilityInfo,
  TextInput,
  View,
  StyleSheet,
  ScrollView,
  Alert,
  TouchableOpacity,
  Platform,
  KeyboardAvoidingView,
  Modal,
  Animated,
  PanResponder,
  Dimensions,
  Pressable,
} from 'react-native';
import { useHeaderHeight } from '@react-navigation/elements';
import { Group, GroupRow, SectionHeading } from '../../components/ui/Group';
import { Amount } from '../../components/ui/Amount';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import { SanctuaryScreenShell } from '../../components/sanctuary/SanctuaryScreenShell';
import { useHousehold } from '../../context/HouseholdContext';
import { useAuth } from '../../context/AuthContext';
import { expensesApi, Expense, ExpenseShare, PairwiseBalance } from '../../api/expensesApi';
import { expenseTemplatesApi, ExpenseTemplate } from '../../api/expenseTemplatesApi';
import { FormTextInput } from '../../components/FormTextInput';
import { PrimaryButton } from '../../components/PrimaryButton';
import { formatCurrency } from '../../utils/formatCurrency';
import { useHouseholdCurrency } from '../../utils/useHouseholdCurrency';
import { getCurrencyOption } from '../../constants/currencies';
import { Avatar } from '../../components/ui/Avatar';
import { useThemeColors, useTheme, fontSizes, fontWeights, radii, spacing, fonts } from '../../theme';
import { EXPENSE_CATEGORIES, getCategoryById, getExpenseCategoryLabel } from '../../constants/expenseCategories';
import { Ionicons } from '@expo/vector-icons';
import { AppText } from '../../components/AppText';
import { useLanguage } from '../../context/LanguageContext';
import { invalidateCache, updateCached } from '../../utils/queryCache';
import { toBcp47Locale } from '../../utils/dateLocales';

/** Mirrors the snapshot shape cached by ExpensesScreen — keep in sync. */
type ExpensesSnapshot = {
  expenses: Expense[];
  total: number;
  balances: PairwiseBalance[];
  mode: boolean;
};

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const EDGE_SWIPE_WIDTH = 24; // iOS-like left edge swipe region
const EDGE_SWIPE_THRESHOLD = 80; // distance to trigger dismiss

export const CreateExpenseScreen: React.FC<{ navigation: any; route: any }> = ({ navigation, route }) => {
  const { selectedHousehold } = useHousehold();
  const { user } = useAuth();
  const colors = useThemeColors();
  const { theme } = useTheme();
  const { t, language } = useLanguage();
  const intlLocale = useMemo(() => toBcp47Locale(language), [language]);
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const [reduceMotion, setReduceMotion] = useState(false);
  const reduceMotionRef = useRef(false);
  useEffect(() => {
    const update = (enabled: boolean) => {
      reduceMotionRef.current = enabled;
      setReduceMotion(enabled);
    };
    AccessibilityInfo.isReduceMotionEnabled().then(update);
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', update);
    return () => subscription.remove();
  }, []);
  useEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <TouchableOpacity accessibilityRole="button" onPress={() => navigation.goBack()}
          style={{ minHeight: 44, minWidth: 44, justifyContent: 'center', paddingHorizontal: spacing.xs }}>
          <AppText style={{ color: colors.primary, fontSize: fontSizes.md }}>{t('common.cancel')}</AppText>
        </TouchableOpacity>
      ),
    });
  }, [navigation, colors, t]);
  const currency = useHouseholdCurrency();
  const currencySymbol = getCurrencyOption(currency).symbol;
  const editingExpense: Expense | undefined = route?.params?.expense;
  const isEditing = !!editingExpense;
  const [description, setDescription] = useState('');
  const [totalAmount, setTotalAmount] = useState('');
  const [paidBy, setPaidBy] = useState('');
  const [date, setDate] = useState(new Date());
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
  const [activePicker, setActivePicker] = useState<'paidBy' | 'split' | 'date' | 'category' | null>(null);

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
      duration: reduceMotionRef.current ? 0 : 200,
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
          Animated.timing(templateModalTranslateX, {
            toValue: 0,
            useNativeDriver: true,
            duration: reduceMotionRef.current ? 0 : 180,
          }).start(() => {
            templateModalCurrentX.current = 0;
          });
        }
      },
      onPanResponderTerminate: () => {
        templateModalTranslateX.flattenOffset();
        Animated.timing(templateModalTranslateX, {
          toValue: 0,
          useNativeDriver: true,
          duration: reduceMotionRef.current ? 0 : 180,
        }).start(() => {
          templateModalCurrentX.current = 0;
        });
      },
    })
  ).current;

  const styles = useMemo(() => StyleSheet.create({
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
    scrollContent: {
      paddingTop: spacing.sm,
      paddingBottom: spacing.xxl,
    },
    textClose: { minHeight: 44, minWidth: 44, maxWidth: '40%', justifyContent: 'center' },
    textCloseLabel: { fontSize: fontSizes.md, color: colors.primary },
    templateFormSheet: {
      height: '80%', backgroundColor: colors.background,
      borderTopLeftRadius: radii.xl, borderTopRightRadius: radii.xl, overflow: 'hidden',
    },
    templateFormContent: { paddingVertical: spacing.lg },
    manualAmountInput: {
      minHeight: 50, fontFamily: fonts.displaySemibold, fontSize: 26, fontVariant: ['tabular-nums'],
      color: colors.text, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
      borderRadius: radii.md, padding: spacing.sm,
    },
    remainingLabel: { fontSize: fontSizes.sm, color: colors.textSecondary, flexShrink: 1 },
    cardPad: {
      padding: spacing.lg,
    },
    fieldLabel: {
      fontSize: fontSizes.sm,
      fontWeight: fontWeights.semibold,
      marginBottom: spacing.xs,
      color: colors.textSecondary,
    },
    selectableRow: {
      minHeight: 60,
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.md,
    },
    paidByRowSelected: {
      backgroundColor: colors.primaryUltraSoft,
    },
    participantRowSelected: {
      backgroundColor: colors.primaryUltraSoft,
    },
    rowName: {
      fontSize: fontSizes.md,
      fontWeight: fontWeights.medium,
      color: colors.text,
      flex: 1,
    },
    rowNameSelected: {
      color: colors.primary,
      fontWeight: fontWeights.semibold,
    },
    selectAllText: {
      color: colors.primary,
      fontWeight: fontWeights.semibold,
      fontSize: fontSizes.sm,
    },
    participantsHeaderRow: {
      gap: spacing.sm,
      flexWrap: 'wrap',
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: spacing.sm,
    },
    participantHeading: {
      fontSize: 20,
      fontWeight: fontWeights.bold,
      color: colors.text,
    },
    sharesTitle: {
      fontSize: fontSizes.md,
      fontWeight: fontWeights.semibold,
      marginBottom: spacing.sm,
      color: colors.text,
    },
    manualShareRow: {
      padding: spacing.md,
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
    },
    manualShareInputWrap: {
      flex: 1,
      minWidth: 0,
    },
    remaining: {
      marginTop: spacing.sm, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: spacing.xs,
    },
    footerActions: {
      paddingHorizontal: spacing.md,
      paddingTop: spacing.md,
      backgroundColor: colors.surface,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.borderLight,
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
      minHeight: 60,
      padding: spacing.md,
    },
    templateCardHeader: {
      gap: spacing.sm,
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      marginBottom: spacing.xs,
    },
    templateCardName: {
      width: '100%',
      fontSize: fontSizes.lg,
      fontWeight: fontWeights.bold,
      color: colors.text,
      flex: 1,
    },
    templateCategoryBadge: {
      maxWidth: '100%',
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
      marginHorizontal: 0,
      marginBottom: spacing.md,
    },
    templateCardActions: {
      flexWrap: 'wrap',
      paddingHorizontal: spacing.sm,
      flexDirection: 'row',
      justifyContent: 'flex-end',
      gap: spacing.md,
      marginTop: spacing.xs,
      paddingTop: spacing.xs,
    },
    templateActionButton: {
      flexShrink: 1,
      minHeight: 44,
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xxs,
      paddingVertical: spacing.xs,
      paddingHorizontal: spacing.sm,
    },
    templateActionText: {
      flexShrink: 1,
      fontSize: fontSizes.sm,
      fontWeight: fontWeights.medium,
      color: colors.primary,
    },
    saveTemplateModalOverlay: {
      flex: 1,
      justifyContent: 'flex-end',
      backgroundColor: colors.shadowStrong,
    },
    saveTemplateModalDescription: {
      paddingHorizontal: spacing.lg,
      fontSize: fontSizes.md,
      color: colors.textSecondary,
      marginBottom: spacing.lg,
      lineHeight: 20,
    },
    pickerBackdrop: {
      flex: 1,
      justifyContent: 'flex-end',
      backgroundColor: colors.shadowStrong,
    },
    pickerSheet: {
      maxHeight: '86%',
      backgroundColor: colors.background,
      borderTopLeftRadius: radii.xl,
      borderTopRightRadius: radii.xl,
      paddingBottom: Math.max(insets.bottom, spacing.md),
      overflow: 'hidden',
    },
    pickerHandle: {
      width: 36,
      height: 4,
      borderRadius: radii.pill,
      backgroundColor: colors.border,
      alignSelf: 'center',
      marginTop: spacing.sm,
    },
    pickerHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.md,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.borderLight,
    },
    pickerTitle: {
      flex: 1,
      fontSize: 20,
      fontWeight: fontWeights.bold,
      color: colors.text,
    },
    pickerClose: {
      width: 44,
      height: 44,
      borderRadius: radii.pill,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.background,
    },
    pickerBody: {
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.md,
    },
    pickerDone: {
      paddingHorizontal: spacing.md,
      paddingTop: spacing.sm,
    },
    segment: {
      flexDirection: 'row',
      padding: spacing.xxs,
      borderRadius: radii.lg,
      backgroundColor: colors.borderLight,
      marginBottom: spacing.lg,
    },
    segmentOption: {
      flexDirection: 'row',
      gap: spacing.xs,
      padding: spacing.xs,
      flex: 1,
      minHeight: 44,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: radii.md,
    },
    segmentOptionActive: {
      backgroundColor: colors.surface,
    },
    segmentText: {
      flexShrink: 1,
      textAlign: 'center',
      fontSize: fontSizes.sm,
      fontWeight: fontWeights.medium,
      color: colors.textSecondary,
    },
    segmentTextActive: {
      color: colors.primary,
      fontWeight: fontWeights.semibold,
    },
    categoryRow: {
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.md,
      flexDirection: 'row',
      alignItems: 'center',
      minHeight: 60,
      gap: spacing.md,
    },
    categoryIcon: {
      width: 34,
      height: 34,
      borderRadius: radii.md,
      alignItems: 'center',
      justifyContent: 'center',
    },
    amountInput: {
      minHeight: 72,
      fontFamily: fonts.displayBold,
      fontSize: 48,
      fontVariant: ['tabular-nums'],
      color: colors.text,
      paddingVertical: spacing.xs,
    },
    amountCurrency: {
      color: colors.textSecondary,
      fontSize: fontSizes.md,
    },
    householdName: {
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.sm,
      color: colors.textSecondary,
      fontSize: fontSizes.sm,
    },
    categoryLabel: {
      flex: 1,
      fontSize: fontSizes.md,
      color: colors.text,
    },
  }), [colors, insets.bottom]);

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
      if (__DEV__) console.error('Failed to load templates:', error);
    } finally {
      setLoadingTemplates(false);
    }
  };

  const closeSaveTemplateModal = () => {
    setShowSaveTemplateModal(false);
    setTemplateName('');
  };

  const closeEditTemplateModal = () => {
    setShowEditTemplateModal(false);
    setEditingTemplate(null);
    setTemplateName('');
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
      closeSaveTemplateModal();
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
      closeEditTemplateModal();
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
        Alert.alert(t('common.error'), t('alerts.sharesMustMatch', { amount: formatCurrency(remaining, currency) }));
        return;
      }
    }

    setLoading(true);
    try {
      const saved = isEditing && editingExpense
        ? await expensesApi.updateExpense(editingExpense._id, {
            description,
            totalAmount: parseFloat(totalAmount),
            paidBy,
            participants: selectedParticipants,
            splitMethod,
            shares,
            date: date.toISOString(),
            category: category ? getCategoryById(category)?.name : undefined,
          })
        : await expensesApi.createExpense({
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

      // Patch any cached ExpensesScreen snapshots so the list reflects the
      // change the moment we pop back — subscribers on that screen update
      // state synchronously instead of waiting for the focus-refetch.
      // Balances can't be recomputed here (the server derives them from all
      // expenses), so the patched snapshots are marked stale: the focus
      // refetch on ExpensesScreen then hits the network and brings fresh
      // balances instead of serving the patched snapshot for up to 30s.
      const patchSnapshot = (prev: ExpensesSnapshot): ExpensesSnapshot => {
        if (isEditing && editingExpense) {
          return {
            ...prev,
            expenses: prev.expenses.map((e) => (e._id === saved._id ? saved : e)),
          };
        }
        // New expense — prepend so it shows at the top of the default
        // newest-first list.
        const alreadyThere = prev.expenses.some((e) => e._id === saved._id);
        if (alreadyThere) return prev;
        return {
          ...prev,
          expenses: [saved, ...prev.expenses],
          total: prev.total + 1,
        };
      };
      updateCached<ExpensesSnapshot>(`expenses:${selectedHousehold._id}:page0`, patchSnapshot, { markStale: true });
      updateCached<ExpensesSnapshot>(`expenses:${selectedHousehold._id}:full`, patchSnapshot, { markStale: true });

      // Home dashboard aggregates (spending totals, insights) need the server
      // to recompute — drop so the next focus refetches fresh numbers.
      invalidateCache(`expenses:${selectedHousehold._id}:summary`);
      invalidateCache(`home:dashboard:${selectedHousehold._id}`);
      invalidateCache(`settle-up:${selectedHousehold._id}`);
      invalidateCache(`household:${selectedHousehold._id}:transaction-count`);
      navigation.goBack();
    } catch (error: any) {
      Alert.alert(t('common.error'), error.response?.data?.error || t('alerts.somethingWentWrong'));
    } finally {
      setLoading(false);
    }
  };

  if (!selectedHousehold) {
    return (
      <SanctuaryScreenShell edges={['bottom']} innerStyle={styles.container}>
        <View style={styles.emptyContainer}>
          <AppText>{t('alerts.selectHousehold')}</AppText>
        </View>
      </SanctuaryScreenShell>
    );
  }

  const remaining = getRemainingAmount();
  const canSubmit = splitMethod === 'even' || Math.abs(remaining) < 0.01;
  const paidByMember = selectedHousehold.members.find((member) => member._id === paidBy);
  const selectedCategory = category ? getCategoryById(category) : undefined;
  const participantCount = selectedParticipants.length;
  const participantLabel =
    participantCount === 1 ? t('expenses.participant') : t('expenses.participantPlural');
  const splitSummary = `${splitMethod === 'even' ? t('expenses.splitEvenly') : t('expenses.splitManually')} • ${participantCount} ${participantLabel}`;

  return (
    <SanctuaryScreenShell edges={[]} innerStyle={styles.container}>
      <KeyboardAvoidingView
        style={styles.keyboardAvoid}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={headerHeight}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          contentInsetAdjustmentBehavior="automatic"
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          showsVerticalScrollIndicator={false}
        >
          <AppText style={styles.householdName}>{selectedHousehold.name}</AppText>
          <SectionHeading title={t('expenses.sectionExpenseDetails')} />
          <Group>
            <View style={styles.cardPad}>
              <AppText style={styles.fieldLabel}>{t('expenses.totalAmount')}</AppText>
              <AppText style={styles.amountCurrency}>{currency} · {currencySymbol}</AppText>
              <TextInput
                accessibilityLabel={`${t('expenses.totalAmount')} (${currency})`}
                value={totalAmount}
                onChangeText={setTotalAmount}
                placeholder="0.00"
                placeholderTextColor={colors.textTertiary}
                keyboardType="numeric"
                style={styles.amountInput}
              />
            </View>
            <View style={styles.cardPad}>
              <FormTextInput
                label={t('expenses.description')}
                value={description}
                onChangeText={setDescription}
                placeholder={t('expenses.descriptionPlaceholder')}
                containerStyle={{ marginBottom: 0 }}
              />
            </View>
          </Group>

          <SectionHeading title={t('expenses.sectionPaidBy')} />
          <Group>
            <GroupRow title={paidByMember?.name || t('expenses.sectionPaidBy')} icon="person-outline"
              chevron titleLines={0} onPress={() => setActivePicker('paidBy')} />
          </Group>
          <SectionHeading title={t('expenses.splitMethod')} />
          <Group>
            <GroupRow title={splitSummary} icon="people-outline" chevron titleLines={0}
              onPress={() => setActivePicker('split')} />
          </Group>
          <SectionHeading title={t('expenses.sectionDateAndCategory')} />
          <Group>
            <GroupRow title={t('expenses.date')}
              subtitle={date.toLocaleDateString(intlLocale, { year: 'numeric', month: 'long', day: 'numeric' })}
              icon="calendar-outline" chevron titleLines={0} onPress={() => setActivePicker('date')} />
            <GroupRow title={t('expenses.categoryOptional')}
              subtitle={selectedCategory ? getExpenseCategoryLabel(t, selectedCategory.id) : t('expenses.categoryPickerPlaceholder')}
              icon={selectedCategory?.icon || 'pricetag-outline'} chevron titleLines={0}
              onPress={() => setActivePicker('category')} />
          </Group>

          {splitMethod === 'even' && selectedParticipants.length > 0 && totalAmount ? (
            <>
              <SectionHeading title={t('expenses.sectionSplitPreview')} />
              <Group>
                <View style={styles.cardPad}>
                  <AppText style={styles.sharesTitle}>{t('expenses.shares')} ({t('expenses.evenSplit')})</AppText>
                </View>
                {calculateEvenShares().map((share, index) => {
                  const member = selectedHousehold.members.find((m) => m._id === share.userId);
                  return <GroupRow key={index} title={member?.name || ''} titleLines={0}
                    trailing={<Amount value={share.amount} currency={currency} size={20} fit />} />;
                })}
              </Group>
            </>
          ) : null}

          <SectionHeading title={t('expenses.sectionTemplates')} />
          <Group>
            <View accessibilityState={{ disabled: loadingTemplates }}>
              <GroupRow title={templates.length > 0 ? `${t('expenses.loadTemplate')} (${templates.length})` : t('expenses.loadTemplate')}
                icon="document-text-outline" chevron titleLines={0}
                onPress={loadingTemplates ? undefined : () => setShowTemplatesModal(true)} />
            </View>
            <GroupRow title={t('expenses.saveAsTemplate')} icon="bookmark-outline" chevron titleLines={0}
              onPress={() => setShowSaveTemplateModal(true)} />
          </Group>
        </ScrollView>
        <View style={[styles.footerActions, { paddingBottom: Math.max(insets.bottom, spacing.md) }]}>
          <PrimaryButton
            title={isEditing ? t('expenses.updateExpense') : t('expenses.saveExpense')}
            onPress={handleSubmit}
            loading={loading}
            disabled={!canSubmit}
          />
        </View>
      </KeyboardAvoidingView>

    <Modal visible={activePicker !== null} transparent animationType={reduceMotion ? 'none' : 'slide'} onRequestClose={() => setActivePicker(null)}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.pickerBackdrop}>
          <Pressable accessibilityRole="button" accessibilityLabel={t('common.close')}
            style={StyleSheet.absoluteFillObject} onPress={() => setActivePicker(null)} />
          <View style={styles.pickerSheet} accessibilityViewIsModal>
          <View style={styles.pickerHandle} />
          <View style={styles.pickerHeader}>
            <AppText accessibilityRole="header" style={styles.pickerTitle}>
              {activePicker === 'paidBy'
                ? t('expenses.sectionPaidBy')
                : activePicker === 'split'
                  ? t('expenses.splitMethod')
                  : activePicker === 'date'
                    ? t('expenses.date')
                    : t('expenses.selectCategory')}
            </AppText>
            <TouchableOpacity accessibilityRole="button" accessibilityLabel={t('common.close')} style={styles.pickerClose} onPress={() => setActivePicker(null)}>
              <Ionicons name="close-outline" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {activePicker === 'paidBy' ? (
            <ScrollView contentContainerStyle={styles.pickerBody}>
              <Group style={{ marginHorizontal: 0 }}>
              {selectedHousehold.members.map((member) => {
                const selected = paidBy === member._id;
                return (
                  <TouchableOpacity
                    accessibilityRole="radio"
                    accessibilityState={{ selected, checked: selected }}
                    key={member._id}
                    style={[
                      styles.selectableRow,
                      selected && styles.paidByRowSelected,
                    ]}
                    onPress={() => {
                      setPaidBy(member._id);
                      setActivePicker(null);
                    }}
                  >
                    <Avatar name={member.name} uri={member.avatarUrl} size={32} />
                    <AppText style={[styles.rowName, selected && styles.rowNameSelected]}>{member.name}</AppText>
                    {selected ? <Ionicons name="checkmark-circle-outline" size={22} color={colors.primary} /> : null}
                  </TouchableOpacity>
                );
              })}
              </Group>
            </ScrollView>
          ) : null}

          {activePicker === 'split' ? (
            <>
              <ScrollView contentContainerStyle={styles.pickerBody} keyboardShouldPersistTaps="handled">
                <View style={styles.segment}>
                  <TouchableOpacity
                    style={[styles.segmentOption, splitMethod === 'even' && styles.segmentOptionActive]}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: splitMethod === 'even', checked: splitMethod === 'even' }}
                    onPress={() => setSplitMethod('even')}
                  >
                    <Ionicons name={splitMethod === 'even' ? 'checkmark-circle-outline' : 'ellipse-outline'} size={22} color={colors.primary} />
                    <AppText style={[styles.segmentText, splitMethod === 'even' && styles.segmentTextActive]}>
                      {t('expenses.splitEvenly')}
                    </AppText>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.segmentOption, splitMethod === 'manual' && styles.segmentOptionActive]}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: splitMethod === 'manual', checked: splitMethod === 'manual' }}
                    onPress={() => setSplitMethod('manual')}
                  >
                    <Ionicons name={splitMethod === 'manual' ? 'checkmark-circle-outline' : 'ellipse-outline'} size={22} color={colors.primary} />
                    <AppText style={[styles.segmentText, splitMethod === 'manual' && styles.segmentTextActive]}>
                      {t('expenses.splitManually')}
                    </AppText>
                  </TouchableOpacity>
                </View>
                <View style={styles.participantsHeaderRow}>
                  <AppText style={styles.participantHeading}>{t('expenses.participants')}</AppText>
                  <TouchableOpacity accessibilityRole="checkbox" accessibilityState={{ checked: allSelected }}
                    style={{ minHeight: 44, justifyContent: 'center' }} onPress={toggleSelectAll}>
                    <AppText style={styles.selectAllText}>
                      {allSelected ? t('common.deselectAll') : t('common.selectAll')}
                    </AppText>
                  </TouchableOpacity>
                </View>
                <Group style={{ marginHorizontal: 0 }}>
                  {selectedHousehold.members.map((member) => {
                    const selected = selectedParticipants.includes(member._id);
                    return (
                      <TouchableOpacity
                        accessibilityRole="checkbox"
                        accessibilityState={{ checked: selected }}
                        key={member._id}
                        style={[
                          styles.selectableRow,
                          selected && styles.participantRowSelected,
                        ]}
                        onPress={() => toggleParticipant(member._id)}
                      >
                        <Avatar name={member.name} uri={member.avatarUrl} size={32} />
                        <AppText style={[styles.rowName, selected && styles.rowNameSelected]}>{member.name}</AppText>
                        <Ionicons name={selected ? 'checkmark-circle-outline' : 'ellipse-outline'} size={22} color={colors.primary} />
                      </TouchableOpacity>
                    );
                  })}
                </Group>
                {splitMethod === 'manual' ? (
                  <View style={{ marginTop: spacing.lg }}>
                    <AppText style={styles.sharesTitle}>{t('expenses.manualShares')}</AppText>
                    <Group style={{ marginHorizontal: 0 }}>
                    {selectedParticipants.map((userId) => {
                      const member = selectedHousehold.members.find((item) => item._id === userId);
                      return (
                        <View key={userId} style={styles.manualShareRow}>
                          <View style={styles.manualShareInputWrap}>
                            <AppText style={styles.fieldLabel}>{member?.name}</AppText>
                            <TextInput accessibilityLabel={`${member?.name}: ${t('expenses.amount')} (${currency})`}
                              value={manualShares[userId] || ''}
                              onChangeText={(text) => setManualShares({ ...manualShares, [userId]: text })}
                              placeholder="0.00" placeholderTextColor={colors.textTertiary}
                              keyboardType="numeric" style={styles.manualAmountInput} />
                          </View>
                        </View>
                      );
                    })}
                    </Group>
                    <View style={styles.remaining} accessibilityLiveRegion="polite">
                      <Ionicons name={remaining !== 0 ? 'alert-circle-outline' : 'checkmark-circle-outline'} size={22}
                        color={remaining !== 0 ? colors.danger : colors.textSecondary} />
                      <AppText style={styles.remainingLabel}>{t('expenses.remainingToAssign')}:</AppText>
                      <Amount value={remaining} currency={currency} size={22} fit
                        color={remaining !== 0 ? colors.danger : colors.text} />
                    </View>
                  </View>
                ) : null}
              </ScrollView>
              <View style={styles.pickerDone}>
                <PrimaryButton title={t('common.done')} onPress={() => setActivePicker(null)} />
              </View>
            </>
          ) : null}

          {activePicker === 'date' ? (
            <View style={styles.pickerBody}>
              <DateTimePicker
                value={date}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                maximumDate={new Date()}
                themeVariant={theme}
                onChange={(event, selectedDate) => {
                  if (selectedDate) setDate(selectedDate);
                  if (Platform.OS !== 'ios') setActivePicker(null);
                }}
              />
              {Platform.OS === 'ios' ? (
                <PrimaryButton title={t('common.done')} onPress={() => setActivePicker(null)} />
              ) : null}
            </View>
          ) : null}

          {activePicker === 'category' ? (
            <ScrollView contentContainerStyle={styles.pickerBody}>
              <Group style={{ marginHorizontal: 0 }}>
              {category ? (
                <TouchableOpacity
                  accessibilityRole="button"
                  style={styles.categoryRow}
                  onPress={() => {
                    setCategory('');
                    setActivePicker(null);
                  }}
                >
                  <View style={[styles.categoryIcon, { backgroundColor: colors.background }]}>
                    <Ionicons name="close-circle-outline" size={20} color={colors.textSecondary} />
                  </View>
                  <AppText style={styles.categoryLabel}>{t('expenses.clearCategorySelection')}</AppText>
                </TouchableOpacity>
              ) : null}
              {EXPENSE_CATEGORIES.map((item) => (
                <TouchableOpacity
                  accessibilityRole="radio"
                  accessibilityState={{ selected: category === item.id, checked: category === item.id }}
                  key={item.id}
                  style={styles.categoryRow}
                  onPress={() => {
                    setCategory(item.id);
                    setActivePicker(null);
                  }}
                >
                  <View style={[styles.categoryIcon, { backgroundColor: colors.primaryUltraSoft }]}>
                    <Ionicons name={item.icon as any} size={20} color={colors.primary} />
                  </View>
                  <AppText style={styles.categoryLabel}>{getExpenseCategoryLabel(t, item.id)}</AppText>
                  {category === item.id ? <Ionicons name="checkmark-circle-outline" size={22} color={colors.primary} /> : null}
                </TouchableOpacity>
              ))}
              </Group>
            </ScrollView>
          ) : null}
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>

    {/* Templates Modal */}
    <Modal
      visible={showTemplatesModal}
      animationType={reduceMotion ? 'none' : 'slide'}
      transparent={false}
      onRequestClose={() => setShowTemplatesModal(false)}
    >
      <SanctuaryScreenShell edges={['top', 'bottom']} innerStyle={{ flex: 1 }}>
        <Animated.View
          style={{ flex: 1, transform: [{ translateX: templateModalTranslateX }] }}
          {...templatesModalPanResponder.panHandlers}
        >
          <View style={styles.pickerHeader}>
            <AppText accessibilityRole="header" style={styles.pickerTitle}>{t('expenses.loadTemplate')}</AppText>
            <TouchableOpacity accessibilityRole="button" style={styles.textClose} onPress={dismissTemplatesModal}>
              <AppText style={styles.textCloseLabel}>{t('common.close')}</AppText>
            </TouchableOpacity>
          </View>
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
                <Group key={template._id} style={styles.templateCardContainer}>
                  <TouchableOpacity
                    accessibilityRole="button"
                    style={styles.templateCard}
                    onPress={() => handleLoadTemplate(template)}
                  >
                    <View style={styles.templateCardHeader}>
                      <AppText style={styles.templateCardName}>{template.name}</AppText>
                      {template.category && (
                        <View style={styles.templateCategoryBadge}>
                          <AppText style={styles.templateCategoryText}>{getExpenseCategoryLabel(t, template.category)}</AppText>
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
                        accessibilityRole="button"
                        style={styles.templateActionButton}
                        onPress={() => handleEditTemplate(template)}
                      >
                        <Ionicons name="pencil-outline" size={18} color={colors.primary} />
                        <AppText style={styles.templateActionText}>{t('common.edit')}</AppText>
                      </TouchableOpacity>
                      <TouchableOpacity
                        accessibilityRole="button"
                        style={styles.templateActionButton}
                        onPress={() => handleDeleteTemplate(template)}
                        accessibilityState={{ disabled: deletingTemplateId === template._id, busy: deletingTemplateId === template._id }}
                        disabled={deletingTemplateId === template._id}
                      >
                        <Ionicons name="trash-outline" size={18} color={colors.danger} />
                        <AppText style={[styles.templateActionText, { color: colors.danger }]}>
                          {deletingTemplateId === template._id ? t('expenses.deleting') : t('common.delete')}
                        </AppText>
                      </TouchableOpacity>
                    </View>
                  )}
                </Group>
              );
            })
          )}
          </ScrollView>
        </Animated.View>
      </SanctuaryScreenShell>
    </Modal>

    {/* Save Template Modal */}
    <Modal visible={showSaveTemplateModal} animationType={reduceMotion ? 'none' : 'slide'} transparent
      onRequestClose={closeSaveTemplateModal}>
      <KeyboardAvoidingView style={styles.saveTemplateModalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <Pressable accessibilityRole="button" accessibilityLabel={t('common.close')}
          style={StyleSheet.absoluteFillObject} onPress={closeSaveTemplateModal} />
        <View style={styles.templateFormSheet} accessibilityViewIsModal>
          <View style={styles.pickerHeader}>
            <AppText accessibilityRole="header" style={styles.pickerTitle}>{t('expenses.saveAsTemplate')}</AppText>
            <TouchableOpacity accessibilityRole="button" style={styles.textClose} onPress={closeSaveTemplateModal}>
              <AppText style={styles.textCloseLabel}>{t('common.cancel')}</AppText>
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={styles.templateFormContent} keyboardShouldPersistTaps="handled" keyboardDismissMode="interactive">
            <AppText style={styles.saveTemplateModalDescription}>{t('expenses.saveTemplateDescription')}</AppText>
            <Group><View style={styles.cardPad}>
              <FormTextInput label={t('expenses.templateName')} value={templateName} onChangeText={setTemplateName}
                placeholder={t('expenses.templateNamePlaceholder')} containerStyle={{ marginBottom: 0 }} />
            </View></Group>
          </ScrollView>
          <View style={[styles.footerActions, { paddingBottom: Math.max(insets.bottom, spacing.md) }]}>
            <PrimaryButton title={t('expenses.saveAsTemplate')} onPress={handleSaveTemplate} />
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>

    {/* Edit Template Modal */}
    <Modal visible={showEditTemplateModal} animationType={reduceMotion ? 'none' : 'slide'} transparent
      onRequestClose={closeEditTemplateModal}>
      <KeyboardAvoidingView style={styles.saveTemplateModalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <Pressable accessibilityRole="button" accessibilityLabel={t('common.close')}
          style={StyleSheet.absoluteFillObject} onPress={closeEditTemplateModal} />
        <View style={styles.templateFormSheet} accessibilityViewIsModal>
          <View style={styles.pickerHeader}>
            <AppText accessibilityRole="header" style={styles.pickerTitle}>{t('expenses.editTemplate')}</AppText>
            <TouchableOpacity accessibilityRole="button" style={styles.textClose} onPress={closeEditTemplateModal}>
              <AppText style={styles.textCloseLabel}>{t('common.cancel')}</AppText>
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={styles.templateFormContent} keyboardShouldPersistTaps="handled" keyboardDismissMode="interactive">
            <AppText style={styles.saveTemplateModalDescription}>{t('expenses.updateTemplateDescription')}</AppText>
            <Group><View style={styles.cardPad}>
              <FormTextInput label={t('expenses.templateName')} value={templateName} onChangeText={setTemplateName}
                placeholder={t('expenses.templateNamePlaceholder')} containerStyle={{ marginBottom: 0 }} />
            </View></Group>
          </ScrollView>
          <View style={[styles.footerActions, { paddingBottom: Math.max(insets.bottom, spacing.md) }]}>
            <PrimaryButton title={t('common.update')} onPress={handleUpdateTemplate} />
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
    </SanctuaryScreenShell>
  );
};

