import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { AppText } from '../AppText';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, fontSizes, fontWeights, spacing } from '../../theme';
import { Household } from '../../api/householdsApi';
import * as Clipboard from 'expo-clipboard';
import { Alert } from 'react-native';

interface HouseholdCardProps {
  household: Household;
  onPress: () => void;
  copiedMessage: string;
  memberCountOne: string;
  memberCount: (params: { count: number }) => string;
}

export const HouseholdCard: React.FC<HouseholdCardProps> = ({
  household,
  onPress,
  copiedMessage,
  memberCountOne,
  memberCount,
}) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const count = household.members?.length ?? 0;
  const palette = isDark
    ? {
        card: 'rgba(32,40,60,0.75)',
        border: 'rgba(255,255,255,0.08)',
        shadow: '#060D1D',
        iconBg: 'rgba(40,63,49,0.9)',
        icon: '#6EE7A2',
        heading: '#EEF3FF',
        body: '#B8C4DB',
        subtle: '#8FA0BC',
        codeBg: 'rgba(40,48,70,0.9)',
        chevron: '#95A7C4',
      }
    : {
        card: 'rgba(255,255,255,0.88)',
        border: 'rgba(255,255,255,0.92)',
        shadow: '#000',
        iconBg: '#ECFFF5',
        icon: '#31C96A',
        heading: '#333333',
        body: '#666666',
        subtle: '#8A95A5',
        codeBg: 'rgba(245,248,252,0.95)',
        chevron: '#A5AFBE',
      };

  const styles = React.useMemo(() => StyleSheet.create({
    card: {
      backgroundColor: palette.card,
      borderRadius: 26,
      padding: spacing.lg,
      marginBottom: spacing.md,
      borderWidth: 1,
      borderColor: palette.border,
      shadowColor: palette.shadow,
      shadowOpacity: isDark ? 0.5 : 0.06,
      shadowRadius: 20,
      shadowOffset: { width: 10, height: 10 },
      elevation: 7,
    },
    inner: {
      flexDirection: 'row',
      alignItems: 'flex-start',
    },
    iconWrap: {
      width: 52,
      height: 52,
      borderRadius: 16,
      backgroundColor: palette.iconBg,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: spacing.md,
      borderWidth: 1,
      borderColor: palette.border,
    },
    content: {
      flex: 1,
      minWidth: 0,
    },
    name: {
      fontSize: fontSizes.lg,
      fontWeight: fontWeights.bold,
      color: palette.heading,
      marginBottom: 2,
    },
    address: {
      fontSize: fontSizes.sm,
      color: palette.body,
      marginBottom: spacing.xs,
    },
    metaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      flexWrap: 'wrap',
      gap: spacing.sm,
      marginTop: spacing.xs,
    },
    memberBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    memberText: {
      fontSize: fontSizes.xs,
      color: palette.subtle,
    },
    codeBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: spacing.sm,
      paddingVertical: 4,
      borderRadius: 14,
      backgroundColor: palette.codeBg,
      gap: 4,
    },
    codeText: {
      fontSize: fontSizes.xs,
      color: palette.subtle,
      fontWeight: fontWeights.medium,
    },
  }), [isDark, palette]);

  const handleCopyCode = (e: { stopPropagation?: () => void }) => {
    e?.stopPropagation?.();
    Clipboard.setStringAsync(household.joinCode).then(() => {
      Alert.alert(copiedMessage, '');
    });
  };

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.inner}>
        <View style={styles.iconWrap}>
          <Ionicons name="home" size={26} color={palette.icon} />
        </View>
        <View style={styles.content}>
          <AppText style={styles.name} numberOfLines={1}>{household.name}</AppText>
          {household.address ? (
            <AppText style={styles.address} numberOfLines={1}>{household.address}</AppText>
          ) : null}
          <View style={styles.metaRow}>
            {count > 0 && (
              <View style={styles.memberBadge}>
                <Ionicons name="people-outline" size={14} color={palette.subtle} />
                <AppText style={styles.memberText}>
                  {count === 1 ? memberCountOne : memberCount({ count })}
                </AppText>
              </View>
            )}
            <TouchableOpacity style={styles.codeBadge} onPress={handleCopyCode} activeOpacity={0.8}>
              <AppText style={styles.codeText}>{household.joinCode}</AppText>
              <Ionicons name="copy-outline" size={14} color={palette.subtle} />
            </TouchableOpacity>
          </View>
        </View>
        <Ionicons name="chevron-forward" size={20} color={palette.chevron} style={{ marginTop: 2 }} />
      </View>
    </TouchableOpacity>
  );
};
