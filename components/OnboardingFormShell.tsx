import type { ReactNode, RefObject } from 'react';
import {
  Keyboard,
  KeyboardAvoidingView,
  ScrollView,
  StyleSheet,
  TouchableWithoutFeedback,
  View,
  type ScrollViewProps,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  KEYBOARD_AVOIDING_BEHAVIOR,
  keyboardVerticalOffset,
  scrollPaddingBottom,
  USE_KEYBOARD_AVOIDING_VIEW,
} from '../constants/keyboardForm';
import { useKeyboardInset } from '../utils/useKeyboardInset';

type Props = {
  scrollRef?: RefObject<ScrollView | null>;
  headerRows?: number;
  children: ReactNode;
  contentContainerStyle?: ScrollViewProps['contentContainerStyle'];
};

export function OnboardingFormShell({
  scrollRef,
  headerRows = 0,
  children,
  contentContainerStyle,
}: Props) {
  const insets = useSafeAreaInsets();
  const keyboardInset = useKeyboardInset();

  const scroll = (
    <ScrollView
      ref={scrollRef}
      style={styles.scroll}
      contentContainerStyle={[
        styles.scrollContent,
        { paddingBottom: scrollPaddingBottom(keyboardInset) },
        contentContainerStyle,
      ]}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      showsVerticalScrollIndicator={false}
    >
      {children}
    </ScrollView>
  );

  const body = USE_KEYBOARD_AVOIDING_VIEW ? (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={KEYBOARD_AVOIDING_BEHAVIOR}
      keyboardVerticalOffset={keyboardVerticalOffset(insets.top, headerRows)}
    >
      {scroll}
    </KeyboardAvoidingView>
  ) : (
    <View style={styles.flex}>{scroll}</View>
  );

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      {body}
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 16,
  },
});
