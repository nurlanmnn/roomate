import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, TextInput, TouchableOpacity, RefreshControl, Alert, Modal, KeyboardAvoidingView, Platform } from 'react-native';
import { AppText } from '../../components/AppText';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useHousehold } from '../../context/HouseholdContext';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { shoppingApi, ShoppingItem, ShoppingList, WeightUnit } from '../../api/shoppingApi';
import { ShoppingItemRow } from '../../components/ShoppingItemRow';
import { QuickAddButton } from '../../components/QuickAddButton';
import { PrimaryButton } from '../../components/PrimaryButton';
import { ScreenHeader } from '../../components/ui/ScreenHeader';
import { EmptyState } from '../../components/ui/EmptyState';
import { useThemeColors, fontSizes, fontWeights, radii, spacing, TAB_BAR_HEIGHT, shadows } from '../../theme';
import { SearchBar } from '../../components/ui/SearchBar';
import { Ionicons } from '@expo/vector-icons';
import { FormTextInput } from '../../components/FormTextInput';

const weightUnits: WeightUnit[] = ['lbs', 'kg', 'g', 'oz', 'liter', 'ml', 'fl oz', 'cup', 'pint', 'quart', 'gallon'];

export const ShoppingListScreen: React.FC = () => {
  const { selectedHousehold, setSelectedHousehold } = useHousehold();
  const { user } = useAuth();
  const { t } = useLanguage();
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  const styles = React.useMemo(() => createStyles(colors, insets.bottom), [colors, insets.bottom]);
  const [lists, setLists] = useState<ShoppingList[]>([]);
  const [selectedList, setSelectedList] = useState<ShoppingList | null>(null);
  const [items, setItems] = useState<ShoppingItem[]>([]);
  const [completedItems, setCompletedItems] = useState<ShoppingItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState('');
  const [quantity, setQuantity] = useState('');
  const [weight, setWeight] = useState('');
  const [weightUnit, setWeightUnit] = useState<WeightUnit | ''>('');
  const [isShared, setIsShared] = useState(true);
  const [ownerId, setOwnerId] = useState('');
  const [showCompleted, setShowCompleted] = useState(false);
  const [showListModal, setShowListModal] = useState(false);
  const [showAddItemModal, setShowAddItemModal] = useState(false);
  const [newListName, setNewListName] = useState('');
  const [editingList, setEditingList] = useState<ShoppingList | null>(null);
  const [editingItem, setEditingItem] = useState<ShoppingItem | null>(null);
  const [editItemName, setEditItemName] = useState('');
  const [editItemQuantity, setEditItemQuantity] = useState('');
  const [editItemWeight, setEditItemWeight] = useState('');
  const [editItemWeightUnit, setEditItemWeightUnit] = useState<WeightUnit | ''>('');
  const [editItemIsShared, setEditItemIsShared] = useState(true);
  const [editItemOwnerId, setEditItemOwnerId] = useState('');
  const [showUnitDropdown, setShowUnitDropdown] = useState(false);
  const [showEditUnitDropdown, setShowEditUnitDropdown] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [addingItem, setAddingItem] = useState(false);

  useEffect(() => {
    if (selectedHousehold) {
      loadLists();
    }
  }, [selectedHousehold]);

  useEffect(() => {
    if (selectedList) {
      loadItems();
    } else {
      setItems([]);
      setCompletedItems([]);
    }
  }, [selectedList]);

  const loadLists = async () => {
    if (!selectedHousehold) return;

    setLoading(true);
    try {
      const allLists = await shoppingApi.getShoppingLists(selectedHousehold._id);
      setLists(allLists);
      
      // Auto-select first list if available and none selected
      if (allLists.length > 0 && !selectedList) {
        setSelectedList(allLists[0]);
      }
    } catch (error: any) {
      console.error('Failed to load shopping lists:', error);
      if (error?.response?.status === 403) {
        setSelectedHousehold(null);
      }
    } finally {
      setLoading(false);
    }
  };

  const loadItems = async () => {
    if (!selectedList) return;

    setLoading(true);
    try {
      const [activeItems, completed] = await Promise.all([
        shoppingApi.getShoppingItems(selectedList._id, false),
        shoppingApi.getShoppingItems(selectedList._id, true),
      ]);
      setItems(activeItems);
      setCompletedItems(completed);
    } catch (error) {
      console.error('Failed to load shopping items:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateList = async () => {
    if (!selectedHousehold || !newListName.trim()) {
      Alert.alert(t('common.error'), t('shoppingList.enterListName'));
      return;
    }

    try {
      const newList = await shoppingApi.createShoppingList({
        householdId: selectedHousehold._id,
        name: newListName.trim(),
      });
      setNewListName('');
      setShowListModal(false);
      await loadLists();
      setSelectedList(newList);
    } catch (error: any) {
      Alert.alert(t('common.error'), error.response?.data?.error || t('shoppingList.failedToCreateList'));
    }
  };

  const handleEditList = (list: ShoppingList) => {
    setEditingList(list);
    setNewListName(list.name);
    setShowListModal(true);
  };

  const handleUpdateList = async () => {
    if (!editingList || !newListName.trim()) {
      Alert.alert(t('common.error'), t('shoppingList.enterListName'));
      return;
    }

    try {
      const updatedList = await shoppingApi.updateShoppingList(editingList._id, {
        name: newListName.trim(),
      });
      setNewListName('');
      setShowListModal(false);
      setEditingList(null);
      await loadLists();
      // Update selected list if it was the one being edited
      if (selectedList?._id === editingList._id) {
        setSelectedList(updatedList);
      }
    } catch (error: any) {
      Alert.alert(t('common.error'), error.response?.data?.error || t('shoppingList.failedToUpdateList'));
    }
  };

  const handleEditItem = (item: ShoppingItem) => {
    setEditingItem(item);
    setEditItemName(item.name);
    setEditItemQuantity(item.quantity?.toString() || '');
    setEditItemWeight(item.weight?.toString() || '');
    setEditItemWeightUnit((item.weightUnit as WeightUnit) || '');
    setEditItemIsShared(item.isShared);
    setEditItemOwnerId(item.ownerId?._id || '');
  };

  const handleUpdateItem = async () => {
    if (!editingItem || !editItemName.trim()) {
      Alert.alert(t('common.error'), t('shoppingList.enterItemName'));
      return;
    }

    if (!editItemIsShared && !editItemOwnerId) {
      Alert.alert(t('common.error'), t('shoppingList.selectOwnerForPersonal'));
      return;
    }

    // Optimistic update - update UI immediately
    const updatedItem = {
      ...editingItem,
      name: editItemName.trim(),
      quantity: editItemQuantity ? parseInt(editItemQuantity, 10) : undefined,
      weight: editItemWeight ? parseInt(editItemWeight, 10) : undefined,
      weightUnit: editItemWeightUnit || undefined,
      isShared: editItemIsShared,
      ownerId: editItemIsShared ? undefined : editItemOwnerId,
    };

    // Update local state immediately
    setItems(items.map(item => 
      item._id === editingItem._id ? updatedItem : item
    ));
    setCompletedItems(completedItems.map(item => 
      item._id === editingItem._id ? updatedItem : item
    ));

    // Close modal immediately
    setEditingItem(null);
    setEditItemName('');
    setEditItemQuantity('');
    setEditItemWeight('');
    setEditItemWeightUnit('');
    setShowEditUnitDropdown(false);
    setEditItemIsShared(true);
    setEditItemOwnerId('');

    // Then sync with server in background
    try {
      await shoppingApi.updateShoppingItem(editingItem._id, {
        name: editItemName.trim(),
        quantity: editItemQuantity ? parseInt(editItemQuantity, 10) : undefined,
        weight: editItemWeight ? parseInt(editItemWeight, 10) : undefined,
        weightUnit: editItemWeightUnit || undefined,
        isShared: editItemIsShared,
        ownerId: editItemIsShared ? undefined : editItemOwnerId,
      });
      // Reload to ensure we have the latest data from server
      loadItems();
    } catch (error: any) {
      // If item was deleted by another user, just refresh silently
      if (error.response?.status === 404) {
        loadItems();
        return;
      }
      // If update fails, reload to revert optimistic update
      Alert.alert(t('common.error'), error.response?.data?.error || t('shoppingList.failedToUpdateItem'));
      loadItems();
    }
  };

  const handleDeleteList = async (list: ShoppingList) => {
    Alert.alert(t('shoppingList.deleteList'), t('shoppingList.deleteListConfirm', { name: list.name }), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: async () => {
          try {
            await shoppingApi.deleteShoppingList(list._id);
            if (selectedList?._id === list._id) {
              setSelectedList(null);
            }
            await loadLists();
          } catch (error) {
            console.error('Failed to delete list:', error);
            Alert.alert(t('common.error'), t('shoppingList.failedToDeleteList'));
          }
        },
      },
    ]);
  };

  const handleAddItem = async () => {
    if (addingItem) return; // Prevent double submission
    
    if (!selectedHousehold || !user || !selectedList || !name.trim()) {
      Alert.alert(t('common.error'), t('shoppingList.enterItemName'));
      return;
    }

    if (!isShared && !ownerId) {
      Alert.alert(t('common.error'), t('shoppingList.selectOwnerForPersonal'));
      return;
    }

    setAddingItem(true);
    try {
      await shoppingApi.createShoppingItem({
        householdId: selectedHousehold._id,
        listId: selectedList._id,
        name: name.trim(),
        quantity: quantity ? parseInt(quantity, 10) : undefined,
        weight: weight ? parseInt(weight, 10) : undefined,
        weightUnit: weightUnit || undefined,
        isShared,
        ownerId: isShared ? undefined : ownerId,
      });
      setName('');
      setQuantity('');
      setWeight('');
      setWeightUnit('');
      setShowUnitDropdown(false);
      setIsShared(true);
      setOwnerId('');
      setShowAddItemModal(false);
      loadItems();
    } catch (error: any) {
      Alert.alert(t('common.error'), error.response?.data?.error || t('shoppingList.failedToAddItem'));
    } finally {
      setAddingItem(false);
    }
  };

  const handleToggleComplete = async (item: ShoppingItem) => {
    // Optimistic update - remove from current list immediately
    if (item.completed) {
      setCompletedItems(prev => prev.filter(i => i._id !== item._id));
    } else {
      setItems(prev => prev.filter(i => i._id !== item._id));
    }

    try {
      await shoppingApi.updateShoppingItem(item._id, {
        completed: !item.completed,
      });
      loadItems();
    } catch (error: any) {
      // If item was already deleted/modified by another user, just refresh
      if (error.response?.status === 404) {
        // Item no longer exists - another user likely deleted it
        loadItems();
        return;
      }
      console.error('Failed to update item:', error);
      // Revert optimistic update on other errors
      loadItems();
    }
  };

  const handleRestoreAll = async () => {
    if (!selectedList || completedItems.length === 0) return;

    Alert.alert(
      t('shopping.restoreAll'),
      t('shopping.restoreAllConfirm', { count: completedItems.length }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('shopping.restoreAll'),
          onPress: async () => {
            try {
              setLoading(true);
              // Use allSettled to handle partial failures gracefully
              const results = await Promise.allSettled(
                completedItems.map(item =>
                  shoppingApi.updateShoppingItem(item._id, {
                    completed: false,
                  })
                )
              );
              
              // Check if any failed (excluding 404s which mean item was already deleted)
              const realFailures = results.filter(r => 
                r.status === 'rejected' && 
                (r.reason as any)?.response?.status !== 404
              );
              
              if (realFailures.length > 0) {
                console.error('Some items failed to restore:', realFailures);
              }
              
              loadItems();
            } catch (error) {
              console.error('Failed to restore items:', error);
              loadItems(); // Still refresh to show current state
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleDelete = async (item: ShoppingItem) => {
    Alert.alert(t('shoppingList.deleteItem'), t('shoppingList.deleteItemConfirm'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: async () => {
          // Optimistic update - remove from list immediately
          setItems(prev => prev.filter(i => i._id !== item._id));
          setCompletedItems(prev => prev.filter(i => i._id !== item._id));

          try {
            await shoppingApi.deleteShoppingItem(item._id);
            loadItems();
          } catch (error: any) {
            // If item was already deleted by another user, just refresh silently
            if (error.response?.status === 404) {
              loadItems();
              return;
            }
            console.error('Failed to delete item:', error);
            Alert.alert(t('common.error'), t('shoppingList.failedToDeleteItem'));
            loadItems();
          }
        },
      },
    ]);
  };

  const handleQuickAdd = async (items: string[]) => {
    if (!selectedHousehold || !selectedList) return;

    try {
      for (const itemText of items) {
        // Parse the item text to extract details
        // Format: "quantity name" or "weight unit name" or "quantity weight unit name" or just "name"
        const parts = itemText.trim().split(/\s+/);
        
        let itemName = itemText;
        let itemQuantity: number | undefined;
        let itemWeight: number | undefined;
        let itemWeightUnit: WeightUnit | undefined;
        
        // Try to extract quantity (number at the start)
        if (parts.length > 0 && /^\d+$/.test(parts[0])) {
          itemQuantity = parseInt(parts[0], 10);
          itemName = parts.slice(1).join(' ');
        }
        
        // Try to extract weight and unit (e.g., "2kg", "1.5lbs", "500g")
        const weightRegex = /^(\d+(?:\.\d+)?)(kg|g|lbs|oz|liter|l|ml|fl oz|cup|pint|quart|gallon)$/i;
        for (let i = 0; i < parts.length; i++) {
          const match = parts[i].match(weightRegex);
          if (match) {
            itemWeight = parseFloat(match[1]);
            const unit = match[2].toLowerCase();
            // Normalize unit
            if (unit === 'l') itemWeightUnit = 'liter';
            else if (['kg', 'g', 'lbs', 'oz', 'liter', 'ml', 'fl oz', 'cup', 'pint', 'quart', 'gallon'].includes(unit)) {
              itemWeightUnit = unit as WeightUnit;
            }
            // Remove weight part from name
            parts.splice(i, 1);
            itemName = parts.join(' ').trim();
            break;
          }
        }
        
        // If we extracted quantity but name is empty, use the original text
        if (!itemName && itemQuantity) {
          itemName = itemText;
          itemQuantity = undefined;
        }
        
        // Clean up item name
        itemName = itemName.replace(/^(a|an|the)\s+/i, '').trim();
        
        if (!itemName) {
          continue;
        }

        await shoppingApi.createShoppingItem({
          householdId: selectedHousehold._id,
          listId: selectedList._id,
          name: itemName,
          quantity: itemQuantity,
          weight: itemWeight,
          weightUnit: itemWeightUnit,
          isShared: true,
        });
      }
      loadItems();
    } catch (error: any) {
      console.error('Failed to add items:', error);
      Alert.alert(t('common.error'), error.response?.data?.error || t('shoppingList.failedToAddItems'));
    }
  };

  const resetAddItemForm = () => {
    setName('');
    setQuantity('');
    setWeight('');
    setWeightUnit('');
    setShowUnitDropdown(false);
    setIsShared(true);
    setOwnerId('');
  };

  if (!selectedHousehold) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <View style={styles.emptyContainer}>
          <EmptyState
            icon="home-outline"
            title={t('alerts.selectHousehold')}
            message={t('household.selectHousehold')}
            variant="minimal"
          />
        </View>
      </SafeAreaView>
    );
  }

  const q = searchQuery.trim().toLowerCase();
  const filteredLists = q
    ? lists.filter((l) => l.name.toLowerCase().includes(q))
    : lists;
  const filteredItems = q
    ? items.filter((it) => it.name.toLowerCase().includes(q))
    : items;
  const filteredCompletedItems = q
    ? completedItems.filter((it) => it.name.toLowerCase().includes(q))
    : completedItems;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView
        style={styles.keyboardAvoid}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        {/* Header */}
        <View style={styles.header}>
          <ScreenHeader title={t('shopping.title')} subtitle={selectedHousehold.name} />
          <View style={styles.headerActions}>
            <SearchBar value={searchQuery} onChangeText={setSearchQuery} placeholder={t('common.search')} />
          </View>
        </View>

        {/* List Selection */}
        <View style={styles.listSection}>
          <View style={styles.listSectionHeader}>
            <AppText style={styles.listSectionTitle}>{t('shopping.title')}</AppText>
            <TouchableOpacity
              style={styles.createListButton}
              onPress={() => {
                setEditingList(null);
                setNewListName('');
                setShowListModal(true);
              }}
            >
              <Ionicons name="add" size={20} color={colors.primary} />
              <AppText style={styles.createListButtonText}>{t('shopping.createList')}</AppText>
            </TouchableOpacity>
          </View>
          {lists.length > 0 && (
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false} 
              contentContainerStyle={styles.listScrollContent}
            >
              {filteredLists.map((list) => (
                <TouchableOpacity
                  key={list._id}
                  style={[
                    styles.listCard,
                    selectedList?._id === list._id && styles.listCardSelected,
                  ]}
                  onPress={() => setSelectedList(list)}
                  onLongPress={() => handleEditList(list)}
                >
                  <AppText
                    style={[
                      styles.listCardText,
                      selectedList?._id === list._id && styles.listCardTextSelected,
                    ]}
                    numberOfLines={1}
                  >
                    {list.name}
                  </AppText>
                  {selectedList?._id === list._id && (
                    <View style={styles.listCardIndicator} />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={loadLists} />}
          keyboardShouldPersistTaps="handled"
        >
          {selectedList ? (
            <>
              {/* List Header */}
              <View style={styles.listHeader}>
                <View style={styles.listHeaderLeft}>
                  <AppText style={styles.listTitle}>{selectedList.name}</AppText>
                  <AppText style={styles.listSubtitle}>
                    {filteredItems.length} {filteredItems.length === 1 ? t('shopping.item') : t('shopping.items')}
                  </AppText>
                </View>
                <View style={styles.listHeaderActions}>
                  <QuickAddButton onAddItems={handleQuickAdd} />
                  <TouchableOpacity
                    style={styles.listActionButton}
                    onPress={() => handleEditList(selectedList)}
                  >
                    <Ionicons name="create-outline" size={22} color={colors.textSecondary} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.listActionButton}
                    onPress={() => handleDeleteList(selectedList)}
                  >
                    <Ionicons name="trash-outline" size={22} color={colors.danger} />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Items Section */}
              {filteredItems.length === 0 && filteredCompletedItems.length === 0 ? (
                <EmptyState
                  icon="cart-outline"
                  title={t('shoppingList.noItemsToBuy')}
                  message={t('shopping.noItemsDescription')}
                  actionLabel={t('shopping.addItem')}
                  onAction={() => setShowAddItemModal(true)}
                />
              ) : (
                <>
                  {filteredItems.length > 0 && (
                    <View style={styles.section}>
                      <AppText style={styles.sectionTitle}>{t('shoppingList.toBuy')}</AppText>
                      <View style={styles.itemsContainer}>
                        {filteredItems.map((item) => (
                          <ShoppingItemRow
                            key={item._id}
                            item={item}
                            onToggle={() => handleToggleComplete(item)}
                            onEdit={() => handleEditItem(item)}
                            onDelete={() => handleDelete(item)}
                          />
                        ))}
                      </View>
                    </View>
                  )}

                  {filteredCompletedItems.length > 0 && (
                    <View style={styles.section}>
                      <TouchableOpacity
                        style={styles.completedHeader}
                        onPress={() => setShowCompleted(!showCompleted)}
                        activeOpacity={0.7}
                      >
                        <View style={styles.completedHeaderLeft}>
                          <Ionicons 
                            name={showCompleted ? 'chevron-down' : 'chevron-forward'} 
                            size={20} 
                            color={colors.textSecondary} 
                          />
                          <AppText style={styles.sectionTitle}>
                            {t('shopping.completedItems')} ({filteredCompletedItems.length})
                          </AppText>
                        </View>
                        {showCompleted && (
                          <TouchableOpacity
                            style={styles.restoreAllButton}
                            onPress={handleRestoreAll}
                          >
                            <Ionicons name="refresh-outline" size={16} color={colors.primary} />
                            <AppText style={styles.restoreAllText}>{t('shopping.restoreAll')}</AppText>
                          </TouchableOpacity>
                        )}
                      </TouchableOpacity>
                      {showCompleted && (
                        <View style={styles.itemsContainer}>
                          {filteredCompletedItems.map((item) => (
                            <ShoppingItemRow
                              key={item._id}
                              item={item}
                              onToggle={() => handleToggleComplete(item)}
                              onEdit={() => handleEditItem(item)}
                              onDelete={() => handleDelete(item)}
                            />
                          ))}
                        </View>
                      )}
                    </View>
                  )}
                </>
              )}
            </>
          ) : (
            <EmptyState
              icon="list-outline"
              title={t('shopping.noShoppingLists')}
              message={t('shopping.noItemsDescription')}
              actionLabel={t('shopping.createList')}
              onAction={() => {
                setEditingList(null);
                setNewListName('');
                setShowListModal(true);
              }}
            />
          )}
        </ScrollView>

        {/* Floating Action Button */}
        {selectedList && (
          <TouchableOpacity
            style={styles.fab}
            onPress={() => setShowAddItemModal(true)}
            activeOpacity={0.8}
          >
            <Ionicons name="add" size={28} color={colors.surface} />
          </TouchableOpacity>
        )}

        {/* Create/Edit List Modal */}
        <Modal
          visible={showListModal}
          animationType="slide"
          transparent
          onRequestClose={() => {
            setShowListModal(false);
            setEditingList(null);
            setNewListName('');
          }}
        >
          <KeyboardAvoidingView
            style={styles.modalOverlay}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
          >
            <TouchableOpacity
              style={styles.modalBackdrop}
              activeOpacity={1}
              onPress={() => {
                setShowListModal(false);
                setEditingList(null);
                setNewListName('');
              }}
            >
              <View style={styles.modalContent}>
                <View style={styles.modalHeader}>
                  <AppText style={styles.modalTitle}>
                    {editingList ? t('shopping.editList') : t('shopping.createList')}
                  </AppText>
                  <TouchableOpacity
                    style={styles.modalCloseButton}
                    onPress={() => {
                      setShowListModal(false);
                      setEditingList(null);
                      setNewListName('');
                    }}
                  >
                    <Ionicons name="close" size={24} color={colors.textSecondary} />
                  </TouchableOpacity>
                </View>
                <View style={styles.modalBody}>
                  <FormTextInput
                    value={newListName}
                    onChangeText={setNewListName}
                    placeholder={t('shopping.listName')}
                    autoFocus
                  />
                </View>
                <View style={styles.modalFooter}>
                  <View style={styles.modalActions}>
                    <View style={styles.modalActionButton}>
                      <PrimaryButton
                        title={t('common.cancel')}
                        onPress={() => {
                          setShowListModal(false);
                          setEditingList(null);
                          setNewListName('');
                        }}
                        variant="outline"
                      />
                    </View>
                    <View style={styles.modalActionButton}>
                      <PrimaryButton
                        title={editingList ? t('common.update') : t('common.create')}
                        onPress={editingList ? handleUpdateList : handleCreateList}
                      />
                    </View>
                  </View>
                </View>
              </View>
            </TouchableOpacity>
          </KeyboardAvoidingView>
        </Modal>

        {/* Add Item Modal */}
        <Modal
          visible={showAddItemModal}
          animationType="slide"
          transparent
          onRequestClose={() => {
            setShowAddItemModal(false);
            resetAddItemForm();
          }}
        >
          <KeyboardAvoidingView
            style={styles.modalOverlay}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
          >
            <TouchableOpacity
              style={styles.modalBackdrop}
              activeOpacity={1}
              onPress={() => {
                setShowAddItemModal(false);
                resetAddItemForm();
              }}
            >
              <View style={styles.modalContent}>
                <View style={styles.modalHeader}>
                  <AppText style={styles.modalTitle}>{t('shopping.addItem')}</AppText>
                  <TouchableOpacity
                    style={styles.modalCloseButton}
                    onPress={() => {
                      setShowAddItemModal(false);
                      resetAddItemForm();
                    }}
                  >
                    <Ionicons name="close" size={24} color={colors.textSecondary} />
                  </TouchableOpacity>
                </View>
                
                <ScrollView 
                  contentContainerStyle={styles.modalScrollContent}
                  style={styles.modalScrollView}
                  keyboardShouldPersistTaps="handled"
                  showsVerticalScrollIndicator={false}
                >
                  <FormTextInput
                    value={name}
                    onChangeText={setName}
                    placeholder={t('shopping.itemNamePlaceholder')}
                    autoFocus
                  />
                  
                  <View style={styles.rowInputs}>
                    <View style={styles.rowInputHalf}>
                      <FormTextInput
                        value={quantity}
                        onChangeText={(text) => {
                          const numericValue = text.replace(/[^0-9]/g, '');
                          setQuantity(numericValue);
                        }}
                        placeholder={t('shopping.quantityOptional')}
                        keyboardType="number-pad"
                      />
                    </View>
                    <View style={styles.rowInputHalf}>
                      <View>
                        <FormTextInput
                          value={weight}
                          onChangeText={(text) => {
                            const numericValue = text.replace(/[^0-9]/g, '');
                            setWeight(numericValue);
                          }}
                          placeholder={t('shopping.weightOptional')}
                          keyboardType="number-pad"
                        />
                        <View style={styles.dropdownContainer}>
                          <TouchableOpacity
                            style={styles.dropdownButton}
                            onPress={() => setShowUnitDropdown(!showUnitDropdown)}
                          >
                            <AppText style={[styles.dropdownButtonText, !weightUnit && styles.dropdownPlaceholder]}>
                              {weightUnit || t('shopping.selectUnit')}
                            </AppText>
                            <Ionicons 
                              name={showUnitDropdown ? 'chevron-up' : 'chevron-down'} 
                              size={20} 
                              color={colors.textSecondary} 
                            />
                          </TouchableOpacity>
                          {showUnitDropdown && (
                            <View style={styles.dropdownMenu}>
                              <ScrollView style={styles.dropdownScrollView} nestedScrollEnabled>
                                {weightUnits.map((unit) => (
                                  <TouchableOpacity
                                    key={unit}
                                    style={[
                                      styles.dropdownItem,
                                      weightUnit === unit && styles.dropdownItemSelected,
                                    ]}
                                    onPress={() => {
                                      setWeightUnit(unit);
                                      setShowUnitDropdown(false);
                                    }}
                                  >
                                    <AppText
                                      style={[
                                        styles.dropdownItemText,
                                        weightUnit === unit && styles.dropdownItemTextSelected,
                                      ]}
                                    >
                                      {unit}
                                    </AppText>
                                  </TouchableOpacity>
                                ))}
                                <TouchableOpacity
                                  style={styles.dropdownItem}
                                  onPress={() => {
                                    setWeightUnit('');
                                    setShowUnitDropdown(false);
                                  }}
                                >
                                  <AppText style={styles.dropdownItemText}>{t('common.none')}</AppText>
                                </TouchableOpacity>
                              </ScrollView>
                            </View>
                          )}
                        </View>
                      </View>
                    </View>
                  </View>

                  <View style={styles.toggleSection}>
                    <AppText style={styles.toggleLabel}>{t('shopping.shared')}</AppText>
                    <View style={styles.toggleGroup}>
                      <TouchableOpacity
                        style={[styles.toggle, isShared && styles.toggleActive]}
                        onPress={() => {
                          setIsShared(true);
                          setOwnerId('');
                        }}
                      >
                        <AppText style={isShared ? styles.toggleTextActive : styles.toggleText}>
                          {t('common.yes')}
                        </AppText>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.toggle, !isShared && styles.toggleActive]}
                        onPress={() => setIsShared(false)}
                      >
                        <AppText style={!isShared ? styles.toggleTextActive : styles.toggleText}>
                          {t('common.no')}
                        </AppText>
                      </TouchableOpacity>
                    </View>
                  </View>

                  {!isShared && (
                    <View style={styles.ownerSelect}>
                      <AppText style={styles.ownerLabel}>{t('shopping.assignedTo')}</AppText>
                      {selectedHousehold.members.map((member) => (
                        <TouchableOpacity
                          key={member._id}
                          style={[
                            styles.ownerOption,
                            ownerId === member._id && styles.ownerOptionSelected,
                          ]}
                          onPress={() => setOwnerId(member._id)}
                        >
                          <AppText style={[
                            styles.ownerOptionText,
                            ownerId === member._id && styles.ownerOptionTextSelected,
                          ]}>
                            {member.name}
                          </AppText>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </ScrollView>

                <View style={styles.modalFooter}>
                  <View style={styles.modalActions}>
                    <View style={styles.modalActionButton}>
                      <PrimaryButton
                        title={t('common.cancel')}
                        onPress={() => {
                          setShowAddItemModal(false);
                          resetAddItemForm();
                        }}
                        variant="outline"
                      />
                    </View>
                    <View style={styles.modalActionButton}>
                      <PrimaryButton
                        title={addingItem ? t('common.loading') : t('shopping.addItem')}
                        onPress={handleAddItem}
                        disabled={addingItem || !name.trim()}
                      />
                    </View>
                  </View>
                </View>
              </View>
            </TouchableOpacity>
          </KeyboardAvoidingView>
        </Modal>

        {/* Edit Item Modal */}
        <Modal
          visible={editingItem !== null}
          animationType="slide"
          transparent
          onRequestClose={() => {
            setEditingItem(null);
            setEditItemName('');
            setEditItemQuantity('');
            setEditItemWeight('');
            setEditItemWeightUnit('');
            setEditItemIsShared(true);
            setEditItemOwnerId('');
          }}
        >
          <KeyboardAvoidingView
            style={styles.modalOverlay}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
          >
            <TouchableOpacity
              style={styles.modalBackdrop}
              activeOpacity={1}
              onPress={() => {
                setEditingItem(null);
                setEditItemName('');
                setEditItemQuantity('');
                setEditItemWeight('');
                setEditItemWeightUnit('');
                setEditItemIsShared(true);
                setEditItemOwnerId('');
              }}
            >
              <View style={styles.modalContent}>
                <View style={styles.modalHeader}>
                  <AppText style={styles.modalTitle}>{t('shopping.editItem')}</AppText>
                  <TouchableOpacity
                    style={styles.modalCloseButton}
                    onPress={() => {
                      setEditingItem(null);
                      setEditItemName('');
                      setEditItemQuantity('');
                      setEditItemWeight('');
                      setEditItemWeightUnit('');
                      setEditItemIsShared(true);
                      setEditItemOwnerId('');
                    }}
                  >
                    <Ionicons name="close" size={24} color={colors.textSecondary} />
                  </TouchableOpacity>
                </View>
                
                <ScrollView 
                  contentContainerStyle={styles.modalScrollContent}
                  style={styles.modalScrollView}
                  keyboardShouldPersistTaps="handled"
                  showsVerticalScrollIndicator={false}
                >
                  <FormTextInput
                    value={editItemName}
                    onChangeText={setEditItemName}
                    placeholder={t('shopping.itemNamePlaceholder')}
                    autoFocus
                  />
                  
                  <View style={styles.rowInputs}>
                    <View style={styles.rowInputHalf}>
                      <FormTextInput
                        value={editItemQuantity}
                        onChangeText={(text) => {
                          const numericValue = text.replace(/[^0-9]/g, '');
                          setEditItemQuantity(numericValue);
                        }}
                        placeholder={t('shopping.quantityOptional')}
                        keyboardType="number-pad"
                      />
                    </View>
                    <View style={styles.rowInputHalf}>
                      <View>
                        <FormTextInput
                          value={editItemWeight}
                          onChangeText={(text) => {
                            const numericValue = text.replace(/[^0-9]/g, '');
                            setEditItemWeight(numericValue);
                          }}
                          placeholder={t('shopping.weightOptional')}
                          keyboardType="number-pad"
                        />
                        <View style={styles.dropdownContainer}>
                          <TouchableOpacity
                            style={styles.dropdownButton}
                            onPress={() => setShowEditUnitDropdown(!showEditUnitDropdown)}
                          >
                            <AppText style={[styles.dropdownButtonText, !editItemWeightUnit && styles.dropdownPlaceholder]}>
                              {editItemWeightUnit || t('shopping.selectUnit')}
                            </AppText>
                            <Ionicons 
                              name={showEditUnitDropdown ? 'chevron-up' : 'chevron-down'} 
                              size={20} 
                              color={colors.textSecondary} 
                            />
                          </TouchableOpacity>
                          {showEditUnitDropdown && (
                            <View style={styles.dropdownMenu}>
                              <ScrollView style={styles.dropdownScrollView} nestedScrollEnabled>
                                {weightUnits.map((unit) => (
                                  <TouchableOpacity
                                    key={unit}
                                    style={[
                                      styles.dropdownItem,
                                      editItemWeightUnit === unit && styles.dropdownItemSelected,
                                    ]}
                                    onPress={() => {
                                      setEditItemWeightUnit(unit);
                                      setShowEditUnitDropdown(false);
                                    }}
                                  >
                                    <AppText
                                      style={[
                                        styles.dropdownItemText,
                                        editItemWeightUnit === unit && styles.dropdownItemTextSelected,
                                      ]}
                                    >
                                      {unit}
                                    </AppText>
                                  </TouchableOpacity>
                                ))}
                                <TouchableOpacity
                                  style={styles.dropdownItem}
                                  onPress={() => {
                                    setEditItemWeightUnit('');
                                    setShowEditUnitDropdown(false);
                                  }}
                                >
                                  <AppText style={styles.dropdownItemText}>{t('common.none')}</AppText>
                                </TouchableOpacity>
                              </ScrollView>
                            </View>
                          )}
                        </View>
                      </View>
                    </View>
                  </View>

                  <View style={styles.toggleSection}>
                    <AppText style={styles.toggleLabel}>{t('shopping.shared')}</AppText>
                    <View style={styles.toggleGroup}>
                      <TouchableOpacity
                        style={[styles.toggle, editItemIsShared && styles.toggleActive]}
                        onPress={() => {
                          setEditItemIsShared(true);
                          setEditItemOwnerId('');
                        }}
                      >
                        <AppText style={editItemIsShared ? styles.toggleTextActive : styles.toggleText}>
                          {t('common.yes')}
                        </AppText>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.toggle, !editItemIsShared && styles.toggleActive]}
                        onPress={() => setEditItemIsShared(false)}
                      >
                        <AppText style={!editItemIsShared ? styles.toggleTextActive : styles.toggleText}>
                          {t('common.no')}
                        </AppText>
                      </TouchableOpacity>
                    </View>
                  </View>

                  {!editItemIsShared && selectedHousehold && (
                    <View style={styles.ownerSelect}>
                      <AppText style={styles.ownerLabel}>{t('shopping.assignedTo')}</AppText>
                      {selectedHousehold.members.map((member) => (
                        <TouchableOpacity
                          key={member._id}
                          style={[
                            styles.ownerOption,
                            editItemOwnerId === member._id && styles.ownerOptionSelected,
                          ]}
                          onPress={() => setEditItemOwnerId(member._id)}
                        >
                          <AppText style={[
                            styles.ownerOptionText,
                            editItemOwnerId === member._id && styles.ownerOptionTextSelected,
                          ]}>
                            {member.name}
                          </AppText>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </ScrollView>

                <View style={styles.modalFooter}>
                  <View style={styles.modalActions}>
                    <View style={styles.modalActionButton}>
                      <PrimaryButton
                        title={t('common.cancel')}
                        onPress={() => {
                          setEditingItem(null);
                          setEditItemName('');
                          setEditItemQuantity('');
                          setEditItemWeight('');
                          setEditItemWeightUnit('');
                          setEditItemIsShared(true);
                          setEditItemOwnerId('');
                        }}
                        variant="outline"
                      />
                    </View>
                    <View style={styles.modalActionButton}>
                      <PrimaryButton 
                        title={t('common.update')} 
                        onPress={handleUpdateItem}
                        disabled={!editItemName.trim()}
                      />
                    </View>
                  </View>
                </View>
              </View>
            </TouchableOpacity>
          </KeyboardAvoidingView>
        </Modal>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const createStyles = (colors: any, bottomInset: number) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  keyboardAvoid: {
    flex: 1,
  },
  header: {
    backgroundColor: colors.background,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  headerActions: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
  },
  listSection: {
    paddingVertical: spacing.md,
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  listSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    marginBottom: spacing.sm,
  },
  listSectionTitle: {
    fontSize: fontSizes.lg,
    fontWeight: fontWeights.bold,
    color: colors.text,
  },
  createListButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radii.md,
    backgroundColor: colors.primaryUltraSoft,
  },
  createListButtonText: {
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.semibold,
    color: colors.primary,
  },
  listScrollContent: {
    paddingHorizontal: spacing.md,
    paddingRight: spacing.lg,
  },
  listCard: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm + 2,
    borderRadius: radii.lg,
    backgroundColor: colors.surface,
    marginRight: spacing.sm,
    borderWidth: 2,
    borderColor: colors.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 100,
    maxWidth: 180,
    position: 'relative',
    ...(shadows.xs as object),
  },
  listCardSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
    ...(shadows.sm as object),
  },
  listCardText: {
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.medium,
    color: colors.text,
  },
  listCardTextSelected: {
    color: colors.surface,
    fontWeight: fontWeights.semibold,
  },
  listCardIndicator: {
    position: 'absolute',
    bottom: -1,
    left: '50%',
    marginLeft: -4,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
  },
  addListCard: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    borderRadius: radii.lg,
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.borderLight,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 100,
    flexDirection: 'row',
    gap: spacing.xs,
  },
  addListCardText: {
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.medium,
    color: colors.primary,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: TAB_BAR_HEIGHT + bottomInset + 100, // Extra padding for FAB (56px) + spacing
  },
  listHeader: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    backgroundColor: colors.background,
  },
  listHeaderLeft: {
    flex: 1,
    marginRight: spacing.md,
  },
  listTitle: {
    fontSize: fontSizes.xxl,
    fontWeight: fontWeights.extrabold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  listSubtitle: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
    fontWeight: fontWeights.medium,
  },
  listHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  listActionButton: {
    padding: spacing.xs,
    borderRadius: radii.md,
    backgroundColor: colors.surface,
  },
  section: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xs,
  },
  sectionTitle: {
    fontSize: fontSizes.lg,
    fontWeight: fontWeights.bold,
    marginBottom: spacing.md,
    color: colors.text,
  },
  itemsContainer: {
    gap: spacing.sm,
  },
  completedHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
    paddingVertical: spacing.xs,
  },
  completedHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    flex: 1,
  },
  restoreAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: radii.md,
    backgroundColor: colors.primaryUltraSoft,
  },
  restoreAllText: {
    fontSize: fontSizes.sm,
    color: colors.primary,
    fontWeight: fontWeights.semibold,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fab: {
    position: 'absolute',
    bottom: TAB_BAR_HEIGHT + bottomInset + spacing.md,
    right: spacing.md,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...(shadows.lg as object),
    elevation: 8,
    zIndex: 1000,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    maxHeight: '90%',
    borderTopWidth: 1,
    borderTopColor: colors.border,
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  modalCloseButton: {
    padding: spacing.xs,
  },
  modalTitle: {
    fontSize: fontSizes.xl,
    fontWeight: fontWeights.bold,
    marginBottom: spacing.lg,
    color: colors.text,
  },
  modalScrollView: {
    flex: 1,
  },
  modalScrollContent: {
    padding: spacing.xl,
    paddingBottom: spacing.md,
  },
  modalBody: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
  },
  modalFooter: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    paddingBottom: spacing.xl,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    backgroundColor: colors.surface,
  },
  rowInputs: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  rowInputHalf: {
    flex: 1,
  },
  dropdownContainer: {
    marginTop: spacing.sm,
    position: 'relative',
    zIndex: 1,
  },
  dropdownButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    padding: spacing.md,
    backgroundColor: colors.surface,
    minHeight: 52,
  },
  dropdownButtonText: {
    fontSize: fontSizes.md,
    color: colors.text,
  },
  dropdownPlaceholder: {
    color: colors.textSecondary,
  },
  dropdownMenu: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    marginTop: spacing.xxs,
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    ...(shadows.md as object),
    maxHeight: 200,
    zIndex: 1000,
  },
  dropdownScrollView: {
    maxHeight: 200,
  },
  dropdownItem: {
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  dropdownItemSelected: {
    backgroundColor: colors.primarySoft,
  },
  dropdownItemText: {
    fontSize: fontSizes.md,
    color: colors.text,
  },
  dropdownItemTextSelected: {
    color: colors.primaryDark,
    fontWeight: fontWeights.semibold,
  },
  toggleSection: {
    marginBottom: spacing.md,
  },
  toggleLabel: {
    fontSize: fontSizes.md,
    fontWeight: fontWeights.semibold,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  toggleGroup: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  toggle: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: radii.lg,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggleActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  toggleText: {
    color: colors.text,
    fontWeight: fontWeights.semibold,
    fontSize: fontSizes.md,
  },
  toggleTextActive: {
    color: colors.surface,
    fontWeight: fontWeights.bold,
    fontSize: fontSizes.md,
  },
  ownerSelect: {
    marginBottom: spacing.md,
  },
  ownerLabel: {
    fontSize: fontSizes.md,
    fontWeight: fontWeights.semibold,
    marginBottom: spacing.sm,
    color: colors.text,
  },
  ownerOption: {
    padding: spacing.md,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: radii.lg,
    marginBottom: spacing.xs,
    backgroundColor: colors.background,
  },
  ownerOptionSelected: {
    backgroundColor: colors.primaryUltraSoft,
    borderColor: colors.primary,
  },
  ownerOptionText: {
    fontSize: fontSizes.md,
    fontWeight: fontWeights.medium,
    color: colors.text,
  },
  ownerOptionTextSelected: {
    color: colors.primaryDark,
    fontWeight: fontWeights.semibold,
  },
  modalActions: {
    marginTop: spacing.lg,
    flexDirection: 'row',
    gap: spacing.sm,
  },
  modalActionButton: {
    flex: 1,
  },
  spacer: {
    width: spacing.sm,
  },
});
