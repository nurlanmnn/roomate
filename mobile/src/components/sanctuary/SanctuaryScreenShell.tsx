import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';
import { useThemeColors } from '../../theme';

type SanctuaryScreenShellProps = {
  children: React.ReactNode;
  /** Safe-area padding. Default top-only. */
  edges?: Edge[];
  style?: ViewStyle;
  /** Applied to the inner `SafeAreaView` (e.g. `flex:1`, `justifyContent:'center'`). */
  innerStyle?: ViewStyle;
};

/**
 * Flat ground fill. The name is historical (the previous design used a gradient here);
 * it is kept so existing imports keep working.
 */
export const SanctuaryBackground: React.FC<{ style?: ViewStyle }> = ({ style }) => {
  const colors = useThemeColors();
  return <View style={[StyleSheet.absoluteFillObject, { backgroundColor: colors.background }, style]} />;
};

/** Root container for a full screen: porcelain ground plus safe-area handling. */
export const SanctuaryScreenShell: React.FC<SanctuaryScreenShellProps> = ({
  children,
  edges = ['top'],
  style,
  innerStyle,
}) => {
  const colors = useThemeColors();

  return (
    <View style={[styles.root, { backgroundColor: colors.background }, style]}>
      <SafeAreaView style={[styles.safe, innerStyle]} edges={edges}>
        {children}
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  safe: {
    flex: 1,
    backgroundColor: 'transparent',
  },
});
