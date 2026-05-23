import * as ImagePicker from 'expo-image-picker';
import { Platform } from 'react-native';

/**
 * Android (SDK 54 / Expo Go): native crop toolbar confirm icons are often invisible.
 * iOS: in-picker square crop works reliably.
 */
export function getProfileImagePickerOptions(): ImagePicker.ImagePickerOptions {
  return {
    mediaTypes: ['images'],
    allowsEditing: Platform.OS === 'ios',
    aspect: [1, 1],
    quality: 0.85,
  };
}
