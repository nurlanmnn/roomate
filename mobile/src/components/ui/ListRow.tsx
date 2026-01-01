import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { AppText } from '../AppText';
import { colors, fontSizes, fontWeights, radii, spacing } from '../../theme';

type ListRowProps = {
  title: string;
  subtitle?: string;
  right?: string;
  onPress?: () => void;
};

export const ListRow: React.FC<ListRowProps> = ({ title, subtitle, right, onPress }) => {
  const content = (
    <View style={styles.row}>
      <View style={styles.left}>
        <AppText style={styles.title}>{title}</AppText>
        {!!subtitle && <AppText style={styles.subtitle}>{subtitle}</AppText>}
      </View>
      <View style={styles.right}>
        {!!right && <AppText style={styles.rightText}>{right}</AppText>}
        {!!onPress && <AppText style={styles.chevron}>›</AppText>}
      </View>
    </View>
  );

  if (onPress) {
    return (
      <Pressable onPress={onPress} style={({ pressed }) => [styles.pressable, pressed && styles.pressed]}>
        {content}
      </Pressable>
    );
  }

  return <View style={styles.pressable}>{content}</View>;
};

const styles = StyleSheet.create({
  pressable: {
    borderRadius: radii.md,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  pressed: {
    opacity: 0.96,
    transform: [{ scale: 0.995 }],
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  left: {
    flex: 1,
    paddingRight: spacing.md,
  },
  title: {
    fontSize: fontSizes.md,
    fontWeight: fontWeights.semibold,
    color: colors.text,
  },
  subtitle: {
    marginTop: spacing.xxs,
    fontSize: fontSizes.xs,
    color: colors.textSecondary,
  },
  right: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  rightText: {
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.semibold,
    color: colors.text,
  },
  chevron: {
    fontSize: 20,
    color: colors.muted,
    lineHeight: 20,
    marginLeft: spacing.xs,
  },
});




