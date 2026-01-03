import React from 'react';
import { Text, TextProps } from 'react-native';

interface AppTextProps extends TextProps {
  /**
   * Set to true only for icons/logos where scaling breaks design.
   * Defaults to true (allows font scaling for accessibility).
   */
  disableScaling?: boolean;
}

export const AppText = ({ style, disableScaling = false, ...props }: AppTextProps) => {
  return <Text allowFontScaling={!disableScaling} style={style} {...props} />;
};

