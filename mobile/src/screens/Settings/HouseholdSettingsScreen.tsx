import React, { useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Alert,
  TextInput,
  ActivityIndicator,
  Share,
  Platform,
} from 'react-native';
import { SanctuaryScreenShell } from '../../components/sanctuary/SanctuaryScreenShell';
import { AppText } from '../../components/AppText';
import { PrimaryButton } from '../../components/PrimaryButton';
import { CurrencyPicker } from '../../components/CurrencyPicker';
import { useHousehold } from '../../context/HouseholdContext';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { householdsApi, getOwnerIdString, HouseholdMember } from '../../api/householdsApi';
import { dedupedFetch, getCached, invalidateCache } from '../../utils/queryCache';
import { GroupRow } from '../../components/ui/Group';
import { SettingsSection } from '../../components/Settings/SettingsSection';
import { SettingsGroupCard } from '../../components/Settings/SettingsGroupCard';
import { ToggleRow } from '../../components/Settings/ToggleRow';
import { MemberRow } from '../../components/Settings/MemberRow';
import * as Clipboard from 'expo-clipboard';
import { useThemeColors, fontSizes, fontWeights, spacing, radii } from '../../theme';

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
  // Per-household mute is the v1.5 escape hatch for users who want a quiet
  // account from one specific household without disabling notifications globally.
  const [householdMuted, setHouseholdMuted] = useState(false);
  const [savingMute, setSavingMute] = useState(false);
  const txCountKey = selectedHousehold?._id
    ? `household:${selectedHousehold._id}:transaction-count`
    : null;

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
      const muted =
        !!user?._id &&
        (selectedHousehold.notificationMutedBy ?? []).some((id) => id === user._id);
      setHouseholdMuted(muted);
    }
  }, [selectedHousehold, user?._id]);

  const handleToggleHouseholdMute = async (next: boolean) => {
    if (!selectedHousehold) return;
    const previous = householdMuted;
    setHouseholdMuted(next);
    setSavingMute(true);
    try {
      await householdsApi.setHouseholdNotificationMute(selectedHousehold._id, next);
      // Reflect the change in cache + selected household so re-entering the
      // screen doesn't read a stale `notificationMutedBy` value.
      const updatedMuted = next
        ? Array.from(new Set([...(selectedHousehold.notificationMutedBy ?? []), user!._id]))
        : (selectedHousehold.notificationMutedBy ?? []).filter((id) => id !== user?._id);
      setSelectedHousehold({ ...selectedHousehold, notificationMutedBy: updatedMuted });
      invalidateCache('households:list');
    } catch (error: unknown) {
      setHouseholdMuted(previous);
      const err = error as { response?: { data?: { error?: string } } };
      Alert.alert(
        t('common.error'),
        err.response?.data?.error || t('householdSettingsScreen.muteHouseholdError')
      );
    } finally {
      setSavingMute(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    if (!selectedHousehold?._id) {
      setTxCount(null);
      return;
    }
    const cached = getCached<{ expenseCount: number; settlementCount: number }>(
      `household:${selectedHousehold._id}:transaction-count`
    );
    if (cached) {
      setTxCount(cached);
    } else {
      setTxCount(null);
    }
    dedupedFetch(
      `household:${selectedHousehold._id}:transaction-count`,
      () => householdsApi.getTransactionCount(selectedHousehold._id)
    )
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
              invalidateCache('households:list');
              if (txCountKey) invalidateCache(txCountKey);
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
      invalidateCache('households:list');
      if (txCountKey) invalidateCache(txCountKey);
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
        message: String(
          t('householdSettingsScreen.shareMessage', { code: selectedHousehold.joinCode })
        ),
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
            invalidateCache('households:list');
            invalidateCache(`home:dashboard:${selectedHousehold._id}`);
            invalidateCache(`expenses:${selectedHousehold._id}`);
            invalidateCache(`calendar:${selectedHousehold._id}`);
            invalidateCache(`shopping:lists:${selectedHousehold._id}`);
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
              invalidateCache('households:list');
              invalidateCache(`home:dashboard:${selectedHousehold._id}`);
              invalidateCache(`expenses:${selectedHousehold._id}`);
              invalidateCache(`calendar:${selectedHousehold._id}`);
              invalidateCache(`shopping:lists:${selectedHousehold._id}`);
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
      <SanctuaryScreenShell edges={['bottom']} innerStyle={styles.container}>
        <View style={styles.emptyContainer}>
          <AppText style={styles.emptyText}>{t('home.pleaseSelectHousehold')}</AppText>
        </View>
      </SanctuaryScreenShell>
    );
  }

  const householdDirty =
    isEditing &&
    isOwner &&
    (editName.trim() !== selectedHousehold.name ||
      (editAddress.trim() || '') !== (selectedHousehold.address || ''));

  return (
    <SanctuaryScreenShell edges={['bottom']} innerStyle={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        contentInsetAdjustmentBehavior="automatic"
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <SettingsSection title={t('householdSettingsScreen.sectionHousehold')}>
          <SettingsGroupCard>
            {isOwner && isEditing ? (
              <View style={styles.padded}>
                <AppText style={styles.inputLabel}>{t('householdSettingsScreen.householdName')}</AppText>
                <TextInput
                  style={styles.textInput}
                  value={editName}
                  onChangeText={setEditName}
                  accessibilityLabel={t('householdSettingsScreen.householdName')}
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
                  accessibilityLabel={t('householdSettingsScreen.householdLocation')}
                  placeholder={t('household.householdLocation')}
                  placeholderTextColor={colors.textTertiary}
                />
                <View style={styles.editRow}>
                  <PrimaryButton
                    title={t('common.cancel')}
                    variant="secondary"
                    style={styles.editButton}
                    disabled={isSaving}
                    onPress={() => {
                      setIsEditing(false);
                      setEditName(selectedHousehold.name);
                      setEditAddress(selectedHousehold.address || '');
                    }}
                  />
                  <PrimaryButton
                    title={t('common.save')}
                    style={styles.editButton}
                    onPress={handleSaveChanges}
                    disabled={!householdDirty || isSaving}
                    loading={isSaving}
                  />
                </View>
              </View>
            ) : [
                <GroupRow
                  titleLines={0}
                  key="name"
                  title={t('householdSettingsScreen.householdName')}
                  subtitle={selectedHousehold.name}
                />,
                <GroupRow
                  titleLines={0}
                  key="location"
                  title={t('householdSettingsScreen.householdLocation')}
                  subtitle={selectedHousehold.address || '—'}
                />,
                isOwner ? (
                  <GroupRow
                    titleLines={0}
                    key="edit"
                    title={t('common.edit')}
                    icon="create-outline"
                    onPress={() => setIsEditing(true)}
                    chevron
                  />
                ) : (
                  <GroupRow key="readOnly" titleLines={0} title={t('householdSettingsScreen.ownerOnlyEdit')} />
                ),
            ]}
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
                <View style={styles.currencySaving} accessibilityLiveRegion="polite">
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
            <GroupRow
              titleLines={0}
              title={selectedHousehold.joinCode}
              accessibilityLabel={`${t('householdSettingsScreen.sectionInvite')}: ${selectedHousehold.joinCode}`}
            />
            <GroupRow
              titleLines={0}
              title={t('householdSettingsScreen.shareInvite')}
              icon="share-outline"
              onPress={handleShare}
            />
            <GroupRow
              titleLines={0}
              title={t('householdSettingsScreen.copyCode')}
              icon="copy-outline"
              onPress={handleCopyCode}
            />
            {isOwner ? (
              <GroupRow
                titleLines={0}
                title={t('householdSettingsScreen.regenerateCode')}
                destructive
                trailing={regenerating ? <ActivityIndicator size="small" color={colors.danger} /> : undefined}
                onPress={regenerating ? undefined : handleRegenerate}
              />
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

        <SettingsSection title={t('householdSettingsScreen.sectionNotifications')}>
          <AppText style={styles.sectionHint}>
            {t('householdSettingsScreen.muteHouseholdHint')}
          </AppText>
          <SettingsGroupCard>
            <ToggleRow
              icon="notifications-off-outline"
              iconBackgroundColor={colors.primaryUltraSoft}
              iconColor={colors.primary}
              title={t('householdSettingsScreen.muteHouseholdTitle')}
              subtitle={t('householdSettingsScreen.muteHouseholdSubtitle')}
              value={householdMuted}
              onValueChange={handleToggleHouseholdMute}
              isLast
            />
            {savingMute ? (
              <View style={styles.savingRow} accessibilityLiveRegion="polite">
                <ActivityIndicator size="small" color={colors.primary} />
                <AppText style={styles.currencySavingText}>{t('common.saving')}</AppText>
              </View>
            ) : null}
          </SettingsGroupCard>
        </SettingsSection>

        <SettingsSection title={t('householdSettingsScreen.sectionActions')}>
          <SettingsGroupCard>
            <GroupRow
              titleLines={0}
              title={t('householdSettingsScreen.switchHousehold')}
              subtitle={t('householdSettingsScreen.switchHouseholdHint')}
              icon="swap-horizontal-outline"
              onPress={handleSwitchHousehold}
              chevron
            />
            {!isOwner ? (
              <GroupRow
                titleLines={0}
                title={t('householdSettingsScreen.leaveHousehold')}
                subtitle={t('householdSettingsScreen.leaveHouseholdHint')}
                onPress={handleLeaveHousehold}
                destructive
              />
            ) : [
                memberCount > 1 ? (
                  <GroupRow
                    titleLines={0}
                    key="leave"
                    title={t('householdSettingsScreen.leaveHousehold')}
                    subtitle={t('householdSettingsScreen.leaveOwnerHint')}
                    onPress={handleLeaveHousehold}
                    destructive
                  />
                ) : null,
                <GroupRow
                  titleLines={0}
                  key="delete"
                  title={t('householdSettingsScreen.deleteHousehold')}
                  subtitle={t('householdSettingsScreen.deleteHouseholdHint')}
                  onPress={handleDeleteHousehold}
                  destructive
                />,
            ]}
          </SettingsGroupCard>
        </SettingsSection>
      </ScrollView>
    </SanctuaryScreenShell>
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
      paddingHorizontal: spacing.lg,
      marginBottom: spacing.sm,
      lineHeight: 20,
    },
    padded: {
      padding: spacing.md,
    },
    inputLabel: {
      fontSize: fontSizes.sm,
      fontWeight: fontWeights.semibold,
      color: colors.textSecondary,
      marginBottom: spacing.xs,
    },
    inputLabelSpaced: {
      marginTop: spacing.md,
    },
    textInput: {
      minHeight: 50,
      backgroundColor: colors.surface,
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
      flexWrap: 'wrap',
      gap: spacing.sm,
      marginTop: spacing.lg,
    },
    editButton: {
      flex: 1,
      minWidth: 120,
    },
    currencySaving: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
      marginTop: spacing.sm,
    },
    currencySavingText: {
      fontSize: fontSizes.sm,
      color: colors.textSecondary,
      flexShrink: 1,
    },
    savingRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
      padding: spacing.md,
    },
  });
