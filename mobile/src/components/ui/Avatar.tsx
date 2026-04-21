import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { AppText } from '../AppText';
import { useThemeColors, fontSizes, fontWeights, radii, spacing } from '../../theme';

type AvatarProps = {
  name?: string;
  uri?: string;
  size?: number;
};

const getInitials = (name?: string) => {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 1).toUpperCase();
  return (parts[0].slice(0, 1) + parts[parts.length - 1].slice(0, 1)).toUpperCase();
};

export const Avatar: React.FC<AvatarProps> = ({ name, uri, size = 44 }) => {
  const colors = useThemeColors();
  const initials = getInitials(name);
  const dim = { width: size, height: size, borderRadius: size / 2 };

  const styles = React.useMemo(() => StyleSheet.create({
    image: {
      backgroundColor: colors.surfaceAlt,
      borderWidth: 1,
      borderColor: colors.border,
    },
    fallback: {
      backgroundColor: colors.primarySoft,
      borderWidth: 1,
      borderColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    initials: {
      color: colors.primaryDark,
      fontWeight: fontWeights.extrabold,
    },
  }), [colors]);

  if (uri) {
    return (
      <Image
        source={{ uri }}
        style={[styles.image, dim]}
        // expo-image disk-caches avatars natively so re-renders and list
        // scrolls never re-decode or re-download the same file.
        cachePolicy="memory-disk"
        contentFit="cover"
        transition={120}
      />
    );
  }

  return (
    <View style={[styles.fallback, dim]}>
      <AppText style={[styles.initials, { fontSize: Math.max(14, size * 0.38) }]}>{initials}</AppText>
    </View>
  );
};




