import React from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { AppText } from '../AppText';
import { Avatar } from '../ui/Avatar';
import { useThemeColors, useTheme, fontSizes, fontWeights, spacing, radii, shadows } from '../../theme';

interface ProfileHeaderCardProps {
  name?: string;
  email?: string;
  householdName?: string | null;
  avatarUri?: string;
  onPress: () => void;
  editHint: string;
}

/**
 * Prominent profile entry: avatar, identity, optional household chip, tap-to-edit affordance.
 */
export const ProfileHeaderCard: React.FC<ProfileHeaderCardProps> = ({
  name,
  email,
  householdName,
  avatarUri,
  onPress,
  editHint,
}) => {
  const colors = useThemeColors();
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const gradientColors = isDark
    ? [colors.surfaceElevated, colors.surface]
    : [colors.surface, colors.background];

  const styles = React.useMemo(
    () =>
      StyleSheet.create({
        outer: {
          marginHorizontal: spacing.xl,
          marginBottom: spacing.sm,
          borderRadius: radii.lg,
          overflow: 'hidden',
          ...(shadows.sm as object),
        },
        gradient: {
          padding: spacing.lg,
        },
        row: {
          flexDirection: 'row',
          alignItems: 'flex-start',
        },
        avatarCol: {
          marginRight: spacing.md,
        },
        textCol: {
          flex: 1,
          minWidth: 0,
        },
        name: {
          fontSize: fontSizes.xl,
          fontWeight: fontWeights.bold,
          color: colors.text,
          letterSpacing: -0.3,
          marginBottom: spacing.xxs,
        },
        email: {
          fontSize: fontSizes.sm,
          color: colors.textSecondary,
          lineHeight: 20,
        },
        householdChip: {
          flexDirection: 'row',
          alignItems: 'center',
          alignSelf: 'flex-start',
          marginTop: spacing.sm,
          paddingHorizontal: spacing.sm,
          paddingVertical: 4,
          borderRadius: radii.md,
          backgroundColor: colors.primaryUltraSoft,
          gap: 4,
        },
        householdText: {
          fontSize: fontSizes.xs,
          fontWeight: fontWeights.semibold,
          color: colors.primary,
        },
        footer: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginTop: spacing.md,
          paddingTop: spacing.md,
          borderTopWidth: StyleSheet.hairlineWidth,
          borderTopColor: colors.borderLight,
        },
        hint: {
          fontSize: fontSizes.xs,
          color: colors.textTertiary,
        },
      }),
    [colors]
  );

  return (
    <Pressable onPress={onPress} style={styles.outer} android_ripple={{ color: colors.border }}>
      <LinearGradient colors={gradientColors} style={styles.gradient}>
        <View style={styles.row}>
          <View style={styles.avatarCol}>
            <Avatar name={name} uri={avatarUri} size={72} />
          </View>
          <View style={styles.textCol}>
            <AppText style={styles.name} numberOfLines={1}>
              {name || '—'}
            </AppText>
            <AppText style={styles.email} numberOfLines={2}>
              {email || ''}
            </AppText>
            {householdName ? (
              <View style={styles.householdChip}>
                <Ionicons name="home" size={12} color={colors.primary} />
                <AppText style={styles.householdText} numberOfLines={1}>
                  {householdName}
                </AppText>
              </View>
            ) : null}
          </View>
        </View>
        <View style={styles.footer}>
          <AppText style={styles.hint}>{editHint}</AppText>
          <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
        </View>
      </LinearGradient>
    </Pressable>
  );
};
