import React from 'react';
import { StyleSheet, Switch, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { GroupRow } from '../ui/Group';
import { useThemeColors } from '../../theme';

interface ToggleRowProps {
  icon: keyof typeof Ionicons.glyphMap;
  iconBackgroundColor: string;
  iconColor: string;
  title: string;
  subtitle: string;
  value: boolean;
  onValueChange: (v: boolean) => void;
  /** Retained for compatibility; the enclosing Group owns separators. */
  isLast?: boolean;
}

export const ToggleRow: React.FC<ToggleRowProps> = ({
  icon,
  title,
  subtitle,
  value,
  onValueChange,
}) => {
  const colors = useThemeColors();
  return (
    <GroupRow
      title={title}
      titleLines={0}
      subtitle={subtitle}
      onPress={() => onValueChange(!value)}
      accessibilityRole="switch"
      accessibilityLabel={title}
      accessibilityHint={subtitle}
      accessibilityState={{ checked: value }}
      icon={icon}
      trailing={
        // Claim the touch here so a tap on the switch isn't also delivered to the
        // row's onPress, which would toggle twice and snap the value back.
        <View style={styles.switchTarget} onStartShouldSetResponder={() => true}>
          <Switch
            value={value}
            onValueChange={onValueChange}
            accessible={false}
            importantForAccessibility="no"
            trackColor={{ false: colors.border, true: colors.primary }}
            thumbColor={colors.onEnamel}
            ios_backgroundColor={colors.border}
          />
        </View>
      }
    />
  );
};

const styles = StyleSheet.create({
  switchTarget: {
    minWidth: 52,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
