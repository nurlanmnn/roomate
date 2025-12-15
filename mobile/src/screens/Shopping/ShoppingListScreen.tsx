import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, RefreshControl, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useHousehold } from '../../context/HouseholdContext';
import { useAuth } from '../../context/AuthContext';
import { shoppingApi, ShoppingItem } from '../../api/shoppingApi';
import { ShoppingItemRow } from '../../components/ShoppingItemRow';
import { VoiceInputButton } from '../../components/VoiceInputButton';
import { PrimaryButton } from '../../components/PrimaryButton';

export const ShoppingListScreen: React.FC = () => {
  const { selectedHousehold } = useHousehold();
  const { user } = useAuth();
  const [items, setItems] = useState<ShoppingItem[]>([]);
  const [completedItems, setCompletedItems] = useState<ShoppingItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState('');
  const [quantity, setQuantity] = useState('');
  const [isShared, setIsShared] = useState(true);
  const [ownerId, setOwnerId] = useState('');
  const [showCompleted, setShowCompleted] = useState(false);

  useEffect(() => {
    if (selectedHousehold) {
      loadItems();
    }
  }, [selectedHousehold]);

  const loadItems = async () => {
    if (!selectedHousehold) return;

    setLoading(true);
    try {
      const [activeItems, completed] = await Promise.all([
        shoppingApi.getShoppingItems(selectedHousehold._id, false),
        shoppingApi.getShoppingItems(selectedHousehold._id, true),
      ]);
      setItems(activeItems);
      setCompletedItems(completed);
    } catch (error) {
      console.error('Failed to load shopping items:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddItem = async () => {
    if (!selectedHousehold || !user || !name.trim()) {
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
        name: name.trim(),
        quantity: quantity || undefined,
        isShared,
        ownerId: isShared ? undefined : ownerId,
      });
      setName('');
      setQuantity('');
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
    if (!selectedHousehold) return;

    try {
      await shoppingApi.createShoppingItem({
        householdId: selectedHousehold._id,
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
      <ScrollView
        style={styles.scrollView}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={loadItems} />}
      >
      <View style={styles.header}>
        <Text style={styles.title}>Shopping List</Text>
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
          onChangeText={setQuantity}
          placeholder="Quantity (optional)"
        />
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
    </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollView: {
    flex: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    padding: 24,
    paddingTop: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#333',
    marginBottom: 16,
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
});

