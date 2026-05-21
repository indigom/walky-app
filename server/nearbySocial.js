/**
 * 근처 이성 산책자: 노크 → 수락 시 1:1 대화 (인메모리, 단일 Node 프로세스).
 */

const {
  getPresence,
  isOppositeGenderNearby,
  cleanupStalePresences,
} = require('./nearbyPresence');

const DEFAULT_RADIUS_M = 50;

const KNOCK_TTL_MS = 3 * 60 * 1000;
const SESSION_TTL_MS = 45 * 60 * 1000;
const MAX_MESSAGES_PER_SESSION = 200;
const MAX_MESSAGE_LEN = 400;

const state = {
  knocks: new Map(),
  sessions: new Map(),
};

function sessionIdFor(userA, userB) {
  return [userA, userB].sort().join(':');
}

function cleanup(now) {
  cleanupStalePresences(now);

  for (const [id, knock] of state.knocks) {
    if (
      knock.status === 'pending' &&
      now - knock.createdAt > KNOCK_TTL_MS
    ) {
      knock.status = 'expired';
    }
    if (now - knock.updatedAt > KNOCK_TTL_MS * 2) {
      state.knocks.delete(id);
    }
  }

  for (const [id, session] of state.sessions) {
    if (now - session.updatedAt > SESSION_TTL_MS) {
      state.sessions.delete(id);
    }
  }
}

async function sendExpoPush(pushToken, title, body) {
  if (!pushToken) return;
  try {
    await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        to: pushToken,
        title,
        body,
        sound: 'default',
        priority: 'high',
      }),
    });
  } catch {
    // noop
  }
}

function peerLabel(presence, fallback = '산책자') {
  const nick =
    typeof presence?.nickname === 'string' && presence.nickname.trim()
      ? presence.nickname.trim()
      : null;
  const dog =
    typeof presence?.dogName === 'string' && presence.dogName.trim()
      ? presence.dogName.trim()
      : fallback;
  return nick ? `${nick} · ${dog}` : dog;
}

function formatKnock(knock) {
  return {
    knockId: knock.id,
    fromUserId: knock.fromUserId,
    toUserId: knock.toUserId,
    fromDogName: knock.fromDogName,
    fromNickname: knock.fromNickname,
    fromGender: knock.fromGender,
    status: knock.status,
    createdAt: knock.createdAt,
  };
}

function formatSession(session, viewerUserId) {
  const peerUserId =
    session.userIds[0] === viewerUserId
      ? session.userIds[1]
      : session.userIds[0];
  const peerPresence = getPresence(peerUserId);

  return {
    sessionId: session.id,
    peerUserId,
    peerDogName: peerPresence?.dogName?.trim() || session.peerDogName || '강아지',
    peerNickname:
      typeof peerPresence?.nickname === 'string'
        ? peerPresence.nickname.trim() || undefined
        : session.peerNickname,
    messages: session.messages.map((m) => ({
      id: m.id,
      fromUserId: m.fromUserId,
      text: m.text,
      createdAt: m.createdAt,
    })),
    updatedAt: session.updatedAt,
  };
}

function findPendingKnockToUser(toUserId) {
  const list = [];
  for (const knock of state.knocks.values()) {
    if (knock.toUserId === toUserId && knock.status === 'pending') {
      list.push(formatKnock(knock));
    }
  }
  list.sort((a, b) => b.createdAt - a.createdAt);
  return list;
}

function findOutgoingKnock(fromUserId) {
  for (const knock of state.knocks.values()) {
    if (knock.fromUserId === fromUserId && knock.status === 'pending') {
      return formatKnock(knock);
    }
    if (
      knock.fromUserId === fromUserId &&
      (knock.status === 'accepted' || knock.status === 'declined')
    ) {
      const recent = Date.now() - knock.updatedAt < 8000;
      if (recent) return formatKnock(knock);
    }
  }
  return null;
}

function activeSessionsFor(userId) {
  const list = [];
  for (const session of state.sessions.values()) {
    if (!session.userIds.includes(userId)) continue;
    list.push(formatSession(session, userId));
  }
  list.sort((a, b) => b.updatedAt - a.updatedAt);
  return list;
}

function handlePoll(body, now) {
  const userId = body.userId;
  if (typeof userId !== 'string') {
    return { status: 400, error: 'Invalid userId' };
  }

  const since =
    typeof body.since === 'number' && body.since > 0 ? body.since : 0;

  const sessions = activeSessionsFor(userId).map((s) => ({
    ...s,
    messages: s.messages.filter((m) => m.createdAt > since),
  }));

  return {
    status: 200,
    json: {
      ok: true,
      incomingKnocks: findPendingKnockToUser(userId),
      outgoingKnock: findOutgoingKnock(userId),
      sessions,
    },
  };
}

async function handleKnock(body, now) {
  const fromUserId = body.fromUserId;
  const toUserId = body.toUserId;

  if (typeof fromUserId !== 'string' || typeof toUserId !== 'string') {
    return { status: 400, error: 'Invalid user ids' };
  }
  if (fromUserId === toUserId) {
    return { status: 400, error: 'Cannot knock yourself' };
  }

  const radiusM =
    typeof body.radiusM === 'number' && body.radiusM > 0
      ? body.radiusM
      : DEFAULT_RADIUS_M;

  if (!isOppositeGenderNearby(fromUserId, toUserId, radiusM)) {
    return { status: 409, error: 'Not nearby' };
  }

  for (const knock of state.knocks.values()) {
    if (
      knock.fromUserId === fromUserId &&
      knock.toUserId === toUserId &&
      knock.status === 'pending'
    ) {
      return {
        status: 200,
        json: { ok: true, knock: formatKnock(knock) },
      };
    }
  }

  const fromPresence = getPresence(fromUserId);
  const fromGender = body.fromGender ?? fromPresence?.gender;
  if (fromGender !== 'male' && fromGender !== 'female') {
    return { status: 400, error: 'Invalid gender' };
  }

  const knockId = `knock-${fromUserId}-${toUserId}-${now}`;
  const knock = {
    id: knockId,
    fromUserId,
    toUserId,
    fromDogName:
      typeof body.fromDogName === 'string' ? body.fromDogName : '강아지',
    fromNickname:
      typeof body.fromNickname === 'string' ? body.fromNickname : undefined,
    fromGender,
    status: 'pending',
    createdAt: now,
    updatedAt: now,
  };

  state.knocks.set(knockId, knock);

  const toPresence = getPresence(toUserId);
  const fromLabel = peerLabel(fromPresence, knock.fromDogName);
  if (toPresence?.pushToken) {
    await sendExpoPush(
      toPresence.pushToken,
      '산책 중 노크',
      `${fromLabel} 님이 대화를 요청했어요. 수락할까요?`
    );
  }

  return {
    status: 200,
    json: { ok: true, knock: formatKnock(knock) },
  };
}

async function handleRespondKnock(body, now) {
  const userId = body.userId;
  const knockId = body.knockId;
  const accept = body.accept === true;

  if (typeof userId !== 'string' || typeof knockId !== 'string') {
    return { status: 400, error: 'Invalid payload' };
  }

  const knock = state.knocks.get(knockId);
  if (!knock || knock.toUserId !== userId) {
    return { status: 404, error: 'Knock not found' };
  }
  if (knock.status !== 'pending') {
    return { status: 409, error: 'Knock already handled' };
  }

  knock.updatedAt = now;

  if (!accept) {
    knock.status = 'declined';
    const fromPresence = getPresence(knock.fromUserId);
    if (fromPresence?.pushToken) {
      await sendExpoPush(
        fromPresence.pushToken,
        '노크 거절',
        '상대방이 대화 요청을 거절했어요.'
      );
    }
    return {
      status: 200,
      json: { ok: true, knock: formatKnock(knock), session: null },
    };
  }

  if (
    !isOppositeGenderNearby(knock.fromUserId, knock.toUserId, DEFAULT_RADIUS_M)
  ) {
    knock.status = 'expired';
    return { status: 409, error: 'Not nearby anymore' };
  }

  knock.status = 'accepted';

  const sid = sessionIdFor(knock.fromUserId, knock.toUserId);
  let session = state.sessions.get(sid);
  if (!session) {
    const toPresence = getPresence(knock.toUserId);
    session = {
      id: sid,
      userIds: [knock.fromUserId, knock.toUserId],
      messages: [],
      peerDogName: knock.fromDogName,
      peerNickname: knock.fromNickname,
      createdAt: now,
      updatedAt: now,
    };
    state.sessions.set(sid, session);
  } else {
    session.updatedAt = now;
  }

  const fromPresence = getPresence(knock.fromUserId);
  const toPresence = getPresence(knock.toUserId);
  const acceptLabel = peerLabel(toPresence, '산책자');

  if (fromPresence?.pushToken) {
    await sendExpoPush(
      fromPresence.pushToken,
      '노크 수락',
      `${acceptLabel} 님이 대화를 수락했어요!`
    );
  }

  return {
    status: 200,
    json: {
      ok: true,
      knock: formatKnock(knock),
      session: formatSession(session, userId),
    },
  };
}

function handleSendMessage(body, now) {
  const userId = body.userId;
  const sessionId = body.sessionId;
  const text =
    typeof body.text === 'string' ? body.text.trim().slice(0, MAX_MESSAGE_LEN) : '';

  if (typeof userId !== 'string' || typeof sessionId !== 'string' || !text) {
    return { status: 400, error: 'Invalid message' };
  }

  const session = state.sessions.get(sessionId);
  if (!session || !session.userIds.includes(userId)) {
    return { status: 404, error: 'Session not found' };
  }

  const peerUserId = session.userIds.find((id) => id !== userId);
  if (
    peerUserId &&
    !isOppositeGenderNearby(userId, peerUserId, DEFAULT_RADIUS_M)
  ) {
    return { status: 409, error: 'Peer not nearby' };
  }

  const message = {
    id: `msg-${sessionId}-${now}-${Math.random().toString(36).slice(2, 8)}`,
    fromUserId: userId,
    text,
    createdAt: now,
  };

  session.messages.push(message);
  if (session.messages.length > MAX_MESSAGES_PER_SESSION) {
    session.messages.splice(
      0,
      session.messages.length - MAX_MESSAGES_PER_SESSION
    );
  }
  session.updatedAt = now;

  const peerPresence = peerUserId ? getPresence(peerUserId) : null;
  const senderPresence = getPresence(userId);
  const senderLabel = peerLabel(senderPresence, '산책자');

  if (peerPresence?.pushToken) {
    void sendExpoPush(
      peerPresence.pushToken,
      senderLabel,
      text.length > 80 ? `${text.slice(0, 77)}…` : text
    );
  }

  return {
    status: 200,
    json: { ok: true, message },
  };
}

function handleLeaveSocial(body) {
  const userId = body.userId;
  if (typeof userId !== 'string') {
    return { status: 400, error: 'Invalid userId' };
  }

  for (const [id, knock] of state.knocks) {
    if (knock.fromUserId === userId || knock.toUserId === userId) {
      state.knocks.delete(id);
    }
  }

  for (const [id, session] of state.sessions) {
    if (session.userIds.includes(userId)) {
      state.sessions.delete(id);
    }
  }

  return { status: 200, json: { ok: true } };
}

/**
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
async function handleNearbySocial(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const body = req.body ?? {};
  const action = body.action;
  const now = Date.now();
  cleanup(now);

  let result;

  switch (action) {
    case 'poll':
      result = handlePoll(body, now);
      break;
    case 'knock':
      result = await handleKnock(body, now);
      break;
    case 'respondKnock':
      result = await handleRespondKnock(body, now);
      break;
    case 'sendMessage':
      result = handleSendMessage(body, now);
      break;
    case 'leave':
      result = handleLeaveSocial(body);
      break;
    default:
      return res.status(400).json({ error: 'Invalid action' });
  }

  if (result.error) {
    return res.status(result.status).json({ error: result.error });
  }
  return res.status(result.status).json(result.json);
}

module.exports = { handleNearbySocial };
