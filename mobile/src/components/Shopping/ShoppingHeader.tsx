import React from 'react';
import { View, StyleSheet } from 'react-native';
import { AppText } from '../AppText';
import { SearchBar } from '../ui/SearchBar';
import { useThemeColors, fontSizes, fontWeights, spacing } from '../../theme';

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
  searchPlaceholder = 'Search',
}) => {
  const colors = useThemeColors();
  const styles = React.useMemo(() => StyleSheet.create({
    container: {
      paddingHorizontal: spacing.xl,
      paddingTop: spacing.lg,
      paddingBottom: spacing.md,
      backgroundColor: colors.background,
    },
    titleRow: {
      marginBottom: spacing.xs,
    },
    title: {
      fontSize: fontSizes.xxl,
      fontWeight: fontWeights.extrabold,
      color: colors.text,
      letterSpacing: -0.5,
    },
    subtitle: {
      fontSize: fontSizes.sm,
      color: colors.textSecondary,
      marginTop: 2,
    },
    searchWrap: {
      marginTop: spacing.md,
    },
  }), [colors]);

  return (
    <View style={styles.container}>
      <View style={styles.titleRow}>
        <AppText style={styles.title}>{title}</AppText>
        <AppText style={styles.subtitle}>{subtitle}</AppText>
      </View>
      <View style={styles.searchWrap}>
        <SearchBar
          value={searchValue}
          onChangeText={onSearchChange}
          placeholder={searchPlaceholder}
        />
      </View>
    </View>
  );
};
