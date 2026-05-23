import { useState } from 'react';
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';

import { PrimaryButton } from '../components/PrimaryButton';
import { persistProfilePhoto } from '../utils/profilePhotoStorage';

export type ProfilePhotoSubmit = {
  nickname?: string;
  skipped: boolean;
  profilePhotoUri?: string;
};

type Props = {
  initialNickname?: string;
  onSubmit: (result: ProfilePhotoSubmit) => void | Promise<void>;
};

export function ProfilePhotoScreen({
  initialNickname = '',
  onSubmit,
}: Props) {
  const [nickname, setNickname] = useState(initialNickname.trim());
  const [previewUri, setPreviewUri] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function buildSubmit(
    skipped: boolean,
    profilePhotoUri?: string
  ): ProfilePhotoSubmit {
    const trimmed = nickname.trim();
    return {
      skipped,
      profilePhotoUri,
      nickname: trimmed || undefined,
    };
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
    if (!(await requestLibraryPermission())) return;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.85,
    });

    if (!result.canceled && result.assets[0]?.uri) {
      setPreviewUri(result.assets[0].uri);
    }
  }

  async function takePhoto() {
    if (!(await requestCameraPermission())) return;

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.85,
    });

    if (!result.canceled && result.assets[0]?.uri) {
      setPreviewUri(result.assets[0].uri);
    }
  }

  async function handleNext() {
    if (!previewUri || busy) return;

    setBusy(true);
    try {
      const savedUri = await persistProfilePhoto(previewUri);
      await Promise.resolve(onSubmit(buildSubmit(false, savedUri)));
    } catch {
      Alert.alert(
        '저장 실패',
        '프로필 사진을 저장하지 못했어요. 다시 시도해 주세요.'
      );
    } finally {
      setBusy(false);
    }
  }

  function handleSkip() {
    if (busy) return;
    onSubmit(buildSubmit(true));
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.title}>나의 프로필</Text>
          <Text style={styles.subtitle}>
            닉네임과 사진은 근처 산책자에게 보여요.{'\n'}
            설정에서 언제든 바꿀 수 있어요.
          </Text>

          <View style={styles.nicknameSection}>
            <Text style={styles.label}>닉네임 (선택)</Text>
            <TextInput
              style={styles.nicknameInput}
              placeholder="예: 산책러 민수"
              placeholderTextColor="#888"
              value={nickname}
              onChangeText={setNickname}
              maxLength={24}
              editable={!busy}
            />
          </View>

          <Text style={styles.photoLabel}>프로필 사진</Text>

          <Pressable
          style={styles.avatarTap}
          onPress={() => void pickFromLibrary()}
          disabled={busy}
        >
          {previewUri ? (
            <Image source={{ uri: previewUri }} style={styles.avatarImage} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarPlaceholderIcon}>📷</Text>
              <Text style={styles.avatarPlaceholderText}>사진 추가</Text>
            </View>
          )}
        </Pressable>

        <View style={styles.secondaryActions}>
          <Pressable
            style={styles.secondaryBtn}
            onPress={() => void pickFromLibrary()}
            disabled={busy}
          >
            <Text style={styles.secondaryBtnText}>앨범에서 선택</Text>
          </Pressable>
          {Platform.OS !== 'web' ? (
            <Pressable
              style={styles.secondaryBtn}
              onPress={() => void takePhoto()}
              disabled={busy}
            >
              <Text style={styles.secondaryBtnText}>카메라로 촬영</Text>
            </Pressable>
          ) : null}
        </View>
        </ScrollView>

        <View style={styles.footer}>
          {!previewUri ? (
            <Text style={styles.footerHint}>
              프로필 사진을 선택하면 다음으로 진행할 수 있어요.
            </Text>
          ) : null}
          <PrimaryButton
            label="다음"
            onPress={() => void handleNext()}
            disabled={!previewUri || busy}
            loading={busy}
          />
          <Pressable
            style={styles.skipWrap}
            onPress={handleSkip}
            disabled={busy}
          >
            <Text style={styles.skipText}>사진은 나중에 할게요</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const AVATAR_SIZE = 168;

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#000' },
  flex: { flex: 1 },
  scroll: { flex: 1 },
  container: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 16,
    alignItems: 'center',
  },
  footer: {
    width: '100%',
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 20,
    borderTopWidth: 1,
    borderTopColor: '#1F1F23',
    backgroundColor: '#000',
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 10,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 21,
    color: '#A7A7A7',
    textAlign: 'center',
    marginBottom: 24,
    paddingHorizontal: 8,
  },
  nicknameSection: {
    width: '100%',
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 8,
  },
  nicknameInput: {
    width: '100%',
    height: 48,
    borderRadius: 12,
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    fontSize: 16,
    color: '#111',
  },
  photoLabel: {
    alignSelf: 'flex-start',
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 12,
    width: '100%',
  },
  avatarTap: {
    marginBottom: 28,
  },
  avatarImage: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
    backgroundColor: '#1C1C1E',
  },
  avatarPlaceholder: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
    backgroundColor: '#1C1C1E',
    borderWidth: 2,
    borderColor: '#2F2F33',
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarPlaceholderIcon: {
    fontSize: 36,
    marginBottom: 8,
  },
  avatarPlaceholderText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#9CA3AF',
  },
  secondaryActions: {
    width: '100%',
    gap: 10,
    marginBottom: 28,
  },
  secondaryBtn: {
    height: 48,
    borderRadius: 12,
    backgroundColor: '#1C1C1E',
    borderWidth: 1,
    borderColor: '#2F2F33',
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#E5E7EB',
  },
  footerHint: {
    fontSize: 13,
    color: '#9CA3AF',
    textAlign: 'center',
    marginBottom: 10,
  },
  skipWrap: {
    marginTop: 12,
    alignItems: 'center',
    paddingVertical: 8,
  },
  skipText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#6B7280',
  },
});
