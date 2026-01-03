import React from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { useThemeColors, spacing, radii } from '../theme';

interface LoadingSkeletonProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: any;
}

export const LoadingSkeleton: React.FC<LoadingSkeletonProps> = ({
  width = '100%',
  height = 20,
  borderRadius = radii.sm,
  style,
}) => {
  const colors = useThemeColors();
  const animatedValue = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(animatedValue, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(animatedValue, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [animatedValue]);

  const opacity = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.7],
  });

  return (
    <Animated.View
      style={[
        {
          backgroundColor: colors.borderLight,
          width,
          height,
          borderRadius,
          opacity,
        },
        style,
      ]}
    />
  );
};

interface SkeletonCardProps {
  lines?: number;
  showAvatar?: boolean;
}

export const SkeletonCard: React.FC<SkeletonCardProps> = ({
  lines = 2,
  showAvatar = false,
}) => {
  const colors = useThemeColors();
  return (
    <View style={[{
      flexDirection: 'row',
      padding: spacing.md,
      backgroundColor: colors.surface,
      borderRadius: radii.md,
      marginBottom: spacing.sm,
      borderWidth: 1,
      borderColor: colors.borderLight,
    }]}>
      {showAvatar && (
        <View style={{ marginRight: spacing.md }}>
          <LoadingSkeleton width={40} height={40} borderRadius={20} />
        </View>
      )}
      <View style={{ flex: 1, justifyContent: 'center' }}>
        {Array.from({ length: lines }).map((_, index) => (
          <LoadingSkeleton
            key={index}
            width={index === 0 ? '80%' : '60%'}
            height={16}
            style={{ marginBottom: index < lines - 1 ? spacing.xs : 0 }}
          />
        ))}
      </View>
    </View>
  );
};

