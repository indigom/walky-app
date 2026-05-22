import type { NearbyWalkerGender } from './nearbyWalker';

export type NearbyKnockStatus =
  | 'pending'
  | 'accepted'
  | 'declined'
  | 'expired';

export type NearbyKnock = {
  knockId: string;
  fromUserId: string;
  toUserId: string;
  fromDogName: string;
  fromNickname?: string;
  fromGender: NearbyWalkerGender;
  status: NearbyKnockStatus;
  createdAt: number;
};

export type NearbyChatMessage = {
  id: string;
  fromUserId: string;
  text: string;
  createdAt: number;
};

export type NearbyChatSession = {
  sessionId: string;
  peerUserId: string;
  peerDogName: string;
  peerNickname?: string;
  messages: NearbyChatMessage[];
  updatedAt: number;
};

export type NearbySocialPollResult = {
  ok: boolean;
  incomingKnocks: NearbyKnock[];
  outgoingKnock: NearbyKnock | null;
  sessions: NearbyChatSession[];
};
