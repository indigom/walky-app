// src/screens/UserInfoScreen.tsx

import { useRef, useState } from 'react';
import {
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PrimaryButton } from '../components/PrimaryButton';
import { ONBOARDING_SCREEN_BG } from '../constants/onboardingTheme';

type Props = {
  onSubmit: (data: {
    age: number;
    gender: 'male' | 'female';
    heightCm: number;
    weightKg: number;
  }) => void;
};

export function UserInfoScreen({ onSubmit }: Props) {
  const [age, setAge] = useState('');
  const [height, setHeight] = useState('');
  const [weight, setWeight] = useState('');
  const [gender, setGender] = useState<'male' | 'female'>('male');

  const scrollRef = useRef<ScrollView>(null);
  const heightRef = useRef<TextInput>(null);
  const weightRef = useRef<TextInput>(null);

  const ageNumber = Number(age);
  const heightNumber = Number(height);
  const weightNumber = Number(weight);

  const isFormValid =
    age.trim() !== '' &&
    height.trim() !== '' &&
    weight.trim() !== '' &&
    ageNumber > 0 &&
    heightNumber > 0 &&
    weightNumber > 0;

  function handleSubmit() {
    Keyboard.dismiss();

    if (!isFormValid) {
      Alert.alert('입력 확인', '나이, 키, 몸무게를 모두 올바르게 입력해 주세요.');
      return;
    }

    onSubmit({
      age: ageNumber,
      gender,
      heightCm: heightNumber,
      weightKg: weightNumber,
    });
  }

  function handleInputFocus(y: number) {
    setTimeout(() => {
      scrollRef.current?.scrollTo({
        y: Math.max(0, y - 120),
        animated: true,
      });
    }, 150);
  }

  const createFocusHandler = (y: number) => () => {
    handleInputFocus(y);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 20 : 0}
        >
          <ScrollView
            ref={scrollRef}
            contentContainerStyle={styles.container}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode={
              Platform.OS === 'ios' ? 'interactive' : 'on-drag'
            }
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.content}>
              <Text style={styles.title}>내 정보를 알려주세요</Text>
              <Text style={styles.subtitle}>
                AI가 더 정확한 산책 밸런스를 맞출 수 있게 기본 정보를 입력해 주세요.
              </Text>

              <View style={styles.section}>
                <Text style={styles.label}>성별</Text>
                <View style={styles.genderRow}>
                  <TouchableOpacity
                    activeOpacity={0.85}
                    style={[
                      styles.genderButton,
                      styles.genderButtonLeft,
                      gender === 'male' && styles.genderButtonActive,
                    ]}
                    onPress={() => setGender('male')}
                  >
                    <Text
                      style={[
                        styles.genderButtonText,
                        gender === 'male' && styles.genderButtonTextActive,
                      ]}
                    >
                      남
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    activeOpacity={0.85}
                    style={[
                      styles.genderButton,
                      gender === 'female' && styles.genderButtonActive,
                    ]}
                    onPress={() => setGender('female')}
                  >
                    <Text
                      style={[
                        styles.genderButtonText,
                        gender === 'female' && styles.genderButtonTextActive,
                      ]}
                    >
                      여
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.section}>
                <Text style={styles.label}>나이</Text>
                <TextInput
                  style={styles.input}
                  placeholder="예: 35"
                  placeholderTextColor="#888"
                  keyboardType="numeric"
                  value={age}
                  onChangeText={setAge}
                  returnKeyType="next"
                  onFocus={createFocusHandler(220)}
                  onSubmitEditing={() => heightRef.current?.focus()}
                  blurOnSubmit={false}
                />
              </View>

              <View style={styles.section}>
                <Text style={styles.label}>키</Text>
                <TextInput
                  ref={heightRef}
                  style={styles.input}
                  placeholder="예: 170 (cm)"
                  placeholderTextColor="#888"
                  keyboardType="numeric"
                  value={height}
                  onChangeText={setHeight}
                  returnKeyType="next"
                  onFocus={createFocusHandler(320)}
                  onSubmitEditing={() => weightRef.current?.focus()}
                  blurOnSubmit={false}
                />
              </View>

              <View style={styles.section}>
                <Text style={styles.label}>몸무게</Text>
                <TextInput
                  ref={weightRef}
                  style={styles.input}
                  placeholder="예: 70 (kg)"
                  placeholderTextColor="#888"
                  keyboardType="numeric"
                  value={weight}
                  onChangeText={setWeight}
                  returnKeyType="done"
                  onFocus={createFocusHandler(420)}
                  onSubmitEditing={handleSubmit}
                />
              </View>

              <View style={styles.buttonWrap}>
                <PrimaryButton
                  label="다음"
                  onPress={handleSubmit}
                  disabled={!isFormValid}
                />
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </TouchableWithoutFeedback>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: ONBOARDING_SCREEN_BG },
  flex: { flex: 1 },
  container: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 96,
  },
  content: { width: '100%' },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 10,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
    color: 'rgba(255,255,255,0.88)',
    textAlign: 'center',
    marginBottom: 28,
    paddingHorizontal: 8,
  },
  section: { marginBottom: 16 },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 8,
  },
  genderRow: { flexDirection: 'row' },
  genderButton: {
    flex: 1,
    height: 52,
    borderRadius: 12,
    backgroundColor: '#1C1C1E',
    borderWidth: 1,
    borderColor: '#2F2F33',
    alignItems: 'center',
    justifyContent: 'center',
  },
  genderButtonLeft: { marginRight: 12 },
  genderButtonActive: {
    backgroundColor: '#fff',
    borderColor: '#fff',
  },
  genderButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#C8C8C8',
  },
  genderButtonTextActive: { color: '#111' },
  input: {
    backgroundColor: '#fff',
    height: 52,
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    color: '#111',
  },
  buttonWrap: { marginTop: 12 },
});