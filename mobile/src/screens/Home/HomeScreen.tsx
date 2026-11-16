import React, { useEffect, useState, useRef } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl, Pressable, Share } from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { AppText } from '../../components/AppText';
import { useHousehold } from '../../context/HouseholdContext';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { eventsApi, Event } from '../../api/eventsApi';
import { expensesApi, PairwiseBalance, HomeExpenseSummary } from '../../api/expensesApi';
import { shoppingApi } from '../../api/shoppingApi';
import { choresApi, ChoreRotation } from '../../api/choresApi';
import { PrimaryButton } from '../../components/PrimaryButton';
import { HomeInviteCard } from '../../components/Home/HomeInviteCard';
import { EnamelHeader } from '../../components/ui/EnamelHeader';
import { Group, GroupRow, SectionHeading } from '../../components/ui/Group';
import { Amount } from '../../components/ui/Amount';
import { Avatar } from '../../components/ui/Avatar';
import { LoadingSkeleton } from '../../components/LoadingSkeleton';
import { formatCurrency } from '../../utils/formatCurrency';
import { formatDate } from '../../utils/dateHelpers';
import { getDateFnsLocale } from '../../utils/dateLocales';
import { useHouseholdCurrency } from '../../utils/useHouseholdCurrency';
import { useThemeColors, fontSizes, fontWeights, spacing, radii, TAB_BAR_HEIGHT } from '../../theme';
import { getCached, dedupedFetch, DEFAULT_STALE_TIME_MS, isFresh } from '../../utils/queryCache';
import { prefetchBalanceHistoryData } from '../../utils/balanceHistoryDataCache';

type HomeDashboardSnapshot = {
  homeSummary: HomeExpenseSummary;
  balances: PairwiseBalance[];
  events: Event[];
  shoppingStats: { total: number; pending: number };
};

const homeDashboardKey = (householdId: string) => `home:dashboard:${householdId}`;

/** How far the action buttons ride up over the enamel field. */
const ACTIONS_OVERLAP = 27;
const HOME_EVENTS_SHOWN = 3;

const EVENT_ICONS: Record<Event['type'], keyof typeof Ionicons.glyphMap> = {
  bill: 'receipt-outline',
  cleaning: 'sparkles-outline',
  social: 'people-outline',
  meal: 'restaurant-outline',
  meeting: 'chatbubbles-outline',
  maintenance: 'construct-outline',
  shopping: 'cart-outline',
  trip: 'airplane-outline',
  birthday: 'gift-outline',
  reminder: 'alarm-outline',
  other: 'calendar-outline',
};

export const HomeScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { selectedHousehold, setSelectedHousehold } = useHousehold();
  const { user } = useAuth();
  const colors = useThemeColors();
  const { t, language } = useLanguage();
  const dateLocale = React.useMemo(() => getDateFnsLocale(language), [language]);
  const currency = useHouseholdCurrency();
  const [events, setEvents] = useState<Event[]>([]);
  const [balances, setBalances] = useState<PairwiseBalance[]>([]);
  const [homeSummary, setHomeSummary] = useState<HomeExpenseSummary | null>(null);
  const [shoppingStats, setShoppingStats] = useState({ total: 0, pending: 0 });
  const [chores, setChores] = useState<ChoreRotation[]>([]);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  /** True only after a successful home fetch: avoids showing "setup" when the API failed and state stayed empty. */
  const [dashboardLoadOk, setDashboardLoadOk] = useState(false);
  const scrollRef = useRef<ScrollView>(null);
  /** Only the latest home fetch may commit (avoids duplicate effects + out-of-order responses). */
  const loadGenRef = useRef(0);
  const prevHouseholdIdRef = useRef<string | undefined>(undefined);
  const loadDataRef = useRef<((opts?: { allowStale?: boolean }) => void) | undefined>(undefined);

  useFocusEffect(
    React.useCallback(() => {
      scrollRef.current?.scrollTo({ y: 0, animated: false });
      // SWR-style: a fresh cache snapshot satisfies the focus reload, so flipping between
      // tabs doesn't refetch every time. A create/delete invalidates the key.
      loadDataRef.current?.({ allowStale: true });
    }, [])
  );

  const householdId = selectedHousehold?._id;

  // Drop stale dashboard data when switching households; invalidate any in-flight fetch.
  useEffect(() => {
    const hid = selectedHousehold?._id;
    if (!hid) {
      prevHouseholdIdRef.current = undefined;
      return;
    }
    if (prevHouseholdIdRef.current !== hid) {
      prevHouseholdIdRef.current = hid;
      loadGenRef.current += 1;

      // Hydrate synchronously from the SWR cache so a returning user sees the
      // last-seen dashboard immediately; the background fetch below will
      // refresh it. Only fall back to skeleton when we truly have nothing.
      const snapshot = getCached<HomeDashboardSnapshot>(homeDashboardKey(hid));
      if (snapshot) {
        setEvents(snapshot.events);
        setBalances(snapshot.balances);
        setHomeSummary(snapshot.homeSummary);
        setShoppingStats(snapshot.shoppingStats);
        setDashboardLoadOk(true);
        setInitialLoading(false);
      } else {
        setEvents([]);
        setBalances([]);
        setHomeSummary(null);
        setShoppingStats({ total: 0, pending: 0 });
        setChores([]);
        setInitialLoading(true);
        setDashboardLoadOk(false);
      }
      setLoadError(false);
    }
  }, [selectedHousehold?._id]);

  /** Chores are a secondary read: failures leave the Today list without chore rows. */
  const loadChores = React.useCallback((hid: string) => {
    choresApi
      .getChores(hid)
      .then((data) => {
        if (prevHouseholdIdRef.current === hid) setChores(Array.isArray(data) ? data : []);
      })
      .catch(() => {
        /* non-blocking */
      });
  }, []);

  const loadData = React.useCallback(async (opts?: { allowStale?: boolean }) => {
    if (!householdId) return;

    const gen = ++loadGenRef.current;
    const skipSpinner =
      Boolean(getCached<HomeDashboardSnapshot>(homeDashboardKey(householdId))) &&
      Boolean(opts?.allowStale) &&
      isFresh(homeDashboardKey(householdId), DEFAULT_STALE_TIME_MS);
    if (!skipSpinner) {
      setLoading(true);
    }
    setLoadError(false);
    loadChores(householdId);
    try {
      const snapshot = await dedupedFetch<HomeDashboardSnapshot>(
        homeDashboardKey(householdId),
        async () => {
          const [homeData, balancesData, eventsRaw, shoppingStatsData] = await Promise.all([
            expensesApi.getHomeExpenseSummary(householdId),
            expensesApi.getBalances(householdId),
            eventsApi.getEvents(householdId, { upcoming: true, limit: 40 }),
            shoppingApi.getHouseholdItemStats(householdId),
          ]);
          const eventsData = Array.isArray(eventsRaw) ? eventsRaw : eventsRaw.items;
          const upcomingEvents = eventsData
            .filter((e) => new Date(e.date) >= new Date())
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
          return {
            homeSummary: homeData,
            balances: balancesData,
            events: upcomingEvents,
            shoppingStats: shoppingStatsData,
          };
        },
        { staleTime: opts?.allowStale ? DEFAULT_STALE_TIME_MS : 0 }
      );

      if (gen !== loadGenRef.current) return;

      setEvents(snapshot.events);
      setBalances(snapshot.balances);
      setHomeSummary(snapshot.homeSummary);
      setShoppingStats(snapshot.shoppingStats);
      setDashboardLoadOk(true);
    } catch (error: any) {
      if (gen !== loadGenRef.current) return;
      setDashboardLoadOk(false);
      const status = error?.response?.status;
      if (status === 403) {
        if (__DEV__) {
          console.warn(
            '[Home] 403: no access to this household — clearing selection (rejoin or pick another).'
          );
        }
        setLoadError(false);
        setSelectedHousehold(null);
      } else {
        if (__DEV__) console.error('Failed to load home data:', error);
      }
      setLoadError(true);
    } finally {
      if (gen === loadGenRef.current) {
        setLoading(false);
        setInitialLoading(false);
      }
    }
  }, [householdId, setSelectedHousehold, loadChores]);

  useEffect(() => {
    loadDataRef.current = loadData;
  }, [loadData]);

  /** Load on mount and when household changes. The focus effect also calls
   *  loadData on every tab focus, but via the SWR cache it's non-blocking
   *  (instant paint, background refresh). */
  useEffect(() => {
    if (householdId) {
      loadData();
    }
  }, [householdId, loadData]);

  const getUserName = (userId: string): string => {
    if (!selectedHousehold) return 'Unknown';
    const member = selectedHousehold.members.find(m => m._id === userId);
    return member?.name || 'Unknown';
  };

  const getUserAvatar = (userId: string): string | undefined => {
    if (!selectedHousehold) return undefined;
    const member = selectedHousehold.members.find(m => m._id === userId);
    return member?.avatarUrl;
  };

  // Calculate stats
  const calculateStats = () => {
    const monthlyExpenses = homeSummary?.calendarMonthTotal ?? 0;

    const pendingShopping = shoppingStats.pending;

    // Upcoming events count
    const upcomingEventsCount = events.length;

    // Net balance for current user
    let netBalance = 0;
    if (user) {
      const userOwed = balances
        .filter(b => b.fromUserId === user._id)
        .reduce((sum, b) => sum + b.amount, 0);
      const userOwedTo = balances
        .filter(b => b.toUserId === user._id)
        .reduce((sum, b) => sum + b.amount, 0);
      netBalance = userOwedTo - userOwed;
    }

    return {
      monthlyExpenses,
      pendingShopping,
      upcomingEventsCount,
      netBalance,
    };
  };

  const stats = calculateStats();
  const hasData =
    (homeSummary?.expenseCount ?? 0) > 0 ||
    events.length > 0 ||
    shoppingStats.total > 0 ||
    balances.length > 0;

  const setupInviteDone = (selectedHousehold?.members?.length ?? 0) > 1;
  const setupExpenseDone = (homeSummary?.expenseCount ?? 0) > 0;
  const setupShoppingDone = shoppingStats.total > 0;
  const setupDoneCount = [setupInviteDone, setupExpenseDone, setupShoppingDone].filter(Boolean).length;

  const handleShareInvite = async () => {
    if (!selectedHousehold?.joinCode) {
      navigation.getParent()?.navigate('HouseholdSettings');
      return;
    }
    try {
      await Share.share({
        message: String(
          t('householdSettingsScreen.shareMessage', { code: selectedHousehold.joinCode })
        ),
        title: selectedHousehold.name,
      });
    } catch {
      /* dismissed */
    }
  };
  const openBalances = () => {
    if (selectedHousehold?._id) prefetchBalanceHistoryData(selectedHousehold._id);
    navigation.getParent()?.navigate('BalanceHistory');
  };

  if (!selectedHousehold) {
    return (
      <View style={[styles.root, styles.centered, { backgroundColor: colors.background }]}>
        <AppText style={[styles.bodyText, { color: colors.textSecondary }]}>
          {t('home.pleaseSelectHousehold')}
        </AppText>
      </View>
    );
  }

  // Balances that involve the signed-in user, largest first.
  const myBalances = user
    ? balances
        .filter((b) => b.fromUserId === user._id || b.toUserId === user._id)
        .map((b) => {
          const owedToMe = b.toUserId === user._id;
          const otherId = owedToMe ? b.fromUserId : b.toUserId;
          return { otherId, owedToMe, amount: b.amount, name: getUserName(otherId), avatar: getUserAvatar(otherId) };
        })
        .sort((a, b) => b.amount - a.amount)
    : [];

  const net = stats.netBalance;
  const settled = Math.abs(net) < 0.005;
  const heroLabel = settled ? t('home.allSettled') : net > 0 ? t('home.youAreOwed') : t('home.youOwe');
  const heroPeople = myBalances.slice(0, 2);
  const heroLine = heroPeople
    .map((b) =>
      b.owedToMe
        ? t('home.owesYouLine', { name: b.name, amount: formatCurrency(b.amount, currency) })
        : t('home.youOweLine', { name: b.name, amount: formatCurrency(b.amount, currency) })
    )
    .join('  ·  ');

  const myChores = user
    ? chores.filter((c) => c.currentAssignee?._id === user._id && !c.currentPeriodCompleted)
    : [];
  const nextEvents = events.slice(0, HOME_EVENTS_SHOWN);
  const relativeDays = { today: t('time.today'), tomorrow: t('time.tomorrow'), yesterday: t('time.yesterday') };
  const showSetup = dashboardLoadOk && !hasData;

  const householdSwitcher = (
    <Pressable
      onPress={() => navigation.getParent()?.navigate('HouseholdSelect')}
      accessibilityRole="button"
      accessibilityLabel={`${selectedHousehold.name}. ${t('householdSettingsScreen.switchHousehold')}`}
      hitSlop={8}
      style={({ pressed }) => [styles.switcher, pressed && styles.pressed]}
    >
      <AppText style={[styles.switcherText, { color: colors.onEnamel }]} numberOfLines={1}>
        {selectedHousehold.name}
      </AppText>
      <Ionicons name="chevron-down" size={16} color={colors.onEnamel} />
    </Pressable>
  );

  const profileButton = (
    <Pressable
      onPress={() => navigation.getParent()?.navigate('Settings')}
      accessibilityRole="button"
      accessibilityLabel={t('settings.title')}
      hitSlop={6}
      style={({ pressed }) => [styles.profileButton, { borderColor: colors.marigold }, pressed && styles.pressed]}
    >
      <Avatar name={user?.name} uri={user?.avatarUrl} size={36} />
    </Pressable>
  );

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <ScrollView
        ref={scrollRef}
        style={styles.root}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={loadData} tintColor={colors.onEnamel} />
        }
      >
        {/* Keeps the pull-to-refresh overscroll area enamel instead of exposing the ground. */}
        <View style={[styles.overscrollFill, { backgroundColor: colors.enamel }]} />

        <EnamelHeader
          leading={householdSwitcher}
          right={profileButton}
          overlap={radii.xl + ACTIONS_OVERLAP}
        >
          {initialLoading ? (
            <View style={styles.heroSkeleton}>
              <LoadingSkeleton width={120} height={16} />
              <LoadingSkeleton width={220} height={84} style={{ marginTop: spacing.sm }} />
            </View>
          ) : (
            <Pressable
              onPress={openBalances}
              accessibilityRole="button"
              accessibilityLabel={`${heroLabel}${settled ? '' : ` ${formatCurrency(Math.abs(net), currency)}`}. ${heroLine}`}
              accessibilityHint={t('home.balanceSummary')}
              style={({ pressed }) => [styles.hero, pressed && styles.pressed]}
            >
              <AppText style={[styles.heroLabel, { color: colors.onEnamelSecondary }]}>{heroLabel}</AppText>
              <Amount
                value={Math.abs(net)}
                currency={currency}
                size={104}
                weight="extrabold"
                color={colors.onEnamel}
                fit
                style={styles.heroAmount}
              />
              {heroPeople.length > 0 ? (
                <View style={styles.heroPeople}>
                  <View style={styles.avatarStack}>
                    {heroPeople.map((b, i) => (
                      <View
                        key={b.otherId}
                        style={[styles.stackedAvatar, { borderColor: colors.enamel, marginLeft: i === 0 ? 0 : -8 }]}
                      >
                        <Avatar name={b.name} uri={b.avatar} size={26} />
                      </View>
                    ))}
                  </View>
                  <AppText style={[styles.heroLine, { color: colors.onEnamel }]} numberOfLines={2}>
                    {heroLine}
                  </AppText>
                </View>
              ) : null}
            </Pressable>
          )}
        </EnamelHeader>

        <View style={[styles.sheet, { backgroundColor: colors.background }]}>
          <View style={styles.actions}>
            <PrimaryButton
              variant="ink"
              icon="add"
              title={t('home.addExpense')}
              onPress={() => navigation.getParent()?.navigate('CreateExpense')}
              style={styles.action}
            />
            <PrimaryButton
              variant="secondary"
              icon="swap-horizontal"
              title={t('home.settleUp')}
              onPress={() => navigation.getParent()?.navigate('SettleUp')}
              style={styles.action}
            />
          </View>

          {loadError ? (
            <View
              style={[styles.errorBanner, { backgroundColor: colors.dangerSoft }]}
              accessibilityRole="alert"
            >
              <Ionicons name="cloud-offline-outline" size={20} color={colors.danger} />
              <AppText style={[styles.errorText, { color: colors.text }]}>{t('home.couldNotConnect')}</AppText>
            </View>
          ) : null}

          {initialLoading ? (
            <View style={styles.listSkeleton}>
              <LoadingSkeleton width={110} height={20} />
              <LoadingSkeleton width="100%" height={180} borderRadius={radii.lg} style={{ marginTop: spacing.sm }} />
            </View>
          ) : null}

          {showSetup ? (
            <>
              <SectionHeading title={t('home.setupStepsHeading')} />
              <AppText style={[styles.sectionNote, { color: colors.textSecondary }]}>
                {t('home.setupProgress', { done: setupDoneCount, total: 3 })}
              </AppText>
              {selectedHousehold.joinCode ? (
                <View style={styles.inviteWrap}>
                  <HomeInviteCard joinCode={selectedHousehold.joinCode} householdName={selectedHousehold.name} />
                </View>
              ) : null}
              <Group>
                <GroupRow
                  icon={setupInviteDone ? 'checkmark-circle' : 'person-add-outline'}
                  iconTone={setupInviteDone ? 'neutral' : 'primary'}
                  title={t('home.setupStep1Title')}
                  subtitle={t('home.setupStep1Subtitle')}
                  onPress={handleShareInvite}
                  chevron
                />
                <GroupRow
                  icon={setupExpenseDone ? 'checkmark-circle' : 'wallet-outline'}
                  iconTone={setupExpenseDone ? 'neutral' : 'primary'}
                  title={t('home.setupStep2Title')}
                  subtitle={t('home.setupStep2Subtitle')}
                  onPress={() => navigation.getParent()?.navigate('CreateExpense')}
                  chevron
                />
                <GroupRow
                  icon={setupShoppingDone ? 'checkmark-circle' : 'cart-outline'}
                  iconTone={setupShoppingDone ? 'neutral' : 'primary'}
                  title={t('home.setupStep3Title')}
                  subtitle={t('home.setupStep3Subtitle')}
                  onPress={() => navigation.navigate('Shopping')}
                  chevron
                />
              </Group>
            </>
          ) : null}

          {!initialLoading && !showSetup ? (
            <>
              <SectionHeading title={t('time.today')} />
              <Group>
                {myChores.map((chore) => (
                  <GroupRow
                    key={`chore-${chore._id}`}
                    icon="sparkles-outline"
                    iconTone="marigold"
                    title={chore.name}
                    subtitle={t('home.yourTurn')}
                    onPress={() => navigation.getParent()?.navigate('ChoreRotation')}
                    chevron
                  />
                ))}
                <GroupRow
                  key="shopping"
                  icon="cart-outline"
                  title={t('home.shoppingList')}
                  subtitle={
                    shoppingStats.pending > 0
                      ? t('home.itemsToBuy', { count: shoppingStats.pending })
                      : t('home.nothingToBuy')
                  }
                  trailing={
                    shoppingStats.pending > 0 ? (
                      <AppText style={[styles.count, { color: colors.text }]}>{shoppingStats.pending}</AppText>
                    ) : undefined
                  }
                  onPress={() => navigation.navigate('Shopping')}
                  chevron
                />
                {nextEvents.map((event) => (
                  <GroupRow
                    key={`event-${event._id}`}
                    icon={EVENT_ICONS[event.type] ?? 'calendar-outline'}
                    title={event.title}
                    subtitle={formatDate(event.date, dateLocale, relativeDays)}
                    onPress={() => navigation.navigate('Calendar')}
                    chevron
                  />
                ))}
              </Group>

              <SectionHeading
                title={t('home.balanceSummary')}
                actionLabel={myBalances.length > 0 ? t('common.seeAll') : undefined}
                onAction={openBalances}
              />
              <Group>
                {myBalances.length === 0 ? (
                  <GroupRow icon="checkmark-circle-outline" iconTone="neutral" title={t('home.allSettled')} />
                ) : (
                  myBalances.map((b) => (
                    <GroupRow
                      key={`balance-${b.otherId}`}
                      leading={<Avatar name={b.name} uri={b.avatar} size={36} />}
                      title={b.name}
                      subtitle={b.owedToMe ? t('expenses.owesYou') : t('home.youOwe')}
                      trailing={<Amount value={b.amount} currency={currency} size={22} direction={b.owedToMe ? 'owed' : 'owe'} />}
                      onPress={openBalances}
                      accessibilityLabel={
                        b.owedToMe
                          ? t('home.owesYouLine', { name: b.name, amount: formatCurrency(b.amount, currency) })
                          : t('home.youOweLine', { name: b.name, amount: formatCurrency(b.amount, currency) })
                      }
                    />
                  ))
                )}
              </Group>

              <SectionHeading title={t('home.thisMonth')} />
              <Group>
                <GroupRow
                  icon="stats-chart-outline"
                  title={t('home.householdSpending')}
                  trailing={<Amount value={stats.monthlyExpenses} currency={currency} size={22} />}
                  onPress={() => navigation.navigate('Expenses')}
                  chevron
                />
              </Group>
            </>
          ) : null}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  centered: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xxl,
  },
  bodyText: {
    fontSize: fontSizes.md,
    textAlign: 'center',
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 0,
  },
  overscrollFill: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: -600,
    height: 600,
  },
  switcher: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: spacing.xxs + 2,
    minHeight: 44,
    maxWidth: '100%',
  },
  switcherText: {
    fontSize: fontSizes.md + 1,
    fontWeight: fontWeights.semibold,
    flexShrink: 1,
  },
  profileButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hero: {
    paddingTop: spacing.md,
  },
  heroSkeleton: {
    paddingTop: spacing.md,
    opacity: 0.35,
  },
  heroLabel: {
    fontSize: fontSizes.md - 1,
    fontWeight: fontWeights.medium,
  },
  heroAmount: {
    marginTop: spacing.xxs,
  },
  heroPeople: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs + 2,
    marginTop: spacing.sm,
  },
  avatarStack: {
    flexDirection: 'row',
  },
  stackedAvatar: {
    borderWidth: 2,
    borderRadius: 15,
  },
  heroLine: {
    flex: 1,
    fontSize: fontSizes.sm,
    lineHeight: 19,
  },
  sheet: {
    flexGrow: 1,
    marginTop: -radii.xl,
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    paddingBottom: TAB_BAR_HEIGHT + spacing.xxl,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.xs + 2,
    marginHorizontal: spacing.md,
    marginTop: -ACTIONS_OVERLAP,
  },
  action: {
    flex: 1,
    minHeight: 54,
    paddingHorizontal: spacing.sm,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginHorizontal: spacing.md,
    marginTop: spacing.md,
    padding: spacing.md,
    borderRadius: radii.md,
  },
  errorText: {
    flex: 1,
    fontSize: fontSizes.sm,
  },
  listSkeleton: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xl,
  },
  sectionNote: {
    fontSize: fontSizes.sm,
    paddingHorizontal: spacing.lg,
    marginTop: -spacing.xxs,
    marginBottom: spacing.sm,
  },
  inviteWrap: {
    marginHorizontal: spacing.md,
  },
  count: {
    fontSize: fontSizes.md,
    fontWeight: fontWeights.semibold,
    fontVariant: ['tabular-nums'],
  },
  pressed: {
    opacity: 0.7,
  },
});
