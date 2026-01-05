import React from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { useThemeColors } from '../theme';

export interface DonutChartSegment {
  value: number;
  color: string;
  label?: string;
}

interface DonutChartProps {
  data: DonutChartSegment[];
  size?: number;
  strokeWidth?: number;
  centerContent?: React.ReactNode;
}

export const DonutChart: React.FC<DonutChartProps> = ({
  data,
  size = 200,
  strokeWidth = 20,
  centerContent,
}) => {
  const colors = useThemeColors();
  const total = data.reduce((sum, segment) => sum + (segment.value || 0), 0);
  const radius = size / 2 - strokeWidth / 2;
  const circumference = 2 * Math.PI * radius;
  let cumulative = 0;

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        style={styles.svg}
      >
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={colors.borderLight}
          strokeWidth={strokeWidth}
          fill="none"
        />
        {data.map((segment, index) => {
          if (!segment.value || segment.value <= 0) return null;
          const percentage = total === 0 ? 0 : segment.value / total;

          // Add a tiny gap between segments to avoid visual overlap
          const segLength = percentage * circumference;
          const gap = Math.min(segLength * 0.03, 4); // up to 4px gap
          const segLengthWithGap = Math.max(segLength - gap, 0);

          const dashArray = `${segLengthWithGap} ${circumference}`;
          const dashOffset = -cumulative * circumference;
          cumulative += percentage;

          return (
            <Circle
              key={`${segment.label ?? 'segment'}-${index}`}
              cx={size / 2}
              cy={size / 2}
              r={radius}
              stroke={segment.color}
              strokeWidth={strokeWidth}
              strokeDasharray={dashArray}
              strokeDashoffset={dashOffset}
              strokeLinecap="round"
              fill="none"
            />
          );
        })}
      </Svg>
      {centerContent && (
        <View
          pointerEvents="none"
          style={[
            styles.centerContent,
            {
              width: size - strokeWidth * 2.5,
              height: size - strokeWidth * 2.5,
            },
          ]}
        >
          {centerContent}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  svg: {
    transform: [{ rotate: '-90deg' }],
  },
  centerContent: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
});


