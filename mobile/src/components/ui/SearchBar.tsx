import React from 'react';
import { StyleSheet, TextInput, TextInputProps, View, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors, fontSizes, radii, spacing } from '../../theme';

type SearchBarProps = Omit<TextInputProps, 'style' | 'value' | 'onChangeText'> & {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  style?: ViewStyle;
};

/** White search field with a 1pt hairline frame that turns cobalt while focused. */
export const SearchBar: React.FC<SearchBarProps> = ({
  value,
  onChangeText,
  placeholder = 'Search',
  style,
  onFocus,
  onBlur,
  ...rest
}) => {
  const colors = useThemeColors();
  const [focused, setFocused] = React.useState(false);

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: colors.surface, borderColor: focused ? colors.primary : colors.border },
        style,
      ]}
    >
      <Ionicons name="search-outline" size={18} color={colors.textTertiary} />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textTertiary}
        selectionColor={colors.primary}
        cursorColor={colors.primary}
        accessibilityLabel={placeholder}
        accessibilityRole="search"
        style={[styles.input, { color: colors.text }]}
        autoCapitalize="none"
        autoCorrect={false}
        returnKeyType="search"
        clearButtonMode="while-editing"
        onFocus={(e) => {
          setFocused(true);
          onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          onBlur?.(e);
        }}
        {...rest}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: 44,
    borderWidth: 1,
    borderRadius: radii.lg,
    paddingLeft: spacing.md,
    paddingRight: spacing.xs,
  },
  input: {
    flex: 1,
    minWidth: 0,
    minHeight: 44,
    fontSize: fontSizes.md,
    paddingVertical: 0,
  },
});
