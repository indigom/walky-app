import { useEffect, useState } from 'react';
import {
  Image,
  StyleSheet,
  Text,
  View,
  type ImageStyle,
  type ViewStyle,
} from 'react-native';

import type { UserProfile } from '../types';
import { resolveProfilePhotoUri } from '../utils/profilePhotoProfile';

type Props = {
  user: UserProfile | null | undefined;
  size?: number;
  style?: ImageStyle;
  fallbackLabel?: string;
};

export function ProfilePhotoAvatar({
  user,
  size = 40,
  style,
  fallbackLabel,
}: Props) {
  const [uri, setUri] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void resolveProfilePhotoUri(user).then((resolved) => {
      if (!cancelled) setUri(resolved);
    });
    return () => {
      cancelled = true;
    };
  }, [
    user?.profilePhotoUri,
    user?.profilePhotoUrl,
    user?.profilePhotoSkipped,
  ]);

  const radius = size / 2;
  const label =
    fallbackLabel?.trim().charAt(0).toUpperCase() ||
    user?.nickname?.trim().charAt(0) ||
    '?';

  if (uri) {
    return (
      <Image
        source={{ uri }}
        style={[
          styles.photo,
          { width: size, height: size, borderRadius: radius },
          style,
        ]}
      />
    );
  }

  return (
    <View
      style={[
        styles.fallback,
        { width: size, height: size, borderRadius: radius },
        style,
      ]}
    >
      <Text style={[styles.fallbackText, { fontSize: size * 0.38 }]}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  photo: {
    backgroundColor: '#E5E7EB',
  },
  fallback: {
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fallbackText: {
    fontWeight: '800',
    color: '#92400E',
  },
});
