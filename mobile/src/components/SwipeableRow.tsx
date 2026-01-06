import React, { useRef, useCallback } from 'react';
import { View, StyleSheet, Animated, Dimensions, PanResponder, PanResponderGestureState } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors, spacing, fontSizes } from '../theme';
import { AppText } from './AppText';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SWIPE_THRESHOLD = 70;

interface SwipeableRowProps {
  children: React.ReactNode;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  leftActionLabel?: string;
  rightActionLabel?: string;
  leftActionColor?: string;
  rightActionColor?: string;
  leftActionIcon?: keyof typeof Ionicons.glyphMap;
  rightActionIcon?: keyof typeof Ionicons.glyphMap;
  disabled?: boolean;
}

export const SwipeableRow: React.FC<SwipeableRowProps> = ({
  children,
  onSwipeLeft,
  onSwipeRight,
  leftActionLabel,
  rightActionLabel,
  leftActionColor,
  rightActionColor,
  leftActionIcon = 'trash-outline',
  rightActionIcon = 'checkmark-circle-outline',
  disabled = false,
}) => {
  const colors = useThemeColors();
  const translateX = useRef(new Animated.Value(0)).current;
  const isSwipingRef = useRef(false);

  const finalLeftActionColor = leftActionColor || colors.danger;
  const finalRightActionColor = rightActionColor || colors.primary;

  // Refs for latest callback values
  const callbacksRef = useRef({ onSwipeLeft, onSwipeRight, disabled });
  callbacksRef.current = { onSwipeLeft, onSwipeRight, disabled };

  const resetPosition = useCallback(() => {
    isSwipingRef.current = false;
    Animated.spring(translateX, {
      toValue: 0,
      useNativeDriver: true,
      tension: 100,
      friction: 10,
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
            duration: 180,
            useNativeDriver: true,
          }).start(() => {
            swLeft?.();
            translateX.setValue(0);
            isSwipingRef.current = false;
          });
        } else if (triggerRight) {
          Animated.timing(translateX, {
            toValue: SCREEN_WIDTH,
            duration: 180,
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

  const leftScale = translateX.interpolate({
    inputRange: [-SWIPE_THRESHOLD, -20, 0],
    outputRange: [1, 0.6, 0.4],
    extrapolate: 'clamp',
  });

  const rightOpacity = translateX.interpolate({
    inputRange: [0, 20, SWIPE_THRESHOLD * 1.5],
    outputRange: [0, 0.3, 1],
    extrapolate: 'clamp',
  });

  const rightScale = translateX.interpolate({
    inputRange: [0, 20, SWIPE_THRESHOLD],
    outputRange: [0.4, 0.6, 1],
    extrapolate: 'clamp',
  });

  return (
    <View style={styles.container}>
      {/* Background actions */}
      <View style={styles.actionsContainer}>
        {onSwipeLeft && (
          <Animated.View
            style={[
              styles.actionLeft,
              {
                backgroundColor: finalLeftActionColor,
                opacity: leftOpacity,
                transform: [{ scale: leftScale }],
              },
            ]}
          >
            <Ionicons name={leftActionIcon} size={22} color="#fff" />
            {leftActionLabel && <AppText style={styles.label}>{leftActionLabel}</AppText>}
          </Animated.View>
        )}
        {onSwipeRight && (
          <Animated.View
            style={[
              styles.actionRight,
              {
                backgroundColor: finalRightActionColor,
                opacity: rightOpacity,
                transform: [{ scale: rightScale }],
              },
            ]}
          >
            <Ionicons name={rightActionIcon} size={22} color="#fff" />
            {rightActionLabel && <AppText style={styles.label}>{rightActionLabel}</AppText>}
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
    borderRadius: 8,
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
    borderRadius: 8,
  },
  label: {
    color: '#fff',
    fontSize: fontSizes.sm,
    fontWeight: '600',
  },
});
