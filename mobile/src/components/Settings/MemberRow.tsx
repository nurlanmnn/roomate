import React from 'react';
import { View, StyleSheet, Pressable, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppText } from '../AppText';
import { Avatar } from '../ui/Avatar';
import { useLanguage } from '../../context/LanguageContext';
import { useThemeColors, fontSizes, fontWeights, spacing } from '../../theme';

interface MemberRowProps {
  name: string;
  email: string;
  avatarUrl?: string;
  role: 'owner' | 'member';
  roleLabel: string;
  showRemove?: boolean;
  removing?: boolean;
  onRemove?: () => void;
  isLast?: boolean;
}

export const MemberRow: React.FC<MemberRowProps> = ({
  name,
  email,
  avatarUrl,
  role,
  roleLabel,
  showRemove,
  removing,
  onRemove,
}) => {
  const colors = useThemeColors();
  const { t } = useLanguage();

  return (
    <View style={styles.row}>
      <Avatar name={name} uri={avatarUrl} size={40} />
      <View style={styles.meta}>
        <AppText style={[styles.name, { color: colors.text }]}>{name}</AppText>
        <AppText style={[styles.email, { color: colors.textSecondary }]}>{email}</AppText>
      </View>
      {role === 'owner' ? (
        <AppText style={[styles.role, { color: colors.textSecondary }]}>{roleLabel}</AppText>
      ) : null}
      {showRemove && onRemove ? (
        <Pressable
          onPress={onRemove}
          disabled={removing}
          accessibilityRole="button"
          accessibilityLabel={`${t('householdSettingsScreen.removeMember')}: ${name}`}
          accessibilityState={{ disabled: Boolean(removing), busy: Boolean(removing) }}
          style={({ pressed }) => [styles.remove, pressed && styles.pressed]}
        >
          {removing ? (
            <ActivityIndicator size="small" color={colors.danger} />
          ) : (
            <Ionicons name="person-remove-outline" size={22} color={colors.danger} />
          )}
        </Pressable>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 60,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  meta: {
    flex: 1,
    minWidth: 0,
    gap: spacing.xxs,
  },
  name: {
    fontSize: fontSizes.md,
    fontWeight: fontWeights.semibold,
  },
  email: {
    fontSize: fontSizes.sm - 1,
  },
  role: {
    fontSize: fontSizes.sm,
    flexShrink: 1,
  },
  remove: {
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.6,
  },
});
