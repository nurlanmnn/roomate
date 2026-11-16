import React from 'react';
import { ViewStyle } from 'react-native';
import { Group } from '../ui/Group';

interface SettingsGroupCardProps {
  children: React.ReactNode;
  style?: ViewStyle;
}

/** Inset grouped surface. The shared Group owns gutters and row separators. */
export const SettingsGroupCard: React.FC<SettingsGroupCardProps> = ({ children, style }) => (
  <Group style={style}>{children}</Group>
);
