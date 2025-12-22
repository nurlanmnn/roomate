import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, Image, Alert, ActivityIndicator, Platform } from 'react-native';
import { CameraView, CameraType, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { expensesApi } from '../api/expensesApi';
import { colors, fontSizes, fontWeights, spacing, radii, shadows } from '../theme';
import { PrimaryButton } from './PrimaryButton';

interface ReceiptScannerProps {
  onReceiptScanned: (data: {
    description: string;
    totalAmount: number | null;
    date: Date | null;
    merchant: string | null;
  }) => void;
  onClose: () => void;
}

export const ReceiptScanner: React.FC<ReceiptScannerProps> = ({
  onReceiptScanned,
  onClose,
}) => {
  const [permission, requestPermission] = useCameraPermissions();
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState<any>(null);

  useEffect(() => {
    // Request camera permission on mount
    if (!permission?.granted) {
      requestPermission();
    }
  }, []);

  const handleTakePhoto = async () => {
    if (!permission?.granted) {
      const result = await requestPermission();
      if (!result.granted) {
        Alert.alert('Permission Required', 'Camera permission is required to scan receipts.');
        return;
      }
    }

    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: 'images',
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
        base64: true,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        setImageUri(asset.uri);
        await processImage(asset.base64 || '');
      }
    } catch (error) {
      console.error('Error taking photo:', error);
      Alert.alert('Error', 'Failed to take photo. Please try again.');
    }
  };

  const handlePickFromLibrary = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Photo library permission is required.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: 'images',
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
        base64: true,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        setImageUri(asset.uri);
        await processImage(asset.base64 || '');
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image. Please try again.');
    }
  };

  const processImage = async (base64: string) => {
    if (!base64) {
      Alert.alert('Error', 'No image data available.');
      return;
    }

    setScanning(true);
    try {
      // Determine MIME type
      let mimeType = 'image/jpeg';
      if (imageUri?.toLowerCase().endsWith('.png')) {
        mimeType = 'image/png';
      }

      const imageBase64 = `data:${mimeType};base64,${base64}`;
      const result = await expensesApi.scanReceipt(imageBase64);
      
      setScanResult(result);
    } catch (error: any) {
      console.error('OCR error:', error);
      Alert.alert('Error', error.response?.data?.error || 'Failed to scan receipt. Please try again.');
    } finally {
      setScanning(false);
    }
  };

  const handleUseResult = () => {
    if (scanResult) {
      onReceiptScanned({
        description: scanResult.description,
        totalAmount: scanResult.totalAmount,
        date: scanResult.date ? new Date(scanResult.date) : null,
        merchant: scanResult.merchant,
      });
      onClose();
    }
  };

  const handleRetake = () => {
    setImageUri(null);
    setScanResult(null);
    setScanning(false);
  };

  return (
    <Modal
      visible={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Scan Receipt</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>
        </View>

        {!imageUri ? (
          <View style={styles.cameraContainer}>
            <View style={styles.instructionsContainer}>
              <Text style={styles.instructionsTitle}>How to scan:</Text>
              <Text style={styles.instructionsText}>
                1. Take a clear photo of your receipt{'\n'}
                2. Make sure the receipt is well-lit{'\n'}
                3. Ensure text is readable
              </Text>
            </View>
            <View style={styles.buttonContainer}>
              <PrimaryButton
                title="📷 Take Photo"
                onPress={handleTakePhoto}
                style={styles.actionButton}
              />
              <PrimaryButton
                title="📁 Choose from Library"
                onPress={handlePickFromLibrary}
                variant="secondary"
                style={styles.actionButton}
              />
            </View>
          </View>
        ) : (
          <View style={styles.previewContainer}>
            <Image source={{ uri: imageUri }} style={styles.previewImage} />
            
            {scanning && (
              <View style={styles.scanningOverlay}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={styles.scanningText}>Scanning receipt...</Text>
              </View>
            )}

            {scanResult && !scanning && (
              <View style={styles.resultContainer}>
                <Text style={styles.resultTitle}>Scanned Data:</Text>
                {scanResult.merchant && (
                  <View style={styles.resultRow}>
                    <Text style={styles.resultLabel}>Merchant:</Text>
                    <Text style={styles.resultValue}>{scanResult.merchant}</Text>
                  </View>
                )}
                {scanResult.totalAmount && (
                  <View style={styles.resultRow}>
                    <Text style={styles.resultLabel}>Amount:</Text>
                    <Text style={styles.resultValue}>${scanResult.totalAmount.toFixed(2)}</Text>
                  </View>
                )}
                {scanResult.date && (
                  <View style={styles.resultRow}>
                    <Text style={styles.resultLabel}>Date:</Text>
                    <Text style={styles.resultValue}>
                      {new Date(scanResult.date).toLocaleDateString()}
                    </Text>
                  </View>
                )}
                <View style={styles.resultActions}>
                  <PrimaryButton
                    title="Use This Data"
                    onPress={handleUseResult}
                    style={styles.useButton}
                  />
                  <TouchableOpacity onPress={handleRetake} style={styles.retakeButton}>
                    <Text style={styles.retakeButtonText}>Retake</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        )}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: {
    fontSize: fontSizes.xl,
    fontWeight: fontWeights.bold,
    color: colors.text,
  },
  closeButton: {
    padding: spacing.xs,
  },
  closeButtonText: {
    fontSize: fontSizes.xl,
    color: colors.textSecondary,
  },
  cameraContainer: {
    flex: 1,
    justifyContent: 'center',
    padding: spacing.xl,
  },
  instructionsContainer: {
    backgroundColor: colors.surface,
    padding: spacing.lg,
    borderRadius: radii.lg,
    marginBottom: spacing.xl,
    ...(shadows.md as object),
  },
  instructionsTitle: {
    fontSize: fontSizes.lg,
    fontWeight: fontWeights.bold,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  instructionsText: {
    fontSize: fontSizes.md,
    color: colors.textSecondary,
    lineHeight: 24,
  },
  buttonContainer: {
    gap: spacing.md,
  },
  actionButton: {
    marginBottom: spacing.sm,
  },
  previewContainer: {
    flex: 1,
    padding: spacing.md,
  },
  previewImage: {
    width: '100%',
    height: 400,
    borderRadius: radii.md,
    marginBottom: spacing.md,
    backgroundColor: colors.surface,
  },
  scanningOverlay: {
    position: 'absolute',
    top: spacing.md,
    left: spacing.md,
    right: spacing.md,
    bottom: spacing.md,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: radii.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanningText: {
    marginTop: spacing.md,
    fontSize: fontSizes.md,
    color: colors.textInverse,
  },
  resultContainer: {
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: radii.lg,
    ...(shadows.md as object),
  },
  resultTitle: {
    fontSize: fontSizes.lg,
    fontWeight: fontWeights.bold,
    color: colors.text,
    marginBottom: spacing.md,
  },
  resultRow: {
    flexDirection: 'row',
    marginBottom: spacing.sm,
  },
  resultLabel: {
    fontSize: fontSizes.md,
    color: colors.textSecondary,
    fontWeight: fontWeights.medium,
    width: 80,
  },
  resultValue: {
    fontSize: fontSizes.md,
    color: colors.text,
    flex: 1,
  },
  resultActions: {
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  useButton: {
    marginBottom: spacing.xs,
  },
  retakeButton: {
    padding: spacing.md,
    alignItems: 'center',
  },
  retakeButtonText: {
    fontSize: fontSizes.md,
    color: colors.primary,
    fontWeight: fontWeights.semibold,
  },
});

