import AsyncStorage from '@react-native-async-storage/async-storage';

import { WALKY_ORIGIN } from '../constants/walkyServer';
import type { PartialDogDialoguesPack } from '../types/dogDialogues';
import { DEFAULT_DOG_DIALOGUES_PACK } from './dogDialoguesDefaults';
import { mergeDogDialoguesPack, setDogDialoguesPack } from './dogDialoguesPack';

const STORAGE_KEY = '@walky/dog-dialogues-ko-v1';
const REMOTE_URL = `${WALKY_ORIGIN}/dialogues/ko.json`;

function parseDialoguesJson(text: string, url: string): PartialDogDialoguesPack {
  if (text.includes('<<<<<<<') || text.includes('>>>>>>>')) {
    throw new Error(
      `dialogues JSON에 Git 병합 충돌 표시가 있습니다. 서버 파일을 수정하세요.\n${url}`
    );
  }

  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error(`dialogues JSON이 올바른 JSON이 아닙니다.\n${url}`);
  }

  if (!json || typeof json !== 'object' || Array.isArray(json)) {
    throw new Error(`dialogues JSON 루트가 객체가 아닙니다.\n${url}`);
  }

  return json as PartialDogDialoguesPack;
}

async function loadCachedDialogues(): Promise<PartialDogDialoguesPack | null> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as PartialDogDialoguesPack;
  } catch {
    return null;
  }
}

async function saveCachedDialogues(
  pack: PartialDogDialoguesPack
): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(pack));
}

async function fetchRemoteDialogues(): Promise<PartialDogDialoguesPack> {
  const res = await fetch(REMOTE_URL);

  if (!res.ok) {
    throw new Error(`dialogues HTTP ${res.status}\n${REMOTE_URL}`);
  }

  const text = await res.text();
  return parseDialoguesJson(text, REMOTE_URL);
}

function applyCachedOrDefaults(
  cached: PartialDogDialoguesPack | null
): void {
  if (cached) {
    setDogDialoguesPack(cached, DEFAULT_DOG_DIALOGUES_PACK);
    return;
  }

  setDogDialoguesPack({}, DEFAULT_DOG_DIALOGUES_PACK);
}

/** 앱 시작 시 캐시 로드 후 기본값과 병합 */
export async function initDogDialoguesPack(): Promise<void> {
  const cached = await loadCachedDialogues();
  applyCachedOrDefaults(cached);
}

/** 서버에서 최신 대사를 받아 캐시·런타임에 반영 */
export async function syncDogDialoguesPack(): Promise<void> {
  try {
    const remote = await fetchRemoteDialogues();
    await saveCachedDialogues(remote);
    setDogDialoguesPack(remote, DEFAULT_DOG_DIALOGUES_PACK);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.log('dog dialogues sync failed:', message);
  }
}

/** init + 백그라운드 동기화 */
export async function initAndSyncDogDialoguesPack(): Promise<void> {
  await initDogDialoguesPack();
  await syncDogDialoguesPack();
}

export function getDogDialoguesRemoteUrl(): string {
  return REMOTE_URL;
}
