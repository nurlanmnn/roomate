import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { GroupRow } from '../ui/Group';
import { useThemeColors, radii } from '../../theme';

interface SettingsRowProps {
  icon: keyof typeof Ionicons.glyphMap;
  iconBackgroundColor: string;
  iconColor: string;
  title: string;
  subtitle?: string;
  onPress: () => void;
  /** Retained for compatibility; the enclosing Group owns separators. */
  isLast?: boolean;
}

export const SettingsRow: React.FC<SettingsRowProps> = ({
  icon,
  title,
  subtitle,
  onPress,
}) => {
  const colors = useThemeColors();
  const outlineIcon = `${icon.replace(/-outline$/, '')}-outline` as keyof typeof Ionicons.glyphMap;

  return (
    <GroupRow
      title={title}
      titleLines={0}
      subtitle={subtitle}
      leading={
        <View style={[styles.iconWell, { backgroundColor: colors.primaryUltraSoft }]}>
          <Ionicons name={outlineIcon} size={22} color={colors.primary} />
        </View>
      }
      onPress={onPress}
      chevron
    />
  );
};

const styles = StyleSheet.create({
  iconWell: {
    width: 36,
    height: 36,
    borderRadius: radii.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
