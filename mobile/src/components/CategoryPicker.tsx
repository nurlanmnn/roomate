import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Modal, ScrollView } from 'react-native';
import { AppText } from './AppText';
import { Ionicons } from '@expo/vector-icons';
import { EXPENSE_CATEGORIES, ExpenseCategory } from '../constants/expenseCategories';
import { useThemeColors, fontSizes, fontWeights, spacing, radii, shadows } from '../theme';

interface CategoryPickerProps {
  selectedCategory?: string;
  onSelectCategory: (categoryId: string) => void;
  onClear?: () => void;
}

export const CategoryPicker: React.FC<CategoryPickerProps> = ({
  selectedCategory,
  onSelectCategory,
  onClear,
}) => {
  const colors = useThemeColors();
  const [modalVisible, setModalVisible] = useState(false);
  const selectedCat = selectedCategory ? EXPENSE_CATEGORIES.find(c => c.id === selectedCategory) : null;

  const styles = React.useMemo(() => StyleSheet.create({
    pickerButton: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radii.md,
      backgroundColor: colors.surface,
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.md,
      minHeight: 44,
      justifyContent: 'center',
      ...(shadows.sm as object),
    },
    selectedContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
    },
    placeholderContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    placeholderText: {
      fontSize: fontSizes.md,
      color: colors.textSecondary,
    },
    selectedText: {
      fontSize: fontSizes.md,
      color: colors.text,
      fontWeight: fontWeights.medium,
      flex: 1,
    },
    iconContainer: {
      width: 32,
      height: 32,
      borderRadius: radii.sm,
      alignItems: 'center',
      justifyContent: 'center',
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'flex-end',
    },
    modalContent: {
      backgroundColor: colors.surface,
      borderTopLeftRadius: radii.lg,
      borderTopRightRadius: radii.lg,
      maxHeight: '80%',
      paddingTop: spacing.lg,
      ...(shadows.lg as object),
    },
    modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: spacing.lg,
      paddingBottom: spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: colors.borderLight,
    },
    modalTitle: {
      fontSize: fontSizes.xl,
      fontWeight: fontWeights.bold,
      color: colors.text,
    },
    categoriesList: {
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.md,
    },
    categoryItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.sm,
      borderRadius: radii.md,
      marginBottom: spacing.xs,
      gap: spacing.sm,
      minHeight: 44,
    },
    categoryItemSelected: {
      backgroundColor: colors.primaryUltraSoft,
    },
    categoryText: {
      fontSize: fontSizes.md,
      color: colors.text,
      flex: 1,
    },
  }), [colors]);

  const handleSelect = (categoryId: string) => {
    onSelectCategory(categoryId);
    setModalVisible(false);
  };

  const handleClear = () => {
    if (onClear) {
      onClear();
    }
    setModalVisible(false);
  };

  return (
    <>
      <TouchableOpacity
        style={styles.pickerButton}
        onPress={() => setModalVisible(true)}
        activeOpacity={0.7}
      >
        {selectedCat ? (
          <View style={styles.selectedContainer}>
            <View style={[styles.iconContainer, { backgroundColor: selectedCat.color + '20' }]}>
              <Ionicons name={selectedCat.icon} size={20} color={selectedCat.color} />
            </View>
            <AppText style={styles.selectedText}>{selectedCat.name}</AppText>
            <Ionicons name="chevron-down-outline" size={20} color={colors.textSecondary} />
          </View>
        ) : (
          <View style={styles.placeholderContainer}>
            <AppText style={styles.placeholderText}>Select category (optional)</AppText>
            <Ionicons name="chevron-down-outline" size={20} color={colors.textSecondary} />
          </View>
        )}
      </TouchableOpacity>

      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <AppText style={styles.modalTitle}>Select Category</AppText>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close-outline" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.categoriesList} showsVerticalScrollIndicator={false}>
              {onClear && selectedCategory && (
                <TouchableOpacity
                  style={styles.categoryItem}
                  onPress={handleClear}
                >
                  <View style={[styles.iconContainer, { backgroundColor: colors.surfaceAlt }]}>
                    <Ionicons name="close-circle-outline" size={20} color={colors.textSecondary} />
                  </View>
                  <AppText style={styles.categoryText}>Clear selection</AppText>
                </TouchableOpacity>
              )}
              
              {EXPENSE_CATEGORIES.map((category) => (
                <TouchableOpacity
                  key={category.id}
                  style={[
                    styles.categoryItem,
                    selectedCategory === category.id && styles.categoryItemSelected,
                  ]}
                  onPress={() => handleSelect(category.id)}
                >
                  <View style={[styles.iconContainer, { backgroundColor: category.color + '20' }]}>
                    <Ionicons name={category.icon} size={20} color={category.color} />
                  </View>
                  <AppText style={styles.categoryText}>{category.name}</AppText>
                  {selectedCategory === category.id && (
                    <Ionicons name="checkmark-circle" size={24} color={colors.primary} />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
};

