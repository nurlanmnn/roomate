import React from 'react';
import { Alert, View, StyleSheet, Pressable } from 'react-native';
import { AppText } from '../AppText';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors, fontSizes, fontWeights, radii, spacing } from '../../theme';
import { useLanguage } from '../../context/LanguageContext';
import { Household } from '../../api/householdsApi';
import * as Clipboard from 'expo-clipboard';

interface HouseholdCardProps {
  household: Household;
  onPress: () => void;
  copiedMessage: string;
  memberCountOne: string;
  memberCount: (params: { count: number }) => string;
}

export const HouseholdCard: React.FC<HouseholdCardProps> = ({
  household, onPress, copiedMessage, memberCountOne, memberCount,
}) => {
  const colors = useThemeColors();
  const { t } = useLanguage();
  const count = household.members?.length ?? 0;

  const handleCopyCode = (e: { stopPropagation?: () => void }) => {
    e?.stopPropagation?.();
    Clipboard.setStringAsync(household.joinCode).then(() => {
      Alert.alert(copiedMessage, '');
    });
  };

  return (
    <View style={[styles.card, { backgroundColor: colors.surface }]}>
      <Pressable onPress={onPress} accessibilityRole="button"
        style={({ pressed }) => [styles.row, pressed && { backgroundColor: colors.primaryUltraSoft }]}>
        <View style={[styles.iconWrap, { backgroundColor: colors.primaryUltraSoft }]}>
          <Ionicons name="home-outline" size={22} color={colors.primary} />
        </View>
        <View style={styles.content}>
          <AppText style={[styles.name, { color: colors.text }]}>{household.name}</AppText>
          {household.address ? <AppText style={[styles.detail, { color: colors.textSecondary }]}>{household.address}</AppText> : null}
          {count > 0 ? (
            <View style={styles.members}>
              <Ionicons name="people-outline" size={18} color={colors.textSecondary} />
              <AppText style={[styles.memberText, { color: colors.textSecondary }]}>
                {count === 1 ? memberCountOne : memberCount({ count })}
              </AppText>
            </View>
          ) : null}
        </View>
        <Ionicons name="chevron-forward-outline" size={18} color={colors.textTertiary} />
      </Pressable>
      <View style={[styles.codeRow, { borderTopColor: colors.borderLight }]}>
        <AppText style={[styles.codeLabel, { color: colors.textSecondary }]}>{t('householdSettingsScreen.inviteCode')}</AppText>
        <Pressable onPress={handleCopyCode} accessibilityRole="button"
          accessibilityLabel={`${t('householdSettingsScreen.copyCode')}: ${household.joinCode}`}
          style={({ pressed }) => [styles.codeButton, pressed && styles.pressed]}>
          <AppText style={[styles.code, { color: colors.primary }]}>{household.joinCode}</AppText>
          <Ionicons name="copy-outline" size={20} color={colors.primary} />
        </Pressable>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: { borderRadius: radii.lg, marginBottom: spacing.sm, overflow: 'hidden' },
  row: { minHeight: 60, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.md },
  iconWrap: { width: 36, height: 36, borderRadius: radii.sm, alignItems: 'center', justifyContent: 'center' },
  content: { flex: 1, minWidth: 0 },
  name: { fontSize: fontSizes.md, fontWeight: fontWeights.semibold },
  detail: { fontSize: fontSizes.sm, marginTop: spacing.xxs },
  members: { flexDirection: 'row', alignItems: 'center', gap: spacing.xxs, marginTop: spacing.xs },
  memberText: { fontSize: fontSizes.sm, flex: 1 },
  codeRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: spacing.xs, marginHorizontal: spacing.md, paddingVertical: spacing.xxs, borderTopWidth: StyleSheet.hairlineWidth },
  codeLabel: { fontSize: fontSizes.sm, flexShrink: 1 },
  codeButton: { minWidth: 44, minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: spacing.xs, paddingHorizontal: spacing.xs, maxWidth: '100%' },
  code: { fontSize: fontSizes.sm, fontWeight: fontWeights.semibold, flexShrink: 1 },
  pressed: { opacity: 0.6 },
});
