import React, { useRef, useState } from 'react';
import {
  AccessibilityInfo, NativeScrollEvent, NativeSyntheticEvent, Pressable, ScrollView, StyleSheet, View, useWindowDimensions,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { StatusBar } from 'expo-status-bar';
import * as Localization from 'expo-localization';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText } from '../../components/AppText';
import { PrimaryButton } from '../../components/PrimaryButton';
import { Amount } from '../../components/ui/Amount';
import { RoomateMark } from '../../components/ui/RoomateMark';
import { useLanguage } from '../../context/LanguageContext';
import { DISPLAY_MAX_FONT_SCALE, fonts, fontSizes, fontWeights, radii, spacing, useThemeColors } from '../../theme';

/** AsyncStorage key: set once the intro has been finished or skipped on this device. */
export const INTRO_SEEN_KEY = 'roomate.introSeen.v1';

type PageKey = 'money' | 'shopping' | 'chores';
const PAGES: PageKey[] = ['money', 'shopping', 'chores'];

/** Three short pages shown once, before Landing, in the enamel/sheet structure of the tab screens. */
export const IntroScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const colors = useThemeColors();
  const { t } = useLanguage();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const scrollRef = useRef<ScrollView>(null);
  const [page, setPage] = useState(0);
  const isLast = page === PAGES.length - 1;
  const currency = Localization.getLocales()[0]?.currencyCode ?? 'USD';
  const fieldHeight = Math.max(280, height * 0.5);

  const finish = async () => {
    try {
      await AsyncStorage.setItem(INTRO_SEEN_KEY, '1');
    } catch {
      // Not fatal: the intro simply shows again next launch.
    }
    navigation.replace('Landing');
  };

  const goTo = async (index: number) => {
    const reduceMotion = await AccessibilityInfo.isReduceMotionEnabled().catch(() => false);
    scrollRef.current?.scrollTo({ x: index * width, animated: !reduceMotion });
    setPage(index);
  };

  const onScrollEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    setPage(Math.round(e.nativeEvent.contentOffset.x / width));
  };

  const figure = (key: PageKey) => {
    switch (key) {
      case 'money':
        return (
          <View>
            <AppText style={[styles.caption, { color: colors.onEnamelSecondary }]}>{t('intro.moneyCaption')}</AppText>
            <Amount value={24.5} currency={currency} size={96} weight="extrabold" color={colors.onEnamel} fit />
          </View>
        );
      case 'shopping':
        return (
          <View style={styles.countRow}>
            <AppText style={[styles.count, { color: colors.onEnamel }]} maxFontSizeMultiplier={DISPLAY_MAX_FONT_SCALE}>6</AppText>
            <AppText style={[styles.caption, styles.countCaption, { color: colors.onEnamelSecondary }]}>{t('intro.shoppingCaption')}</AppText>
          </View>
        );
      case 'chores':
        return (
          <View style={styles.chore}>
            <View style={[styles.badge, { backgroundColor: colors.marigold }]}>
              <AppText style={[styles.badgeText, { color: colors.onMarigold }]}>{t('chores.yourTurn')}</AppText>
            </View>
            <AppText style={[styles.choreTitle, { color: colors.onEnamel }]}>{t('intro.choresExample')}</AppText>
            <AppText style={[styles.caption, { color: colors.onEnamelSecondary }]}>{t('intro.choresCaption')}</AppText>
          </View>
        );
    }
  };

  return (
    <View style={[styles.fill, { backgroundColor: colors.background }]}>
      <StatusBar style="light" />
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onScrollEnd}
        style={styles.fill}
      >
        {PAGES.map((key, i) => (
          <View key={key} style={{ width }} accessibilityElementsHidden={i !== page}
            importantForAccessibility={i === page ? 'auto' : 'no-hide-descendants'}>
            <View style={[styles.field, { backgroundColor: colors.enamel, height: fieldHeight, paddingTop: insets.top + 64 }]}
              accessible accessibilityRole="image" accessibilityLabel={t(`intro.${key}Example`)}>
              {figure(key)}
            </View>
            <View style={[styles.sheet, { backgroundColor: colors.background }]}>
              <AppText accessibilityRole="header" style={[styles.title, { color: colors.text }]}>{t(`intro.${key}Title`)}</AppText>
              <AppText style={[styles.body, { color: colors.textSecondary }]}>{t(`intro.${key}Body`)}</AppText>
            </View>
          </View>
        ))}
      </ScrollView>

      <View style={[styles.topBar, { top: insets.top + spacing.xs }]} pointerEvents="box-none">
        <RoomateMark size={44} />
        {!isLast ? (
          <Pressable onPress={finish} accessibilityRole="button" hitSlop={8}
            style={({ pressed }) => [styles.skip, pressed && styles.pressed]}>
            <AppText style={[styles.skipText, { color: colors.onEnamel }]}>{t('intro.skip')}</AppText>
          </Pressable>
        ) : null}
      </View>

      <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.lg }]}>
        <View style={styles.dots} accessible accessibilityLabel={t('intro.pageOf', { page: page + 1, total: PAGES.length })}>
          {PAGES.map((key, i) => (
            <View key={key} style={[styles.dot, { backgroundColor: i === page ? colors.primary : colors.border },
              i === page && styles.dotActive]} />
          ))}
        </View>
        <PrimaryButton
          title={isLast ? t('auth.getStarted') : t('intro.next')}
          onPress={isLast ? finish : () => goTo(page + 1)}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  fill: { flex: 1 },
  field: { justifyContent: 'flex-end', paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl + 28 },
  sheet: {
    flex: 1, marginTop: -28, borderTopLeftRadius: radii.xl, borderTopRightRadius: radii.xl,
    paddingHorizontal: spacing.lg, paddingTop: spacing.xl,
  },
  title: { fontSize: 28, fontWeight: fontWeights.bold, letterSpacing: -0.3, marginBottom: spacing.sm },
  body: { fontSize: fontSizes.md, lineHeight: 24 },
  caption: { fontSize: fontSizes.md },
  countCaption: { flexShrink: 1 },
  countRow: { flexDirection: 'row', alignItems: 'baseline', gap: spacing.sm },
  count: { fontFamily: fonts.displayExtrabold, fontSize: 96, lineHeight: 100 },
  chore: { alignItems: 'flex-start', gap: spacing.xs },
  badge: { borderRadius: radii.sm, paddingHorizontal: spacing.xs, paddingVertical: spacing.xxs },
  badgeText: { fontSize: fontSizes.sm, fontWeight: fontWeights.semibold },
  choreTitle: { fontSize: 28, fontWeight: fontWeights.bold, marginTop: spacing.xs },
  topBar: {
    position: 'absolute', left: spacing.lg, right: spacing.lg, minHeight: 48,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  skip: { minHeight: 44, minWidth: 44, justifyContent: 'center', alignItems: 'flex-end' },
  skipText: { fontSize: fontSizes.md, fontWeight: fontWeights.semibold },
  pressed: { opacity: 0.6 },
  footer: { paddingHorizontal: spacing.lg, gap: spacing.lg },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: spacing.xs },
  dot: { width: 8, height: 8, borderRadius: 4 },
  dotActive: { width: 24 },
});
