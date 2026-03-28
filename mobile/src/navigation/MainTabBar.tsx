import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Pressable,
  StyleSheet,
  Animated,
  LayoutChangeEvent,
  Platform,
  PanResponder,
} from 'react-native';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { AppText } from '../components/AppText';
import { useThemeColors, spacing, fontSizes, fontWeights } from '../theme';

const ICON_SIZE = 24;
/** Taller + full slot width so the lens reads larger than icon/text */
const BUBBLE_HEIGHT = 58;
/** 0 = bubble spans the full tab slot width */
const BUBBLE_PAD_H = 0;

const TAB_ICONS: Record<
  string,
  { outline: React.ComponentProps<typeof Ionicons>['name']; filled: React.ComponentProps<typeof Ionicons>['name'] }
> = {
  home: { outline: 'home-outline', filled: 'home' },
  dollar: { outline: 'cash-outline', filled: 'cash' },
  cart: { outline: 'cart-outline', filled: 'cart' },
  calendar: { outline: 'calendar-outline', filled: 'calendar' },
  settings: { outline: 'settings-outline', filled: 'settings' },
};

const ROUTE_TO_ICON: Record<string, string> = {
  Home: 'home',
  Expenses: 'dollar',
  Shopping: 'cart',
  Calendar: 'calendar',
  Settings: 'settings',
};

type Props = BottomTabBarProps;

export const MainTabBar: React.FC<Props> = ({ state, descriptors, navigation }) => {
  const { theme } = useTheme();
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  const isDark = theme === 'dark';

  const horizontal = spacing.md;
  const bottomInset = Math.max(insets.bottom, spacing.sm);

  const [barWidth, setBarWidth] = useState(0);
  const bubbleX = useRef(new Animated.Value(0)).current;
  const bubbleLaidOut = useRef(false);
  const isDragging = useRef(false);
  const dragStartX = useRef(0);
  const lastX = useRef(0);
  const activeIndexRef = useRef(state.index);
  activeIndexRef.current = state.index;

  const routes = state.routes;
  const tabCount = routes.length;
  const innerPaddingH = spacing.sm;
  const slotWidth = barWidth > 0 ? (barWidth - innerPaddingH * 2) / tabCount : 0;
  const bubbleW = slotWidth > 0 ? Math.max(0, slotWidth - BUBBLE_PAD_H * 2) : 0;

  const minX = innerPaddingH + BUBBLE_PAD_H;
  const maxX = innerPaddingH + BUBBLE_PAD_H + Math.max(0, tabCount - 1) * slotWidth;

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => false,
        onMoveShouldSetPanResponder: (_, g) =>
          Math.abs(g.dx) > 10 && Math.abs(g.dx) > Math.abs(g.dy) * 1.2,
        onPanResponderGrant: () => {
          bubbleX.stopAnimation((v) => {
            dragStartX.current = v;
            lastX.current = v;
          });
          isDragging.current = true;
        },
        onPanResponderMove: (_, g) => {
          const x = dragStartX.current + g.dx;
          const clamped = Math.max(minX, Math.min(maxX, x));
          lastX.current = clamped;
          bubbleX.setValue(clamped);
        },
        onPanResponderRelease: () => {
          isDragging.current = false;
          if (slotWidth <= 0 || tabCount === 0) return;
          const idx = Math.round((lastX.current - innerPaddingH - BUBBLE_PAD_H) / slotWidth);
          const next = Math.max(0, Math.min(tabCount - 1, idx));
          const targetRoute = routes[next];
          const currentIdx = activeIndexRef.current;
          if (targetRoute && next !== currentIdx) {
            navigation.navigate(targetRoute.name);
          } else {
            const snapX = innerPaddingH + BUBBLE_PAD_H + currentIdx * slotWidth;
            Animated.spring(bubbleX, {
              toValue: snapX,
              useNativeDriver: true,
              friction: 9,
              tension: 65,
            }).start();
          }
        },
        onPanResponderTerminate: () => {
          isDragging.current = false;
        },
      }),
    [
      bubbleX,
      innerPaddingH,
      maxX,
      minX,
      navigation,
      routes,
      slotWidth,
      tabCount,
    ]
  );

  useEffect(() => {
    if (isDragging.current) return;
    if (barWidth <= 0 || slotWidth <= 0) return;
    const toX = state.index * slotWidth + BUBBLE_PAD_H + innerPaddingH;
    if (!bubbleLaidOut.current) {
      bubbleX.setValue(toX);
      bubbleLaidOut.current = true;
      return;
    }
    Animated.spring(bubbleX, {
      toValue: toX,
      useNativeDriver: true,
      friction: 9,
      tension: 65,
    }).start();
  }, [state.index, barWidth, slotWidth, bubbleX, innerPaddingH]);

  const onBarLayout = (e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width;
    if (w !== barWidth) setBarWidth(w);
  };

  const inactiveColor = isDark ? 'rgba(255,255,255,0.75)' : colors.textTertiary;
  const activeColor = colors.primary;
  /** Bubble tint — matches brand green, not blue accent */
  const bubbleBg = isDark ? 'rgba(74, 222, 128, 0.22)' : 'rgba(34, 197, 94, 0.15)';
  const bubbleBorder = isDark ? 'rgba(134, 239, 172, 0.42)' : 'rgba(34, 197, 94, 0.32)';

  return (
    <View
      style={[
        styles.outer,
        {
          paddingHorizontal: horizontal,
          paddingBottom: bottomInset,
        },
      ]}
    >
      <View style={styles.barOuter} onLayout={onBarLayout} {...panResponder.panHandlers}>
        <View style={[StyleSheet.absoluteFill, { borderRadius: 24, overflow: 'hidden' }]}>
          <BlurView intensity={isDark ? 5 : 10} tint={isDark ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />
          <View
            style={[
              StyleSheet.absoluteFill,
              {
                borderRadius: 24,
                backgroundColor: isDark ? 'rgba(40,40,40,0.65)' : 'rgba(255,255,255,0.7)',
              },
            ]}
          />
        </View>

        {barWidth > 0 && bubbleW > 0 && (
          <Animated.View
            pointerEvents="none"
            style={[
              styles.bubble,
              {
                width: bubbleW,
                height: BUBBLE_HEIGHT,
                top: 5,
                backgroundColor: bubbleBg,
                borderColor: bubbleBorder,
                transform: [{ translateX: bubbleX }],
              },
            ]}
          />
        )}

        <View style={[styles.tabsRow, { paddingHorizontal: innerPaddingH, paddingTop: 10, paddingBottom: 14 }]}>
          {routes.map((route, index) => {
            const { options } = descriptors[route.key];
            const rawLabel =
              options.tabBarLabel !== undefined
                ? options.tabBarLabel
                : options.title !== undefined
                  ? options.title
                  : route.name;
            const labelText = typeof rawLabel === 'string' ? rawLabel : route.name;
            const isFocused = state.index === index;
            const iconKey = ROUTE_TO_ICON[route.name] || 'home';
            const iconSet = TAB_ICONS[iconKey] || TAB_ICONS.home;
            const color = isFocused ? activeColor : inactiveColor;

            const onPress = () => {
              const event = navigation.emit({
                type: 'tabPress',
                target: route.key,
                canPreventDefault: true,
              });
              if (!isFocused && !event.defaultPrevented) {
                navigation.navigate(route.name);
              }
            };

            const onLongPress = () => {
              navigation.emit({
                type: 'tabLongPress',
                target: route.key,
              });
            };

            return (
              <Pressable
                key={route.key}
                accessibilityRole="button"
                accessibilityState={isFocused ? { selected: true } : {}}
                accessibilityLabel={options.tabBarAccessibilityLabel}
                testID={options.tabBarTestID}
                onPress={onPress}
                onLongPress={onLongPress}
                style={styles.tabPressable}
              >
                <Ionicons name={isFocused ? iconSet.filled : iconSet.outline} size={ICON_SIZE} color={color} />
                <AppText
                  numberOfLines={1}
                  style={[
                    styles.label,
                    {
                      color,
                      fontWeight: isFocused ? fontWeights.semibold : fontWeights.medium,
                    },
                  ]}
                >
                  {labelText}
                </AppText>
              </Pressable>
            );
          })}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  outer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
  },
  barOuter: {
    borderRadius: 24,
    minHeight: 88,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.12,
        shadowRadius: 16,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  bubble: {
    position: 'absolute',
    left: 0,
    borderRadius: 29,
    borderWidth: StyleSheet.hairlineWidth,
  },
  tabsRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  tabPressable: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    minHeight: 52,
    paddingBottom: 2,
  },
  label: {
    fontSize: fontSizes.xs,
    marginTop: 4,
    textAlign: 'center',
  },
});
