import React from 'react';
import { View, StyleSheet } from 'react-native';
import { AppText } from './AppText';
import { PairwiseBalance } from '../api/expensesApi';
import { formatCurrency } from '../utils/formatCurrency';
import { formatDateShort } from '../utils/dateHelpers';
import { useThemeColors, fontSizes, fontWeights, radii, spacing, shadows } from '../theme';
import { Avatar } from './ui/Avatar';
import { useLanguage } from '../context/LanguageContext';

interface BalanceSummaryProps {
  balances: PairwiseBalance[];
  currentUserId: string;
  getUserName: (userId: string) => string;
  getUserAvatar?: (userId: string) => string | undefined;
  hideTitle?: boolean;
  variant?: 'card' | 'plain';
}

export const BalanceSummary: React.FC<BalanceSummaryProps> = ({
  balances,
  currentUserId,
  getUserName,
  getUserAvatar,
  hideTitle = false,
  variant = 'card',
}) => {
  const colors = useThemeColors();
  const { t } = useLanguage();
  const userBalances = balances.filter(b => b.fromUserId === currentUserId || b.toUserId === currentUserId);

  const totalOwedToYou = userBalances
    .filter(b => b.toUserId === currentUserId)
    .reduce((sum, b) => sum + b.amount, 0);
  const totalYouOwe = userBalances
    .filter(b => b.fromUserId === currentUserId)
    .reduce((sum, b) => sum + b.amount, 0);

  const styles = React.useMemo(() => StyleSheet.create({
    container: {
      backgroundColor: colors.surface,
      padding: spacing.lg,
      borderRadius: radii.lg,
      borderWidth: 1,
      borderColor: colors.borderLight,
      ...(shadows.sm as object),
    },
    containerPlain: {
      backgroundColor: 'transparent',
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      borderWidth: 0,
      borderRadius: 0,
    },
    title: {
      fontSize: fontSizes.lg,
      fontWeight: fontWeights.bold,
      color: colors.text,
      marginBottom: spacing.md,
    },
    summaryRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: spacing.md,
      paddingBottom: spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: colors.borderLight,
    },
    summaryItem: {
      alignItems: 'center',
    },
    summaryLabel: {
      fontSize: fontSizes.xs,
      color: colors.textSecondary,
      marginBottom: 2,
    },
    summaryValue: {
      fontSize: fontSizes.md,
      fontWeight: fontWeights.bold,
      fontVariant: ['tabular-nums'],
    },
    balanceRow: {
      paddingVertical: spacing.sm,
      borderBottomWidth: 1,
      borderBottomColor: colors.borderLight,
    },
    balanceRowLast: {
      borderBottomWidth: 0,
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

  const wrapStyle = variant === 'plain' ? [styles.container, styles.containerPlain] : styles.container;

  if (userBalances.length === 0) {
    return (
      <View style={wrapStyle}>
        <AppText style={styles.emptyText}>{t('home.allSettled')} 🎉</AppText>
      </View>
    );
  }

  return (
    <View style={wrapStyle}>
      {!hideTitle && <AppText style={styles.title}>{t('home.balanceSummary')}</AppText>}
      {(totalOwedToYou > 0 || totalYouOwe > 0) && (
        <View style={styles.summaryRow}>
          {totalOwedToYou > 0 && (
            <View style={styles.summaryItem}>
              <AppText style={styles.summaryLabel}>{t('home.youAreOwed')}</AppText>
              <AppText style={[styles.summaryValue, { color: colors.success }]}>{formatCurrency(totalOwedToYou)}</AppText>
            </View>
          )}
          {totalYouOwe > 0 && (
            <View style={styles.summaryItem}>
              <AppText style={styles.summaryLabel}>{t('home.youOwe')}</AppText>
              <AppText style={[styles.summaryValue, { color: colors.danger }]}>{formatCurrency(totalYouOwe)}</AppText>
            </View>
          )}
        </View>
      )}
      {userBalances.map((balance, index) => {
        const isOwed = balance.toUserId === currentUserId;
        const otherUserId = isOwed ? balance.fromUserId : balance.toUserId;
        
        const otherUserName = getUserName(otherUserId);
        const otherUserAvatar = getUserAvatar?.(otherUserId);
        
        return (
          <View key={index} style={[styles.balanceRow, index === userBalances.length - 1 && styles.balanceRowLast]}>
            <View style={styles.balanceContent}>
              <Avatar name={otherUserName} uri={otherUserAvatar} size={32} />
              <View style={styles.balanceTextContainer}>
                {isOwed ? (
                  <AppText style={styles.balanceText}>
                    <AppText style={styles.userName}>{otherUserName}</AppText>
                    {' '}{t('settleUp.owesYou').toLowerCase()}{' '}
                    <AppText style={styles.amountPositive}>{formatCurrency(balance.amount)}</AppText>
                  </AppText>
                ) : (
                  <AppText style={styles.balanceText}>
                    {t('home.youOwe')} <AppText style={styles.userName}>{otherUserName}</AppText>
                    {' '}
                    <AppText style={styles.amountNegative}>{formatCurrency(balance.amount)}</AppText>
                  </AppText>
                )}
                {balance.sinceDate && (
                  <AppText style={styles.sinceDate}>
                    {t('time.since')} {formatDateShort(balance.sinceDate)}
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
