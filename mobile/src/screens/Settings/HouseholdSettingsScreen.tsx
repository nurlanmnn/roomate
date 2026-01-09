import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Alert, TextInput, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppText } from '../../components/AppText';
import { PrimaryButton } from '../../components/PrimaryButton';
import { useHousehold } from '../../context/HouseholdContext';
import { useAuth } from '../../context/AuthContext';
import { householdsApi, getOwnerIdString } from '../../api/householdsApi';
import { Avatar } from '../../components/ui/Avatar';
import { ScreenHeader } from '../../components/ui/ScreenHeader';
import * as Clipboard from 'expo-clipboard';
import * as Sharing from 'expo-sharing';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors, fontSizes, fontWeights, spacing, radii, shadows } from '../../theme';

export const HouseholdSettingsScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { selectedHousehold, setSelectedHousehold } = useHousehold();
  const { user } = useAuth();
  const colors = useThemeColors();
  const styles = React.useMemo(() => createStyles(colors), [colors]);
  const [isOwner, setIsOwner] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [removingMemberId, setRemovingMemberId] = useState<string | null>(null);

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

  const handleStartEditing = () => {
    if (selectedHousehold) {
      setEditName(selectedHousehold.name);
      setEditAddress(selectedHousehold.address || '');
      setIsEditing(true);
    }
  };

  const handleCancelEditing = () => {
    setIsEditing(false);
    if (selectedHousehold) {
      setEditName(selectedHousehold.name);
      setEditAddress(selectedHousehold.address || '');
    }
  };

  const handleSaveChanges = async () => {
    if (!selectedHousehold || !editName.trim()) {
      Alert.alert('Error', 'Household name is required');
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
      Alert.alert('Success', 'Household updated successfully');
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.error || 'Failed to update household');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCopyCode = async () => {
    if (selectedHousehold) {
      await Clipboard.setStringAsync(selectedHousehold.joinCode);
      Alert.alert('Copied', 'Join code copied to clipboard');
    }
  };

  const handleShareCode = async () => {
    if (!selectedHousehold) return;

    const message = `Join my household "${selectedHousehold.name}" using code: ${selectedHousehold.joinCode}`;

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

  const handleSwitchHousehold = () => {
    // Clear selection first so the MainTabs guard can't bounce us back into tabs
    setSelectedHousehold(null);
    // Reset stack to the household picker (more reliable than getParent().navigate)
    navigation.reset({
      index: 0,
      routes: [{ name: 'HouseholdSelect' }],
    });
  };

  const handleLeaveHousehold = async () => {
    if (!selectedHousehold) return;

    Alert.alert('Leave Household', 'Are you sure you want to leave this household?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Leave',
        style: 'destructive',
        onPress: async () => {
          try {
            await householdsApi.leaveHousehold(selectedHousehold._id);
            setSelectedHousehold(null);
            navigation.reset({
              index: 0,
              routes: [{ name: 'HouseholdSelect' }],
            });
          } catch (error: any) {
            Alert.alert('Error', error.response?.data?.error || 'Failed to leave household');
          }
        },
      },
    ]);
  };

  const handleDeleteHousehold = async () => {
    if (!selectedHousehold) return;

    Alert.alert(
      'Delete Household',
      `Are you sure you want to delete "${selectedHousehold.name}"? This action cannot be undone and all data (expenses, shopping lists, events, etc.) will be permanently deleted.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await householdsApi.deleteHousehold(selectedHousehold._id);
              setSelectedHousehold(null);
              navigation.reset({
                index: 0,
                routes: [{ name: 'HouseholdSelect' }],
              });
              Alert.alert('Deleted', 'Household has been deleted successfully');
            } catch (error: any) {
              Alert.alert('Error', error.response?.data?.error || 'Failed to delete household');
            }
          },
        },
      ]
    );
  };

  const handleRemoveMember = (memberId: string, memberName: string) => {
    if (!selectedHousehold) return;
    Alert.alert(
      'Remove member',
      `Remove ${memberName} from this household?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              setRemovingMemberId(memberId);
              const updated = await householdsApi.removeMember(selectedHousehold._id, memberId);
              setSelectedHousehold(updated);
              if (user && user._id === memberId) {
                // if somehow removing self (should be blocked on backend), reset
                setSelectedHousehold(null);
                navigation.reset({ index: 0, routes: [{ name: 'HouseholdSelect' }] });
              }
            } catch (error: any) {
              Alert.alert('Error', error.response?.data?.error || 'Failed to remove member');
            } finally {
              setRemovingMemberId(null);
            }
          },
        },
      ]
    );
  };

  if (!selectedHousehold) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <View style={styles.emptyContainer}>
          <AppText style={styles.emptyText}>Please select a household</AppText>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <ScreenHeader title="Household Settings" subtitle={selectedHousehold.name} />

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <AppText style={styles.sectionTitle}>Household Information</AppText>
            {isOwner && !isEditing && (
              <TouchableOpacity onPress={handleStartEditing} style={styles.editButton}>
                <Ionicons name="pencil" size={18} color={colors.primary} />
                <AppText style={styles.editButtonText}>Edit</AppText>
              </TouchableOpacity>
            )}
          </View>

          {isEditing ? (
            <>
              <View style={styles.inputGroup}>
                <AppText style={styles.inputLabel}>Name</AppText>
                <TextInput
                  style={styles.textInput}
                  value={editName}
                  onChangeText={setEditName}
                  placeholder="Household name"
                  placeholderTextColor={colors.textSecondary}
                />
              </View>
              <View style={styles.inputGroup}>
                <AppText style={styles.inputLabel}>Address (optional)</AppText>
                <TextInput
                  style={styles.textInput}
                  value={editAddress}
                  onChangeText={setEditAddress}
                  placeholder="Address or location"
                  placeholderTextColor={colors.textSecondary}
                />
              </View>
              <View style={styles.editActions}>
                <TouchableOpacity
                  style={[styles.editActionButton, styles.cancelButton]}
                  onPress={handleCancelEditing}
                  disabled={isSaving}
                >
                  <AppText style={styles.cancelButtonText}>Cancel</AppText>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.editActionButton, styles.saveButton, isSaving && styles.disabledButton]}
                  onPress={handleSaveChanges}
                  disabled={isSaving}
                >
                  <AppText style={styles.saveButtonText}>{isSaving ? 'Saving...' : 'Save'}</AppText>
                </TouchableOpacity>
              </View>
            </>
          ) : (
            <>
              <View style={styles.infoRow}>
                <AppText style={styles.infoLabel}>Name</AppText>
                <AppText style={styles.infoValue}>{selectedHousehold.name}</AppText>
              </View>
              {selectedHousehold.address && (
                <View style={styles.infoRow}>
                  <AppText style={styles.infoLabel}>Address</AppText>
                  <AppText style={styles.infoValue}>{selectedHousehold.address}</AppText>
                </View>
              )}
            </>
          )}

          <View style={styles.infoRow}>
            <AppText style={styles.infoLabel}>Join Code</AppText>
            <View style={styles.joinCodeRow}>
              <AppText style={styles.infoValue}>{selectedHousehold.joinCode}</AppText>
              <TouchableOpacity onPress={handleCopyCode} style={styles.copyButton}>
                <Ionicons name="copy-outline" size={18} color={colors.primary} />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.codeActions}>
            <PrimaryButton
              title="Copy Code"
              onPress={handleCopyCode}
              variant="secondary"
            />
            <View style={styles.spacer} />
            <PrimaryButton
              title="Share Code"
              onPress={handleShareCode}
              variant="secondary"
            />
          </View>
        </View>

        <View style={styles.section}>
          <AppText style={styles.sectionTitle}>Members</AppText>
          {selectedHousehold.members.map((m) => {
            const ownerIdStr = getOwnerIdString(selectedHousehold);
            const isOwnerMember = m._id === ownerIdStr;
            const canRemove = isOwner && !isOwnerMember;
            return (
              <View key={m._id} style={styles.memberRow}>
                <Avatar name={m.name} uri={m.avatarUrl} size={40} />
                <View style={styles.memberInfo}>
                  <AppText style={styles.memberName}>{m.name}</AppText>
                  <AppText style={styles.memberEmail}>{m.email}</AppText>
                </View>
                {isOwnerMember && (
                  <View style={styles.ownerBadge}>
                    <AppText style={styles.ownerBadgeText}>Owner</AppText>
                  </View>
                )}
                {canRemove && (
                  <TouchableOpacity
                    style={styles.removeButton}
                    onPress={() => handleRemoveMember(m._id, m.name)}
                    disabled={removingMemberId === m._id}
                  >
                    {removingMemberId === m._id ? (
                      <ActivityIndicator size="small" color={colors.danger} />
                    ) : (
                      <Ionicons name="person-remove-outline" size={20} color={colors.danger} />
                    )}
                  </TouchableOpacity>
                )}
              </View>
            );
          })}
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <AppText style={styles.sectionTitle}>Actions</AppText>
          </View>
          <PrimaryButton
            title="Switch Household"
            onPress={handleSwitchHousehold}
          />
          {!isOwner && (
            <>
              <View style={styles.spacer} />
              <PrimaryButton
                title="Leave Household"
                onPress={handleLeaveHousehold}
                variant="danger"
              />
            </>
          )}
          {isOwner && (
            <>
              <View style={styles.spacer} />
              <PrimaryButton
                title="Delete Household"
                onPress={handleDeleteHousehold}
                variant="danger"
              />
              <View style={styles.ownerNoteContainer}>
                <Ionicons name="information-circle-outline" size={20} color={colors.warning} />
                <AppText style={styles.ownerNote}>
                  Deleting this household will permanently remove all data including expenses, shopping lists, and events.
                </AppText>
              </View>
            </>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const createStyles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: spacing.xl,
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
  section: {
    backgroundColor: colors.surface,
    padding: spacing.lg,
    marginHorizontal: spacing.md,
    marginTop: spacing.md,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...(shadows.sm as object),
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: fontSizes.lg,
    fontWeight: fontWeights.bold,
    color: colors.text,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: radii.sm,
    backgroundColor: colors.primaryUltraSoft,
  },
  editButtonText: {
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.semibold,
    color: colors.primary,
  },
  inputGroup: {
    marginBottom: spacing.md,
  },
  inputLabel: {
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.medium,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  textInput: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: fontSizes.md,
    color: colors.text,
  },
  editActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
    marginBottom: spacing.md,
  },
  editActionButton: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: radii.md,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cancelButtonText: {
    fontSize: fontSizes.md,
    fontWeight: fontWeights.semibold,
    color: colors.textSecondary,
  },
  saveButton: {
    backgroundColor: colors.primary,
  },
  saveButtonText: {
    fontSize: fontSizes.md,
    fontWeight: fontWeights.semibold,
    color: colors.textOnPrimary,
  },
  disabledButton: {
    opacity: 0.6,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  infoLabel: {
    fontSize: fontSizes.md,
    color: colors.textSecondary,
    fontWeight: fontWeights.medium,
  },
  infoValue: {
    fontSize: fontSizes.md,
    color: colors.text,
    fontWeight: fontWeights.semibold,
    flex: 1,
    textAlign: 'right',
  },
  joinCodeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    flex: 1,
  },
  copyButton: {
    padding: spacing.xs,
  },
  codeActions: {
    marginTop: spacing.md,
  },
  spacer: {
    height: spacing.sm,
  },
  membersSection: {
    marginTop: spacing.md,
  },
  membersTitle: {
    fontSize: fontSizes.md,
    fontWeight: fontWeights.semibold,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
    gap: spacing.md,
  },
  memberInfo: {
    flex: 1,
  },
  memberName: {
    fontSize: fontSizes.md,
    fontWeight: fontWeights.semibold,
    color: colors.text,
  },
  memberEmail: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
    marginTop: spacing.xxs,
  },
  ownerBadge: {
    backgroundColor: colors.primaryUltraSoft,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radii.sm,
  },
  ownerBadgeText: {
    fontSize: fontSizes.xs,
    fontWeight: fontWeights.semibold,
    color: colors.primary,
  },
  ownerNoteContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.warningUltraSoft,
    borderRadius: radii.md,
    gap: spacing.sm,
  },
  ownerNote: {
    flex: 1,
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
    lineHeight: 20,
  },
});

