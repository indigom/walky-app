import { useCallback, useRef, type RefObject } from 'react';
import {
  type LayoutChangeEvent,
  Platform,
  type ScrollView,
} from 'react-native';

export function useScrollToField(scrollRef: RefObject<ScrollView | null>) {
  const offsetsRef = useRef<Record<string, number>>({});

  const register = useCallback(
    (key: string) => (event: LayoutChangeEvent) => {
      offsetsRef.current[key] = event.nativeEvent.layout.y;
    },
    []
  );

  const focus = useCallback(
    (key: string) => () => {
      const y = offsetsRef.current[key] ?? 0;
      const delay = Platform.OS === 'android' ? 320 : 140;

      setTimeout(() => {
        scrollRef.current?.scrollTo({
          y: Math.max(0, y - 32),
          animated: true,
        });
      }, delay);
    },
    [scrollRef]
  );

  return { register, focus };
}
