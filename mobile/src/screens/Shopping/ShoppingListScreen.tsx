import React, { useEffect, useState, useRef, useMemo } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, Alert, Modal, KeyboardAvoidingView, Platform } from 'react-native';
import { AppText } from '../../components/AppText';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useHousehold } from '../../context/HouseholdContext';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { shoppingApi, ShoppingItem, ShoppingList, WeightUnit } from '../../api/shoppingApi';
import { ShoppingItemRow } from '../../components/ShoppingItemRow';
import { PrimaryButton } from '../../components/PrimaryButton';
import { EmptyState } from '../../components/ui/EmptyState';
import { ScreenHeader } from '../../components/ui/ScreenHeader';
import { SearchBar } from '../../components/ui/SearchBar';
import { SettingsSection } from '../../components/Settings/SettingsSection';
import { SettingsGroupCard } from '../../components/Settings/SettingsGroupCard';
import { ListTabs } from '../../components/Shopping/ListTabs';
import { ActiveListCard } from '../../components/Shopping/ActiveListCard';
import { SectionHeader } from '../../components/Shopping/SectionHeader';
import { AddListSheet } from '../../components/Shopping/AddListSheet';
import { AddItemSheet } from '../../components/Shopping/AddItemSheet';
import { UnitPickerModal } from '../../components/Shopping/UnitPickerModal';
import { ShoppingFAB } from '../../components/Shopping/ShoppingFAB';
import { useFocusEffect } from '@react-navigation/native';
import { useThemeColors, fontSizes, fontWeights, radii, spacing, TAB_BAR_HEIGHT, shadows } from '../../theme';
import { Ionicons } from '@expo/vector-icons';
import { FormTextInput } from '../../components/FormTextInput';

const weightUnits: WeightUnit[] = ['lbs', 'kg', 'g', 'oz', 'liter', 'ml', 'fl oz', 'cup', 'pint', 'quart', 'gallon'];

export const ShoppingListScreen: React.FC = () => {
  const { selectedHousehold, setSelectedHousehold } = useHousehold();
  const { user } = useAuth();
  const { t } = useLanguage();
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => createStyles(colors, insets.bottom), [colors, insets.bottom]);
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
  const [showEditUnitPicker, setShowEditUnitPicker] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [addingItem, setAddingItem] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  useFocusEffect(
    React.useCallback(() => {
      scrollRef.current?.scrollTo({ y: 0, animated: true });
    }, [])
  );

  useEffect(() => {
    setShowEditUnitPicker(false);
  }, [editingItem]);

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
      if (__DEV__) console.error('Failed to load shopping lists:', error);
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
      if (__DEV__) console.error('Failed to load shopping items:', error);
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
    setShowEditUnitPicker(false);
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
            if (__DEV__) console.error('Failed to delete list:', error);
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
      if (__DEV__) console.error('Failed to update item:', error);
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
                if (__DEV__) console.error('Some items failed to restore:', realFailures);
              }
              
              loadItems();
            } catch (error) {
              if (__DEV__) console.error('Failed to restore items:', error);
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
            if (__DEV__) console.error('Failed to delete item:', error);
            Alert.alert(t('common.error'), t('shoppingList.failedToDeleteItem'));
            loadItems();
          }
        },
      },
    ]);
  };

  const resetAddItemForm = () => {
    setName('');
    setQuantity('');
    setWeight('');
    setWeightUnit('');
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
        <ScrollView
          ref={scrollRef}
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={loadLists} />}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <ScreenHeader title={t('shopping.title')} subtitle={selectedHousehold.name} />

          <SettingsSection title={t('shopping.sectionSearch')}>
            <SettingsGroupCard>
              <View style={styles.searchPad}>
                <SearchBar
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  placeholder={t('common.search')}
                />
              </View>
            </SettingsGroupCard>
          </SettingsSection>

          <SettingsSection title={t('shopping.yourLists')}>
            <SettingsGroupCard>
              <ListTabs
                embedded
                lists={filteredLists}
                selectedListId={selectedList?._id ?? null}
                onSelectList={setSelectedList}
                onLongPressList={handleEditList}
                onAddList={() => {
                  setEditingList(null);
                  setNewListName('');
                  setShowListModal(true);
                }}
                newListLabel={t('shopping.createList')}
              />
            </SettingsGroupCard>
          </SettingsSection>

          {selectedList ? (
            <>
              <SettingsSection title={t('shopping.sectionCurrentList')}>
                <SettingsGroupCard>
                  <ActiveListCard
                    embedded
                    listName={selectedList.name}
                    toBuyCount={filteredItems.length}
                    completedCount={filteredCompletedItems.length}
                    itemLabel={t('shopping.item')}
                    itemsLabel={t('shopping.items')}
                    onEdit={() => handleEditList(selectedList)}
                    onDelete={() => handleDeleteList(selectedList)}
                  />
                </SettingsGroupCard>
              </SettingsSection>

              {filteredItems.length === 0 && filteredCompletedItems.length === 0 ? (
                <View style={styles.emptyStateWrap}>
                  <EmptyState
                    icon="cart-outline"
                    title={t('shoppingList.noItemsToBuy')}
                    message={t('shopping.noItemsDescription')}
                    actionLabel={t('shopping.addItem')}
                    onAction={() => setShowAddItemModal(true)}
                  />
                </View>
              ) : (
                <>
                  {filteredItems.length > 0 ? (
                    <SettingsSection title={t('shoppingList.toBuy')}>
                      <SettingsGroupCard>
                        {filteredItems.map((item, index) => (
                          <ShoppingItemRow
                            key={item._id}
                            item={item}
                            inGroupCard
                            onToggle={() => handleToggleComplete(item)}
                            onEdit={() => handleEditItem(item)}
                            onDelete={() => handleDelete(item)}
                            isFirst={index === 0}
                            isLast={index === filteredItems.length - 1}
                          />
                        ))}
                      </SettingsGroupCard>
                    </SettingsSection>
                  ) : null}

                  {filteredCompletedItems.length > 0 ? (
                    <View style={styles.completedSection}>
                      <SectionHeader
                        embedded
                        title={t('shopping.completedItems')}
                        count={filteredCompletedItems.length}
                        collapsed={!showCompleted}
                        onToggle={() => setShowCompleted(!showCompleted)}
                        actionLabel={showCompleted ? t('shopping.restoreAll') : undefined}
                        onAction={showCompleted ? handleRestoreAll : undefined}
                      />
                      {showCompleted ? (
                        <SettingsGroupCard style={styles.completedCard}>
                          {filteredCompletedItems.map((item, index) => (
                            <ShoppingItemRow
                              key={item._id}
                              item={item}
                              inGroupCard
                              onToggle={() => handleToggleComplete(item)}
                              onEdit={() => handleEditItem(item)}
                              onDelete={() => handleDelete(item)}
                              isFirst={index === 0}
                              isLast={index === filteredCompletedItems.length - 1}
                            />
                          ))}
                        </SettingsGroupCard>
                      ) : null}
                    </View>
                  ) : null}
                </>
              )}
            </>
          ) : (
            <View style={styles.noListsWrap}>
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
            </View>
          )}
        </ScrollView>

        {selectedList && (
          <ShoppingFAB
            onPress={() => setShowAddItemModal(true)}
            bottomOffset={TAB_BAR_HEIGHT + insets.bottom + spacing.md}
          />
        )}

        <AddListSheet
          visible={showListModal}
          title={editingList ? t('shopping.editList') : t('shopping.createList')}
          name={newListName}
          onNameChange={setNewListName}
          placeholder={t('shopping.listName')}
          submitLabel={editingList ? t('common.update') : t('common.create')}
          cancelLabel={t('common.cancel')}
          onSubmit={editingList ? handleUpdateList : handleCreateList}
          onCancel={() => {
            setShowListModal(false);
            setEditingList(null);
            setNewListName('');
          }}
          onClose={() => {
            setShowListModal(false);
            setEditingList(null);
            setNewListName('');
          }}
          isEditing={!!editingList}
        />

        <AddItemSheet
          visible={showAddItemModal}
          title={t('shopping.addItem')}
          name={name}
          onNameChange={setName}
          quantity={quantity}
          onQuantityChange={setQuantity}
          weight={weight}
          onWeightChange={setWeight}
          weightUnit={weightUnit}
          onWeightUnitChange={(v) => setWeightUnit(v as WeightUnit | '')}
          weightUnits={weightUnits}
          isShared={isShared}
          onSharedChange={(shared) => {
            setIsShared(shared);
            if (shared) setOwnerId('');
          }}
          ownerId={ownerId}
          onOwnerSelect={setOwnerId}
          members={selectedHousehold.members}
          namePlaceholder={t('shopping.itemNamePlaceholder')}
          quantityPlaceholder={t('shopping.quantityOptional')}
          weightPlaceholder={t('shopping.weightOptional')}
          unitPlaceholder={t('shopping.selectUnit')}
          noneUnitLabel={t('common.none')}
          sharedLabel={t('shopping.shared')}
          personalLabel={t('shopping.personal')}
          assignedToLabel={t('shopping.assignedTo')}
          selectPersonLabel={t('shopping.assignedTo')}
          submitLabel={t('shopping.addItem')}
          cancelLabel={t('common.cancel')}
          onSubmit={handleAddItem}
          onCancel={() => {
            setShowAddItemModal(false);
            resetAddItemForm();
          }}
          onClose={() => {
            setShowAddItemModal(false);
            resetAddItemForm();
          }}
          submitting={addingItem}
          submitDisabled={!name.trim() || (!isShared && !ownerId)}
        />

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
                  <AppText style={styles.modalHeaderTitle}>{t('shopping.editItem')}</AppText>
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
                            onPress={() => setShowEditUnitPicker(true)}
                            activeOpacity={0.7}
                          >
                            <AppText style={[styles.dropdownButtonText, !editItemWeightUnit && styles.dropdownPlaceholder]}>
                              {editItemWeightUnit || t('shopping.selectUnit')}
                            </AppText>
                            <Ionicons name="chevron-down" size={20} color={colors.textSecondary} />
                          </TouchableOpacity>
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
          <UnitPickerModal
            visible={showEditUnitPicker}
            onClose={() => setShowEditUnitPicker(false)}
            selectedValue={editItemWeightUnit}
            onSelect={(v) => setEditItemWeightUnit((v as WeightUnit | '') || '')}
            units={weightUnits}
            title={t('shopping.selectUnit')}
            noneLabel={t('common.none')}
            cancelLabel={t('common.cancel')}
          />
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
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
  },
  headerTop: {
    marginBottom: spacing.md,
  },
  pageTitle: {
    fontSize: fontSizes.xxl,
    fontWeight: fontWeights.extrabold,
    color: colors.text,
    letterSpacing: -0.5,
    marginBottom: spacing.xxs,
  },
  pageSubtitle: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
  },
  searchWrap: {
    marginBottom: spacing.xs,
  },
  listsStrip: {
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.xl,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.borderLight,
  },
  listsStripHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  listsStripTitle: {
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.semibold,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  newListButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  newListButtonText: {
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.semibold,
    color: colors.primary,
  },
  listsScrollContent: {
    paddingRight: spacing.lg,
    gap: spacing.sm,
  },
  listPill: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm + 2,
    borderRadius: radii.pill,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.borderLight,
    marginRight: spacing.sm,
    minWidth: 88,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listPillSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
    ...(shadows.sm as object),
  },
  listPillText: {
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.medium,
    color: colors.text,
  },
  listPillTextSelected: {
    color: colors.surface,
    fontWeight: fontWeights.semibold,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: spacing.sm,
    paddingBottom: TAB_BAR_HEIGHT + bottomInset + 100,
  },
  searchPad: {
    padding: spacing.md,
  },
  completedSection: {
    marginTop: spacing.xl,
    paddingHorizontal: spacing.xl,
  },
  completedCard: {
    marginTop: spacing.sm,
  },
  noListsWrap: {
    marginTop: spacing.md,
    paddingHorizontal: spacing.xl,
  },
  listCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...(shadows.sm as object),
  },
  listCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  listCardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    flex: 1,
    minWidth: 0,
  },
  listCardIconWrap: {
    width: 44,
    height: 44,
    borderRadius: radii.md,
    backgroundColor: colors.primaryUltraSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listCardTitle: {
    fontSize: fontSizes.xl,
    fontWeight: fontWeights.bold,
    color: colors.text,
    marginBottom: spacing.xxs,
  },
  listCardSubtitle: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
  },
  listCardActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  listCardActionBtn: {
    padding: spacing.sm,
    borderRadius: radii.md,
    backgroundColor: colors.background,
  },
  emptyStateWrap: {
    marginTop: spacing.sm,
    paddingHorizontal: spacing.xl,
  },
  itemsSection: {
    marginBottom: spacing.xl,
  },
  itemsSectionTitle: {
    fontSize: fontSizes.md,
    fontWeight: fontWeights.semibold,
    color: colors.textSecondary,
    marginBottom: spacing.md,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  itemsCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    overflow: 'hidden',
    ...(shadows.sm as object),
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
    borderTopLeftRadius: radii.lg,
    borderTopRightRadius: radii.lg,
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
  modalHeaderTitle: {
    fontSize: fontSizes.lg,
    fontWeight: fontWeights.extrabold,
    color: colors.text,
    flex: 1,
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
