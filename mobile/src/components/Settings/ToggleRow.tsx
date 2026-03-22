import React from 'react';
import { View, StyleSheet, Switch, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppText } from '../AppText';
import { useThemeColors, fontSizes, fontWeights, spacing } from '../../theme';

interface ToggleRowProps {
  icon: keyof typeof Ionicons.glyphMap;
  iconBackgroundColor: string;
  iconColor: string;
  title: string;
  subtitle: string;
  value: boolean;
  onValueChange: (v: boolean) => void;
  isLast?: boolean;
}

export const ToggleRow: React.FC<ToggleRowProps> = ({
  icon,
  iconBackgroundColor,
  iconColor,
  title,
  subtitle,
  value,
  onValueChange,
  isLast = false,
}) => {
  const colors = useThemeColors();
  const styles = React.useMemo(
    () =>
      StyleSheet.create({
        row: {
          flexDirection: 'row',
          alignItems: 'center',
          paddingVertical: spacing.sm,
          paddingLeft: spacing.md,
          paddingRight: spacing.sm,
          minHeight: 56,
          borderBottomWidth: isLast ? 0 : StyleSheet.hairlineWidth,
          borderBottomColor: colors.borderLight,
        },
        iconWrap: {
          width: 36,
          height: 36,
          borderRadius: 10,
          alignItems: 'center',
          justifyContent: 'center',
          marginRight: spacing.md,
        },
        textBlock: {
          flex: 1,
          minWidth: 0,
          paddingRight: spacing.sm,
        },
        title: {
          fontSize: fontSizes.md,
          fontWeight: fontWeights.semibold,
          color: colors.text,
        },
        subtitle: {
          fontSize: fontSizes.sm,
          color: colors.textSecondary,
          marginTop: 2,
          lineHeight: 18,
        },
      }),
    [colors, isLast]
  );

  return (
    <View style={styles.row}>
      <View style={[styles.iconWrap, { backgroundColor: iconBackgroundColor }]}>
        <Ionicons name={icon} size={20} color={iconColor} />
      </View>
      <View style={styles.textBlock}>
        <AppText style={styles.title}>{title}</AppText>
        <AppText style={styles.subtitle} numberOfLines={2}>
          {subtitle}
        </AppText>
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{
          false: colors.border,
          true: colors.primary,
        }}
        thumbColor={colors.surface}
        ios_backgroundColor={colors.border}
        style={Platform.OS === 'ios' ? { transform: [{ scaleX: 0.92 }, { scaleY: 0.92 }] } : undefined}
      />
    </View>
  );
};
