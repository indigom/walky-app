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
  if (
    WALKY_ASSET_FALLBACK_ORIGIN &&
    WALKY_ASSET_FALLBACK_ORIGIN !== WALKY_ASSET_ORIGIN
  ) {
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

function getVideoMetaPath(breed: Breed): string {
  return `${getBreedFolder(breed)}video-meta.json`;
}

type RemoteVideoMeta = {
  etag: string | null;
  lastModified: string | null;
  size: number | null;
};

type StoredVideoMetaFile = Record<string, RemoteVideoMeta>;

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

function getUniqueVideoFileNames(manifest: DogAssetManifest): string[] {
  return [...new Set(getAllVideoFileNames(manifest))];
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

async function loadStoredVideoMeta(breed: Breed): Promise<StoredVideoMetaFile> {
  const path = getVideoMetaPath(breed);
  const info = await FileSystem.getInfoAsync(path);
  if (!info.exists) return {};

  try {
    const content = await FileSystem.readAsStringAsync(path);
    return JSON.parse(content) as StoredVideoMetaFile;
  } catch {
    return {};
  }
}

async function saveStoredVideoMeta(
  breed: Breed,
  meta: StoredVideoMetaFile
): Promise<void> {
  await FileSystem.writeAsStringAsync(
    getVideoMetaPath(breed),
    JSON.stringify(meta)
  );
}

async function fetchRemoteVideoMeta(
  breed: Breed,
  fileName: string
): Promise<RemoteVideoMeta | null> {
  const url = getRemoteVideoUrl(breed, fileName);

  try {
    const res = await fetch(url, { method: 'HEAD' });
    if (!res.ok) return null;

    const etag = res.headers.get('etag');
    const lastModified = res.headers.get('last-modified');
    const contentLength = res.headers.get('content-length');
    const parsedSize = contentLength ? Number.parseInt(contentLength, 10) : NaN;

    return {
      etag: etag?.replace(/^W\//, '') ?? null,
      lastModified,
      size: Number.isFinite(parsedSize) ? parsedSize : null,
    };
  } catch {
    return null;
  }
}

function remoteMetaMatches(
  stored: RemoteVideoMeta | undefined,
  remote: RemoteVideoMeta
): boolean {
  if (!stored) return false;

  if (stored.etag && remote.etag) {
    return stored.etag === remote.etag;
  }

  if (
    stored.lastModified &&
    remote.lastModified &&
    stored.size != null &&
    remote.size != null
  ) {
    return (
      stored.lastModified === remote.lastModified && stored.size === remote.size
    );
  }

  if (stored.size != null && remote.size != null) {
    return stored.size === remote.size;
  }

  return false;
}

function needsVideoDownload(
  localExists: boolean,
  previousFileNames: Set<string> | null,
  fileName: string,
  stored: RemoteVideoMeta | undefined,
  remote: RemoteVideoMeta | null
): boolean {
  if (!localExists) return true;

  if (previousFileNames && !previousFileNames.has(fileName)) {
    return true;
  }

  if (!remote) return false;

  if (!stored) return true;

  return !remoteMetaMatches(stored, remote);
}

async function syncVideoFile(
  breed: Breed,
  fileName: string,
  options: {
    previousFileNames: Set<string> | null;
    storedMeta: StoredVideoMetaFile;
  }
): Promise<void> {
  const localPath = `${getBreedFolder(breed)}${fileName}`;
  const fileInfo = await FileSystem.getInfoAsync(localPath);
  const remoteMeta = await fetchRemoteVideoMeta(breed, fileName);
  const stored = options.storedMeta[fileName];

  const shouldDownload = needsVideoDownload(
    fileInfo.exists,
    options.previousFileNames,
    fileName,
    stored,
    remoteMeta
  );

  if (shouldDownload) {
    await downloadVideo(breed, fileName, { overwrite: fileInfo.exists });
  }

  if (remoteMeta) {
    options.storedMeta[fileName] = remoteMeta;
    return;
  }

  const updatedInfo = await FileSystem.getInfoAsync(localPath);
  if (!updatedInfo.exists) return;

  options.storedMeta[fileName] = {
    etag: null,
    lastModified: null,
    size: 'size' in updatedInfo ? (updatedInfo.size ?? null) : null,
  };
}

async function syncManifestVideos(
  breed: Breed,
  manifest: DogAssetManifest,
  previousManifest: DogAssetManifest | null
): Promise<void> {
  const previousFileNames = previousManifest
    ? new Set(getUniqueVideoFileNames(previousManifest))
    : null;
  const storedMeta = await loadStoredVideoMeta(breed);
  const allVideos = getUniqueVideoFileNames(manifest);

  for (const fileName of allVideos) {
    try {
      await syncVideoFile(breed, fileName, { previousFileNames, storedMeta });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      throw new Error(`${fileName} 다운로드 실패\n${msg}`);
    }
  }

  const prunedMeta: StoredVideoMetaFile = {};
  for (const fileName of allVideos) {
    if (storedMeta[fileName]) {
      prunedMeta[fileName] = storedMeta[fileName];
    }
  }

  await saveStoredVideoMeta(breed, prunedMeta);
}

export async function downloadBreedAssets(
  breed: Breed
): Promise<DogAssetManifest> {
  const folder = getBreedFolder(breed);

  await ensureDir(folder);

  const manifest = await downloadManifest(breed);
  const previousManifest = await loadLocalManifest(breed);

  await syncManifestVideos(breed, manifest, previousManifest);

  const manifestPath = getLocalManifestPath(breed);
  await FileSystem.writeAsStringAsync(
    manifestPath,
    JSON.stringify(manifest)
  );

  return manifest;
}

/**
 * 원격 manifest.json을 받아 로컬에 반영합니다.
 * manifest에 나열된 영상 중 서버에서 갱신된 파일만 다시 받습니다.
 */
export async function syncRemoteBreedAssets(
  breed: Breed
): Promise<DogAssetManifest> {
  const folder = getBreedFolder(breed);

  await ensureDir(folder);

  const previousManifest = await loadLocalManifest(breed);
  const manifest = await downloadManifest(breed);

  await syncManifestVideos(breed, manifest, previousManifest);

  const manifestPath = getLocalManifestPath(breed);
  await FileSystem.writeAsStringAsync(
    manifestPath,
    JSON.stringify(manifest)
  );

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
