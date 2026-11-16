import React from 'react';
import { Pressable, StyleSheet, View, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText } from '../AppText';
import { useThemeColors, fonts, fontSizes, radii, spacing } from '../../theme';

type HeaderIconButtonProps = {
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  accessibilityLabel: string;
};

/** Round 44pt icon button for use on the enamel field. */
export const HeaderIconButton: React.FC<HeaderIconButtonProps> = ({ icon, onPress, accessibilityLabel }) => {
  const colors = useThemeColors();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      hitSlop={4}
      style={({ pressed }) => [
        styles.iconButton,
        { borderColor: colors.enamelKeyline },
        pressed && styles.pressed,
      ]}
    >
      <Ionicons name={icon} size={22} color={colors.onEnamel} />
    </Pressable>
  );
};

type EnamelHeaderProps = {
  /** Top-level screen title, set in the display face. Omit when `leading` replaces it. */
  title?: string;
  subtitle?: string;
  /** Replaces the title block (e.g. the household switcher on Home). */
  leading?: React.ReactNode;
  /** `HeaderIconButton`s or an avatar, right-aligned in the top row. */
  right?: React.ReactNode;
  /** The screen's key figure or controls, placed on the enamel under the title row. */
  children?: React.ReactNode;
  /** Extra space at the bottom so a `Sheet` (or floating buttons) can overlap the field. */
  overlap?: number;
  style?: ViewStyle;
};

/**
 * The cobalt enamel field at the top of every tab screen. It runs under the status bar and
 * is the one place the brand colour owns a whole region.
 */
export const EnamelHeader: React.FC<EnamelHeaderProps> = ({
  title,
  subtitle,
  leading,
  right,
  children,
  overlap = radii.xl,
  style,
}) => {
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.field,
        { backgroundColor: colors.enamel, paddingTop: insets.top + spacing.xs, paddingBottom: overlap + spacing.md },
        style,
      ]}
    >
      {/* Status bar text must be light on the enamel field in both appearances. */}
      <StatusBar style="light" />
      <View style={styles.topRow}>
        <View style={styles.titleBlock}>
          {leading ?? (
            <>
              {title ? (
                <AppText
                  accessibilityRole="header"
                  style={[styles.title, { color: colors.onEnamel }]}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.7}
                  maxFontSizeMultiplier={1.3}
                >
                  {title}
                </AppText>
              ) : null}
              {subtitle ? (
                <AppText style={[styles.subtitle, { color: colors.onEnamelSecondary }]} numberOfLines={2}>
                  {subtitle}
                </AppText>
              ) : null}
            </>
          )}
        </View>
        {right ? <View style={styles.right}>{right}</View> : null}
      </View>
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  field: {
    paddingHorizontal: spacing.lg,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 48,
    gap: spacing.sm,
  },
  titleBlock: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    fontFamily: fonts.displayExtrabold,
    fontSize: 34,
    lineHeight: 38,
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: fontSizes.sm,
    marginTop: 2,
  },
  right: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.6,
  },
});
