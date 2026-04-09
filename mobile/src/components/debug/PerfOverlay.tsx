import React from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import Constants from 'expo-constants';
import { AppText } from '../AppText';
import { useThemeColors, fontSizes, fontWeights, radii, spacing } from '../../theme';
import { perfClear, perfGetState, perfSetVisible, perfSubscribe } from '../../utils/perfDebug';

function usePerfState() {
  const [, force] = React.useReducer((x) => x + 1, 0);
  React.useEffect(() => perfSubscribe(() => force()), []);
  return perfGetState();
}

function fmtMs(ms: number) {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

export const PerfOverlay: React.FC = () => {
  const colors = useThemeColors();
  const perf = usePerfState();

  if (!perf.visible) return null;

  const apiUrl = (Constants.expoConfig?.extra as any)?.apiUrl || (process as any)?.env?.EXPO_PUBLIC_API_URL || '';

  const styles = React.useMemo(
    () =>
      StyleSheet.create({
        backdrop: {
          position: 'absolute',
          left: 0,
          right: 0,
          top: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.35)',
          padding: spacing.lg,
        },
        card: {
          flex: 1,
          backgroundColor: colors.surface,
          borderRadius: radii.lg,
          borderWidth: 1,
          borderColor: colors.borderLight,
          overflow: 'hidden',
        },
        header: {
          padding: spacing.md,
          borderBottomWidth: 1,
          borderBottomColor: colors.borderLight,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: spacing.sm,
        },
        title: {
          fontSize: fontSizes.lg,
          fontWeight: fontWeights.bold,
          color: colors.text,
        },
        subtitle: {
          fontSize: fontSizes.xs,
          color: colors.textSecondary,
          marginTop: spacing.xxs,
        },
        headerLeft: { flex: 1 },
        pill: {
          paddingHorizontal: spacing.sm,
          paddingVertical: spacing.xs,
          borderRadius: 999,
          backgroundColor: colors.primaryUltraSoft,
          borderWidth: 1,
          borderColor: colors.primarySoft,
        },
        pillText: {
          fontSize: fontSizes.xs,
          color: colors.primaryDark,
          fontWeight: fontWeights.semibold,
        },
        body: { flex: 1 },
        row: {
          paddingVertical: spacing.sm,
          paddingHorizontal: spacing.md,
          borderBottomWidth: 1,
          borderBottomColor: colors.borderLight,
        },
        rowTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
        rowLeft: { flex: 1, flexShrink: 1 },
        method: { fontSize: fontSizes.xs, color: colors.textSecondary, fontWeight: fontWeights.semibold },
        url: { fontSize: fontSizes.sm, color: colors.text, fontWeight: fontWeights.semibold },
        meta: { fontSize: fontSizes.xs, color: colors.textTertiary, marginTop: spacing.xxs },
        duration: { fontSize: fontSizes.sm, fontWeight: fontWeights.extrabold, color: colors.text },
        footer: {
          padding: spacing.md,
          borderTopWidth: 1,
          borderTopColor: colors.borderLight,
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: spacing.sm,
        },
        btnText: { fontSize: fontSizes.sm, color: colors.primary, fontWeight: fontWeights.semibold },
      }),
    [colors]
  );

  return (
    <View style={styles.backdrop} pointerEvents="box-none">
      <View style={styles.card}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <AppText style={styles.title}>Perf Debug</AppText>
            <AppText style={styles.subtitle}>
              {__DEV__ ? 'DEV' : 'RELEASE'} • {perf.entries.length} requests • apiUrl: {apiUrl || '(unset)'}
            </AppText>
          </View>
          <TouchableOpacity style={styles.pill} onPress={() => perfSetVisible(false)} activeOpacity={0.8}>
            <AppText style={styles.pillText}>Close</AppText>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.body} contentContainerStyle={{ paddingBottom: spacing.lg }}>
          {perf.entries.map((e, idx) => (
            <View key={`${e.atMs}-${idx}`} style={styles.row}>
              <View style={styles.rowTop}>
                <View style={styles.rowLeft}>
                  <AppText style={styles.method}>
                    {e.method} • {e.status}
                  </AppText>
                  <AppText style={styles.url} numberOfLines={1}>
                    {e.url}
                  </AppText>
                  <AppText style={styles.meta} numberOfLines={1}>
                    {e.baseURL}
                  </AppText>
                </View>
                <AppText style={styles.duration}>{fmtMs(e.durationMs)}</AppText>
              </View>
            </View>
          ))}
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity onPress={perfClear} activeOpacity={0.8}>
            <AppText style={styles.btnText}>Clear</AppText>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => perfSetVisible(false)} activeOpacity={0.8}>
            <AppText style={styles.btnText}>Hide</AppText>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

