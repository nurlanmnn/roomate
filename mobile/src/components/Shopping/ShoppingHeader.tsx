import React from 'react';
import { View } from 'react-native';
import { EnamelHeader } from '../ui/EnamelHeader';
import { useLanguage } from '../../context/LanguageContext';
import { SearchBar } from '../ui/SearchBar';
import { useThemeColors, spacing } from '../../theme';

interface ShoppingHeaderProps {
  title: string;
  subtitle: string;
  searchValue: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder?: string;
}

export const ShoppingHeader: React.FC<ShoppingHeaderProps> = ({
  title,
  subtitle,
  searchValue,
  onSearchChange,
  searchPlaceholder,
}) => {
  const colors = useThemeColors();
  const { t } = useLanguage();
  return (
    <View>
      <EnamelHeader title={title} subtitle={subtitle} />
      <View style={{ padding: spacing.md, backgroundColor: colors.background }}>
        <SearchBar
          value={searchValue}
          onChangeText={onSearchChange}
          placeholder={searchPlaceholder ?? t('common.search')}
        />
      </View>
    </View>
  );
};
