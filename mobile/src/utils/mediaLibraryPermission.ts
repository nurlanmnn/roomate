import { Alert, Linking } from 'react-native';
import * as ImagePicker from 'expo-image-picker';

/**
 * Ensures photo library access: shows the system prompt when possible (first ask / Android re-ask).
 * After a hard deny (typical on iOS), returns false — caller should offer Settings.
 */
export async function ensureMediaLibraryPermission(): Promise<boolean> {
  let perm = await ImagePicker.getMediaLibraryPermissionsAsync();
  if (!perm.granted) {
    if (perm.status === 'undetermined' || perm.canAskAgain) {
      perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    }
  }
  return perm.granted;
}

export function alertOpenSettingsForPhotoLibrary(
  t: (key: string) => string,
  titleKey: string
): void {
  Alert.alert(t(titleKey), t('alerts.photoLibraryEnableInSettings'), [
    { text: t('common.cancel'), style: 'cancel' },
    { text: t('alerts.openSettings'), onPress: () => void Linking.openSettings() },
  ]);
}
