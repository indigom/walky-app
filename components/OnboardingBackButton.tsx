import { Pressable, StyleSheet, Text } from 'react-native';

type Props = {
  onPress: () => void;
  label?: string;
  /** 밝은 배경(견종 선택) vs 어두운/컬러 배경 */
  tone?: 'light' | 'dark';
};

export function OnboardingBackButton({
  onPress,
  label = '이전',
  tone = 'dark',
}: Props) {
  return (
    <Pressable
      onPress={onPress}
      style={styles.wrap}
      hitSlop={12}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <Text style={[styles.text, tone === 'light' && styles.textLight]}>
        ← {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignSelf: 'flex-start',
    paddingVertical: 8,
    paddingRight: 12,
  },
  text: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  textLight: {
    color: '#2B211C',
  },
});
