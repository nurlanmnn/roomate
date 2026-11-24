import React from 'react';
import { Ionicons } from '@expo/vector-icons';
import { GroupRow } from '../ui/Group';

/** A navigation row in Settings. Colour props are kept for older callers and ignored. */
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
  return (
    <GroupRow
      title={title}
      titleLines={0}
      subtitle={subtitle}
      icon={icon}
      onPress={onPress}
      chevron
    />
  );
};
