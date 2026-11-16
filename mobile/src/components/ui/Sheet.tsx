import React from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import { useThemeColors, radii } from '../../theme';

type SheetProps = {
  children: React.ReactNode;
  style?: ViewStyle;
};

/**
 * Porcelain body of a tab screen. Its rounded top overlaps the `EnamelHeader` above it,
 * so render it directly after the header inside a `flex: 1` column.
 */
export const Sheet: React.FC<SheetProps> = ({ children, style }) => {
  const colors = useThemeColors();
  return <View style={[styles.sheet, { backgroundColor: colors.background }, style]}>{children}</View>;
};

const styles = StyleSheet.create({
  sheet: {
    flex: 1,
    marginTop: -radii.xl,
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    overflow: 'hidden',
  },
});
