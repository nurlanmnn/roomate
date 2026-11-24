import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppText } from './AppText';
import { FormTextInput } from './FormTextInput';
import { useLanguage } from '../context/LanguageContext';
import { useThemeColors, fontSizes, fontWeights, radii, spacing } from '../theme';
import { geoApi, AddressLocation, AddressSuggestion } from '../api/geoApi';

type AddressFieldProps = {
  label: string;
  value: string;
  /** Present when the current text was picked from a suggestion. */
  location: AddressLocation | null | undefined;
  /** Typing clears the location; picking a suggestion sets text and location together. */
  onChange: (text: string, location: AddressLocation | null) => void;
  placeholder?: string;
  /** boxed: a standalone field (sheets). inset: a row inside a `Group`. */
  variant?: 'boxed' | 'inset';
  editable?: boolean;
};

const MIN_QUERY = 3;
const DEBOUNCE_MS = 350;
const MAX_SHOWN = 5;

type Status = 'idle' | 'searching' | 'results' | 'empty' | 'failed';

/**
 * Address input that checks what is typed against OpenStreetMap. Suggestions appear under the
 * field after three characters; picking one fills the field and marks it verified. A typed
 * address that matches nothing can still be saved, and says plainly that it is not verified.
 */
export const AddressField: React.FC<AddressFieldProps> = ({
  label,
  value,
  location,
  onChange,
  placeholder,
  variant = 'boxed',
  editable = true,
}) => {
  const colors = useThemeColors();
  const { t, language } = useLanguage();
  const [focused, setFocused] = React.useState(false);
  const [status, setStatus] = React.useState<Status>('idle');
  const [results, setResults] = React.useState<AddressSuggestion[]>([]);
  const requestRef = React.useRef<AbortController | null>(null);
  const timerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const inset = variant === 'inset';
  const verified = Boolean(location) && value.trim().length > 0;

  const cancelPending = React.useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = null;
    requestRef.current?.abort();
    requestRef.current = null;
  }, []);

  React.useEffect(() => cancelPending, [cancelPending]);

  const search = React.useCallback(
    (query: string) => {
      cancelPending();
      const q = query.trim();
      if (q.length < MIN_QUERY) {
        setStatus('idle');
        setResults([]);
        return;
      }
      setStatus('searching');
      timerRef.current = setTimeout(async () => {
        const controller = new AbortController();
        requestRef.current = controller;
        try {
          const found = await geoApi.searchAddress(q, language, controller.signal);
          if (controller.signal.aborted) return;
          setResults(found.slice(0, MAX_SHOWN));
          setStatus(found.length > 0 ? 'results' : 'empty');
        } catch {
          if (controller.signal.aborted) return;
          setResults([]);
          setStatus('failed');
        }
      }, DEBOUNCE_MS);
    },
    [cancelPending, language]
  );

  const handleChangeText = (text: string) => {
    onChange(text, null);
    search(text);
  };

  const handlePick = (s: AddressSuggestion) => {
    cancelPending();
    onChange(s.label, { lat: s.lat, lng: s.lng });
    setResults([]);
    setStatus('idle');
  };

  const showList = focused && status === 'results' && !verified;
  const hasText = value.trim().length > 0;

  let note: { icon: keyof typeof Ionicons.glyphMap | null; text: string; color: string } | null = null;
  if (verified) {
    note = { icon: 'checkmark-circle', text: t('address.verified'), color: colors.success };
  } else if (focused && status === 'searching') {
    note = { icon: null, text: t('address.searching'), color: colors.textSecondary };
  } else if (focused && status === 'results') {
    note = null;
  } else if (status === 'failed' && hasText) {
    note = { icon: 'cloud-offline-outline', text: t('address.lookupFailed'), color: colors.textSecondary };
  } else if (status === 'empty' && hasText) {
    note = { icon: 'alert-circle-outline', text: t('address.noMatches'), color: colors.textSecondary };
  } else if (hasText) {
    note = { icon: 'alert-circle-outline', text: t('address.notVerified'), color: colors.textSecondary };
  }

  return (
    <View>
      <FormTextInput
        label={label}
        value={value}
        onChangeText={handleChangeText}
        placeholder={placeholder}
        variant={variant}
        editable={editable}
        autoCapitalize="words"
        autoCorrect={false}
        textContentType="fullStreetAddress"
        autoComplete="street-address"
        returnKeyType="done"
        containerStyle={note || showList ? styles.tightBottom : undefined}
        onFocus={() => {
          setFocused(true);
          if (!verified && value.trim().length >= MIN_QUERY && status === 'idle') search(value);
        }}
        onBlur={() => setFocused(false)}
      />

      {showList ? (
        <View
          style={[
            styles.list,
            inset ? styles.listInset : [styles.listBoxed, { borderColor: colors.border, backgroundColor: colors.surface }],
          ]}
          accessibilityLabel={t('address.suggestions')}
        >
          {results.map((s, i) => (
            <Pressable
              key={s.id || s.label}
              onPress={() => handlePick(s)}
              accessibilityRole="button"
              accessibilityLabel={s.label}
              accessibilityHint={t('address.pickHint')}
              style={({ pressed }) => [
                styles.suggestion,
                i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.borderLight },
                pressed && { backgroundColor: colors.primaryUltraSoft },
              ]}
            >
              <Ionicons name="location-outline" size={18} color={colors.textSecondary} style={styles.pin} />
              <View style={styles.suggestionText}>
                <AppText style={[styles.line1, { color: colors.text }]} numberOfLines={2}>
                  {s.line1 || s.label}
                </AppText>
                {s.line2 ? (
                  <AppText style={[styles.line2, { color: colors.textSecondary }]} numberOfLines={2}>
                    {s.line2}
                  </AppText>
                ) : null}
              </View>
            </Pressable>
          ))}
          <AppText style={[styles.attribution, { color: colors.textTertiary }]}>{t('address.attribution')}</AppText>
        </View>
      ) : null}

      {note ? (
        <View style={[styles.note, inset ? styles.noteInset : styles.noteBoxed]} accessibilityLiveRegion="polite">
          {note.icon ? (
            <Ionicons name={note.icon} size={15} color={note.color} />
          ) : (
            <ActivityIndicator size="small" color={colors.textSecondary} style={styles.spinner} />
          )}
          <AppText style={[styles.noteText, { color: note.color }]}>{note.text}</AppText>
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  tightBottom: {
    marginBottom: 0,
  },
  list: {
    overflow: 'hidden',
  },
  listBoxed: {
    marginTop: spacing.xs,
    borderWidth: 1,
    borderRadius: radii.md,
  },
  listInset: {
    // Suggestion pins line up with the field's text column.
    marginHorizontal: spacing.md - spacing.sm,
  },
  suggestion: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    minHeight: 48,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
  },
  pin: {
    marginTop: 1,
  },
  suggestionText: {
    flex: 1,
    minWidth: 0,
  },
  line1: {
    fontSize: fontSizes.md - 1,
    fontWeight: fontWeights.semibold,
  },
  line2: {
    fontSize: fontSizes.sm - 1,
    marginTop: 1,
  },
  attribution: {
    fontSize: 10,
    textAlign: 'right',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
  },
  note: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxs + 2,
  },
  noteBoxed: {
    marginTop: spacing.xs,
    marginBottom: spacing.md,
  },
  noteInset: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
  },
  spinner: {
    transform: [{ scale: 0.7 }],
    width: 15,
    height: 15,
  },
  noteText: {
    flex: 1,
    fontSize: fontSizes.xs,
    lineHeight: 16,
  },
});
