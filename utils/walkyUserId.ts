import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'walky_anonymous_user_id';

export async function getWalkyUserId(): Promise<string> {
  const existing = await AsyncStorage.getItem(STORAGE_KEY);
  if (existing) return existing;

  const id = `w_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 11)}`;
  await AsyncStorage.setItem(STORAGE_KEY, id);
  return id;
}
