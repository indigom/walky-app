import { StyleSheet, Text, View } from 'react-native';

export function DogAvatarPlaceholder() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Dog Avatar</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: 180,
    height: 180,
    borderRadius: 90,
    borderWidth: 2,
    borderColor: '#CBD5E1',
    borderStyle: 'dashed',
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 28,
  },
  text: {
    color: '#64748B',
    fontSize: 16,
    fontWeight: '600',
  },
});
