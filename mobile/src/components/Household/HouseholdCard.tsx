import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { AppText } from '../AppText';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors, fontSizes, fontWeights, spacing, radii, shadows } from '../../theme';
import { Household } from '../../api/householdsApi';
import * as Clipboard from 'expo-clipboard';
import { Alert } from 'react-native';

interface HouseholdCardProps {
  household: Household;
  onPress: () => void;
  copiedMessage: string;
  memberCountOne: string;
  memberCount: (params: { count: number }) => string;
}

export const HouseholdCard: React.FC<HouseholdCardProps> = ({
  household,
  onPress,
  copiedMessage,
  memberCountOne,
  memberCount,
}) => {
  const colors = useThemeColors();
  const count = household.members?.length ?? 0;

  const styles = React.useMemo(() => StyleSheet.create({
    card: {
      backgroundColor: colors.surface,
      borderRadius: radii.lg,
      padding: spacing.lg,
      marginBottom: spacing.md,
      borderWidth: 1,
      borderColor: colors.borderLight,
      ...(shadows.sm as object),
    },
    inner: {
      flexDirection: 'row',
      alignItems: 'flex-start',
    },
    iconWrap: {
      width: 48,
      height: 48,
      borderRadius: radii.md,
      backgroundColor: colors.primaryUltraSoft,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: spacing.md,
    },
    content: {
      flex: 1,
      minWidth: 0,
    },
    name: {
      fontSize: fontSizes.lg,
      fontWeight: fontWeights.bold,
      color: colors.text,
      marginBottom: 2,
    },
    address: {
      fontSize: fontSizes.sm,
      color: colors.textSecondary,
      marginBottom: spacing.xs,
    },
    metaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      flexWrap: 'wrap',
      gap: spacing.sm,
      marginTop: spacing.xs,
    },
    memberBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    memberText: {
      fontSize: fontSizes.xs,
      color: colors.textTertiary,
    },
    codeBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: spacing.sm,
      paddingVertical: 4,
      borderRadius: radii.sm,
      backgroundColor: colors.background,
      gap: 4,
    },
    codeText: {
      fontSize: fontSizes.xs,
      color: colors.textTertiary,
      fontWeight: fontWeights.medium,
    },
  }), [colors]);

  const handleCopyCode = (e: { stopPropagation?: () => void }) => {
    e?.stopPropagation?.();
    Clipboard.setStringAsync(household.joinCode).then(() => {
      Alert.alert(copiedMessage, '');
    });
  };

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.inner}>
        <View style={styles.iconWrap}>
          <Ionicons name="home" size={24} color={colors.primary} />
        </View>
        <View style={styles.content}>
          <AppText style={styles.name} numberOfLines={1}>{household.name}</AppText>
          {household.address ? (
            <AppText style={styles.address} numberOfLines={1}>{household.address}</AppText>
          ) : null}
          <View style={styles.metaRow}>
            {count > 0 && (
              <View style={styles.memberBadge}>
                <Ionicons name="people-outline" size={14} color={colors.textTertiary} />
                <AppText style={styles.memberText}>
                  {count === 1 ? memberCountOne : memberCount({ count })}
                </AppText>
              </View>
            )}
            <TouchableOpacity style={styles.codeBadge} onPress={handleCopyCode} activeOpacity={0.8}>
              <AppText style={styles.codeText}>{household.joinCode}</AppText>
              <Ionicons name="copy-outline" size={14} color={colors.textTertiary} />
            </TouchableOpacity>
          </View>
        </View>
        <Ionicons name="chevron-forward" size={20} color={colors.textTertiary} style={{ marginTop: 2 }} />
      </View>
    </TouchableOpacity>
  );
};
