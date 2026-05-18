// assetManifest.ts

import type { DogAssetManifest, DogVideoState } from '../types';

// 특정 상태의 영상 리스트 가져오기
export function getVideosByState(
  manifest: DogAssetManifest,
  state: DogVideoState
): string[] {
  return manifest.videos[state] ?? [];
}

// 랜덤 영상 하나 선택
export function pickRandomVideo(
  manifest: DogAssetManifest,
  state: DogVideoState
): string | null {
  const list = getVideosByState(manifest, state);

  if (list.length === 0) return null;

  const index = Math.floor(Math.random() * list.length);
  return list[index];
}