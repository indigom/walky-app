import { useEffect, useState } from 'react';
import {
  Alert,
  Image,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';

import type { UserProfile } from '../types';
import { getProfileImagePickerOptions } from '../utils/profileImagePicker';
import { resolveProfilePhotoUri } from '../utils/profilePhotoProfile';

type Props = {
  user: UserProfile | null | undefined;
  onPreviewChange: (uri: string | null) => void;
  disabled?: boolean;
};

export function ProfilePhotoPickerSection({
  user,
  onPreviewChange,
  disabled = false,
}: Props) {
  const [previewUri, setPreviewUri] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void resolveProfilePhotoUri(user).then((uri) => {
      if (!cancelled) {
        setPreviewUri(uri);
        onPreviewChange(uri);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [
    user?.profilePhotoUri,
    user?.profilePhotoUrl,
    user?.profilePhotoSkipped,
  ]);

  function updatePreview(uri: string | null) {
    setPreviewUri(uri);
    onPreviewChange(uri);
  }

  async function requestLibraryPermission(): Promise<boolean> {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status === 'granted') return true;
    Alert.alert(
      '사진 접근',
      '프로필 사진을 선택하려면 사진 보관함 접근을 허용해 주세요.'
    );
    return false;
  }

  async function requestCameraPermission(): Promise<boolean> {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status === 'granted') return true;
    Alert.alert(
      '카메라 접근',
      '프로필 사진을 촬영하려면 카메라 접근을 허용해 주세요.'
    );
    return false;
  }

  async function pickFromLibrary() {
    if (disabled || !(await requestLibraryPermission())) return;

    const result = await ImagePicker.launchImageLibraryAsync(
      getProfileImagePickerOptions()
    );

    if (!result.canceled && result.assets[0]?.uri) {
      updatePreview(result.assets[0].uri);
    }
  }

  async function takePhoto() {
    if (disabled || !(await requestCameraPermission())) return;

    const result = await ImagePicker.launchCameraAsync(
      getProfileImagePickerOptions()
    );

    if (!result.canceled && result.assets[0]?.uri) {
      updatePreview(result.assets[0].uri);
    }
  }

  return (
    <View style={styles.wrap}>
      <Pressable
        onPress={() => void pickFromLibrary()}
        disabled={disabled}
        style={styles.avatarTap}
      >
        {previewUri ? (
          <Image source={{ uri: previewUri }} style={styles.avatar} />
        ) : (
          <View style={styles.placeholder}>
            <Text style={styles.placeholderIcon}>📷</Text>
          </View>
        )}
      </Pressable>

      <View style={styles.actions}>
        <Pressable
          style={styles.linkBtn}
          onPress={() => void pickFromLibrary()}
          disabled={disabled}
        >
          <Text style={styles.linkText}>앨범에서 변경</Text>
        </Pressable>
        {Platform.OS !== 'web' ? (
          <Pressable
            style={styles.linkBtn}
            onPress={() => void takePhoto()}
            disabled={disabled}
          >
            <Text style={styles.linkText}>카메라로 촬영</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const SIZE = 96;

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    marginBottom: 8,
  },
  avatarTap: {
    marginBottom: 10,
  },
  avatar: {
    width: SIZE,
    height: SIZE,
    borderRadius: SIZE / 2,
    backgroundColor: '#1C1C1E',
  },
  placeholder: {
    width: SIZE,
    height: SIZE,
    borderRadius: SIZE / 2,
    backgroundColor: '#1C1C1E',
    borderWidth: 2,
    borderColor: '#2F2F33',
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderIcon: {
    fontSize: 28,
  },
  actions: {
    flexDirection: 'row',
    gap: 16,
  },
  linkBtn: {
    paddingVertical: 4,
  },
  linkText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#F59E0B',
  },
});
