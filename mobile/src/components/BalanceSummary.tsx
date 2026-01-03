import React from 'react';
import { View, StyleSheet } from 'react-native';
import { AppText } from './AppText';
import { PairwiseBalance } from '../api/expensesApi';
import { formatCurrency } from '../utils/formatCurrency';
import { formatDateShort } from '../utils/dateHelpers';
import { useThemeColors, fontSizes, fontWeights, radii, spacing, shadows } from '../theme';
import { Avatar } from './ui/Avatar';

interface BalanceSummaryProps {
  balances: PairwiseBalance[];
  currentUserId: string;
  getUserName: (userId: string) => string;
  getUserAvatar?: (userId: string) => string | undefined;
}

export const BalanceSummary: React.FC<BalanceSummaryProps> = ({
  balances,
  currentUserId,
  getUserName,
  getUserAvatar,
}) => {
  const colors = useThemeColors();
  const userBalances = balances.filter(b => b.fromUserId === currentUserId || b.toUserId === currentUserId);

  const styles = React.useMemo(() => StyleSheet.create({
    container: {
      backgroundColor: colors.surface,
      padding: spacing.xl,
      borderRadius: radii.lg,
      marginBottom: spacing.lg,
      borderWidth: 1,
      borderColor: colors.borderLight,
      ...(shadows.sm as object),
    },
    title: {
      fontSize: fontSizes.lg,
      fontWeight: fontWeights.extrabold,
      color: colors.text,
      marginBottom: spacing.md,
    },
    balanceRow: {
      paddingVertical: spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: colors.borderLight,
    },
    balanceContent: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
    },
    balanceTextContainer: {
      flex: 1,
      flexShrink: 1,
    },
    balanceText: {
      fontSize: fontSizes.md,
      color: colors.text,
      flexShrink: 1,
    },
    sinceDate: {
      fontSize: fontSizes.xs,
      color: colors.textTertiary,
      marginTop: spacing.xxs,
    },
    userName: {
      fontWeight: fontWeights.semibold,
    },
    amountPositive: {
      color: colors.success,
      fontWeight: fontWeights.extrabold,
    },
    amountNegative: {
      color: colors.danger,
      fontWeight: fontWeights.extrabold,
    },
    emptyText: {
      fontSize: fontSizes.md,
      color: colors.textSecondary,
      textAlign: 'center',
      padding: spacing.lg,
    },
  }), [colors]);

  if (userBalances.length === 0) {
    return (
      <View style={styles.container}>
        <AppText style={styles.emptyText}>All settled up! 🎉</AppText>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <AppText style={styles.title}>Your Balances</AppText>
      {userBalances.map((balance, index) => {
        const isOwed = balance.toUserId === currentUserId;
        const otherUserId = isOwed ? balance.fromUserId : balance.toUserId;
        
        const otherUserName = getUserName(otherUserId);
        const otherUserAvatar = getUserAvatar?.(otherUserId);
        
        return (
          <View key={index} style={styles.balanceRow}>
            <View style={styles.balanceContent}>
              <Avatar name={otherUserName} uri={otherUserAvatar} size={32} />
              <View style={styles.balanceTextContainer}>
                {isOwed ? (
                  <AppText style={styles.balanceText}>
                    <AppText style={styles.userName}>{otherUserName}</AppText>
                    {' owes you '}
                    <AppText style={styles.amountPositive}>{formatCurrency(balance.amount)}</AppText>
                  </AppText>
                ) : (
                  <AppText style={styles.balanceText}>
                    You owe <AppText style={styles.userName}>{otherUserName}</AppText>
                    {' '}
                    <AppText style={styles.amountNegative}>{formatCurrency(balance.amount)}</AppText>
                  </AppText>
                )}
                {balance.sinceDate && (
                  <AppText style={styles.sinceDate}>
                    since {formatDateShort(balance.sinceDate)}
                  </AppText>
                )}
              </View>
            </View>
          </View>
        );
      })}
    </View>
  );
};

<<<<<<< HEAD
=======
const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    padding: spacing.xl,
    borderRadius: radii.lg,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...(shadows.sm as object),
  },
  title: {
    fontSize: fontSizes.lg,
    fontWeight: fontWeights.extrabold,
    color: colors.text,
    marginBottom: spacing.md,
  },
  balanceRow: {
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  balanceContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  balanceTextContainer: {
    flex: 1,
    flexShrink: 1,
  },
  balanceText: {
    fontSize: fontSizes.md,
    color: colors.text,
    flexShrink: 1,
  },
  sinceDate: {
    fontSize: fontSizes.xs,
    color: colors.textTertiary,
    marginTop: spacing.xxs,
  },
  userName: {
    fontWeight: fontWeights.semibold,
  },
  amountPositive: {
    color: colors.success,
    fontWeight: fontWeights.extrabold,
  },
  amountNegative: {
    color: colors.danger,
    fontWeight: fontWeights.extrabold,
  },
  emptyText: {
    fontSize: fontSizes.md,
    color: colors.textSecondary,
    textAlign: 'center',
    padding: spacing.lg,
  },
});

>>>>>>> 1df1ba5d13d9522aa065c910c9295011455d243d
