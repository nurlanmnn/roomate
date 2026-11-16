import React from 'react';
import { View } from 'react-native';
import { SectionHeading } from '../ui/Group';

interface SettingsSectionProps {
  title: string;
  children: React.ReactNode;
}

/** The heading and its group each own their standard screen gutter. */
export const SettingsSection: React.FC<SettingsSectionProps> = ({ title, children }) => (
  <View>
    <SectionHeading title={title} />
    {children}
  </View>
);
