import React from 'react';
import { StyleSheet, View } from 'react-native';
import { AppText } from '../AppText';
import { Avatar } from '../ui/Avatar';
import { Group, GroupRow } from '../ui/Group';
import { useThemeColors, fontSizes, spacing } from '../../theme';

interface ProfileHeaderCardProps {
  name?: string;
  email?: string;
  householdName?: string | null;
  avatarUri?: string;
  onPress: () => void;
  editHint: string;
}

/** Plain profile entry in the same inset group system as the settings below it. */
export const ProfileHeaderCard: React.FC<ProfileHeaderCardProps> = ({
  name,
  email,
  householdName,
  avatarUri,
  onPress,
  editHint,
}) => {
  const colors = useThemeColors();

  return (
    <View style={styles.wrap}>
      <Group>
        <GroupRow
          title={name || '—'}
          titleLines={0}
          subtitle={[email, householdName].filter(Boolean).join('\n')}
          leading={<Avatar name={name} uri={avatarUri} size={44} />}
          onPress={onPress}
          accessibilityHint={editHint}
          chevron
        />
      </Group>
      <AppText style={[styles.hint, { color: colors.textSecondary }]}>{editHint}</AppText>
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    marginTop: spacing.md,
  },
  hint: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xs,
    fontSize: fontSizes.sm,
  },
});
