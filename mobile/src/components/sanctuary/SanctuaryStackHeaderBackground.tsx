import React from 'react';
import { View, StyleSheet, Platform, Pressable, I18nManager } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../context/ThemeContext';
import { useThemeColors } from '../../theme';

/**
 * Shape of props native-stack passes to `headerLeft`. Native stack does NOT provide `onPress`
 * (unlike `@react-navigation/stack`), so we must wire `goBack()` ourselves.
 */
type NativeStackHeaderLeftProps = {
  tintColor?: string;
  canGoBack: boolean;
  label?: string;
};

export type SanctuaryStackHeaderVariant = 'default' | 'immersive';

type Props = {
  /** `immersive` = lighter overlay + brand glow (Account / Household settings headers). */
  variant?: SanctuaryStackHeaderVariant;
};

/**
 * Frosted header background for native stack — pairs with `headerTransparent: true`.
 */
export const SanctuaryStackHeaderBackground: React.FC<Props> = ({ variant = 'default' }) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const immersive = variant === 'immersive';

  const tintOverlay = isDark
    ? immersive
      ? 'rgba(10, 20, 16, 0.38)'
      : 'rgba(16, 24, 22, 0.55)'
    : immersive
      ? 'rgba(255, 255, 255, 0.36)'
      : 'rgba(255, 255, 255, 0.48)';

  const borderBottom = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(34, 197, 94, 0.2)';

  const blurIntensity =
    Platform.OS === 'ios'
      ? isDark
        ? immersive
          ? 42
          : 26
        : immersive
          ? 40
          : 34
      : isDark
        ? immersive
          ? 28
          : 18
        : immersive
          ? 24
          : 18;

  return (
    <View style={StyleSheet.absoluteFillObject}>
      <BlurView intensity={blurIntensity} tint={isDark ? 'dark' : 'light'} style={StyleSheet.absoluteFillObject} />
      {immersive ? (
        <LinearGradient
          colors={
            isDark
              ? ['transparent', 'rgba(74, 222, 128, 0.1)', 'rgba(16, 185, 129, 0.08)']
              : ['rgba(255,255,255,0.02)', 'rgba(34, 197, 94, 0.08)', 'rgba(34, 197, 94, 0.06)']
          }
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          pointerEvents="none"
          style={StyleSheet.absoluteFillObject}
        />
      ) : null}
      <View
        pointerEvents="none"
        style={[
          StyleSheet.absoluteFillObject,
          {
            backgroundColor: tintOverlay,
            borderBottomWidth: StyleSheet.hairlineWidth,
            borderBottomColor: borderBottom,
          },
        ]}
      />
    </View>
  );
};

/**
 * Minimal back control for settings stack screens (chevron only, no glass pill).
 *
 * Avoids the stretched pill that `HeaderBackButton` produces on iOS (its chevron has
 * ~22pt of right-margin reserved for the hidden label).
 * Native stack's `headerLeft` props do NOT include `onPress`, so we wire `goBack()`
 * ourselves via `useNavigation`.
 */
export const SanctuaryStackGlassBack: React.FC<NativeStackHeaderLeftProps> = ({
  tintColor,
  canGoBack,
}) => {
  const navigation = useNavigation();
  const { theme } = useTheme();
  const colors = useThemeColors();
  const isDark = theme === 'dark';

  if (!canGoBack) return null;

  const iconColor = tintColor ?? colors.text;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Go back"
      hitSlop={10}
      onPress={() => {
        if (navigation.canGoBack()) navigation.goBack();
      }}
      android_ripple={{
        color: isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.08)',
        borderless: true,
        radius: 20,
      }}
      style={({ pressed }) => [
        styles.backHit,
        pressed && Platform.OS === 'ios' ? styles.backPressed : null,
      ]}
    >
      <Ionicons
        name="chevron-back"
        size={24}
        color={iconColor}
        style={{
          // Ionicons draws chevron-back slightly low in its box; nudge up for optical center in the nav bar.
          transform: [
            { translateY: Platform.OS === 'ios' ? -2 : 0 },
            { scaleX: I18nManager.getConstants().isRTL ? -1 : 1 },
          ],
        }}
      />
    </Pressable>
  );
};

const styles = StyleSheet.create({
  backHit: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: Platform.OS === 'ios' ? 0 : 4,
  },
  backPressed: {
    opacity: 0.55,
  },
});
