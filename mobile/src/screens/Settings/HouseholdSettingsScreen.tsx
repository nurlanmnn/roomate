import React, { useEffect, useState, useLayoutEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Alert,
  Pressable,
  ActivityIndicator,
  Share,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SanctuaryScreenShell } from '../../components/sanctuary/SanctuaryScreenShell';
import { AppText } from '../../components/AppText';
import { CurrencyPicker } from '../../components/CurrencyPicker';
import { useHousehold } from '../../context/HouseholdContext';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { householdsApi, getOwnerIdString, HouseholdMember } from '../../api/householdsApi';
import { dedupedFetch, getCached, invalidateCache } from '../../utils/queryCache';
import { AddressField } from '../../components/AddressField';
import type { AddressLocation } from '../../api/geoApi';
import { Group, GroupRow, FieldRow, GroupFooter, SectionHeading } from '../../components/ui/Group';
import { ToggleRow } from '../../components/Settings/ToggleRow';
import { MemberRow } from '../../components/Settings/MemberRow';
import * as Clipboard from 'expo-clipboard';
import { useThemeColors, fontSizes, fontWeights, spacing } from '../../theme';

export const HouseholdSettingsScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { selectedHousehold, setSelectedHousehold } = useHousehold();
  const { user } = useAuth();
  const { t } = useLanguage();
  const colors = useThemeColors();
  const styles = React.useMemo(() => createStyles(colors), [colors]);

  const [isOwner, setIsOwner] = useState(false);
  const [editName, setEditName] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [editAddressLocation, setEditAddressLocation] = useState<AddressLocation | null>(null);
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
      setEditAddressLocation(selectedHousehold.addressLocation ?? null);
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
        // An empty string clears the address (undefined would leave the old one in place).
        address: editAddress.trim(),
        addressLocation: editAddress.trim() ? editAddressLocation : null,
      });
      invalidateCache('households:list');
      if (txCountKey) invalidateCache(txCountKey);
      setSelectedHousehold(updated);
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

  const householdDirty =
    isOwner &&
    editName.trim().length > 0 &&
    !!selectedHousehold &&
    (editName.trim() !== selectedHousehold.name ||
      editAddress.trim() !== (selectedHousehold.address || '') ||
      Boolean(editAddressLocation) !== Boolean(selectedHousehold.addressLocation));

  // The header item is only rebuilt when its state changes; rebuilding it on every
  // render (each keystroke) makes the native header lose the item's size.
  const saveRef = React.useRef(handleSaveChanges);
  saveRef.current = handleSaveChanges;
  const hasHousehold = !!selectedHousehold;
  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: isOwner && hasHousehold ? () => (
        <Pressable
          onPress={() => saveRef.current()}
          disabled={!householdDirty || isSaving}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel={t('common.save')}
          accessibilityState={{ disabled: !householdDirty || isSaving, busy: isSaving }}
          style={({ pressed }) => [styles.headerButton, pressed && styles.pressed]}
        >
          {isSaving ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <AppText style={[styles.headerButtonText, { color: householdDirty ? colors.primary : colors.textTertiary }]}>
              {t('common.save')}
            </AppText>
          )}
        </Pressable>
      ) : undefined,
    });
  }, [navigation, t, colors.primary, colors.textTertiary, styles, isOwner, hasHousehold, householdDirty, isSaving]);

  if (!selectedHousehold) {
    return (
      <SanctuaryScreenShell edges={['bottom']} innerStyle={styles.container}>
        <View style={styles.emptyContainer}>
          <AppText style={styles.emptyText}>{t('home.pleaseSelectHousehold')}</AppText>
        </View>
      </SanctuaryScreenShell>
    );
  }

  return (
    <SanctuaryScreenShell edges={['bottom']} innerStyle={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        contentInsetAdjustmentBehavior="automatic"
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Group>
          <FieldRow
            label={t('householdSettingsScreen.householdName')}
            value={isOwner ? editName : selectedHousehold.name}
            onChangeText={setEditName}
            placeholder={t('household.householdName')}
            editable={isOwner}
          />
          <AddressField
            variant="inset"
            label={t('householdSettingsScreen.householdLocation')}
            value={isOwner ? editAddress : selectedHousehold.address || ''}
            location={isOwner ? editAddressLocation : selectedHousehold.addressLocation}
            onChange={(text, location) => {
              setEditAddress(text);
              setEditAddressLocation(location);
            }}
            placeholder={t('address.placeholder')}
            editable={isOwner}
          />
          <CurrencyPicker
            variant="row"
            value={selectedHousehold.currency || 'USD'}
            onChange={handleChangeCurrency}
            disabled={!isOwner || currencyLocked || savingCurrency}
            loading={savingCurrency}
          />
        </Group>
        <GroupFooter>
          {isOwner
            ? currencyLocked
              ? t('currency.sectionHintLocked')
              : t('currency.sectionHintEditable')
            : `${t('householdSettingsScreen.ownerOnlyEdit')} ${currencyLocked ? t('currency.sectionHintLocked') : t('currency.sectionHintMember')}`}
        </GroupFooter>

        <SectionHeading title={t('householdSettingsScreen.sectionInvite')} />
        <Group>
          <View style={styles.inviteRow}>
            <View
              style={styles.inviteCodeColumn}
              accessible
              accessibilityLabel={`${t('householdSettingsScreen.inviteCode')}: ${selectedHousehold.joinCode}`}
            >
              <AppText style={styles.inviteCaption}>{t('householdSettingsScreen.inviteCode')}</AppText>
              <AppText style={styles.inviteCode} selectable>{selectedHousehold.joinCode}</AppText>
            </View>
            <Pressable
              onPress={handleCopyCode}
              accessibilityRole="button"
              accessibilityLabel={t('householdSettingsScreen.copyCode')}
              style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}
            >
              <Ionicons name="copy-outline" size={22} color={colors.primary} />
            </Pressable>
            <Pressable
              onPress={handleShare}
              accessibilityRole="button"
              accessibilityLabel={t('householdSettingsScreen.shareInvite')}
              style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}
            >
              <Ionicons name="share-outline" size={22} color={colors.primary} />
            </Pressable>
          </View>
          {isOwner ? (
            <GroupRow
              titleLines={0}
              destructive
              title={t('householdSettingsScreen.regenerateCode')}
              loading={regenerating}
              onPress={handleRegenerate}
            />
          ) : null}
        </Group>
        <GroupFooter>{t('householdSettingsScreen.inviteHint')}</GroupFooter>

        <SectionHeading title={t('householdSettingsScreen.sectionMembers')} />
        <Group>
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
        </Group>

        <Group style={styles.spacedGroup}>
          <ToggleRow
            icon="notifications-off-outline"
            iconBackgroundColor={colors.primaryUltraSoft}
            iconColor={colors.primary}
            title={t('householdSettingsScreen.muteHouseholdTitle')}
            subtitle={t('householdSettingsScreen.muteHouseholdSubtitle')}
            value={householdMuted}
            onValueChange={handleToggleHouseholdMute}
          />
          <GroupRow
            titleLines={0}
            title={t('householdSettingsScreen.switchHousehold')}
            subtitle={t('householdSettingsScreen.switchHouseholdHint')}
            icon="swap-horizontal-outline"
            onPress={handleSwitchHousehold}
            chevron
          />
        </Group>

        <Group style={styles.spacedGroup}>
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
        </Group>
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
      paddingTop: spacing.md,
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
    headerButton: {
      // The native header already gives the item a 44pt target; extra height pushes the label off centre.
      paddingHorizontal: spacing.xxs,
      alignItems: 'center',
      justifyContent: 'center',
    },
    headerButtonText: {
      fontSize: fontSizes.md,
      fontWeight: fontWeights.semibold,
    },
    inviteRow: {
      minHeight: 60,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      flexDirection: 'row',
      alignItems: 'center',
    },
    inviteCodeColumn: {
      flex: 1,
      minWidth: 0,
    },
    inviteCaption: {
      fontSize: fontSizes.sm - 1,
      color: colors.textSecondary,
    },
    inviteCode: {
      fontSize: fontSizes.xl,
      fontWeight: fontWeights.bold,
      letterSpacing: 2,
      fontVariant: ['tabular-nums'],
      color: colors.text,
    },
    iconButton: {
      width: 44,
      height: 44,
      alignItems: 'center',
      justifyContent: 'center',
    },
    spacedGroup: {
      marginTop: spacing.xl,
    },
    pressed: {
      opacity: 0.6,
    },
  });
