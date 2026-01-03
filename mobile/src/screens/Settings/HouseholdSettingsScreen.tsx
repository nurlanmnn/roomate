import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppText } from '../../components/AppText';
import { PrimaryButton } from '../../components/PrimaryButton';
import { useHousehold } from '../../context/HouseholdContext';
import { useAuth } from '../../context/AuthContext';
import { householdsApi } from '../../api/householdsApi';
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

  useEffect(() => {
    if (selectedHousehold && user) {
      setIsOwner(selectedHousehold.ownerId === user._id);
    }
  }, [selectedHousehold, user]);

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
          <AppText style={styles.sectionTitle}>Household Information</AppText>
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
            const isOwnerMember = m._id === selectedHousehold.ownerId;
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
              </View>
            );
          })}
        </View>

        <View style={styles.section}>
          <AppText style={styles.sectionTitle}>Actions</AppText>
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
            <View style={styles.ownerNoteContainer}>
              <Ionicons name="information-circle-outline" size={20} color={colors.warning} />
              <AppText style={styles.ownerNote}>
                Note: Owners cannot leave the household. You must transfer ownership or delete the household first.
              </AppText>
            </View>
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
  sectionTitle: {
    fontSize: fontSizes.lg,
    fontWeight: fontWeights.bold,
    color: colors.text,
    marginBottom: spacing.md,
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

