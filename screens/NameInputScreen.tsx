import { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PrimaryButton } from '../components/PrimaryButton';

type Props = {
  onSubmit: (name: string) => void;
};

export function NameInputScreen({ onSubmit }: Props) {
  const [name, setName] = useState('');

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>이름을 지어주세요</Text>

        <TextInput
          style={styles.input}
          placeholder="예: 몽이"
          value={name}
          onChangeText={setName}
        />

        <PrimaryButton
          label="시작하기"
          onPress={() => {
            if (name.trim().length === 0) return;
            onSubmit(name.trim());
          }}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
  },
  content: {
    padding: 24,
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
  },
});