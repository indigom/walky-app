import * as FileSystem from 'expo-file-system/legacy';

import type { Breed, DogAssetManifest } from '../types';
import {
  WALKY_ASSET_FALLBACK_ORIGIN,
  WALKY_ASSET_ORIGIN,
} from '../constants/walkyServer';

const LOCAL_BASE = `${FileSystem.documentDirectory}dogs/`;

/** manifest 다운로드에 성공한 호스트 (영상 URL도 동일 호스트 사용) */
let activeAssetOrigin = WALKY_ASSET_ORIGIN;

function assetOriginsToTry(): string[] {
  const list = [WALKY_ASSET_ORIGIN];
  if (WALKY_ASSET_FALLBACK_ORIGIN !== WALKY_ASSET_ORIGIN) {
    list.push(WALKY_ASSET_FALLBACK_ORIGIN);
  }
  return list;
}

function getBreedFolder(breed: Breed): string {
  return `${LOCAL_BASE}${breed}/`;
}

function getLocalManifestPath(breed: Breed): string {
  return `${getBreedFolder(breed)}manifest.json`;
}

function getRemoteManifestUrl(origin: string, breed: Breed): string {
  return `${origin}/dogs/${breed}/manifest.json`;
}

function getRemoteVideoUrl(breed: Breed, fileName: string): string {
  return `${activeAssetOrigin}/dogs/${breed}/${fileName}`;
}

async function ensureDir(path: string): Promise<void> {
  const dirInfo = await FileSystem.getInfoAsync(path);

  if (!dirInfo.exists) {
    await FileSystem.makeDirectoryAsync(path, {
      intermediates: true,
    });
  }
}

function getAllVideoFileNames(manifest: DogAssetManifest): string[] {
  return Object.values(manifest.videos)
    .filter((value): value is string[] => Array.isArray(value))
    .flat();
}

function parseManifestJson(text: string, url: string): DogAssetManifest {
  if (text.includes('<<<<<<<') || text.includes('>>>>>>>')) {
    throw new Error(
      `manifest.json에 Git 병합 충돌 표시가 있습니다. 서버 파일을 수정하세요.\n${url}`
    );
  }

  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error(`manifest.json이 올바른 JSON이 아닙니다.\n${url}`);
  }

  return json as DogAssetManifest;
}

async function fetchManifestFromOrigin(
  origin: string,
  breed: Breed
): Promise<DogAssetManifest> {
  const url = getRemoteManifestUrl(origin, breed);
  const res = await fetch(url);

  if (!res.ok) {
    throw new Error(`manifest HTTP ${res.status}\n${url}`);
  }

  const text = await res.text();
  return parseManifestJson(text, url);
}

export async function downloadManifest(
  breed: Breed
): Promise<DogAssetManifest> {
  let lastError: Error | null = null;

  for (const origin of assetOriginsToTry()) {
    try {
      const manifest = await fetchManifestFromOrigin(origin, breed);
      activeAssetOrigin = origin;
      return manifest;
    } catch (e) {
      lastError = e instanceof Error ? e : new Error(String(e));
      console.log(`manifest fetch failed (${origin}):`, lastError.message);
    }
  }

  throw (
    lastError ??
    new Error(`Failed to download manifest for breed: ${breed}`)
  );
}

async function downloadVideo(
  breed: Breed,
  fileName: string,
  options?: { overwrite?: boolean }
): Promise<string> {
  const remoteUrl = getRemoteVideoUrl(breed, fileName);
  const localPath = `${getBreedFolder(breed)}${fileName}`;

  const fileInfo = await FileSystem.getInfoAsync(localPath);

  if (fileInfo.exists && !options?.overwrite) {
    return localPath;
  }

  if (fileInfo.exists && options?.overwrite) {
    await FileSystem.deleteAsync(localPath, { idempotent: true });
  }

  const result = await FileSystem.downloadAsync(remoteUrl, localPath);

  if (result.status < 200 || result.status >= 300) {
    throw new Error(
      `영상 다운로드 실패 HTTP ${result.status}\n${remoteUrl}`
    );
  }

  return localPath;
}

export async function downloadBreedAssets(
  breed: Breed
): Promise<DogAssetManifest> {
  const folder = getBreedFolder(breed);

  await ensureDir(folder);

  const manifest = await downloadManifest(breed);

  const manifestPath = getLocalManifestPath(breed);

  await FileSystem.writeAsStringAsync(
    manifestPath,
    JSON.stringify(manifest)
  );

  const allVideos = getAllVideoFileNames(manifest);

  for (const fileName of allVideos) {
    try {
      await downloadVideo(breed, fileName);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      throw new Error(`${fileName} 다운로드 실패\n${msg}`);
    }
  }

  return manifest;
}

/**
 * 원격 manifest.json을 항상 받아 로컬에 반영합니다.
 * 매니페스트 내용이 이전과 달라진 경우에만, 목록에 있는 영상을 서버 기준으로 다시 받습니다.
 */
export async function syncRemoteBreedAssets(
  breed: Breed
): Promise<DogAssetManifest> {
  const folder = getBreedFolder(breed);

  await ensureDir(folder);

  const manifestPath = getLocalManifestPath(breed);
  let previousSerialized: string | null = null;
  const prevInfo = await FileSystem.getInfoAsync(manifestPath);
  if (prevInfo.exists) {
    previousSerialized = await FileSystem.readAsStringAsync(manifestPath);
  }

  const manifest = await downloadManifest(breed);
  const nextSerialized = JSON.stringify(manifest);

  await FileSystem.writeAsStringAsync(manifestPath, nextSerialized);

  const manifestChanged =
    previousSerialized === null || previousSerialized !== nextSerialized;

  const allVideos = getAllVideoFileNames(manifest);

  for (const fileName of allVideos) {
    await downloadVideo(breed, fileName, { overwrite: manifestChanged });
  }

  return manifest;
}

export async function loadLocalManifest(
  breed: Breed
): Promise<DogAssetManifest | null> {
  const path = getLocalManifestPath(breed);

  const fileInfo = await FileSystem.getInfoAsync(path);

  if (!fileInfo.exists) {
    return null;
  }

  const content = await FileSystem.readAsStringAsync(path);

  return JSON.parse(content) as DogAssetManifest;
}

export function getLocalVideoPath(
  breed: Breed,
  fileName: string
): string {
  return `${getBreedFolder(breed)}${fileName}`;
}

export async function removeBreedAssets(breed: Breed): Promise<void> {
  const folder = getBreedFolder(breed);

  const info = await FileSystem.getInfoAsync(folder);

  if (info.exists) {
    await FileSystem.deleteAsync(folder, {
      idempotent: true,
    });
  }
}
