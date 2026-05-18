import { useRef } from 'react';
import {
  Animated,
  Image,
  Pressable,
  StyleSheet,
} from 'react-native';

type QuickActionType = 'feed';

type QuickActionButtonProps = {
  action: QuickActionType;
  onPress: () => void;
  accessibilityLabel?: string;
};

const actionIcons: Record<QuickActionType, any> = {
  feed: require('../assets/ui/feed.png'),
};

export function QuickActionButton({
  action,
  onPress,
  accessibilityLabel,
}: QuickActionButtonProps) {
  const scale = useRef(new Animated.Value(1)).current;

  function handlePressIn() {
    Animated.spring(scale, {
      toValue: 0.92,
      useNativeDriver: true,
      speed: 30,
      bounciness: 4,
    }).start();
  }

  function handlePressOut() {
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: true,
      speed: 20,
      bounciness: 6,
    }).start();
  }

  return (
    <Pressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
    >
      <Animated.View
        style={[
          styles.button,
          {
            transform: [{ scale }],
          },
        ]}
      >
        <Image source={actionIcons[action]} style={styles.icon} />
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.88)',
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  icon: {
    width: 26,
    height: 26,
    resizeMode: 'contain',
  },
});