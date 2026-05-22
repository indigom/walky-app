import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import type { NearbyChatSession } from '../types/nearbyWalkerSocial';
import { peerDisplayName } from '../utils/nearbyWalkerSocial';

type Props = {
  visible: boolean;
  session: NearbyChatSession | null;
  myUserId: string;
  onClose: () => void;
  onSend: (text: string) => Promise<boolean>;
  sending?: boolean;
};

function formatTime(ts: number): string {
  const d = new Date(ts);
  return `${d.getHours().toString().padStart(2, '0')}:${d
    .getMinutes()
    .toString()
    .padStart(2, '0')}`;
}

export function NearbyWalkerChatModal({
  visible,
  session,
  myUserId,
  onClose,
  onSend,
  sending = false,
}: Props) {
  const [draft, setDraft] = useState('');
  const listRef = useRef<FlatList>(null);

  useEffect(() => {
    if (!visible) setDraft('');
  }, [visible]);

  useEffect(() => {
    if (!visible || !session?.messages.length) return;
    requestAnimationFrame(() => {
      listRef.current?.scrollToEnd({ animated: true });
    });
  }, [visible, session?.messages.length, session?.sessionId]);

  if (!session) return null;

  const title = peerDisplayName(session);

  async function handleSend() {
    const text = draft.trim();
    if (!text || sending) return;
    const ok = await onSend(text);
    if (ok) setDraft('');
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.backdrop}>
          <View style={styles.sheet}>
            <View style={styles.header}>
              <View style={styles.headerText}>
                <Text style={styles.title}>{title}</Text>
                <Text style={styles.subtitle}>근처 산책 대화</Text>
              </View>
              <Pressable onPress={onClose} hitSlop={12}>
                <Text style={styles.close}>닫기</Text>
              </Pressable>
            </View>

            <FlatList
              ref={listRef}
              data={session.messages}
              keyExtractor={(item) => item.id}
              style={styles.list}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
              renderItem={({ item }) => {
                const mine = item.fromUserId === myUserId;
                return (
                  <View
                    style={[
                      styles.bubbleRow,
                      mine ? styles.bubbleRowMine : styles.bubbleRowPeer,
                    ]}
                  >
                    <View
                      style={[
                        styles.bubble,
                        mine ? styles.bubbleMine : styles.bubblePeer,
                      ]}
                    >
                      <Text
                        style={[
                          styles.bubbleText,
                          mine ? styles.bubbleTextMine : styles.bubbleTextPeer,
                        ]}
                      >
                        {item.text}
                      </Text>
                      <Text
                        style={[
                          styles.time,
                          mine ? styles.timeMine : styles.timePeer,
                        ]}
                      >
                        {formatTime(item.createdAt)}
                      </Text>
                    </View>
                  </View>
                );
              }}
              ListEmptyComponent={
                <View style={styles.emptyChat}>
                  <Text style={styles.emptyChatText}>
                    수락된 대화예요. 인사를 건네 보세요!
                  </Text>
                </View>
              }
            />

            <View style={styles.composer}>
              <TextInput
                style={styles.input}
                placeholder="메시지 입력"
                placeholderTextColor="#9CA3AF"
                value={draft}
                onChangeText={setDraft}
                multiline
                maxLength={400}
                editable={!sending}
              />
              <Pressable
                style={[
                  styles.sendBtn,
                  (!draft.trim() || sending) && styles.sendBtnDisabled,
                ]}
                onPress={() => void handleSend()}
                disabled={!draft.trim() || sending}
              >
                {sending ? (
                  <ActivityIndicator color="#111" size="small" />
                ) : (
                  <Text style={styles.sendLabel}>전송</Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  sheet: {
    height: '78%',
    backgroundColor: '#fff',
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  headerText: { flex: 1, marginRight: 12 },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111',
  },
  subtitle: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 4,
  },
  close: {
    fontSize: 15,
    fontWeight: '700',
    color: '#F59E0B',
  },
  list: { flex: 1 },
  listContent: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexGrow: 1,
  },
  bubbleRow: {
    marginBottom: 10,
    flexDirection: 'row',
  },
  bubbleRowMine: { justifyContent: 'flex-end' },
  bubbleRowPeer: { justifyContent: 'flex-start' },
  bubble: {
    maxWidth: '82%',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  bubbleMine: {
    backgroundColor: '#F59E0B',
    borderBottomRightRadius: 4,
  },
  bubblePeer: {
    backgroundColor: '#F3F4F6',
    borderBottomLeftRadius: 4,
  },
  bubbleText: {
    fontSize: 15,
    lineHeight: 21,
  },
  bubbleTextMine: { color: '#111' },
  bubbleTextPeer: { color: '#111' },
  time: {
    fontSize: 10,
    marginTop: 6,
  },
  timeMine: { color: 'rgba(17,17,17,0.55)', textAlign: 'right' },
  timePeer: { color: '#9CA3AF' },
  emptyChat: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 48,
  },
  emptyChatText: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
  },
  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    paddingBottom: Platform.OS === 'ios' ? 24 : 12,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  input: {
    flex: 1,
    minHeight: 42,
    maxHeight: 100,
    borderRadius: 14,
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    color: '#111',
  },
  sendBtn: {
    height: 42,
    paddingHorizontal: 16,
    borderRadius: 14,
    backgroundColor: '#F59E0B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: { opacity: 0.45 },
  sendLabel: {
    fontSize: 14,
    fontWeight: '800',
    color: '#111',
  },
});
