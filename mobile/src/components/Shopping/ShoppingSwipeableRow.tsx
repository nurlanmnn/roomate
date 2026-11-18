import React, { useRef, useCallback } from 'react';
import { View, StyleSheet, Animated, Dimensions, PanResponder, PanResponderGestureState } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors, spacing, fontSizes } from '../../theme';
import { useLanguage } from '../../context/LanguageContext';
import { useShoppingMotion } from './useShoppingMotion';
import { AppText } from '../AppText';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SWIPE_THRESHOLD = 70;

interface ShoppingSwipeableRowProps {
  children: React.ReactNode;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  disabled?: boolean;
}

export const ShoppingSwipeableRow: React.FC<ShoppingSwipeableRowProps> = ({
  children,
  onSwipeLeft,
  onSwipeRight,
  disabled = false,
}) => {
  const colors = useThemeColors();
  const { t } = useLanguage();
  const reduceMotion = useShoppingMotion();
  const reduceMotionRef = useRef(reduceMotion);
  reduceMotionRef.current = reduceMotion;
  const translateX = useRef(new Animated.Value(0)).current;
  const isSwipingRef = useRef(false);


  // Refs for latest callback values
  const callbacksRef = useRef({ onSwipeLeft, onSwipeRight, disabled });
  callbacksRef.current = { onSwipeLeft, onSwipeRight, disabled };

  const resetPosition = useCallback(() => {
    isSwipingRef.current = false;
    Animated.timing(translateX, {
      toValue: 0,
      useNativeDriver: true,
      duration: reduceMotionRef.current ? 0 : 180,
    }).start();
  }, [translateX]);

  const panResponder = useRef(
    PanResponder.create({
      // Immediately claim when touch starts if we're already swiping
      onStartShouldSetPanResponder: () => false,

      // Check if we should capture this gesture
      onMoveShouldSetPanResponder: (_, gs) => {
        if (callbacksRef.current.disabled) return false;
        // Only claim if horizontal movement is dominant
        const isHorizontal = Math.abs(gs.dx) > Math.abs(gs.dy) * 1.2;
        const hasMoved = Math.abs(gs.dx) > 8;
        return isHorizontal && hasMoved;
      },

      // Capture gesture more aggressively for horizontal swipes
      onMoveShouldSetPanResponderCapture: (_, gs) => {
        if (callbacksRef.current.disabled) return false;
        const isStrongHorizontal = Math.abs(gs.dx) > Math.abs(gs.dy) * 2;
        const hasMovedEnough = Math.abs(gs.dx) > 15;
        return isStrongHorizontal && hasMovedEnough;
      },

      onPanResponderGrant: () => {
        isSwipingRef.current = true;
        translateX.stopAnimation();
        translateX.setValue(0);
      },

      onPanResponderMove: (_, gs: PanResponderGestureState) => {
        if (callbacksRef.current.disabled) return;

        let { dx } = gs;
        const { onSwipeLeft: swLeft, onSwipeRight: swRight } = callbacksRef.current;

        // Block if no handler
        if (dx < 0 && !swLeft) dx = 0;
        if (dx > 0 && !swRight) dx = 0;

        // Rubber band resistance
        const limit = SWIPE_THRESHOLD * 1.6;
        if (Math.abs(dx) > limit) {
          const overflow = Math.abs(dx) - limit;
          dx = (dx > 0 ? 1 : -1) * (limit + overflow * 0.08);
        }

        translateX.setValue(dx);
      },

      onPanResponderRelease: (_, gs: PanResponderGestureState) => {
        if (callbacksRef.current.disabled) {
          resetPosition();
          return;
        }

        const { dx, vx } = gs;
        const { onSwipeLeft: swLeft, onSwipeRight: swRight } = callbacksRef.current;

        const triggerLeft = (dx < -SWIPE_THRESHOLD || vx < -0.8) && swLeft;
        const triggerRight = (dx > SWIPE_THRESHOLD || vx > 0.8) && swRight;

        if (triggerLeft) {
          Animated.timing(translateX, {
            toValue: -SCREEN_WIDTH,
            duration: reduceMotionRef.current ? 0 : 180,
            useNativeDriver: true,
          }).start(() => {
            swLeft?.();
            translateX.setValue(0);
            isSwipingRef.current = false;
          });
        } else if (triggerRight) {
          Animated.timing(translateX, {
            toValue: SCREEN_WIDTH,
            duration: reduceMotionRef.current ? 0 : 180,
            useNativeDriver: true,
          }).start(() => {
            swRight?.();
            translateX.setValue(0);
            isSwipingRef.current = false;
          });
        } else {
          resetPosition();
        }
      },

      onPanResponderTerminate: () => {
        resetPosition();
      },

      // Don't let parent take over once we've started
      onPanResponderTerminationRequest: () => !isSwipingRef.current,
    })
  ).current;

  // Interpolations
  const leftOpacity = translateX.interpolate({
    inputRange: [-SWIPE_THRESHOLD * 1.5, -20, 0],
    outputRange: [1, 0.3, 0],
    extrapolate: 'clamp',
  });


  const rightOpacity = translateX.interpolate({
    inputRange: [0, 20, SWIPE_THRESHOLD * 1.5],
    outputRange: [0, 0.3, 1],
    extrapolate: 'clamp',
  });


  return (
    <View style={styles.container}>
      {/* Background actions */}
      <View style={styles.actionsContainer} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        {onSwipeLeft && (
          <Animated.View
            style={[
              styles.actionLeft,
              {
                backgroundColor: colors.dangerSoft,
                opacity: leftOpacity,
              },
            ]}
          >
            <Ionicons name="trash-outline" size={22} color={colors.danger} />
            <AppText numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7} maxFontSizeMultiplier={1.4} style={[styles.label, { color: colors.danger }]}>{t('common.delete')}</AppText>
          </Animated.View>
        )}
        {onSwipeRight && (
          <Animated.View
            style={[
              styles.actionRight,
              {
                backgroundColor: colors.primaryUltraSoft,
                opacity: rightOpacity,
              },
            ]}
          >
            <Ionicons name="checkmark-circle-outline" size={22} color={colors.primary} />
            <AppText numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7} maxFontSizeMultiplier={1.4} style={[styles.label, { color: colors.primary }]}>{t('shopping.completed')}</AppText>
          </Animated.View>
        )}
      </View>

      {/* Main content */}
      <Animated.View
        {...panResponder.panHandlers}
        style={{ transform: [{ translateX }] }}
      >
        {children}
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    overflow: 'hidden',
  },
  actionsContainer: {
    ...StyleSheet.absoluteFillObject,
  },
  actionLeft: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    right: 0,
    width: '50%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingRight: spacing.lg,
    gap: spacing.xs,
  },
  actionRight: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    width: '50%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingLeft: spacing.lg,
    gap: spacing.xs,
  },
  label: {
    flexShrink: 1,
    fontSize: fontSizes.sm,
    fontWeight: '600',
  },
});
