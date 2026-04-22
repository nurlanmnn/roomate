import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';
import { useTheme } from '../../context/ThemeContext';
import { useThemeColors } from '../../theme';

type SanctuaryScreenShellProps = {
  children: React.ReactNode;
  /** Safe-area padding. Default top-only so home-indicator strip stays on-gradient (see HouseholdSelect). */
  edges?: Edge[];
  style?: ViewStyle;
  /** Applied to the inner `SafeAreaView` (e.g. `flex:1`, `justifyContent:'center'`). */
  innerStyle?: ViewStyle;
};

/**
 * Immersive brand gradient + transparent safe area — use as the root of every full-screen surface.
 */
export const SanctuaryBackground: React.FC<{ style?: ViewStyle }> = ({ style }) => {
  const { theme } = useTheme();
  const colors = useThemeColors();
  const isDark = theme === 'dark';

  return (
    <>
      <LinearGradient
        colors={
          isDark
            ? [colors.primaryUltraSoft, '#15221C', '#1A1628']
            : [colors.primaryUltraSoft, '#F6FDF9', colors.primarySoft]
        }
        start={{ x: 0.04, y: 0.08 }}
        end={{ x: 0.96, y: 0.92 }}
        style={[StyleSheet.absoluteFillObject, style]}
      />
      <LinearGradient
        colors={
          isDark
            ? ['rgba(74, 222, 128, 0.12)', 'transparent', 'rgba(22, 197, 94, 0.08)']
            : ['rgba(34, 197, 94, 0.16)', 'rgba(255,255,255,0.06)', 'rgba(34, 197, 94, 0.08)']
        }
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[StyleSheet.absoluteFillObject, style]}
      />
    </>
  );
};

export const SanctuaryScreenShell: React.FC<SanctuaryScreenShellProps> = ({
  children,
  edges = ['top'],
  style,
  innerStyle,
}) => {
  const { theme } = useTheme();
  const colors = useThemeColors();
  const isDark = theme === 'dark';

  return (
    <View
      style={[
        styles.root,
        { backgroundColor: isDark ? '#131A29' : colors.primaryUltraSoft },
        style,
      ]}
    >
      <SanctuaryBackground />
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
