import { Platform } from 'react-native';

/** Android는 app.json resize로 창 높이 조절 — KAV padding과 겹치면 버튼이 입력란을 가림 */
export const USE_KEYBOARD_AVOIDING_VIEW = Platform.OS === 'ios';

export const KEYBOARD_AVOIDING_BEHAVIOR = 'padding' as const;

export function keyboardVerticalOffset(topInset: number, headerRows = 0): number {
  return topInset + headerRows * 44;
}

/** ScrollView 하단 여백 — Android만 키보드 높이 반영 (iOS는 KAV가 처리) */
export function scrollPaddingBottom(
  keyboardInset: number,
  base = 32
): number {
  return base + (Platform.OS === 'android' ? keyboardInset : 0);
}
