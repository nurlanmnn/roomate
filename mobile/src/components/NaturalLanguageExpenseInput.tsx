import React, { useState } from 'react';
import { TouchableOpacity, Text, StyleSheet, Modal, View, TextInput, Alert, Platform, KeyboardAvoidingView } from 'react-native';
import { colors, fontSizes, fontWeights, spacing, radii, shadows } from '../theme';
import { parseExpenseInput, ParsedExpense } from '../utils/expenseParser';
import { formatCurrency } from '../utils/formatCurrency';

interface NaturalLanguageExpenseInputProps {
  memberNames: Array<{ _id: string; name: string }>;
  currentUserId: string;
  onExpenseParsed: (parsed: ParsedExpense) => void;
}

export const NaturalLanguageExpenseInput: React.FC<NaturalLanguageExpenseInputProps> = ({
  memberNames,
  currentUserId,
  onExpenseParsed,
}) => {
  const [showModal, setShowModal] = useState(false);
  const [textInput, setTextInput] = useState('');
  const [parsedPreview, setParsedPreview] = useState<ParsedExpense | null>(null);

  const handleTextChange = (text: string) => {
    setTextInput(text);
    if (text.trim()) {
      const parsed = parseExpenseInput(text, memberNames);
      setParsedPreview(parsed);
    } else {
      setParsedPreview(null);
    }
  };

  const handleSubmit = () => {
    if (!textInput.trim()) {
      Alert.alert('Error', 'Please enter an expense description');
      return;
    }

    const parsed = parseExpenseInput(textInput, memberNames);
    if (!parsed) {
      Alert.alert('Error', 'Could not parse expense. Please try a different format.');
      return;
    }

    if (!parsed.amount || parsed.amount <= 0) {
      Alert.alert('Error', 'Could not find a valid amount in your input.');
      return;
    }

    // If no participants found, include current user
    if (parsed.participants.length === 0) {
      parsed.participants = [currentUserId];
    }

    onExpenseParsed(parsed);
    setTextInput('');
    setParsedPreview(null);
    setShowModal(false);
  };

  const handleCancel = () => {
    setTextInput('');
    setParsedPreview(null);
    setShowModal(false);
  };

  return (
    <>
      <TouchableOpacity
        style={styles.button}
        onPress={() => setShowModal(true)}
      >
        <Text style={styles.buttonText}>💬 Quick Add</Text>
      </TouchableOpacity>

      <Modal
        visible={showModal}
        animationType="slide"
        transparent
        onRequestClose={handleCancel}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Quick Add Expense</Text>
            <Text style={styles.modalSubtitle}>
              Describe your expense naturally.
              {'\n\n'}Examples:
              {'\n'}• "Pizza $24.50 with John and Sarah"
              {'\n'}• "Uber $15.50 split evenly"
              {'\n'}• "Groceries $100 I pay 60%"
              {'\n'}• "Rent $1200 John pays $400, Sarah pays $400"
            </Text>
            <TextInput
              style={styles.textInput}
              value={textInput}
              onChangeText={handleTextChange}
              placeholder="e.g., Pizza $24.50 with John and Sarah"
              multiline
              numberOfLines={4}
              autoFocus
            />

            {parsedPreview && (
              <View style={styles.previewContainer}>
                <Text style={styles.previewTitle}>Preview:</Text>
                <View style={styles.previewRow}>
                  <Text style={styles.previewLabel}>Description:</Text>
                  <Text style={styles.previewValue}>{parsedPreview.description}</Text>
                </View>
                {parsedPreview.amount && (
                  <View style={styles.previewRow}>
                    <Text style={styles.previewLabel}>Amount:</Text>
                    <Text style={styles.previewValue}>{formatCurrency(parsedPreview.amount)}</Text>
                  </View>
                )}
                {parsedPreview.participants.length > 0 && (
                  <View style={styles.previewRow}>
                    <Text style={styles.previewLabel}>Participants:</Text>
                    <Text style={styles.previewValue}>
                      {parsedPreview.participants
                        .map(id => memberNames.find(m => m._id === id)?.name || 'Unknown')
                        .join(', ')}
                    </Text>
                  </View>
                )}
                <View style={styles.previewRow}>
                  <Text style={styles.previewLabel}>Split:</Text>
                  <Text style={styles.previewValue}>
                    {parsedPreview.splitMethod === 'even' && 'Evenly'}
                    {parsedPreview.splitMethod === 'percentage' && `${parsedPreview.percentage}%`}
                    {parsedPreview.splitMethod === 'manual' && 'Manual'}
                  </Text>
                </View>
              </View>
            )}

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={handleCancel}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.submitButton]}
                onPress={handleSubmit}
                disabled={!parsedPreview || !parsedPreview.amount}
              >
                <Text style={[styles.submitButtonText, (!parsedPreview || !parsedPreview.amount) && styles.disabledText]}>
                  Use This
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  button: {
    backgroundColor: colors.primary,
    padding: spacing.sm,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
    minWidth: 120,
  },
  buttonText: {
    color: colors.textInverse,
    fontSize: fontSizes.md,
    fontWeight: fontWeights.semibold,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    padding: spacing.xl,
    width: '100%',
    maxWidth: 400,
    ...(shadows.lg as object),
  },
  modalTitle: {
    fontSize: fontSizes.xxl,
    fontWeight: fontWeights.bold,
    marginBottom: spacing.xs,
    color: colors.text,
  },
  modalSubtitle: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
    marginBottom: spacing.md,
    lineHeight: 20,
  },
  textInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    padding: spacing.md,
    fontSize: fontSizes.md,
    minHeight: 100,
    textAlignVertical: 'top',
    marginBottom: spacing.md,
    backgroundColor: colors.background,
    color: colors.text,
  },
  previewContainer: {
    backgroundColor: colors.accentSoft,
    padding: spacing.md,
    borderRadius: radii.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.accent,
  },
  previewTitle: {
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.semibold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  previewRow: {
    flexDirection: 'row',
    marginBottom: spacing.xxs,
  },
  previewLabel: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
    fontWeight: fontWeights.medium,
    width: 100,
  },
  previewValue: {
    fontSize: fontSizes.sm,
    color: colors.text,
    flex: 1,
  },
  modalActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  modalButton: {
    flex: 1,
    padding: spacing.md,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cancelButtonText: {
    color: colors.textSecondary,
    fontSize: fontSizes.md,
    fontWeight: fontWeights.semibold,
  },
  submitButton: {
    backgroundColor: colors.primary,
  },
  submitButtonText: {
    color: colors.textInverse,
    fontSize: fontSizes.md,
    fontWeight: fontWeights.semibold,
  },
  disabledText: {
    opacity: 0.5,
  },
});

