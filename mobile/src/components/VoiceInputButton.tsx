import React, { useState, useEffect } from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator, Modal, View, TextInput, Alert, Platform, KeyboardAvoidingView } from 'react-native';
import { Audio } from 'expo-av';
import * as Speech from 'expo-speech';
import { speechApi } from '../api/speechApi';

interface VoiceInputButtonProps {
  onTranscript: (transcript: string) => void;
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
        } else {
          item.name = part;
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
  const unitMap: { [key: string]: string } = {
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

export const VoiceInputButton: React.FC<VoiceInputButtonProps> = ({ onTranscript }) => {
  const [isListening, setIsListening] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [showTextModal, setShowTextModal] = useState(false);
  const [textInput, setTextInput] = useState('');
  const [sound, setSound] = useState<Audio.Sound | null>(null);

  useEffect(() => {
    // Request audio permissions
    (async () => {
      try {
        await Audio.requestPermissionsAsync();
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: true,
          playsInSilentModeIOS: true,
        });
      } catch (err) {
        console.error('Failed to get audio permissions', err);
      }
    })();

    return () => {
      if (sound) {
        sound.unloadAsync();
      }
      if (recording) {
        recording.stopAndUnloadAsync();
      }
    };
  }, []);

  const startRecording = async () => {
    try {
      const { recording: newRecording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      setRecording(newRecording);
      setIsRecording(true);
    } catch (err) {
      console.error('Failed to start recording', err);
      Alert.alert('Error', 'Failed to start recording. Please check microphone permissions.');
      setIsListening(false);
    }
  };

  const stopRecording = async () => {
    if (!recording) return;

    try {
      setIsRecording(false);
      setIsListening(true); // show "Processing..."

      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      setRecording(null);

      if (!uri) {
        throw new Error('Recording URI not available');
      }

      let transcript = '';
      let transcriptionHardFail = false;
      try {
        const resp = await speechApi.transcribe(uri);
        transcript = resp.transcript || '';
      } catch (err: any) {
        console.error('Transcription error:', err);
        const status = err?.response?.status;
        const backendError = err?.response?.data?.error as string | undefined;
        if (status === 413) {
          Alert.alert(
            'Recording too long',
            'Your recording is too large to upload. Please try again with a shorter recording (1–5 seconds).'
          );
          transcriptionHardFail = true;
        } else if (backendError?.includes('SubscriptionRequiredException')) {
          Alert.alert(
            'AWS Transcribe not available',
            'AWS returned “SubscriptionRequiredException”. This usually means the AWS account/credentials can’t use Transcribe yet (often billing/payment method not set, or region not supported). Check your AWS account billing and AWS_REGION, then try again.'
          );
          transcriptionHardFail = true;
        }
        transcript = '';
      }

      if (transcriptionHardFail) {
        return;
      }

      if (!transcript.trim()) {
        // Fallback to manual text entry
        setShowTextModal(true);
        return;
      }

      const parsedItems = parseShoppingList(transcript);
      if (parsedItems.length === 0) {
        setShowTextModal(true);
        return;
      }

      for (const item of parsedItems) {
        let itemText = item.name;
        if (item.quantity) itemText = `${item.quantity} ${itemText}`;
        if (item.weight && item.weightUnit) itemText = `${item.weight}${item.weightUnit} ${itemText}`;
        onTranscript(itemText);
      }

      Speech.speak(`Added ${parsedItems.length} item${parsedItems.length > 1 ? 's' : ''}`, {
        language: 'en',
      });
    } catch (error) {
      console.error('Failed to stop recording', error);
      Alert.alert('Error', 'Failed to process recording');
    } finally {
      setIsListening(false);
    }
  };

  const handlePress = async () => {
    if (isRecording) {
      await stopRecording();
    } else {
      setIsListening(true);
      await startRecording();
    }
  };

  const handleTextSubmit = () => {
    if (!textInput.trim()) {
      Alert.alert('Error', 'Please enter your shopping list');
      return;
    }

    try {
      // Parse the input
      const parsedItems = parseShoppingList(textInput);
      
      if (parsedItems.length === 0) {
        Alert.alert('Error', 'Could not parse any items from your input');
        return;
      }

      // Process each parsed item
      parsedItems.forEach((item) => {
        // Format the item name with quantity/weight if available
        let itemText = item.name;
        if (item.quantity) {
          itemText = `${item.quantity} ${itemText}`;
        }
        if (item.weight && item.weightUnit) {
          itemText = `${item.weight}${item.weightUnit} ${itemText}`;
        }
        onTranscript(itemText);
      });

      // Provide feedback
      Speech.speak(`Added ${parsedItems.length} item${parsedItems.length > 1 ? 's' : ''}`, {
        language: 'en',
      });

      setTextInput('');
      setShowTextModal(false);
    } catch (error) {
      console.error('Failed to process input', error);
      Alert.alert('Error', 'Failed to process your input');
    }
  };

  return (
    <>
      <TouchableOpacity
        style={[styles.button, isRecording && styles.buttonRecording]}
        onPress={handlePress}
        disabled={isListening && !isRecording}
      >
        {isListening ? (
          <View style={styles.listeningContainer}>
            <ActivityIndicator color="#fff" size="small" />
            <Text style={styles.listeningText}>
              {isRecording ? 'Recording...' : 'Processing...'}
            </Text>
          </View>
        ) : (
          <Text style={styles.buttonText}>🎤 Voice Input</Text>
        )}
      </TouchableOpacity>

      <Modal
        visible={showTextModal}
        animationType="slide"
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
            <Text style={styles.modalTitle}>Enter Shopping List</Text>
            <Text style={styles.modalSubtitle}>
              Type or paste your shopping list. You can include quantities and weights.
              {'\n\n'}Example: "milk, 2kg chicken, 3 eggs, 1 liter of water"
            </Text>
            <TextInput
              style={styles.textInput}
              value={textInput}
              onChangeText={setTextInput}
              placeholder="milk, eggs, 2kg chicken, trash bags..."
              multiline
              numberOfLines={6}
              autoFocus
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setShowTextModal(false);
                  setTextInput('');
                }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.submitButton]}
                onPress={handleTextSubmit}
              >
                <Text style={styles.submitButtonText}>Add Items</Text>
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
    backgroundColor: '#2196F3',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
    minWidth: 120,
  },
  buttonRecording: {
    backgroundColor: '#f44336',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  listeningContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  listeningText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 8,
    color: '#333',
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
    lineHeight: 20,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    minHeight: 120,
    textAlignVertical: 'top',
    marginBottom: 16,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    backgroundColor: '#f5f5f5',
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
  },
  submitButton: {
    backgroundColor: '#4CAF50',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
