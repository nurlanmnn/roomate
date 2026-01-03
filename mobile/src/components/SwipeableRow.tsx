import React, { useRef, useEffect } from 'react';
import { View, StyleSheet, Animated, TouchableOpacity, Dimensions, PanResponder } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors, spacing, radii, fontSizes } from '../theme';
import { AppText } from './AppText';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SWIPE_THRESHOLD = 80; // Minimum swipe distance to trigger action

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
  const currentValue = useRef(0);
  
  const finalLeftActionColor = leftActionColor || colors.danger;
  const finalRightActionColor = rightActionColor || colors.primary;

  useEffect(() => {
    // Reset position when disabled
    if (disabled) {
      Animated.spring(translateX, {
        toValue: 0,
        useNativeDriver: true,
      }).start();
      currentValue.current = 0;
    }
  }, [disabled, translateX]);

  // Use PanResponder for gesture handling
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => !disabled,
      onMoveShouldSetPanResponder: (evt, gestureState) => {
        return !disabled && Math.abs(gestureState.dx) > 10;
      },
      onPanResponderGrant: () => {
        translateX.setOffset(currentValue.current);
        translateX.setValue(0);
      },
      onPanResponderMove: (evt, gestureState) => {
        if (disabled) return;

        const { dx } = gestureState;
        let newValue = dx + currentValue.current;

        // Limit swipe range
        const maxLeft = onSwipeLeft ? -SWIPE_THRESHOLD * 2 : 0;
        const maxRight = onSwipeRight ? SWIPE_THRESHOLD * 2 : 0;

        if (newValue < maxLeft) newValue = maxLeft;
        if (newValue > maxRight) newValue = maxRight;

        translateX.setValue(dx);
      },
      onPanResponderRelease: (evt, gestureState) => {
        if (disabled) return;

        const { dx, vx } = gestureState;
        const finalValue = dx + currentValue.current;
        const shouldTriggerLeft = finalValue < -SWIPE_THRESHOLD && onSwipeLeft;
        const shouldTriggerRight = finalValue > SWIPE_THRESHOLD && onSwipeRight;

        translateX.flattenOffset();
        currentValue.current = translateX._value;

        if (shouldTriggerLeft || (vx < -0.5 && onSwipeLeft)) {
          // Trigger left action
          Animated.timing(translateX, {
            toValue: -SCREEN_WIDTH,
            duration: 200,
            useNativeDriver: true,
          }).start(() => {
            onSwipeLeft?.();
            translateX.setValue(0);
            currentValue.current = 0;
          });
        } else if (shouldTriggerRight || (vx > 0.5 && onSwipeRight)) {
          // Trigger right action
          Animated.timing(translateX, {
            toValue: SCREEN_WIDTH,
            duration: 200,
            useNativeDriver: true,
          }).start(() => {
            onSwipeRight?.();
            translateX.setValue(0);
            currentValue.current = 0;
          });
        } else {
          // Snap back
          Animated.spring(translateX, {
            toValue: 0,
            useNativeDriver: true,
            tension: 100,
            friction: 8,
          }).start();
          currentValue.current = 0;
        }
      },
      onPanResponderTerminate: () => {
        translateX.flattenOffset();
        currentValue.current = translateX._value;
        Animated.spring(translateX, {
          toValue: 0,
          useNativeDriver: true,
          tension: 100,
          friction: 8,
        }).start();
        currentValue.current = 0;
      },
    })
  ).current;

  const leftActionOpacity = translateX.interpolate({
    inputRange: [-SWIPE_THRESHOLD * 2, 0],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });

  const rightActionOpacity = translateX.interpolate({
    inputRange: [0, SWIPE_THRESHOLD * 2],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  return (
    <View style={styles.container}>
      {/* Background Actions */}
      <View style={styles.backgroundActions}>
        {onSwipeLeft && (
          <Animated.View
            style={[
              styles.leftAction,
              { backgroundColor: finalLeftActionColor, opacity: leftActionOpacity },
            ]}
          >
            <Ionicons name={leftActionIcon} size={24} color={colors.surface} />
            {leftActionLabel && (
              <AppText style={[styles.actionLabel, { color: colors.surface }]}>{leftActionLabel}</AppText>
            )}
          </Animated.View>
        )}
        {onSwipeRight && (
          <Animated.View
            style={[
              styles.rightAction,
              { backgroundColor: finalRightActionColor, opacity: rightActionOpacity },
            ]}
          >
            <Ionicons name={rightActionIcon} size={24} color={colors.surface} />
            {rightActionLabel && (
              <AppText style={[styles.actionLabel, { color: colors.surface }]}>{rightActionLabel}</AppText>
            )}
          </Animated.View>
        )}
      </View>

      {/* Content */}
      <Animated.View
        style={[
          styles.content,
          { backgroundColor: colors.surface },
          {
            transform: [{ translateX }],
          },
        ]}
        {...panResponder.panHandlers}
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
  backgroundActions: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  leftAction: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'flex-end',
    paddingRight: spacing.lg,
    flexDirection: 'row',
    gap: spacing.sm,
  },
  rightAction: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'flex-start',
    paddingLeft: spacing.lg,
    flexDirection: 'row',
    gap: spacing.sm,
  },
  actionLabel: {
    fontSize: fontSizes.md,
    fontWeight: '600',
  },
  content: {
    // backgroundColor will be set dynamically
  },
});

