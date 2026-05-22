import type { UserProfile } from './index';

export type NearbyWalkerGender = NonNullable<UserProfile['gender']>;

export type NearbyWalkerEntry = {
  userId: string;
  dogName: string;
  nickname?: string;
  profilePhotoUrl?: string;
  gender: NearbyWalkerGender;
  distanceM: number;
};

export type NearbyWalkerPresenceResult = {
  ok: boolean;
  nearbyWalkers: NearbyWalkerEntry[];
  nearbyOppositeCount: number;
  notifySelf: boolean;
};
