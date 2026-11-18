import React from 'react';
import { Alert, View, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { AppText } from '../AppText';
import { Avatar } from '../ui/Avatar';
import { useThemeColors, fonts, fontSizes, fontWeights, radii, spacing, DISPLAY_MAX_FONT_SCALE } from '../../theme';
import { useLanguage } from '../../context/LanguageContext';
import { Household } from '../../api/householdsApi';

interface HouseholdCardProps {
  household: Household;
  onPress: () => void;
  copiedMessage: string;
  memberCountOne: string;
  memberCount: (params: { count: number }) => string;
}

/** The household's "house number": its initial in signage numerals on a small enamel plaque. */
export const HouseholdPlaque: React.FC<{ name: string; size?: number }> = ({ name, size = 44 }) => {
  const colors = useThemeColors();
  const initial = (name.trim().match(/[\p{L}\p{N}]/u)?.[0] ?? '?').toUpperCase();
  return (
    <View
      style={[styles.plaque, { width: size, height: size, backgroundColor: colors.enamel }]}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <AppText
        style={[styles.plaqueText, { color: colors.onEnamel, fontSize: Math.round(size * 0.56) }]}
        maxFontSizeMultiplier={DISPLAY_MAX_FONT_SCALE}
      >
        {initial}
      </AppText>
    </View>
  );
};

/**
 * One household in the picker: plaque, name, members, and the invite code as a copy command.
 * Rendered inside a `Group`, which draws the separators between households.
 */
export const HouseholdCard: React.FC<HouseholdCardProps> = ({
  household, onPress, copiedMessage, memberCountOne, memberCount,
}) => {
  const colors = useThemeColors();
  const { t } = useLanguage();
  const members = household.members ?? [];
  const count = members.length;
  const countLabel = count === 1 ? memberCountOne : memberCount({ count });

  const handleCopyCode = () => {
    Clipboard.setStringAsync(household.joinCode).then(() => {
      Alert.alert(copiedMessage, '');
    });
  };

  return (
    <View>
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={`${household.name}, ${countLabel}`}
        style={({ pressed }) => [styles.row, pressed && { backgroundColor: colors.primaryUltraSoft }]}
      >
        <HouseholdPlaque name={household.name} />
        <View style={styles.content}>
          <AppText style={[styles.name, { color: colors.text }]} numberOfLines={2}>{household.name}</AppText>
          <AppText style={[styles.detail, { color: colors.textSecondary }]} numberOfLines={2}>
            {household.address ? `${countLabel} · ${household.address}` : countLabel}
          </AppText>
        </View>
        {count > 0 ? (
          <View style={styles.stack} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
            {members.slice(0, 3).map((m, i) => (
              <View key={m._id ?? i} style={[styles.stackItem, i > 0 && styles.stackOverlap, { borderColor: colors.surface }]}>
                <Avatar name={m.name} uri={m.avatarUrl} size={26} />
              </View>
            ))}
          </View>
        ) : null}
        <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
      </Pressable>
      <Pressable
        onPress={handleCopyCode}
        accessibilityRole="button"
        accessibilityLabel={`${t('householdSettingsScreen.copyCode')}: ${household.joinCode}`}
        hitSlop={4}
        style={({ pressed }) => [styles.code, pressed && styles.pressed]}
      >
        <AppText style={[styles.codeLabel, { color: colors.textSecondary }]}>{t('householdSettingsScreen.inviteCode')}</AppText>
        <AppText style={[styles.codeValue, { color: colors.primary }]}>{household.joinCode}</AppText>
        <Ionicons name="copy-outline" size={16} color={colors.primary} />
      </Pressable>
    </View>
  );
};

const PLAQUE_COLUMN = spacing.md + 44 + spacing.sm;

const styles = StyleSheet.create({
  plaque: {
    borderRadius: radii.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  plaqueText: {
    fontFamily: fonts.displayExtrabold,
    includeFontPadding: false,
  },
  row: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xxs,
  },
  content: { flex: 1, minWidth: 0 },
  name: { fontSize: fontSizes.md + 1, fontWeight: fontWeights.semibold },
  detail: { fontSize: fontSizes.sm - 1, marginTop: 2 },
  stack: { flexDirection: 'row', alignItems: 'center' },
  stackItem: { borderWidth: 2, borderRadius: 15 },
  stackOverlap: { marginLeft: -10 },
  code: {
    minHeight: 40,
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: spacing.xs,
    paddingLeft: PLAQUE_COLUMN,
    paddingRight: spacing.md,
    paddingBottom: spacing.xs,
  },
  codeLabel: { fontSize: fontSizes.sm - 1 },
  codeValue: { fontSize: fontSizes.sm, fontWeight: fontWeights.semibold, letterSpacing: 0.6, fontVariant: ['tabular-nums'] },
  pressed: { opacity: 0.6 },
});
