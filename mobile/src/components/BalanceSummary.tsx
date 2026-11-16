import React, { useEffect, useState } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { format, isThisYear, parseISO } from 'date-fns';
import { PairwiseBalance } from '../api/expensesApi';
import { useLanguage } from '../context/LanguageContext';
import { fontSizes, fontWeights, radii, spacing, useThemeColors } from '../theme';
import { getDateFnsLocale } from '../utils/dateLocales';
import { useHouseholdCurrency } from '../utils/useHouseholdCurrency';
import { AppText } from './AppText';
import { Amount } from './ui/Amount';
import { Avatar } from './ui/Avatar';
import { GroupRow } from './ui/Group';

interface BalanceSummaryProps {
  balances: PairwiseBalance[];
  currentUserId: string;
  getUserName: (userId: string) => string;
  getUserAvatar?: (userId: string) => string | undefined;
  hideTitle?: boolean;
  variant?: 'card' | 'plain';
}

const BALANCE_ROWS_PAGE_SIZE = 5;

export const BalanceSummary: React.FC<BalanceSummaryProps> = ({
  balances,
  currentUserId,
  getUserName,
  getUserAvatar,
  hideTitle = false,
  variant = 'card',
}) => {
  const colors = useThemeColors();
  const { t, language } = useLanguage();
  const dateLocale = React.useMemo(() => getDateFnsLocale(language), [language]);
  const currency = useHouseholdCurrency();
  const [visibleRows, setVisibleRows] = useState(BALANCE_ROWS_PAGE_SIZE);
  const userBalances = balances.filter(b => b.fromUserId === currentUserId || b.toUserId === currentUserId);

  useEffect(() => {
    setVisibleRows(BALANCE_ROWS_PAGE_SIZE);
  }, [balances, currentUserId]);

  const rowsToShow = userBalances.slice(0, visibleRows);
  const hasMoreBalanceRows = visibleRows < userBalances.length;

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
      borderWidth: 0,
      borderColor: colors.borderLight,

    },
    containerPlain: {
      backgroundColor: colors.surface,
      paddingHorizontal: 0,
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
      marginHorizontal: spacing.md,
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.md,
      justifyContent: 'space-between',
      marginBottom: spacing.md,
      paddingBottom: spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: colors.borderLight,
    },
    summaryItem: {
      flex: 1,
      flexBasis: 120,
      minWidth: 0,
      gap: spacing.xxs,
    },
    summaryLabel: {
      fontSize: fontSizes.xs,
      color: colors.textSecondary,
      marginBottom: spacing.xxs,
    },
    emptyText: {
      fontSize: fontSizes.md,
      color: colors.textSecondary,
      textAlign: 'center',
      padding: spacing.lg,
    },
    separator: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: colors.borderLight,
      marginLeft: spacing.md + 36 + spacing.sm,
    },
    loadMore: {
      alignItems: 'center',
      minHeight: 44,
      justifyContent: 'center',
      paddingTop: spacing.sm,
    },
    loadMoreText: {
      fontSize: fontSizes.sm,
      fontWeight: fontWeights.semibold,
      color: colors.primary,
    },
  }), [colors]);

  const wrapStyle = variant === 'plain' ? [styles.container, styles.containerPlain] : styles.container;

  if (userBalances.length === 0) {
    return (
      <View style={wrapStyle}>
        <AppText style={styles.emptyText}>{t('home.allSettled')}</AppText>
      </View>
    );
  }

  return (
    <View style={wrapStyle}>
      {!hideTitle && <AppText style={styles.title}>{t('home.balanceSummary')}</AppText>}
      {userBalances.length > 3 && (totalOwedToYou > 0 || totalYouOwe > 0) && (
        <View style={styles.summaryRow}>
          {totalOwedToYou > 0 && (
            <View style={styles.summaryItem}>
              <AppText style={styles.summaryLabel}>{t('home.youAreOwed')}</AppText>
              <Amount value={totalOwedToYou} currency={currency} direction="owed" size={28} fit />
            </View>
          )}
          {totalYouOwe > 0 && (
            <View style={styles.summaryItem}>
              <AppText style={styles.summaryLabel}>{t('home.youOwe')}</AppText>
              <Amount value={totalYouOwe} currency={currency} direction="owe" size={28} fit />
            </View>
          )}
        </View>
      )}
      {rowsToShow.map((balance, index) => {
        const isOwed = balance.toUserId === currentUserId;
        const otherUserId = isOwed ? balance.fromUserId : balance.toUserId;

        const otherUserName = getUserName(otherUserId);
        const otherUserAvatar = getUserAvatar?.(otherUserId);
        const rowKey = `${balance.fromUserId}-${balance.toUserId}`;
        const sinceDate = balance.sinceDate ? parseISO(balance.sinceDate) : null;
        const since = sinceDate
          ? ` · ${t('time.since')} ${format(sinceDate, isThisYear(sinceDate) ? 'MMM d' : 'MMM d, yyyy', { locale: dateLocale })}`
          : '';

        return (
          <React.Fragment key={rowKey}>
            {index > 0 ? <View style={styles.separator} /> : null}
            <GroupRow
              title={otherUserName}
              subtitle={`${isOwed ? t('settleUp.owesYou') : t('home.youOwe')}${since}`}
              titleLines={0}
              leading={<Avatar name={otherUserName} uri={otherUserAvatar} size={36} />}
              trailing={<Amount value={balance.amount} currency={currency} direction={isOwed ? 'owed' : 'owe'} size={22} fit />}
            />
          </React.Fragment>
        );
      })}
      {hasMoreBalanceRows ? (
        <TouchableOpacity
          accessibilityRole="button"
          style={styles.loadMore}
          onPress={() => setVisibleRows((n) => n + BALANCE_ROWS_PAGE_SIZE)}
          activeOpacity={0.75}
        >
          <AppText style={styles.loadMoreText}>
            {t('common.loadMore')} ({rowsToShow.length}/{userBalances.length})
          </AppText>
        </TouchableOpacity>
      ) : null}
    </View>
  );
};
