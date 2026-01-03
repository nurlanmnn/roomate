import React, { useMemo, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useHousehold } from '../../context/HouseholdContext';
import { goalsApi } from '../../api/goalsApi';
import { FormTextInput } from '../../components/FormTextInput';
import { PrimaryButton } from '../../components/PrimaryButton';
import { ScreenHeader } from '../../components/ui/ScreenHeader';
import { useThemeColors, fontSizes, fontWeights, radii, spacing, shadows } from '../../theme';

export const CreateGoalScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { selectedHousehold } = useHousehold();
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<'idea' | 'planned' | 'in_progress' | 'done'>('idea');
  const [targetDate, setTargetDate] = useState<Date | null>(null);
  const [showTargetDatePicker, setShowTargetDatePicker] = useState(false);
  const [saving, setSaving] = useState(false);

  const canSubmit = useMemo(() => title.trim().length > 0, [title]);

  const handleCreate = async () => {
    if (!selectedHousehold) return;
    if (!canSubmit) {
      Alert.alert('Error', 'Please enter a title');
      return;
    }

    try {
      setSaving(true);
      await goalsApi.createGoal({
        householdId: selectedHousehold._id,
        title: title.trim(),
        description: description || undefined,
        status,
        targetDate: targetDate ? targetDate.toISOString().split('T')[0] : undefined,
      });
      navigation.goBack();
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.error || 'Failed to create goal');
    } finally {
      setSaving(false);
    }
  };

  if (!selectedHousehold) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>Please select a household</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView
        style={styles.keyboardAvoid}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <ScrollView style={styles.scrollView} keyboardShouldPersistTaps="handled">
          <ScreenHeader title="New Goal" subtitle={selectedHousehold.name} />

          <View style={styles.card}>
            <FormTextInput
              label="Title"
              value={title}
              onChangeText={setTitle}
              placeholder="e.g., Get a big living room rug"
            />
            <FormTextInput
              label="Description (Optional)"
              value={description}
              onChangeText={setDescription}
              placeholder="Add details"
              multiline
            />

            <View style={styles.field}>
              <Text style={styles.label}>Status</Text>
              {(['idea', 'planned', 'in_progress', 'done'] as const).map((s) => (
                <TouchableOpacity
                  key={s}
                  style={[styles.option, status === s && styles.optionActive]}
                  onPress={() => setStatus(s)}
                >
                  <Text style={[styles.optionText, status === s && styles.optionTextActive]}>
                    {s.charAt(0).toUpperCase() + s.replace('_', ' ').slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Target Date (Optional)</Text>
              <TouchableOpacity style={styles.dateButton} onPress={() => setShowTargetDatePicker(true)}>
                <Text style={[styles.dateText, !targetDate && styles.placeholderText]}>
                  {targetDate
                    ? targetDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
                    : 'Select date'}
                </Text>
              </TouchableOpacity>
              {showTargetDatePicker && (
                <DateTimePicker
                  value={targetDate || new Date()}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  minimumDate={new Date()}
                  onChange={(event, selectedDate) => {
                    setShowTargetDatePicker(Platform.OS === 'ios');
                    if (selectedDate) setTargetDate(selectedDate);
                  }}
                />
              )}
            </View>

            <View style={styles.actions}>
              <PrimaryButton title="Cancel" onPress={() => navigation.goBack()} variant="secondary" />
              <View style={styles.spacer} />
              <PrimaryButton title="Create" onPress={handleCreate} disabled={!canSubmit} loading={saving} />
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const createStyles = (colors: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  keyboardAvoid: { flex: 1 },
  scrollView: { flex: 1 },
  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xxl },
  emptyText: { fontSize: fontSizes.md, color: colors.muted },
  card: {
    marginHorizontal: spacing.md,
    marginTop: spacing.md,
    marginBottom: spacing.xxl,
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    ...(shadows.sm as object),
  },
  field: { marginBottom: spacing.md },
  label: { fontSize: fontSizes.sm, fontWeight: fontWeights.semibold, color: colors.textSecondary, marginBottom: spacing.xs },
  option: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    marginBottom: spacing.xs,
  },
  optionActive: { backgroundColor: colors.accentSoft, borderColor: colors.accent },
  optionText: { fontSize: fontSizes.md, color: colors.text },
  optionTextActive: { color: colors.text, fontWeight: fontWeights.semibold },
  dateButton: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  dateText: { fontSize: fontSizes.md, color: colors.text },
  placeholderText: { color: colors.muted },
  actions: { flexDirection: 'row', marginTop: spacing.md },
  spacer: { width: spacing.sm },
});




