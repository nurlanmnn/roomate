import React from 'react';
import { View, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppText } from '../AppText';
import { Avatar } from '../ui/Avatar';
import { RoleBadge, RoleBadgeVariant } from './RoleBadge';
import { useThemeColors, fontSizes, fontWeights, spacing } from '../../theme';

interface MemberRowProps {
  name: string;
  email: string;
  avatarUrl?: string;
  role: RoleBadgeVariant;
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
  isLast = false,
}) => {
  const colors = useThemeColors();
  const styles = React.useMemo(
    () =>
      StyleSheet.create({
        row: {
          flexDirection: 'row',
          alignItems: 'center',
          paddingVertical: spacing.md,
          paddingHorizontal: spacing.sm,
          borderBottomWidth: isLast ? 0 : StyleSheet.hairlineWidth,
          borderBottomColor: colors.borderLight,
          gap: spacing.md,
        },
        meta: {
          flex: 1,
          minWidth: 0,
        },
        name: {
          fontSize: fontSizes.md,
          fontWeight: fontWeights.semibold,
          color: colors.text,
        },
        email: {
          fontSize: fontSizes.sm,
          color: colors.textSecondary,
          marginTop: 2,
        },
        right: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.sm,
        },
      }),
    [colors, isLast]
  );

  return (
    <View style={styles.row}>
      <Avatar name={name} uri={avatarUrl} size={44} />
      <View style={styles.meta}>
        <AppText style={styles.name} numberOfLines={1}>
          {name}
        </AppText>
        <AppText style={styles.email} numberOfLines={1}>
          {email}
        </AppText>
      </View>
      <View style={styles.right}>
        <RoleBadge variant={role} label={roleLabel} />
        {showRemove && onRemove ? (
          <TouchableOpacity
            onPress={onRemove}
            disabled={removing}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            activeOpacity={0.7}
          >
            {removing ? (
              <ActivityIndicator size="small" color={colors.danger} />
            ) : (
              <Ionicons name="person-remove-outline" size={22} color={colors.danger} />
            )}
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  );
};
