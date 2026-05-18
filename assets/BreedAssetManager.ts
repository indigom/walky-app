import * as FileSystem from 'expo-file-system/legacy';

import type { Breed, DogAssetManifest } from '../types';
import { WALKY_ASSET_ORIGIN } from '../constants/assetServer';

const BASE_URL = `${WALKY_ASSET_ORIGIN}/dogs`;

const LOCAL_BASE = `${FileSystem.documentDirectory}dogs/`;

function getBreedFolder(breed: Breed): string {
  return `${LOCAL_BASE}${breed}/`;
}

function getLocalManifestPath(breed: Breed): string {
  return `${getBreedFolder(breed)}manifest.json`;
}

function getRemoteManifestUrl(breed: Breed): string {
  return `${BASE_URL}/${breed}/manifest.json`;
}

function getRemoteVideoUrl(breed: Breed, fileName: string): string {
  return `${BASE_URL}/${breed}/${fileName}`;
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

export async function downloadManifest(
  breed: Breed
): Promise<DogAssetManifest> {
  const url = getRemoteManifestUrl(breed);
  const res = await fetch(url);

  if (!res.ok) {
    throw new Error(`Failed to download manifest: ${url}`);
  }

  const json = (await res.json()) as DogAssetManifest;

  return json;
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

  await FileSystem.downloadAsync(remoteUrl, localPath);

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
    await downloadVideo(breed, fileName);
  }

  return manifest;
}

/**
 * 원격 manifest.json을 항상 받아 로컬에 반영합니다.
 * 매니페스트 내용이 이전과 달라진 경우에만, 목록에 있는 영상을 서버 기준으로 다시 받습니다.
 * (파일명만 같고 내용만 바뀐 경우에는 manifest에 버전 필드 등을 넣어 JSON이 달라지게 하세요.)
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