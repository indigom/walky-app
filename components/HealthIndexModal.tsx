import { Modal, StyleSheet, Text, View } from 'react-native';

import { PrimaryButton } from './PrimaryButton';
import { healthIndexModalAdvice } from '../utils/userHealthIndex';

type Props = {
  visible: boolean;
  score: number;
  onClose: () => void;
};

export function HealthIndexModal({ visible, score, onClose }: Props) {
  const advice = healthIndexModalAdvice(score);

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={styles.title}>현재 건강지수</Text>
          <Text style={styles.scoreLine}>
            현재 건강지수는{' '}
            <Text style={styles.scoreValue}>{score}</Text>
            입니다
          </Text>
          <Text style={styles.advice}>{advice}</Text>
          <View style={styles.action}>
            <PrimaryButton label="확인" onPress={onClose} />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    paddingHorizontal: 36,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 18,
    paddingHorizontal: 22,
    paddingVertical: 24,
    alignItems: 'center',
  },
  title: {
    fontSize: 17,
    fontWeight: '800',
    color: '#111',
    marginBottom: 12,
  },
  scoreLine: {
    fontSize: 15,
    lineHeight: 22,
    color: '#374151',
    textAlign: 'center',
    marginBottom: 10,
  },
  scoreValue: {
    fontWeight: '800',
    color: '#111',
  },
  advice: {
    fontSize: 14,
    lineHeight: 21,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 20,
  },
  action: {
    width: '100%',
  },
});
