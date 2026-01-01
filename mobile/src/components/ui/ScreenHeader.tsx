import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { AppText } from '../AppText';
import { colors, fontSizes, fontWeights, spacing } from '../../theme';

type ScreenHeaderProps = {
  title: string;
  subtitle?: string;
  rightText?: string;
  onRightPress?: () => void;
};

export const ScreenHeader: React.FC<ScreenHeaderProps> = ({ title, subtitle, rightText, onRightPress }) => {
  return (
    <View style={styles.container}>
      <View style={styles.left}>
        <AppText style={styles.title}>{title}</AppText>
        {!!subtitle && <AppText style={styles.subtitle}>{subtitle}</AppText>}
      </View>
      {!!rightText && !!onRightPress && (
        <Pressable onPress={onRightPress} style={styles.right}>
          <AppText style={styles.rightText}>{rightText}</AppText>
        </Pressable>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    backgroundColor: colors.background,
  },
  left: {
    flex: 1,
    paddingRight: spacing.md,
  },
  title: {
    fontSize: fontSizes.xxl,
    fontWeight: fontWeights.extrabold,
    color: colors.text,
  },
  subtitle: {
    marginTop: spacing.xxs,
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
  },
  right: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  rightText: {
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.semibold,
    color: colors.primary,
  },
});




