import { useState } from 'react';
import {
  Keyboard,
  StyleSheet,
  Text,
  TextInput,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { OnboardingBackButton } from '../components/OnboardingBackButton';
import { PrimaryButton } from '../components/PrimaryButton';

type Props = {
  onSubmit: (name: string) => void;
  onBack?: () => void;
};

export function NameInputScreen({ onSubmit, onBack }: Props) {
  const [name, setName] = useState('');

  return (
    <SafeAreaView style={styles.safeArea}>
      {onBack ? (
        <View style={styles.backRow}>
          <OnboardingBackButton onPress={onBack} />
        </View>
      ) : null}
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={styles.container}>
          <Text style={styles.title}>이름을 지어주세요</Text>

          <TextInput
            style={styles.input}
            placeholder="예: 몽이"
            placeholderTextColor="#888"
            value={name}
            onChangeText={setName}
            returnKeyType="done"
            onSubmitEditing={() => {
              if (name.trim().length > 0) {
                onSubmit(name.trim());
              }
            }}
          />

          <PrimaryButton
            label="시작하기"
            onPress={() => {
              if (name.trim().length === 0) return;
              onSubmit(name.trim());
            }}
          />
        </View>
      </TouchableWithoutFeedback>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#000',
  },
  backRow: {
    paddingHorizontal: 24,
    paddingTop: 4,
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  title: {
    fontSize: 28,
    color: '#fff',
    marginBottom: 20,
    textAlign: 'center',
  },
  input: {
    height: 50,
    borderRadius: 12,
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    marginBottom: 20,
    fontSize: 16,
    color: '#111',
  },
});
