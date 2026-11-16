import React, { useState } from 'react';
import { Alert, KeyboardAvoidingView, Modal, Platform, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useLanguage } from '../context/LanguageContext';
import { radii, spacing, useThemeColors } from '../theme';
import { AppText } from './AppText';
import { PrimaryButton } from './PrimaryButton';

interface QuickAddButtonProps {
  onAddItems: (items: string[]) => void;
}

interface ParsedItem {
  name: string;
  quantity?: number;
  weight?: number;
  weightUnit?: string;
}

// Parse natural language shopping list input
const parseShoppingList = (input: string): ParsedItem[] => {
  const items: ParsedItem[] = [];

  // Normalize input: replace "and" with commas, handle various separators
  let normalized = input
    .toLowerCase()
    .replace(/\s+and\s+/gi, ', ')
    .replace(/\s*,\s*/g, ',')
    .replace(/\s*;\s*/g, ',')
    .replace(/\s*\.\s*/g, ',');

  // Split by commas
  const parts = normalized.split(',').map(p => p.trim()).filter(p => p.length > 0);

  // Weight units to recognize
  const weightUnits = ['kg', 'kilogram', 'kilograms', 'g', 'gram', 'grams', 'lbs', 'pound', 'pounds', 'oz', 'ounce', 'ounces', 'liter', 'liters', 'l', 'ml', 'milliliter', 'milliliters', 'fl oz', 'fluid ounce', 'cup', 'cups', 'pint', 'pints', 'quart', 'quarts', 'gallon', 'gallons'];

  // Quantity keywords
  const quantityKeywords = ['x', 'times', 'of', 'pack', 'packs', 'bottle', 'bottles', 'box', 'boxes', 'bag', 'bags'];

  for (const part of parts) {
    const item: ParsedItem = { name: '' };

    // Extract weight (e.g., "2kg chicken", "1.5 lbs flour")
    const weightRegex = /(\d+(?:\.\d+)?)\s*(kg|kilogram|kilograms|g|gram|grams|lbs|pound|pounds|oz|ounce|ounces|liter|liters|l|ml|milliliter|milliliters|fl oz|fluid ounce|cup|cups|pint|pints|quart|quarts|gallon|gallons)\s+(.+)/i;
    const weightMatch = part.match(weightRegex);

    if (weightMatch) {
      item.weight = parseFloat(weightMatch[1]);
      item.weightUnit = normalizeWeightUnit(weightMatch[2]);
      item.name = weightMatch[3].trim();
    } else {
      // Extract quantity (e.g., "2 milk", "3x eggs", "5 bottles of water")
      const quantityRegex = /(\d+)\s*(x|times|of|pack|packs|bottle|bottles|box|boxes|bag|bags)?\s*(.+)/i;
      const quantityMatch = part.match(quantityRegex);

      if ((quantityMatch && quantityKeywords.some(kw => part.includes(kw))) || /^\d+\s+\w+/.test(part)) {
        if (quantityMatch) {
          item.quantity = parseInt(quantityMatch[1], 10);
          item.name =
            (quantityMatch[3]?.trim() || quantityMatch[2])
              ? part.replace(/^\d+\s*(x|times|of|pack|packs|bottle|bottles|box|boxes|bag|bags)?\s*/i, '').trim()
              : part;
        }
      } else {
        // Just the item name
        item.name = part;
      }
    }

    // Clean up item name
    item.name = item.name
      .replace(/^(a|an|the)\s+/i, '')
      .trim();

    if (item.name.length > 0) {
      items.push(item);
    }
  }

  return items;
};

// Normalize weight units to standard format
const normalizeWeightUnit = (unit: string): string => {
  const normalized = unit.toLowerCase().trim();
  const unitMap: { [key: string]: string; } = {
    'kg': 'kg', 'kilogram': 'kg', 'kilograms': 'kg',
    'g': 'g', 'gram': 'g', 'grams': 'g',
    'lbs': 'lbs', 'pound': 'lbs', 'pounds': 'lbs',
    'oz': 'oz', 'ounce': 'oz', 'ounces': 'oz',
    'liter': 'liter', 'liters': 'liter', 'l': 'liter',
    'ml': 'ml', 'milliliter': 'ml', 'milliliters': 'ml',
    'fl oz': 'fl oz', 'fluid ounce': 'fl oz',
    'cup': 'cup', 'cups': 'cup',
    'pint': 'pint', 'pints': 'pint',
    'quart': 'quart', 'quarts': 'quart',
    'gallon': 'gallon', 'gallons': 'gallon',
  };
  return unitMap[normalized] || normalized;
};

export const QuickAddButton: React.FC<QuickAddButtonProps> = ({ onAddItems }) => {
  const colors = useThemeColors();
  const { t } = useLanguage();
  const [showTextModal, setShowTextModal] = useState(false);
  const [textInput, setTextInput] = useState('');

  const styles = React.useMemo(() => StyleSheet.create({
    modalOverlay: {
      flex: 1,
      backgroundColor: colors.shadowStrong,
      justifyContent: 'center',
      alignItems: 'center',
      padding: spacing.lg,
    },
    modalContent: {
      backgroundColor: colors.surface,
      borderRadius: radii.lg,
      padding: spacing.xl,
      width: '100%',
      maxWidth: 400,
      maxHeight: '95%',
    },
    modalTitle: {
      fontSize: 24,
      fontWeight: '700',
      marginBottom: spacing.xs,
      color: colors.text,
    },
    modalSubtitle: {
      fontSize: 14,
      color: colors.textSecondary,
      marginBottom: spacing.md,
      lineHeight: 20,
    },
    textInput: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radii.md,
      padding: spacing.sm,
      fontSize: 16,
      minHeight: 120,
      textAlignVertical: 'top',
      marginBottom: spacing.md,
      color: colors.text,
      backgroundColor: colors.background,
    },
    modalActions: {
      flexDirection: 'column',
      gap: spacing.sm,
    },
  }), [colors]);

  const handleTextSubmit = () => {
    if (!textInput.trim()) {
      Alert.alert(t('common.error'), t('shopping.quickAddEmpty'));
      return;
    }

    try {
      // Parse the input
      const parsedItems = parseShoppingList(textInput);

      if (parsedItems.length === 0) {
        Alert.alert(t('common.error'), t('shopping.quickAddParseError'));
        return;
      }

      // Format items for adding
      const formattedItems = parsedItems.map((item) => {
        let itemText = item.name;
        if (item.quantity) {
          itemText = `${item.quantity} ${itemText}`;
        }
        if (item.weight && item.weightUnit) {
          itemText = `${item.weight}${item.weightUnit} ${itemText}`;
        }
        return itemText;
      });

      onAddItems(formattedItems);
      setTextInput('');
      setShowTextModal(false);
    } catch (error) {
      if (__DEV__) console.error('Failed to process input', error);
      Alert.alert(t('common.error'), t('shoppingList.failedToAddItems'));
    }
  };

  return (
    <>
      <PrimaryButton
        title={t('shopping.quickAdd')}
        icon="add-outline"
        variant="secondary"
        onPress={() => setShowTextModal(true)}
      />

      <Modal
        visible={showTextModal}
        animationType="none"
        transparent
        onRequestClose={() => {
          setShowTextModal(false);
          setTextInput('');
        }}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
        >
          <View style={styles.modalContent}>
            <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
              <AppText accessibilityRole="header" style={styles.modalTitle}>{t('shopping.quickAdd')}</AppText>
              <AppText style={styles.modalSubtitle}>
                {t('shopping.quickAddHelp')}
              </AppText>
              <TextInput
                style={styles.textInput}
                value={textInput}
                onChangeText={setTextInput}
                placeholder={t('shopping.itemNamePlaceholder')}
                accessibilityLabel={t('shopping.title')}
                placeholderTextColor={colors.textSecondary}
                multiline
                numberOfLines={6}
                autoFocus
              />
              <View style={styles.modalActions}>
                <PrimaryButton
                  title={t('common.cancel')}
                  variant="secondary"
                  onPress={() => {
                    setShowTextModal(false);
                    setTextInput('');
                  }}
                />
                <PrimaryButton title={t('common.add')} onPress={handleTextSubmit} />
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </>
  );
};
