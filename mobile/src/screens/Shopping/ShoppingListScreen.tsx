import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, RefreshControl, Alert, Modal, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useHousehold } from '../../context/HouseholdContext';
import { useAuth } from '../../context/AuthContext';
import { shoppingApi, ShoppingItem, ShoppingList, WeightUnit } from '../../api/shoppingApi';
import { ShoppingItemRow } from '../../components/ShoppingItemRow';
import { VoiceInputButton } from '../../components/VoiceInputButton';
import { PrimaryButton } from '../../components/PrimaryButton';

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
    setEditItemWeightUnit(item.weightUnit || '');
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

    try {
      await shoppingApi.updateShoppingItem(editingItem._id, {
        name: editItemName.trim(),
        quantity: editItemQuantity ? parseInt(editItemQuantity, 10) : undefined,
        weight: editItemWeight ? parseInt(editItemWeight, 10) : undefined,
        weightUnit: editItemWeightUnit || undefined,
        isShared: editItemIsShared,
        ownerId: editItemIsShared ? undefined : editItemOwnerId,
      });
      setEditingItem(null);
      setEditItemName('');
      setEditItemQuantity('');
      setEditItemWeight('');
      setEditItemWeightUnit('');
      setShowEditUnitDropdown(false);
      setEditItemIsShared(true);
      setEditItemOwnerId('');
      loadItems();
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.error || 'Failed to update item');
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

  const handleVoiceInput = async (transcript: string) => {
    if (!selectedHousehold || !selectedList) return;

    try {
      await shoppingApi.createShoppingItem({
        householdId: selectedHousehold._id,
        listId: selectedList._id,
        name: transcript,
        isShared: true,
      });
      loadItems();
    } catch (error) {
      console.error('Failed to add voice item:', error);
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
        <ScrollView
          style={styles.scrollView}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={loadLists} />}
          keyboardShouldPersistTaps="handled"
        >
        <View style={styles.header}>
          <Text style={styles.title}>Shopping Lists</Text>
          <TouchableOpacity
            style={styles.addListButton}
            onPress={() => setShowListModal(true)}
          >
            <Text style={styles.addListButtonText}>+ New List</Text>
          </TouchableOpacity>
        </View>

        {/* List Selection */}
        <View style={styles.listSection}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.listScroll}>
            {lists.map((list) => (
              <TouchableOpacity
                key={list._id}
                style={[
                  styles.listCard,
                  selectedList?._id === list._id && styles.listCardSelected,
                ]}
                onPress={() => setSelectedList(list)}
                onLongPress={() => handleDeleteList(list)}
              >
                <Text
                  style={[
                    styles.listCardText,
                    selectedList?._id === list._id && styles.listCardTextSelected,
                  ]}
                >
                  {list.name}
                </Text>
                {selectedList?._id === list._id && (
                  <View style={styles.listCardActions}>
                    <TouchableOpacity
                      style={styles.editListButton}
                      onPress={() => handleEditList(list)}
                    >
                      <Text style={styles.editListButtonText}>✎</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.deleteListButton}
                      onPress={() => handleDeleteList(list)}
                    >
                      <Text style={styles.deleteListButtonText}>×</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {selectedList ? (
          <>
            <View style={styles.header}>
              <Text style={styles.listTitle}>{selectedList.name}</Text>
              <VoiceInputButton onTranscript={handleVoiceInput} />
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>To Buy</Text>
              {items.length === 0 ? (
                <Text style={styles.emptyText}>No items to buy</Text>
              ) : (
                items.map((item) => (
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

            {completedItems.length > 0 && (
              <View style={styles.section}>
                <TouchableOpacity
                  onPress={() => setShowCompleted(!showCompleted)}
                  style={styles.completedHeader}
                >
                  <Text style={styles.sectionTitle}>
                    Completed ({completedItems.length})
                  </Text>
                  <Text>{showCompleted ? '▼' : '▶'}</Text>
                </TouchableOpacity>
                {showCompleted &&
                  completedItems.map((item) => (
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
              <Text style={styles.addSectionTitle}>Add Item</Text>
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
                    <Text style={[styles.dropdownButtonText, !weightUnit && styles.dropdownPlaceholder]}>
                      {weightUnit || 'Select Unit'}
                    </Text>
                    <Text style={styles.dropdownArrow}>{showUnitDropdown ? '▲' : '▼'}</Text>
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
                            <Text
                              style={[
                                styles.dropdownItemText,
                                weightUnit === unit && styles.dropdownItemTextSelected,
                              ]}
                            >
                              {unit}
                            </Text>
                          </TouchableOpacity>
                        ))}
                        <TouchableOpacity
                          style={styles.dropdownItem}
                          onPress={() => {
                            setWeightUnit('');
                            setShowUnitDropdown(false);
                          }}
                        >
                          <Text style={styles.dropdownItemText}>None</Text>
                        </TouchableOpacity>
                      </ScrollView>
                    </View>
                  )}
                </View>
              </View>
              <View style={styles.toggleRow}>
                <Text>Shared</Text>
                <TouchableOpacity
                  style={[styles.toggle, isShared && styles.toggleActive]}
                  onPress={() => {
                    setIsShared(true);
                    setOwnerId('');
                  }}
                >
                  <Text style={isShared ? styles.toggleTextActive : styles.toggleText}>
                    Yes
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.toggle, !isShared && styles.toggleActive]}
                  onPress={() => setIsShared(false)}
                >
                  <Text style={!isShared ? styles.toggleTextActive : styles.toggleText}>
                    No
                  </Text>
                </TouchableOpacity>
              </View>
              {!isShared && (
                <View style={styles.ownerSelect}>
                  <Text style={styles.label}>Owner</Text>
                  {selectedHousehold.members.map((member) => (
                    <TouchableOpacity
                      key={member._id}
                      style={[
                        styles.ownerOption,
                        ownerId === member._id && styles.ownerOptionSelected,
                      ]}
                      onPress={() => setOwnerId(member._id)}
                    >
                      <Text>{member.name}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
              <PrimaryButton title="Add Item" onPress={handleAddItem} />
            </View>
          </>
        ) : (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No shopping lists yet. Create one to get started!</Text>
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
            <Text style={styles.modalTitle}>
              {editingList ? 'Edit List' : 'Create New List'}
            </Text>
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
              <Text style={styles.modalTitle}>Edit Item</Text>
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
                    <Text style={[styles.dropdownButtonText, !editItemWeightUnit && styles.dropdownPlaceholder]}>
                      {editItemWeightUnit || 'Select Unit'}
                    </Text>
                    <Text style={styles.dropdownArrow}>{showEditUnitDropdown ? '▲' : '▼'}</Text>
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
                            <Text
                              style={[
                                styles.dropdownItemText,
                                editItemWeightUnit === unit && styles.dropdownItemTextSelected,
                              ]}
                            >
                              {unit}
                            </Text>
                          </TouchableOpacity>
                        ))}
                        <TouchableOpacity
                          style={styles.dropdownItem}
                          onPress={() => {
                            setEditItemWeightUnit('');
                            setShowEditUnitDropdown(false);
                          }}
                        >
                          <Text style={styles.dropdownItemText}>None</Text>
                        </TouchableOpacity>
                      </ScrollView>
                    </View>
                  )}
                </View>
              </View>
              <View style={styles.toggleRow}>
                <Text>Shared</Text>
                <TouchableOpacity
                  style={[styles.toggle, editItemIsShared && styles.toggleActive]}
                  onPress={() => {
                    setEditItemIsShared(true);
                    setEditItemOwnerId('');
                  }}
                >
                  <Text style={editItemIsShared ? styles.toggleTextActive : styles.toggleText}>
                    Yes
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.toggle, !editItemIsShared && styles.toggleActive]}
                  onPress={() => setEditItemIsShared(false)}
                >
                  <Text style={!editItemIsShared ? styles.toggleTextActive : styles.toggleText}>
                    No
                  </Text>
                </TouchableOpacity>
              </View>
              {!editItemIsShared && selectedHousehold && (
                <View style={styles.ownerSelect}>
                  <Text style={styles.label}>Owner</Text>
                  {selectedHousehold.members.map((member) => (
                    <TouchableOpacity
                      key={member._id}
                      style={[
                        styles.ownerOption,
                        editItemOwnerId === member._id && styles.ownerOptionSelected,
                      ]}
                      onPress={() => setEditItemOwnerId(member._id)}
                    >
                      <Text>{member.name}</Text>
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
    backgroundColor: '#f5f5f5',
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
  header: {
    padding: 24,
    paddingTop: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#333',
  },
  addListButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  addListButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  listSection: {
    paddingVertical: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  listScroll: {
    paddingHorizontal: 16,
  },
  listCard: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#f5f5f5',
    marginRight: 12,
    borderWidth: 2,
    borderColor: 'transparent',
    flexDirection: 'row',
    alignItems: 'center',
  },
  listCardSelected: {
    backgroundColor: '#E8F5E9',
    borderColor: '#4CAF50',
  },
  listCardText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#666',
  },
  listCardTextSelected: {
    color: '#4CAF50',
    fontWeight: '600',
  },
  listCardActions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 8,
  },
  editListButton: {
    padding: 4,
    marginRight: 4,
  },
  editListButtonText: {
    fontSize: 18,
    color: '#2196F3',
    fontWeight: 'bold',
  },
  deleteListButton: {
    padding: 4,
  },
  deleteListButtonText: {
    fontSize: 20,
    color: '#f44336',
    fontWeight: 'bold',
  },
  listTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#333',
  },
  section: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 12,
    color: '#333',
  },
  completedHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
    textAlign: 'center',
    padding: 32,
  },
  addSection: {
    padding: 16,
    backgroundColor: '#fff',
    marginTop: 16,
  },
  addSectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fff',
    marginBottom: 12,
  },
  dropdownContainer: {
    marginBottom: 12,
    position: 'relative',
    zIndex: 1,
  },
  dropdownButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    backgroundColor: '#fff',
  },
  dropdownButtonText: {
    fontSize: 16,
    color: '#333',
  },
  dropdownPlaceholder: {
    color: '#999',
  },
  dropdownArrow: {
    fontSize: 12,
    color: '#666',
  },
  dropdownMenu: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    marginTop: 4,
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
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
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  dropdownItemSelected: {
    backgroundColor: '#E8F5E9',
  },
  dropdownItemText: {
    fontSize: 16,
    color: '#333',
  },
  dropdownItemTextSelected: {
    color: '#4CAF50',
    fontWeight: '600',
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 12,
  },
  toggle: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  toggleActive: {
    backgroundColor: '#4CAF50',
    borderColor: '#4CAF50',
  },
  toggleText: {
    color: '#666',
  },
  toggleTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  ownerSelect: {
    marginBottom: 12,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  ownerOption: {
    padding: 12,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    marginBottom: 8,
    backgroundColor: '#fff',
  },
  ownerOptionSelected: {
    backgroundColor: '#E8F5E9',
    borderColor: '#4CAF50',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    width: '90%',
    maxWidth: 400,
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
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 16,
  },
  modalActions: {
    flexDirection: 'row',
    marginTop: 16,
  },
  spacer: {
    width: 12,
  },
});
