import React from 'react';
import Svg, { Circle, Polyline } from 'react-native-svg';
import { useThemeColors } from '../../theme';

type RoomateMarkProps = {
  /** Width in points; height follows the mark's aspect ratio. */
  size?: number;
  /** Colour of the roof and the roommate dot. Defaults to `onEnamel` (white). */
  color?: string;
};

/**
 * The Roomate mark: a roof line over two dots, a roommate and you (marigold).
 * Geometry matches mobile/scripts/generate-logo.py and assets/logo.svg.
 */
export const RoomateMark: React.FC<RoomateMarkProps> = ({ size = 64, color }) => {
  const colors = useThemeColors();
  const roof = color ?? colors.onEnamel;
  return (
    <Svg width={size} height={size * (49.5 / 68.5)} viewBox="15.75 22.75 68.5 49.5"
      accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Polyline points="20,53.5 50,27.5 80,53.5" fill="none" stroke={roof} strokeWidth={8.5}
        strokeLinecap="round" strokeLinejoin="round" />
      <Circle cx={39} cy={63.5} r={8.5} fill={roof} />
      <Circle cx={61} cy={63.5} r={8.5} fill={colors.marigold} />
    </Svg>
  );
};
