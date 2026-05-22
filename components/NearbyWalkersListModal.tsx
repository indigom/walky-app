import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { NEARBY_WALKER_RADIUS_M } from '../constants/nearbyWalkerApi';
import type { NearbyWalkerEntry } from '../types/nearbyWalker';
import type { UserProfile } from '../types';
import { ProfilePhotoAvatar } from './ProfilePhotoAvatar';

type Props = {
  visible: boolean;
  walkers: NearbyWalkerEntry[];
  onClose: () => void;
  onKnock?: (walker: NearbyWalkerEntry) => void;
  knockingUserId?: string | null;
  waitingKnockUserId?: string | null;
  chattingPeerIds?: string[];
  onOpenChat?: (peerUserId: string) => void;
  myProfile?: UserProfile | null;
};

function genderLabel(gender: NearbyWalkerEntry['gender']): string {
  return gender === 'male' ? '남' : '여';
}

function displayName(entry: NearbyWalkerEntry): string {
  if (entry.nickname) {
    return `${entry.nickname} · ${entry.dogName}`;
  }
  return entry.dogName;
}

export function NearbyWalkersListModal({
  visible,
  walkers,
  onClose,
  onKnock,
  knockingUserId = null,
  waitingKnockUserId = null,
  chattingPeerIds = [],
  onOpenChat,
  myProfile,
}: Props) {
  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <Pressable style={styles.backdropTap} onPress={onClose} />

        <View style={styles.sheet}>
          <View style={styles.handle} />

          <View style={styles.header}>
            <View style={styles.headerTop}>
              <ProfilePhotoAvatar
                user={myProfile}
                size={44}
                fallbackLabel={myProfile?.nickname}
              />
              <View style={styles.headerTitles}>
                <Text style={styles.title}>근처 산책 중인 회원</Text>
                <Text style={styles.subtitle}>
                  {NEARBY_WALKER_RADIUS_M}m 이내 · 이성만 표시
                </Text>
              </View>
            </View>
            <Pressable onPress={onClose} hitSlop={12}>
              <Text style={styles.close}>닫기</Text>
            </Pressable>
          </View>

          {walkers.length === 0 ? (
            <View style={styles.empty}>
              <Text style={styles.emptyText}>
                지금은 근처에 산책 중인 회원이 없어요.
              </Text>
              <Text style={styles.emptyHint}>
                다른 walky 사용자가 같은 구역에서 산책하면 여기에
                나타납니다.
              </Text>
            </View>
          ) : (
            <FlatList
              data={walkers}
              keyExtractor={(item) => item.userId}
              style={styles.list}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
              renderItem={({ item }) => {
                const isChatting = chattingPeerIds.includes(item.userId);
                const isKnocking = knockingUserId === item.userId;
                const isWaiting =
                  waitingKnockUserId === item.userId && !isChatting;

                return (
                  <View style={styles.row}>
                    <ProfilePhotoAvatar
                      user={{
                        nickname: item.nickname,
                        profilePhotoUrl: item.profilePhotoUrl,
                        profilePhotoSkipped: !item.profilePhotoUrl,
                      }}
                      size={44}
                      fallbackLabel={item.nickname ?? item.dogName}
                    />
                    <View style={styles.rowMain}>
                      <Text style={styles.rowName}>{displayName(item)}</Text>
                      <View style={styles.badge}>
                        <Text style={styles.badgeText}>
                          {genderLabel(item.gender)}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.rowRight}>
                      <Text style={styles.rowDistance}>{item.distanceM}m</Text>
                      {isChatting ? (
                        <Pressable
                          style={styles.chatBtn}
                          onPress={() => onOpenChat?.(item.userId)}
                        >
                          <Text style={styles.chatBtnText}>대화</Text>
                        </Pressable>
                      ) : isWaiting ? (
                        <View style={styles.waitBtn}>
                          <Text style={styles.waitBtnText}>대기</Text>
                        </View>
                      ) : onKnock ? (
                        <Pressable
                          style={[
                            styles.knockBtn,
                            isKnocking && styles.knockBtnBusy,
                          ]}
                          onPress={() => onKnock(item)}
                          disabled={isKnocking}
                        >
                          {isKnocking ? (
                            <ActivityIndicator size="small" color="#111" />
                          ) : (
                            <Text style={styles.knockBtnText}>노크</Text>
                          )}
                        </Pressable>
                      ) : null}
                    </View>
                  </View>
                );
              }}
            />
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  backdropTap: {
    flex: 1,
  },
  sheet: {
    maxHeight: '72%',
    backgroundColor: '#fff',
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingBottom: 28,
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#D1D5DB',
    marginTop: 10,
    marginBottom: 8,
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 10,
  },
  headerTitles: {
    flex: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    color: '#6B7280',
  },
  close: {
    fontSize: 15,
    fontWeight: '700',
    color: '#F59E0B',
    alignSelf: 'flex-end',
  },
  list: {
    flexGrow: 0,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  rowMain: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginRight: 12,
  },
  rowName: {
    flexShrink: 1,
    fontSize: 16,
    fontWeight: '700',
    color: '#111',
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    backgroundColor: '#FEF3C7',
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#92400E',
  },
  rowRight: {
    alignItems: 'flex-end',
    gap: 8,
  },
  rowDistance: {
    fontSize: 15,
    fontWeight: '800',
    color: '#F59E0B',
  },
  knockBtn: {
    minWidth: 52,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  knockBtnBusy: {
    opacity: 0.7,
  },
  knockBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#92400E',
  },
  waitBtn: {
    minWidth: 52,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  waitBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#6B7280',
  },
  chatBtn: {
    minWidth: 52,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#F59E0B',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  chatBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#111',
  },
  empty: {
    paddingHorizontal: 24,
    paddingVertical: 36,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#374151',
    textAlign: 'center',
    marginBottom: 8,
  },
  emptyHint: {
    fontSize: 13,
    lineHeight: 19,
    color: '#9CA3AF',
    textAlign: 'center',
  },
});
