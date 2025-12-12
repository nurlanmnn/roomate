import React, { useState } from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator } from 'react-native';
import * as Speech from 'expo-speech';

interface VoiceInputButtonProps {
  onTranscript: (transcript: string) => void;
}

export const VoiceInputButton: React.FC<VoiceInputButtonProps> = ({ onTranscript }) => {
  const [isListening, setIsListening] = useState(false);

  const handlePress = async () => {
    setIsListening(true);
    
    // MVP: Simple text input simulation
    // In production, you would use expo-speech or a speech recognition library
    // For now, we'll use a simple prompt-based approach
    // This is a placeholder - you'll need to implement actual speech recognition
    
    try {
      // Placeholder: In a real app, you'd use:
      // - expo-speech for TTS
      // - A speech recognition library (may require native modules)
      // - Or a third-party service like Google Speech-to-Text
      
      // For MVP, we'll simulate with a simple parsing function
      // You can replace this with actual speech recognition
      const mockTranscript = "milk, eggs, 2kg chicken, trash bags and shampoo";
      
      // Parse the transcript
      const items = mockTranscript
        .replace(/ and /gi, ', ')
        .split(',')
        .map(item => item.trim())
        .filter(item => item.length > 0);
      
      // Call onTranscript for each item
      for (const item of items) {
        onTranscript(item);
      }
    } catch (error) {
      console.error('Voice input error:', error);
    } finally {
      setIsListening(false);
    }
  };

  return (
    <TouchableOpacity
      style={[styles.button, isListening && styles.buttonListening]}
      onPress={handlePress}
      disabled={isListening}
    >
      {isListening ? (
        <ActivityIndicator color="#fff" />
      ) : (
        <Text style={styles.buttonText}>🎤 Voice Input</Text>
      )}
    </TouchableOpacity>
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
  },
  buttonListening: {
    backgroundColor: '#1976D2',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

