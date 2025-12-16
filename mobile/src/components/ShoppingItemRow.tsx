import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { ShoppingItem } from '../api/shoppingApi';

interface ShoppingItemRowProps {
  item: ShoppingItem;
  onToggle: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}

export const ShoppingItemRow: React.FC<ShoppingItemRowProps> = ({
  item,
  onToggle,
  onEdit,
  onDelete,
}) => {
  return (
    <View style={[styles.row, item.completed && styles.rowCompleted]}>
      <TouchableOpacity onPress={onToggle} style={styles.checkboxContainer}>
        <View style={[styles.checkbox, item.completed && styles.checkboxChecked]}>
          {item.completed && <Text style={styles.checkmark}>✓</Text>}
        </View>
      </TouchableOpacity>
      <View style={styles.content}>
        <Text style={[styles.name, item.completed && styles.nameCompleted]}>
          {item.name}
        </Text>
        <View style={styles.details}>
          {item.quantity && (
            <Text style={styles.detailText}>Qty: {item.quantity}</Text>
          )}
          {item.weight && (
            <Text style={styles.detailText}>
              {item.quantity ? ' • ' : ''}Weight: {item.weight}{item.weightUnit ? ` ${item.weightUnit}` : ''}
            </Text>
          )}
        </View>
        <View style={styles.meta}>
          {item.isShared ? (
            <Text style={styles.sharedBadge}>Shared</Text>
          ) : (
            item.ownerId && (
              <Text style={styles.personalBadge}>{item.ownerId.name}</Text>
            )
          )}
        </View>
      </View>
      <View style={styles.actions}>
        {onEdit && (
          <TouchableOpacity onPress={onEdit} style={styles.editButton}>
            <Text style={styles.editText}>✎</Text>
          </TouchableOpacity>
        )}
        {onDelete && (
          <TouchableOpacity onPress={onDelete} style={styles.deleteButton}>
            <Text style={styles.deleteText}>×</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#fff',
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#eee',
  },
  rowCompleted: {
    opacity: 0.6,
  },
  checkboxContainer: {
    marginRight: 12,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderWidth: 2,
    borderColor: '#4CAF50',
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#4CAF50',
  },
  checkmark: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
  },
  name: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
  },
  nameCompleted: {
    textDecorationLine: 'line-through',
    color: '#999',
  },
  details: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  detailText: {
    fontSize: 14,
    color: '#666',
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  editButton: {
    padding: 8,
    marginRight: 4,
  },
  editText: {
    fontSize: 18,
    color: '#2196F3',
    fontWeight: 'bold',
  },
  sharedBadge: {
    fontSize: 12,
    color: '#2196F3',
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  personalBadge: {
    fontSize: 12,
    color: '#666',
  },
  deleteButton: {
    padding: 8,
  },
  deleteText: {
    fontSize: 24,
    color: '#f44336',
  },
});

