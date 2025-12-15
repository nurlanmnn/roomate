import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, TouchableOpacity, Platform } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useHousehold } from '../../context/HouseholdContext';
import { useAuth } from '../../context/AuthContext';
import { expensesApi, ExpenseShare } from '../../api/expensesApi';
import { FormTextInput } from '../../components/FormTextInput';
import { PrimaryButton } from '../../components/PrimaryButton';
import { formatCurrency } from '../../utils/formatCurrency';

export const CreateExpenseScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { selectedHousehold } = useHousehold();
  const { user } = useAuth();
  const [description, setDescription] = useState('');
  const [totalAmount, setTotalAmount] = useState('');
  const [paidBy, setPaidBy] = useState('');
  const [date, setDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [category, setCategory] = useState('');
  const [selectedParticipants, setSelectedParticipants] = useState<string[]>([]);
  const [splitMethod, setSplitMethod] = useState<'even' | 'manual'>('even');
  const [manualShares, setManualShares] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (selectedHousehold && user) {
      setPaidBy(user._id);
      setSelectedParticipants([user._id]);
    }
  }, [selectedHousehold, user]);

  const toggleParticipant = (memberId: string) => {
    if (selectedParticipants.includes(memberId)) {
      setSelectedParticipants(selectedParticipants.filter(id => id !== memberId));
      const newShares = { ...manualShares };
      delete newShares[memberId];
      setManualShares(newShares);
    } else {
      setSelectedParticipants([...selectedParticipants, memberId]);
      if (splitMethod === 'even' && selectedParticipants.length > 0) {
        // Recalculate even split
      }
    }
  };

  const selectAll = () => {
    if (!selectedHousehold) return;
    const allIds = selectedHousehold.members.map(m => m._id);
    setSelectedParticipants(allIds);
  };

  const calculateEvenShares = (): ExpenseShare[] => {
    if (!totalAmount || selectedParticipants.length === 0) return [];
    const amount = parseFloat(totalAmount);
    const shareAmount = amount / selectedParticipants.length;
    return selectedParticipants.map(userId => ({
      userId,
      amount: Math.round(shareAmount * 100) / 100, // Round to 2 decimals
    }));
  };

  const getRemainingAmount = (): number => {
    if (!totalAmount) return 0;
    const total = parseFloat(totalAmount);
    const sumShares = Object.values(manualShares).reduce((sum, val) => {
      return sum + (parseFloat(val) || 0);
    }, 0);
    return total - sumShares;
  };

  const handleSubmit = async () => {
    if (!selectedHousehold || !user) return;

    if (!description.trim() || !totalAmount || selectedParticipants.length === 0) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    let shares: ExpenseShare[] = [];
    if (splitMethod === 'even') {
      shares = calculateEvenShares();
    } else {
      shares = selectedParticipants.map(userId => ({
        userId,
        amount: parseFloat(manualShares[userId] || '0'),
      }));

      const remaining = getRemainingAmount();
      if (Math.abs(remaining) > 0.01) {
        Alert.alert('Error', `Share amounts must add up to total. Remaining: ${formatCurrency(remaining)}`);
        return;
      }
    }

    setLoading(true);
    try {
      await expensesApi.createExpense({
        householdId: selectedHousehold._id,
        description,
        totalAmount: parseFloat(totalAmount),
        paidBy,
        participants: selectedParticipants,
        splitMethod,
        shares,
        date: date.toISOString(),
        category: category || undefined,
      });
      navigation.goBack();
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.error || 'Failed to create expense');
    } finally {
      setLoading(false);
    }
  };

  if (!selectedHousehold) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <View style={styles.emptyContainer}>
          <Text>Please select a household</Text>
        </View>
      </SafeAreaView>
    );
  }

  const remaining = getRemainingAmount();
  const canSubmit = splitMethod === 'even' || Math.abs(remaining) < 0.01;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView style={styles.scrollView}>
      <View style={styles.header}>
        <Text style={styles.title}>Add Expense</Text>
      </View>

      <View style={styles.form}>
        <FormTextInput
          label="Description"
          value={description}
          onChangeText={setDescription}
          placeholder="e.g., WiFi - January"
        />

        <FormTextInput
          label="Total Amount"
          value={totalAmount}
          onChangeText={setTotalAmount}
          placeholder="0.00"
          keyboardType="numeric"
        />

        <View style={styles.field}>
          <Text style={styles.label}>Paid By</Text>
          {selectedHousehold.members.map((member) => (
            <TouchableOpacity
              key={member._id}
              style={[styles.radioOption, paidBy === member._id && styles.radioSelected]}
              onPress={() => setPaidBy(member._id)}
            >
              <Text>{member.name}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Date</Text>
          <TouchableOpacity
            style={styles.dateButton}
            onPress={() => setShowDatePicker(true)}
          >
            <Text style={styles.dateText}>
              {date.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </Text>
          </TouchableOpacity>
          {showDatePicker && (
            <DateTimePicker
              value={date}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              maximumDate={new Date()}
              onChange={(event, selectedDate) => {
                setShowDatePicker(Platform.OS === 'ios');
                if (selectedDate) {
                  setDate(selectedDate);
                }
              }}
            />
          )}
          {Platform.OS === 'ios' && showDatePicker && (
            <View style={styles.datePickerActions}>
              <TouchableOpacity
                style={styles.datePickerButton}
                onPress={() => setShowDatePicker(false)}
              >
                <Text style={styles.datePickerButtonText}>Done</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        <FormTextInput
          label="Category (Optional)"
          value={category}
          onChangeText={setCategory}
          placeholder="e.g., utilities, groceries"
        />

        <View style={styles.field}>
          <Text style={styles.label}>Participants</Text>
          <TouchableOpacity onPress={selectAll} style={styles.selectAllButton}>
            <Text style={styles.selectAllText}>Select All</Text>
          </TouchableOpacity>
          {selectedHousehold.members.map((member) => (
            <TouchableOpacity
              key={member._id}
              style={[styles.checkboxOption, selectedParticipants.includes(member._id) && styles.checkboxSelected]}
              onPress={() => toggleParticipant(member._id)}
            >
              <Text>{member.name}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Split Method</Text>
          <TouchableOpacity
            style={[styles.radioOption, splitMethod === 'even' && styles.radioSelected]}
            onPress={() => setSplitMethod('even')}
          >
            <Text>Split Evenly</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.radioOption, splitMethod === 'manual' && styles.radioSelected]}
            onPress={() => setSplitMethod('manual')}
          >
            <Text>Split Manually</Text>
          </TouchableOpacity>
        </View>

        {splitMethod === 'even' && selectedParticipants.length > 0 && totalAmount && (
          <View style={styles.sharesPreview}>
            <Text style={styles.sharesTitle}>Shares (Even Split):</Text>
            {calculateEvenShares().map((share, index) => {
              const member = selectedHousehold.members.find(m => m._id === share.userId);
              return (
                <Text key={index} style={styles.shareItem}>
                  {member?.name}: {formatCurrency(share.amount)}
                </Text>
              );
            })}
          </View>
        )}

        {splitMethod === 'manual' && (
          <View style={styles.field}>
            <Text style={styles.label}>Manual Shares</Text>
            {selectedParticipants.map((userId) => {
              const member = selectedHousehold.members.find(m => m._id === userId);
              return (
                <View key={userId} style={styles.manualShareRow}>
                  <Text style={styles.manualShareLabel}>{member?.name}:</Text>
                  <FormTextInput
                    value={manualShares[userId] || ''}
                    onChangeText={(text) => setManualShares({ ...manualShares, [userId]: text })}
                    placeholder="0.00"
                    keyboardType="numeric"
                  />
                </View>
              );
            })}
            <Text style={[styles.remaining, remaining !== 0 && styles.remainingError]}>
              Remaining to assign: {formatCurrency(remaining)}
            </Text>
          </View>
        )}

        <PrimaryButton
          title="Save Expense"
          onPress={handleSubmit}
          loading={loading}
          disabled={!canSubmit}
        />
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
  },
  form: {
    padding: 16,
  },
  field: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    color: '#333',
  },
  radioOption: {
    padding: 12,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    marginBottom: 8,
    backgroundColor: '#fff',
  },
  radioSelected: {
    backgroundColor: '#E3F2FD',
    borderColor: '#2196F3',
  },
  checkboxOption: {
    padding: 12,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    marginBottom: 8,
    backgroundColor: '#fff',
  },
  checkboxSelected: {
    backgroundColor: '#E8F5E9',
    borderColor: '#4CAF50',
  },
  selectAllButton: {
    alignSelf: 'flex-end',
    padding: 8,
  },
  selectAllText: {
    color: '#2196F3',
    fontWeight: '600',
  },
  sharesPreview: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
  },
  sharesTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  shareItem: {
    fontSize: 14,
    marginBottom: 4,
  },
  manualShareRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  manualShareLabel: {
    width: 100,
    fontSize: 14,
  },
  remaining: {
    marginTop: 8,
    fontSize: 14,
    fontWeight: '600',
    color: '#4CAF50',
  },
  remainingError: {
    color: '#f44336',
  },
  dateButton: {
    padding: 12,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    backgroundColor: '#fff',
  },
  dateText: {
    fontSize: 16,
    color: '#333',
  },
  datePickerActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 8,
  },
  datePickerButton: {
    padding: 8,
    paddingHorizontal: 16,
  },
  datePickerButtonText: {
    color: '#2196F3',
    fontSize: 16,
    fontWeight: '600',
  },
});

