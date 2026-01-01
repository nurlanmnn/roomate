import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, TextInput, TouchableOpacity, RefreshControl, Alert, Modal, KeyboardAvoidingView, Platform } from 'react-native';
import { AppText } from '../../components/AppText';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useHousehold } from '../../context/HouseholdContext';
import { useAuth } from '../../context/AuthContext';
import { shoppingApi, ShoppingItem, ShoppingList, WeightUnit } from '../../api/shoppingApi';
import { ShoppingItemRow } from '../../components/ShoppingItemRow';
import { QuickAddButton } from '../../components/QuickAddButton';
import { PrimaryButton } from '../../components/PrimaryButton';
import { ScreenHeader } from '../../components/ui/ScreenHeader';
import { colors, fontSizes, fontWeights, radii, spacing } from '../../theme';
import { SearchBar } from '../../components/ui/SearchBar';
import { Ionicons } from '@expo/vector-icons';

const weightUnits: WeightUnit[] = ['lbs', 'kg', 'g', 'oz', 'liter', 'ml', 'fl oz', 'cup', 'pint', 'quart', 'gallon'];

export const ShoppingListScreen: React.FC = () => {
  const { selectedHousehold } = useHousehold();
  const { user } = useAuth();
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
    } catch (error) {
      console.error('Failed to load shopping lists:', error);
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
      Alert.alert('Error', 'Please enter a list name');
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
      Alert.alert('Error', error.response?.data?.error || 'Failed to create list');
    }
  };

  const handleEditList = (list: ShoppingList) => {
    setEditingList(list);
    setNewListName(list.name);
    setShowListModal(true);
  };

  const handleUpdateList = async () => {
    if (!editingList || !newListName.trim()) {
      Alert.alert('Error', 'Please enter a list name');
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
      Alert.alert('Error', error.response?.data?.error || 'Failed to update list');
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
      Alert.alert('Error', 'Please enter an item name');
      return;
    }

    if (!editItemIsShared && !editItemOwnerId) {
      Alert.alert('Error', 'Please select an owner for personal items');
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
      // If update fails, reload to revert optimistic update
      Alert.alert('Error', error.response?.data?.error || 'Failed to update item');
      loadItems();
    }
  };

  const handleDeleteList = async (list: ShoppingList) => {
    Alert.alert('Delete List', `Are you sure you want to delete "${list.name}"? This will delete all items in the list.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
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
            Alert.alert('Error', 'Failed to delete list');
          }
        },
      },
    ]);
  };

  const handleAddItem = async () => {
    if (!selectedHousehold || !user || !selectedList || !name.trim()) {
      Alert.alert('Error', 'Please enter an item name');
      return;
    }

    if (!isShared && !ownerId) {
      Alert.alert('Error', 'Please select an owner for personal items');
      return;
    }

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
      loadItems();
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.error || 'Failed to add item');
    }
  };

  const handleToggleComplete = async (item: ShoppingItem) => {
    try {
      await shoppingApi.updateShoppingItem(item._id, {
        completed: !item.completed,
      });
      loadItems();
    } catch (error) {
      console.error('Failed to update item:', error);
    }
  };

  const handleDelete = async (item: ShoppingItem) => {
    Alert.alert('Delete Item', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await shoppingApi.deleteShoppingItem(item._id);
            loadItems();
          } catch (error) {
            console.error('Failed to delete item:', error);
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
      Alert.alert('Error', error.response?.data?.error || 'Failed to add items');
    }
  };

  if (!selectedHousehold) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <View style={styles.emptyContainer}>
          <AppText style={styles.emptyText}>Please select a household</AppText>
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
          style={styles.scrollView}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={loadLists} />}
          keyboardShouldPersistTaps="handled"
        >
        <View style={styles.topHeader}>
          <ScreenHeader title="Shopping" subtitle={selectedHousehold.name} />
          <View style={styles.topHeaderActions}>
            <PrimaryButton title="+ New List" onPress={() => setShowListModal(true)} />
          </View>
          <View style={styles.searchWrap}>
            <SearchBar value={searchQuery} onChangeText={setSearchQuery} placeholder="Search lists & items" />
          </View>
        </View>

        {/* List Selection */}
        <View style={styles.listSection}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.listScroll}>
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
                >
                  {list.name}
                </AppText>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {selectedList ? (
          <>
            <View style={styles.listHeader}>
              <AppText style={styles.listTitle}>{selectedList.name}</AppText>
              <View style={styles.listHeaderActions}>
                <TouchableOpacity
                  style={styles.listActionButton}
                  onPress={() => handleEditList(selectedList)}
                >
                  <Ionicons name="create-outline" size={20} color={colors.textSecondary} />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.listActionButton}
                  onPress={() => handleDeleteList(selectedList)}
                >
                  <Ionicons name="trash-outline" size={20} color={colors.danger} />
                </TouchableOpacity>
                <QuickAddButton onAddItems={handleQuickAdd} />
              </View>
            </View>

            <View style={styles.section}>
              <AppText style={styles.sectionTitle}>To Buy</AppText>
              {filteredItems.length === 0 ? (
                <AppText style={styles.emptyText}>No items to buy</AppText>
              ) : (
                filteredItems.map((item) => (
                  <ShoppingItemRow
                    key={item._id}
                    item={item}
                    onToggle={() => handleToggleComplete(item)}
                    onEdit={() => handleEditItem(item)}
                    onDelete={() => handleDelete(item)}
                  />
                ))
              )}
            </View>

            {filteredCompletedItems.length > 0 && (
              <View style={styles.section}>
                <TouchableOpacity
                  onPress={() => setShowCompleted(!showCompleted)}
                  style={styles.completedHeader}
                >
                  <AppText style={styles.sectionTitle}>
                    Completed ({filteredCompletedItems.length})
                  </AppText>
                  <AppText>{showCompleted ? '▼' : '▶'}</AppText>
                </TouchableOpacity>
                {showCompleted &&
                  filteredCompletedItems.map((item) => (
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

            <View style={styles.addSection}>
              <AppText style={styles.addSectionTitle}>Add Item</AppText>
              <TextInput
                style={styles.input}
                value={name}
                onChangeText={setName}
                placeholder="Item name"
              />
              <TextInput
                style={styles.input}
                value={quantity}
                onChangeText={(text) => {
                  // Only allow integers
                  const numericValue = text.replace(/[^0-9]/g, '');
                  setQuantity(numericValue);
                }}
                placeholder="Quantity (optional)"
                keyboardType="number-pad"
              />
              <View>
                <TextInput
                  style={styles.input}
                  value={weight}
                  onChangeText={(text) => {
                    // Only allow integers
                    const numericValue = text.replace(/[^0-9]/g, '');
                    setWeight(numericValue);
                  }}
                  placeholder="Weight (optional)"
                  keyboardType="number-pad"
                />
                <View style={styles.dropdownContainer}>
                  <TouchableOpacity
                    style={styles.dropdownButton}
                    onPress={() => setShowUnitDropdown(!showUnitDropdown)}
                  >
                    <AppText style={[styles.dropdownButtonText, !weightUnit && styles.dropdownPlaceholder]}>
                      {weightUnit || 'Select Unit'}
                    </AppText>
                    <AppText style={styles.dropdownArrow}>{showUnitDropdown ? '▲' : '▼'}</AppText>
                  </TouchableOpacity>
                  {showUnitDropdown && (
                    <View style={styles.dropdownMenu}>
                      <ScrollView style={styles.dropdownScrollView}>
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
                          <AppText style={styles.dropdownItemText}>None</AppText>
                        </TouchableOpacity>
                      </ScrollView>
                    </View>
                  )}
                </View>
              </View>
              <View style={styles.toggleRow}>
                <AppText>Shared</AppText>
                <TouchableOpacity
                  style={[styles.toggle, isShared && styles.toggleActive]}
                  onPress={() => {
                    setIsShared(true);
                    setOwnerId('');
                  }}
                >
                  <AppText style={isShared ? styles.toggleTextActive : styles.toggleText}>
                    Yes
                  </AppText>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.toggle, !isShared && styles.toggleActive]}
                  onPress={() => setIsShared(false)}
                >
                  <AppText style={!isShared ? styles.toggleTextActive : styles.toggleText}>
                    No
                  </AppText>
                </TouchableOpacity>
              </View>
              {!isShared && (
                <View style={styles.ownerSelect}>
                  <AppText style={styles.label}>Owner</AppText>
                  {selectedHousehold.members.map((member) => (
                    <TouchableOpacity
                      key={member._id}
                      style={[
                        styles.ownerOption,
                        ownerId === member._id && styles.ownerOptionSelected,
                      ]}
                      onPress={() => setOwnerId(member._id)}
                    >
                      <AppText>{member.name}</AppText>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
              <PrimaryButton title="Add Item" onPress={handleAddItem} />
            </View>
          </>
        ) : (
          <View style={styles.emptyContainer}>
            <AppText style={styles.emptyText}>No shopping lists yet. Create one to get started!</AppText>
          </View>
        )}
      </ScrollView>

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
          <View style={styles.modalContent}>
            <AppText style={styles.modalTitle}>
              {editingList ? 'Edit List' : 'Create New List'}
            </AppText>
            <TextInput
              style={styles.input}
              value={newListName}
              onChangeText={setNewListName}
              placeholder="List name"
              autoFocus
            />
            <View style={styles.modalActions}>
              <PrimaryButton
                title="Cancel"
                onPress={() => {
                  setShowListModal(false);
                  setEditingList(null);
                  setNewListName('');
                }}
              />
              <View style={styles.spacer} />
              <PrimaryButton
                title={editingList ? 'Update' : 'Create'}
                onPress={editingList ? handleUpdateList : handleCreateList}
              />
            </View>
          </View>
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
          <ScrollView 
            contentContainerStyle={styles.modalScrollContent}
            style={styles.modalScrollView}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.modalContent}>
              <AppText style={styles.modalTitle}>Edit Item</AppText>
              <TextInput
                style={styles.input}
                value={editItemName}
                onChangeText={setEditItemName}
                placeholder="Item name"
                autoFocus
              />
              <TextInput
                style={styles.input}
                value={editItemQuantity}
                onChangeText={(text) => {
                  // Only allow integers
                  const numericValue = text.replace(/[^0-9]/g, '');
                  setEditItemQuantity(numericValue);
                }}
                placeholder="Quantity (optional)"
                keyboardType="number-pad"
              />
              <View>
                <TextInput
                  style={styles.input}
                  value={editItemWeight}
                  onChangeText={(text) => {
                    // Only allow integers
                    const numericValue = text.replace(/[^0-9]/g, '');
                    setEditItemWeight(numericValue);
                  }}
                  placeholder="Weight (optional)"
                  keyboardType="number-pad"
                />
                <View style={styles.dropdownContainer}>
                  <TouchableOpacity
                    style={styles.dropdownButton}
                    onPress={() => setShowEditUnitDropdown(!showEditUnitDropdown)}
                  >
                    <AppText style={[styles.dropdownButtonText, !editItemWeightUnit && styles.dropdownPlaceholder]}>
                      {editItemWeightUnit || 'Select Unit'}
                    </AppText>
                    <AppText style={styles.dropdownArrow}>{showEditUnitDropdown ? '▲' : '▼'}</AppText>
                  </TouchableOpacity>
                  {showEditUnitDropdown && (
                    <View style={styles.dropdownMenu}>
                      <ScrollView style={styles.dropdownScrollView}>
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
                          <AppText style={styles.dropdownItemText}>None</AppText>
                        </TouchableOpacity>
                      </ScrollView>
                    </View>
                  )}
                </View>
              </View>
              <View style={styles.toggleRow}>
                <AppText>Shared</AppText>
                <TouchableOpacity
                  style={[styles.toggle, editItemIsShared && styles.toggleActive]}
                  onPress={() => {
                    setEditItemIsShared(true);
                    setEditItemOwnerId('');
                  }}
                >
                  <AppText style={editItemIsShared ? styles.toggleTextActive : styles.toggleText}>
                    Yes
                  </AppText>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.toggle, !editItemIsShared && styles.toggleActive]}
                  onPress={() => setEditItemIsShared(false)}
                >
                  <AppText style={!editItemIsShared ? styles.toggleTextActive : styles.toggleText}>
                    No
                  </AppText>
                </TouchableOpacity>
              </View>
              {!editItemIsShared && selectedHousehold && (
                <View style={styles.ownerSelect}>
                  <AppText style={styles.label}>Owner</AppText>
                  {selectedHousehold.members.map((member) => (
                    <TouchableOpacity
                      key={member._id}
                      style={[
                        styles.ownerOption,
                        editItemOwnerId === member._id && styles.ownerOptionSelected,
                      ]}
                      onPress={() => setEditItemOwnerId(member._id)}
                    >
                      <AppText>{member.name}</AppText>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
              <View style={styles.modalActions}>
                <PrimaryButton
                  title="Cancel"
                  onPress={() => {
                    setEditingItem(null);
                    setEditItemName('');
                    setEditItemQuantity('');
                    setEditItemWeight('');
                    setEditItemWeightUnit('');
                    setEditItemIsShared(true);
                    setEditItemOwnerId('');
                  }}
                />
                <View style={styles.spacer} />
                <PrimaryButton title="Update" onPress={handleUpdateItem} />
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  keyboardAvoid: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  topHeader: {
    backgroundColor: colors.background,
  },
  topHeaderActions: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
  },
  searchWrap: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
  },
  listSection: {
    paddingVertical: spacing.md,
    backgroundColor: colors.background,
  },
  listScroll: {
    paddingHorizontal: spacing.md,
  },
  listCard: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radii.md,
    backgroundColor: colors.surface,
    marginRight: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 100,
  },
  listCardSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  listCardText: {
    fontSize: fontSizes.md,
    fontWeight: fontWeights.medium,
    color: colors.text,
  },
  listCardTextSelected: {
    color: colors.surface,
    fontWeight: fontWeights.semibold,
  },
  listHeader: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  listTitle: {
    fontSize: fontSizes.xl,
    fontWeight: fontWeights.extrabold,
    color: colors.text,
    flex: 1,
  },
  listHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  listActionButton: {
    padding: spacing.xs,
  },
  section: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.xs,
  },
  sectionTitle: {
    fontSize: fontSizes.xl,
    fontWeight: fontWeights.semibold,
    marginBottom: spacing.md,
    color: colors.text,
  },
  completedHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  emptyText: {
    fontSize: fontSizes.md,
    color: colors.muted,
    textAlign: 'center',
    padding: spacing.xxl,
  },
  addSection: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.lg,
    backgroundColor: colors.surface,
    marginTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  addSectionTitle: {
    fontSize: fontSizes.lg,
    fontWeight: fontWeights.semibold,
    marginBottom: spacing.md,
    color: colors.text,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    padding: spacing.md,
    fontSize: fontSizes.md,
    backgroundColor: colors.surface,
    marginBottom: spacing.md,
    color: colors.text,
  },
  dropdownContainer: {
    marginBottom: spacing.md,
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
  },
  dropdownButtonText: {
    fontSize: fontSizes.md,
    color: colors.text,
  },
  dropdownPlaceholder: {
    color: colors.muted,
  },
  dropdownArrow: {
    fontSize: 12,
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
    maxHeight: 200,
    zIndex: 1000,
  },
  dropdownScrollView: {
    maxHeight: 200,
  },
  dropdownItem: {
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
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
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
    gap: 12,
  },
  toggle: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceAlt,
  },
  toggleActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  toggleText: {
    color: colors.textSecondary,
  },
  toggleTextActive: {
    color: colors.surface,
    fontWeight: fontWeights.semibold,
  },
  ownerSelect: {
    marginBottom: 12,
  },
  label: {
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.semibold,
    marginBottom: spacing.xs,
    color: colors.textSecondary,
  },
  ownerOption: {
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    marginBottom: spacing.xs,
    backgroundColor: colors.surface,
  },
  ownerOptionSelected: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primary,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.xl,
    width: '90%',
    maxWidth: 400,
    borderWidth: 1,
    borderColor: colors.border,
  },
  modalScrollView: {
    width: '100%',
  },
  modalScrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalTitle: {
    fontSize: fontSizes.xl,
    fontWeight: fontWeights.extrabold,
    marginBottom: spacing.md,
    color: colors.text,
  },
  modalActions: {
    flexDirection: 'row',
    marginTop: spacing.md,
  },
  spacer: {
    width: spacing.sm,
  },
});
