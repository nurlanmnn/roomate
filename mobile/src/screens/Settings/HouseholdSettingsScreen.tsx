import React, { useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  TextInput,
  ActivityIndicator,
  Share,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { AppText } from '../../components/AppText';
import { PrimaryButton } from '../../components/PrimaryButton';
import { CurrencyPicker } from '../../components/CurrencyPicker';
import { useHousehold } from '../../context/HouseholdContext';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { householdsApi, getOwnerIdString, HouseholdMember } from '../../api/householdsApi';
import { ScreenHeader } from '../../components/ui/ScreenHeader';
import { SettingsSection } from '../../components/Settings/SettingsSection';
import { SettingsGroupCard } from '../../components/Settings/SettingsGroupCard';
import { MemberRow } from '../../components/Settings/MemberRow';
import * as Clipboard from 'expo-clipboard';
import { useThemeColors, fontSizes, fontWeights, spacing, radii, shadows } from '../../theme';

export const HouseholdSettingsScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { selectedHousehold, setSelectedHousehold } = useHousehold();
  const { user } = useAuth();
  const { t } = useLanguage();
  const colors = useThemeColors();
  const styles = React.useMemo(() => createStyles(colors), [colors]);

  const [isOwner, setIsOwner] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [removingMemberId, setRemovingMemberId] = useState<string | null>(null);
  const [regenerating, setRegenerating] = useState(false);
  // Currency is locked as soon as this household has any expense or settlement.
  // `null` means "still loading"; we hide the action affordance until we know.
  const [txCount, setTxCount] = useState<{ expenseCount: number; settlementCount: number } | null>(
    null
  );
  const [savingCurrency, setSavingCurrency] = useState(false);

  useEffect(() => {
    if (selectedHousehold && user) {
      const ownerIdStr = getOwnerIdString(selectedHousehold);
      setIsOwner(ownerIdStr === user._id);
    }
  }, [selectedHousehold, user]);

  useEffect(() => {
    if (selectedHousehold) {
      setEditName(selectedHousehold.name);
      setEditAddress(selectedHousehold.address || '');
    }
  }, [selectedHousehold]);

  useEffect(() => {
    let cancelled = false;
    if (!selectedHousehold?._id) {
      setTxCount(null);
      return;
    }
    setTxCount(null);
    householdsApi
      .getTransactionCount(selectedHousehold._id)
      .then((res) => {
        if (!cancelled) setTxCount(res);
      })
      .catch(() => {
        // On failure we treat the currency as locked — safer than silently
        // relabeling data if something fishy is happening.
        if (!cancelled) setTxCount({ expenseCount: 1, settlementCount: 0 });
      });
    return () => {
      cancelled = true;
    };
  }, [selectedHousehold?._id]);

  const currencyLocked =
    !txCount ? true : txCount.expenseCount > 0 || txCount.settlementCount > 0;

  const handleChangeCurrency = (newCode: string) => {
    if (!selectedHousehold || !isOwner) return;
    if (newCode === selectedHousehold.currency) return;
    if (currencyLocked) return;

    Alert.alert(
      t('currency.changeConfirmTitle'),
      t('currency.changeConfirmBody', { code: newCode }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.confirm'),
          onPress: async () => {
            try {
              setSavingCurrency(true);
              const updated = await householdsApi.updateHousehold(selectedHousehold._id, {
                currency: newCode,
              });
              setSelectedHousehold(updated);
            } catch (error: unknown) {
              const err = error as {
                response?: { status?: number; data?: { error?: string; code?: string } };
              };
              if (err.response?.status === 409 || err.response?.data?.code === 'CURRENCY_LOCKED') {
                // Server says it's locked now — re-fetch the count so our UI reflects reality.
                setTxCount({ expenseCount: 1, settlementCount: 0 });
                Alert.alert(t('currency.lockedTitle'), t('currency.lockedBody'));
              } else {
                Alert.alert(
                  t('common.error'),
                  err.response?.data?.error || t('alerts.somethingWentWrong')
                );
              }
            } finally {
              setSavingCurrency(false);
            }
          },
        },
      ]
    );
  };

  const memberCount = selectedHousehold?.members.length ?? 0;
  const ownerIdStr = selectedHousehold ? getOwnerIdString(selectedHousehold) : '';

  const handleSaveChanges = async () => {
    if (!selectedHousehold || !editName.trim()) {
      Alert.alert(t('common.error'), t('household.householdName'));
      return;
    }
    setIsSaving(true);
    try {
      const updated = await householdsApi.updateHousehold(selectedHousehold._id, {
        name: editName.trim(),
        address: editAddress.trim() || undefined,
      });
      setSelectedHousehold(updated);
      setIsEditing(false);
      Alert.alert(t('common.success'), t('accountSettingsScreen.profileUpdated'));
    } catch (error: unknown) {
      const err = error as { response?: { data?: { error?: string } } };
      Alert.alert(t('common.error'), err.response?.data?.error || t('alerts.somethingWentWrong'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleCopyCode = async () => {
    if (!selectedHousehold) return;
    await Clipboard.setStringAsync(selectedHousehold.joinCode);
    Alert.alert(t('common.copied'), t('householdSettingsScreen.codeCopied'));
  };

  const handleShare = async () => {
    if (!selectedHousehold) return;
    try {
      await Share.share({
        message: t('householdSettingsScreen.shareMessage', { code: selectedHousehold.joinCode }),
        title: selectedHousehold.name,
      });
    } catch {
      /* dismissed */
    }
  };

  const handleRegenerate = () => {
    if (!selectedHousehold || !isOwner) return;
    Alert.alert(
      t('householdSettingsScreen.regenerateConfirmTitle'),
      t('householdSettingsScreen.regenerateConfirmBody'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('householdSettingsScreen.regenerateCode'),
          style: 'destructive',
          onPress: async () => {
            try {
              setRegenerating(true);
              const updated = await householdsApi.regenerateInviteCode(selectedHousehold._id);
              setSelectedHousehold(updated);
            } catch (error: unknown) {
              const err = error as { response?: { data?: { error?: string } } };
              Alert.alert(
                t('common.error'),
                err.response?.data?.error || t('householdSettingsScreen.failedToRegenerate')
              );
            } finally {
              setRegenerating(false);
            }
          },
        },
      ]
    );
  };

  const handleSwitchHousehold = () => {
    setSelectedHousehold(null);
    navigation.reset({
      index: 0,
      routes: [{ name: 'HouseholdSelect' }],
    });
  };

  const handleLeaveHousehold = async () => {
    if (!selectedHousehold) return;
    let message = t('householdSettingsScreen.leaveConfirm');
    if (isOwner) {
      if (memberCount === 1) {
        message = t('householdSettingsScreen.leaveConfirm');
      } else {
        const nextOwner = selectedHousehold.members.find((m) => m._id !== user?._id);
        message = `${t('householdSettingsScreen.leaveOwnerHint')} ${nextOwner?.name || ''}`;
      }
    }

    Alert.alert(t('householdSettingsScreen.leaveHousehold'), message, [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('householdSettingsScreen.leaveHousehold'),
        style: 'destructive',
        onPress: async () => {
          try {
            await householdsApi.leaveHousehold(selectedHousehold._id);
            setSelectedHousehold(null);
            navigation.reset({
              index: 0,
              routes: [{ name: 'HouseholdSelect' }],
            });
          } catch (error: unknown) {
            const err = error as { response?: { data?: { error?: string } } };
            Alert.alert(t('common.error'), err.response?.data?.error || t('householdSettingsScreen.failedToLeave'));
          }
        },
      },
    ]);
  };

  const handleDeleteHousehold = async () => {
    if (!selectedHousehold) return;
    Alert.alert(
      t('householdSettingsScreen.deleteHousehold'),
      t('householdSettingsScreen.deleteConfirm'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: async () => {
            try {
              await householdsApi.deleteHousehold(selectedHousehold._id);
              setSelectedHousehold(null);
              navigation.reset({
                index: 0,
                routes: [{ name: 'HouseholdSelect' }],
              });
              Alert.alert(t('common.deleted'), t('householdSettingsScreen.deleted'));
            } catch (error: unknown) {
              const err = error as { response?: { data?: { error?: string } } };
              Alert.alert(t('common.error'), err.response?.data?.error || t('householdSettingsScreen.failedToDelete'));
            }
          },
        },
      ]
    );
  };

  const handleRemoveMember = (memberId: string, memberName: string) => {
    if (!selectedHousehold) return;
    Alert.alert(
      t('householdSettingsScreen.removeMember'),
      t('householdSettingsScreen.removeConfirm', { name: memberName }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('householdSettingsScreen.removeMember'),
          style: 'destructive',
          onPress: async () => {
            try {
              setRemovingMemberId(memberId);
              const updated = await householdsApi.removeMember(selectedHousehold._id, memberId);
              setSelectedHousehold(updated);
              if (user && user._id === memberId) {
                setSelectedHousehold(null);
                navigation.reset({ index: 0, routes: [{ name: 'HouseholdSelect' }] });
              }
            } catch (error: unknown) {
              const err = error as { response?: { data?: { error?: string } } };
              Alert.alert(t('common.error'), err.response?.data?.error || t('householdSettingsScreen.failedToRemoveMember'));
            } finally {
              setRemovingMemberId(null);
            }
          },
        },
      ]
    );
  };

  const roleForMember = (m: HouseholdMember): 'owner' | 'member' => {
    return m._id === ownerIdStr ? 'owner' : 'member';
  };

  if (!selectedHousehold) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <View style={styles.emptyContainer}>
          <AppText style={styles.emptyText}>{t('home.pleaseSelectHousehold')}</AppText>
        </View>
      </SafeAreaView>
    );
  }

  const householdDirty =
    isEditing &&
    isOwner &&
    (editName.trim() !== selectedHousehold.name ||
      (editAddress.trim() || '') !== (selectedHousehold.address || ''));

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <ScreenHeader title={t('householdSettingsScreen.title')} subtitle={selectedHousehold.name} />

        <SettingsSection title={t('householdSettingsScreen.sectionHousehold')}>
          <SettingsGroupCard>
            {isOwner && isEditing ? (
              <View style={styles.padded}>
                <AppText style={styles.inputLabel}>{t('householdSettingsScreen.householdName')}</AppText>
                <TextInput
                  style={styles.textInput}
                  value={editName}
                  onChangeText={setEditName}
                  placeholder={t('household.householdName')}
                  placeholderTextColor={colors.textTertiary}
                />
                <AppText style={[styles.inputLabel, styles.inputLabelSpaced]}>
                  {t('householdSettingsScreen.householdLocation')}
                </AppText>
                <TextInput
                  style={styles.textInput}
                  value={editAddress}
                  onChangeText={setEditAddress}
                  placeholder={t('household.householdLocation')}
                  placeholderTextColor={colors.textTertiary}
                />
                <View style={styles.editRow}>
                  <TouchableOpacity
                    style={[styles.chipButton, styles.chipCancel]}
                    onPress={() => {
                      setIsEditing(false);
                      setEditName(selectedHousehold.name);
                      setEditAddress(selectedHousehold.address || '');
                    }}
                    disabled={isSaving}
                  >
                    <AppText style={styles.chipCancelText}>{t('common.cancel')}</AppText>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.chipButton, styles.chipSave, (!householdDirty || isSaving) && styles.chipDisabled]}
                    onPress={handleSaveChanges}
                    disabled={!householdDirty || isSaving}
                  >
                    {isSaving ? (
                      <ActivityIndicator color="#FFFFFF" />
                    ) : (
                      <AppText style={styles.chipSaveText}>{t('common.save')}</AppText>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <View style={styles.padded}>
                <View style={styles.displayRow}>
                  <AppText style={styles.displayLabel}>{t('householdSettingsScreen.householdName')}</AppText>
                  <AppText style={styles.displayValue}>{selectedHousehold.name}</AppText>
                </View>
                <View style={styles.displayRow}>
                  <AppText style={styles.displayLabel}>{t('householdSettingsScreen.householdLocation')}</AppText>
                  <AppText style={styles.displayValue}>
                    {selectedHousehold.address || '—'}
                  </AppText>
                </View>
                {isOwner ? (
                  <TouchableOpacity style={styles.editLink} onPress={() => setIsEditing(true)} activeOpacity={0.7}>
                    <Ionicons name="create-outline" size={18} color={colors.primary} />
                    <AppText style={styles.editLinkText}>{t('common.edit')}</AppText>
                  </TouchableOpacity>
                ) : (
                  <AppText style={styles.readOnlyNote}>{t('householdSettingsScreen.ownerOnlyEdit')}</AppText>
                )}
              </View>
            )}
          </SettingsGroupCard>
        </SettingsSection>

        <SettingsSection title={t('currency.sectionTitle')}>
          <AppText style={styles.sectionHint}>
            {currencyLocked
              ? t('currency.sectionHintLocked')
              : isOwner
              ? t('currency.sectionHintEditable')
              : t('currency.sectionHintMember')}
          </AppText>
          <SettingsGroupCard>
            <View style={styles.padded}>
              <CurrencyPicker
                value={selectedHousehold.currency || 'USD'}
                onChange={handleChangeCurrency}
                disabled={!isOwner || currencyLocked || savingCurrency}
                lockedHint={
                  currencyLocked && isOwner ? t('currency.lockedInlineHint') : undefined
                }
              />
              {savingCurrency ? (
                <View style={styles.currencySaving}>
                  <ActivityIndicator size="small" color={colors.primary} />
                  <AppText style={styles.currencySavingText}>{t('common.saving')}</AppText>
                </View>
              ) : null}
            </View>
          </SettingsGroupCard>
        </SettingsSection>

        <SettingsSection title={t('householdSettingsScreen.sectionInvite')}>
          <AppText style={styles.sectionHint}>{t('householdSettingsScreen.inviteHint')}</AppText>
          <SettingsGroupCard>
            <View style={styles.inviteRow}>
              <View style={styles.codeBadge}>
                <AppText style={styles.codeBadgeText}>{selectedHousehold.joinCode}</AppText>
              </View>
              <TouchableOpacity onPress={handleCopyCode} style={styles.iconBtn} hitSlop={10}>
                <Ionicons name="copy-outline" size={22} color={colors.primary} />
              </TouchableOpacity>
            </View>
            <View style={styles.inviteActions}>
              <View style={styles.inviteActionHalf}>
                <PrimaryButton title={t('householdSettingsScreen.shareInvite')} onPress={handleShare} variant="secondary" />
              </View>
              <View style={styles.inviteActionHalf}>
                <PrimaryButton title={t('householdSettingsScreen.copyCode')} onPress={handleCopyCode} variant="outline" />
              </View>
            </View>
            {isOwner ? (
              <View style={styles.regenWrap}>
                <TouchableOpacity
                  style={[styles.regenButton, regenerating && styles.chipDisabled]}
                  onPress={handleRegenerate}
                  disabled={regenerating}
                  activeOpacity={0.7}
                >
                  {regenerating ? (
                    <ActivityIndicator size="small" color={colors.danger} />
                  ) : (
                    <>
                      <Ionicons name="refresh-outline" size={18} color={colors.danger} />
                      <AppText style={styles.regenText}>{t('householdSettingsScreen.regenerateCode')}</AppText>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            ) : null}
          </SettingsGroupCard>
        </SettingsSection>

        <SettingsSection title={t('householdSettingsScreen.sectionMembers')}>
          <SettingsGroupCard>
            {selectedHousehold.members.map((m, index) => {
              const role = roleForMember(m);
              const canRemove = isOwner && role === 'member';
              return (
                <MemberRow
                  key={m._id}
                  name={m.name}
                  email={m.email}
                  avatarUrl={m.avatarUrl}
                  role={role}
                  roleLabel={role === 'owner' ? t('householdSettingsScreen.owner') : t('householdSettingsScreen.member')}
                  showRemove={canRemove}
                  removing={removingMemberId === m._id}
                  onRemove={canRemove ? () => handleRemoveMember(m._id, m.name) : undefined}
                  isLast={index === selectedHousehold.members.length - 1}
                />
              );
            })}
          </SettingsGroupCard>
        </SettingsSection>

        <SettingsSection title={t('householdSettingsScreen.sectionActions')}>
          <TouchableOpacity style={styles.switchRow} onPress={handleSwitchHousehold} activeOpacity={0.7}>
            <View style={styles.switchRowLeft}>
              <Ionicons name="swap-horizontal-outline" size={22} color={colors.textSecondary} />
              <View style={styles.switchRowText}>
                <AppText style={styles.switchTitle}>{t('householdSettingsScreen.switchHousehold')}</AppText>
                <AppText style={styles.switchHint}>{t('householdSettingsScreen.switchHouseholdHint')}</AppText>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.textTertiary} />
          </TouchableOpacity>

          <View style={styles.actionSpacer} />

          {!isOwner ? (
            <TouchableOpacity style={styles.leaveOutline} onPress={handleLeaveHousehold} activeOpacity={0.8}>
              <AppText style={styles.leaveOutlineText}>{t('householdSettingsScreen.leaveHousehold')}</AppText>
              <AppText style={styles.leaveOutlineHint}>{t('householdSettingsScreen.leaveHouseholdHint')}</AppText>
            </TouchableOpacity>
          ) : (
            <>
              {memberCount > 1 ? (
                <TouchableOpacity style={styles.leaveOutline} onPress={handleLeaveHousehold} activeOpacity={0.8}>
                  <AppText style={styles.leaveOutlineText}>{t('householdSettingsScreen.leaveHousehold')}</AppText>
                  <AppText style={styles.leaveOutlineHint}>{t('householdSettingsScreen.leaveOwnerHint')}</AppText>
                </TouchableOpacity>
              ) : null}
              <View style={styles.actionSpacer} />
              <PrimaryButton
                title={t('householdSettingsScreen.deleteHousehold')}
                onPress={handleDeleteHousehold}
                variant="danger"
              />
              <AppText style={styles.deleteHint}>{t('householdSettingsScreen.deleteHouseholdHint')}</AppText>
            </>
          )}
        </SettingsSection>

        <View style={styles.bottomPad} />
      </ScrollView>
    </SafeAreaView>
  );
};

const createStyles = (colors: ReturnType<typeof useThemeColors>) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    scrollView: { flex: 1 },
    scrollContent: {
      paddingBottom: spacing.xxl,
    },
    emptyContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: spacing.xl,
    },
    emptyText: {
      fontSize: fontSizes.lg,
      color: colors.textSecondary,
    },
    sectionHint: {
      fontSize: fontSizes.sm,
      color: colors.textSecondary,
      marginBottom: spacing.sm,
      lineHeight: 20,
    },
    padded: {
      padding: spacing.md,
    },
    inputLabel: {
      fontSize: fontSizes.xs,
      fontWeight: fontWeights.semibold,
      color: colors.textSecondary,
      marginBottom: spacing.xs,
    },
    inputLabelSpaced: {
      marginTop: spacing.md,
    },
    textInput: {
      backgroundColor: colors.background,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radii.md,
      paddingHorizontal: spacing.md,
      paddingVertical: Platform.OS === 'ios' ? spacing.sm : spacing.xs,
      fontSize: fontSizes.md,
      color: colors.text,
    },
    editRow: {
      flexDirection: 'row',
      gap: spacing.sm,
      marginTop: spacing.lg,
    },
    chipButton: {
      flex: 1,
      paddingVertical: spacing.md,
      borderRadius: radii.md,
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 48,
    },
    chipCancel: {
      backgroundColor: colors.background,
      borderWidth: 1,
      borderColor: colors.border,
    },
    chipCancelText: {
      fontSize: fontSizes.md,
      fontWeight: fontWeights.semibold,
      color: colors.textSecondary,
    },
    chipSave: {
      backgroundColor: colors.primary,
    },
    chipSaveText: {
      fontSize: fontSizes.md,
      fontWeight: fontWeights.semibold,
      color: '#FFFFFF',
    },
    chipDisabled: {
      opacity: 0.5,
    },
    displayRow: {
      paddingVertical: spacing.sm,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.borderLight,
    },
    displayLabel: {
      fontSize: fontSizes.xs,
      fontWeight: fontWeights.semibold,
      color: colors.textTertiary,
      marginBottom: 4,
    },
    displayValue: {
      fontSize: fontSizes.md,
      fontWeight: fontWeights.semibold,
      color: colors.text,
    },
    editLink: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
      marginTop: spacing.md,
      alignSelf: 'flex-start',
    },
    editLinkText: {
      fontSize: fontSizes.sm,
      fontWeight: fontWeights.semibold,
      color: colors.primary,
    },
    readOnlyNote: {
      fontSize: fontSizes.sm,
      color: colors.textTertiary,
      marginTop: spacing.md,
    },
    currencySaving: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
      marginTop: spacing.sm,
    },
    currencySavingText: {
      fontSize: fontSizes.xs,
      color: colors.textSecondary,
    },
    inviteRow: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: spacing.md,
      gap: spacing.md,
    },
    codeBadge: {
      flex: 1,
      backgroundColor: colors.background,
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.md,
      borderRadius: radii.md,
      borderWidth: 1,
      borderColor: colors.borderLight,
    },
    codeBadgeText: {
      fontSize: fontSizes.xl,
      fontWeight: fontWeights.bold,
      letterSpacing: 4,
      color: colors.text,
      fontVariant: ['tabular-nums'],
    },
    iconBtn: {
      padding: spacing.sm,
    },
    inviteActions: {
      flexDirection: 'row',
      gap: spacing.sm,
      paddingHorizontal: spacing.md,
      paddingBottom: spacing.md,
    },
    inviteActionHalf: {
      flex: 1,
    },
    regenWrap: {
      paddingHorizontal: spacing.md,
      paddingBottom: spacing.md,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.borderLight,
    },
    regenButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.sm,
      paddingVertical: spacing.sm,
    },
    regenText: {
      fontSize: fontSizes.sm,
      fontWeight: fontWeights.semibold,
      color: colors.danger,
    },
    switchRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.md,
      backgroundColor: colors.surface,
      borderRadius: radii.lg,
      borderWidth: 1,
      borderColor: colors.borderLight,
      ...(shadows.sm as object),
    },
    switchRowLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      flex: 1,
    },
    switchRowText: {
      flex: 1,
    },
    switchTitle: {
      fontSize: fontSizes.md,
      fontWeight: fontWeights.semibold,
      color: colors.text,
    },
    switchHint: {
      fontSize: fontSizes.sm,
      color: colors.textSecondary,
      marginTop: 2,
    },
    actionSpacer: {
      height: spacing.md,
    },
    leaveOutline: {
      padding: spacing.lg,
      borderRadius: radii.lg,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
    },
    leaveOutlineText: {
      fontSize: fontSizes.md,
      fontWeight: fontWeights.semibold,
      color: colors.text,
      marginBottom: spacing.xs,
    },
    leaveOutlineHint: {
      fontSize: fontSizes.sm,
      color: colors.textSecondary,
      lineHeight: 18,
    },
    deleteHint: {
      fontSize: fontSizes.sm,
      color: colors.textSecondary,
      marginTop: spacing.sm,
      lineHeight: 18,
    },
    bottomPad: {
      height: spacing.xl,
    },
  });
