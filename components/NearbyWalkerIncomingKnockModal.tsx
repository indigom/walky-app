import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { PrimaryButton } from './PrimaryButton';
import type { NearbyKnock } from '../types/nearbyWalkerSocial';
import { knockFromDisplayName } from '../utils/nearbyWalkerSocial';

type Props = {
  visible: boolean;
  knock: NearbyKnock | null;
  onAccept: () => void;
  onDecline: () => void;
  busy?: boolean;
};

export function NearbyWalkerIncomingKnockModal({
  visible,
  knock,
  onAccept,
  onDecline,
  busy = false,
}: Props) {
  if (!knock) return null;

  const name = knockFromDisplayName(knock);

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      onRequestClose={onDecline}
    >
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={styles.emoji}>🚪</Text>
          <Text style={styles.title}>노크가 왔어요</Text>
          <Text style={styles.body}>
            {name} 님이 산책 중 대화를 요청했어요.{'\n'}
            수락하면 메시지를 주고받을 수 있어요.
          </Text>

          <View style={styles.actions}>
            <View style={styles.actionBtn}>
              <PrimaryButton
                label="수락"
                onPress={onAccept}
                loading={busy}
                disabled={busy}
              />
            </View>
            <View style={styles.actionGap} />
            <Pressable
              onPress={onDecline}
              disabled={busy}
              style={styles.declineWrap}
            >
              <Text style={styles.decline}>거절</Text>
            </Pressable>
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
    paddingHorizontal: 28,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 20,
    paddingHorizontal: 24,
    paddingVertical: 28,
    alignItems: 'center',
  },
  emoji: {
    fontSize: 36,
    marginBottom: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: '#111',
    marginBottom: 10,
  },
  body: {
    fontSize: 15,
    lineHeight: 22,
    color: '#4B5563',
    textAlign: 'center',
    marginBottom: 22,
  },
  actions: {
    width: '100%',
    alignItems: 'center',
  },
  actionBtn: {
    width: '100%',
  },
  actionGap: {
    height: 12,
  },
  declineWrap: {
    paddingVertical: 8,
  },
  decline: {
    fontSize: 15,
    fontWeight: '700',
    color: '#6B7280',
  },
});
