import { Platform } from 'react-native';

import {
  NEARBY_SOCIAL_API_URL,
  NEARBY_WALKER_RADIUS_M,
} from '../constants/nearbyWalkerApi';
import type { UserProfile } from '../types';
import type {
  NearbyChatMessage,
  NearbyChatSession,
  NearbyKnock,
  NearbySocialPollResult,
} from '../types/nearbyWalkerSocial';
import { getWalkyUserId } from './walkyUserId';

type SocialPostResult<T> = {
  data: T | null;
  status: number;
  error?: string;
};

async function postSocial<T extends Record<string, unknown>>(
  body: Record<string, unknown>
): Promise<SocialPostResult<T>> {
  if (!NEARBY_SOCIAL_API_URL || Platform.OS === 'web') {
    return { data: null, status: 0 };
  }

  try {
    const res = await fetch(NEARBY_SOCIAL_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    const json = (await res.json().catch(() => ({}))) as T & {
      error?: string;
    };

    if (!res.ok) {
      return {
        data: null,
        status: res.status,
        error: typeof json.error === 'string' ? json.error : undefined,
      };
    }

    return { data: json, status: res.status };
  } catch {
    return { data: null, status: 0 };
  }
}

function parseKnock(raw: unknown): NearbyKnock | null {
  if (!raw || typeof raw !== 'object') return null;
  const row = raw as Record<string, unknown>;
  const status = row.status;
  if (
    status !== 'pending' &&
    status !== 'accepted' &&
    status !== 'declined' &&
    status !== 'expired'
  ) {
    return null;
  }
  const fromGender = row.fromGender;
  if (fromGender !== 'male' && fromGender !== 'female') return null;
  if (typeof row.knockId !== 'string' || typeof row.fromUserId !== 'string') {
    return null;
  }
  if (typeof row.toUserId !== 'string' || typeof row.createdAt !== 'number') {
    return null;
  }

  return {
    knockId: row.knockId,
    fromUserId: row.fromUserId,
    toUserId: row.toUserId,
    fromDogName:
      typeof row.fromDogName === 'string' && row.fromDogName.trim()
        ? row.fromDogName.trim()
        : '강아지',
    fromNickname:
      typeof row.fromNickname === 'string' && row.fromNickname.trim()
        ? row.fromNickname.trim()
        : undefined,
    fromGender,
    status,
    createdAt: row.createdAt,
  };
}

function parseMessage(raw: unknown): NearbyChatMessage | null {
  if (!raw || typeof raw !== 'object') return null;
  const row = raw as Record<string, unknown>;
  if (
    typeof row.id !== 'string' ||
    typeof row.fromUserId !== 'string' ||
    typeof row.text !== 'string' ||
    typeof row.createdAt !== 'number'
  ) {
    return null;
  }
  return {
    id: row.id,
    fromUserId: row.fromUserId,
    text: row.text,
    createdAt: row.createdAt,
  };
}

function parseSession(raw: unknown): NearbyChatSession | null {
  if (!raw || typeof raw !== 'object') return null;
  const row = raw as Record<string, unknown>;
  if (typeof row.sessionId !== 'string' || typeof row.peerUserId !== 'string') {
    return null;
  }

  const messages: NearbyChatMessage[] = [];
  if (Array.isArray(row.messages)) {
    for (const m of row.messages) {
      const parsed = parseMessage(m);
      if (parsed) messages.push(parsed);
    }
  }

  return {
    sessionId: row.sessionId,
    peerUserId: row.peerUserId,
    peerDogName:
      typeof row.peerDogName === 'string' && row.peerDogName.trim()
        ? row.peerDogName.trim()
        : '강아지',
    peerNickname:
      typeof row.peerNickname === 'string' && row.peerNickname.trim()
        ? row.peerNickname.trim()
        : undefined,
    messages,
    updatedAt:
      typeof row.updatedAt === 'number' ? row.updatedAt : Date.now(),
  };
}

export async function pollNearbySocial(
  sinceMessageAt = 0
): Promise<NearbySocialPollResult | null> {
  const userId = await getWalkyUserId();
  const { data } = await postSocial<Record<string, unknown>>({
    action: 'poll',
    userId,
    since: sinceMessageAt,
  });
  if (!data || data.ok !== true) return null;

  const incomingKnocks: NearbyKnock[] = [];
  if (Array.isArray(data.incomingKnocks)) {
    for (const k of data.incomingKnocks) {
      const parsed = parseKnock(k);
      if (parsed) incomingKnocks.push(parsed);
    }
  }

  const sessions: NearbyChatSession[] = [];
  if (Array.isArray(data.sessions)) {
    for (const s of data.sessions) {
      const parsed = parseSession(s);
      if (parsed) sessions.push(parsed);
    }
  }

  return {
    ok: true,
    incomingKnocks,
    outgoingKnock: parseKnock(data.outgoingKnock),
    sessions,
  };
}

export async function knockNearbyWalker(
  user: UserProfile | null | undefined,
  toUserId: string,
  dogName: string
): Promise<{ knock: NearbyKnock | null; error?: string }> {
  if (!user?.gender) return { knock: null };

  const fromUserId = await getWalkyUserId();
  const { data, error, status } = await postSocial<Record<string, unknown>>({
    action: 'knock',
    fromUserId,
    toUserId,
    fromGender: user.gender,
    fromDogName: dogName,
    fromNickname: user.nickname,
    radiusM: NEARBY_WALKER_RADIUS_M,
  });

  if (data?.ok === true) {
    return { knock: parseKnock(data.knock) };
  }

  if (status === 409) {
    return { knock: null, error: 'not_nearby' };
  }

  return { knock: null, error: error ?? 'unknown' };
}

export async function respondNearbyKnock(
  knockId: string,
  accept: boolean
): Promise<{ knock: NearbyKnock | null; session: NearbyChatSession | null }> {
  const userId = await getWalkyUserId();
  const { data } = await postSocial<Record<string, unknown>>({
    action: 'respondKnock',
    userId,
    knockId,
    accept,
  });

  return {
    knock: data?.ok === true ? parseKnock(data.knock) : null,
    session: data?.ok === true ? parseSession(data.session) : null,
  };
}

export async function sendNearbyChatMessage(
  sessionId: string,
  text: string
): Promise<NearbyChatMessage | null> {
  const userId = await getWalkyUserId();
  const trimmed = text.trim();
  if (!trimmed) return null;

  const { data } = await postSocial<Record<string, unknown>>({
    action: 'sendMessage',
    userId,
    sessionId,
    text: trimmed,
  });

  return data?.ok === true ? parseMessage(data.message) : null;
}

export async function leaveNearbySocial(): Promise<void> {
  const userId = await getWalkyUserId();
  await postSocial({ action: 'leave', userId }).then(() => undefined);
}

export function mergeSessionMessages(
  prev: NearbyChatSession | null,
  incoming: NearbyChatSession
): NearbyChatSession {
  if (!prev || prev.sessionId !== incoming.sessionId) {
    return {
      ...incoming,
      messages: [...incoming.messages].sort(
        (a, b) => a.createdAt - b.createdAt
      ),
    };
  }

  const byId = new Map<string, NearbyChatMessage>();
  for (const m of prev.messages) byId.set(m.id, m);
  for (const m of incoming.messages) byId.set(m.id, m);

  const messages = [...byId.values()].sort((a, b) => a.createdAt - b.createdAt);

  return {
    ...incoming,
    messages,
    peerDogName: incoming.peerDogName || prev.peerDogName,
    peerNickname: incoming.peerNickname ?? prev.peerNickname,
  };
}

export function peerDisplayName(session: NearbyChatSession): string {
  if (session.peerNickname) {
    return `${session.peerNickname} · ${session.peerDogName}`;
  }
  return session.peerDogName;
}

export function knockFromDisplayName(knock: NearbyKnock): string {
  if (knock.fromNickname) {
    return `${knock.fromNickname} · ${knock.fromDogName}`;
  }
  return knock.fromDogName;
}
