import type { ImageSourcePropType } from 'react-native';

import type { Breed } from '../types';

/**
 * 산책 결과 화면 배경 (견종별).
 * 파일명: `{breed}_walkresult_bg.png` — `assets/images/` 에 추가하세요.
 */
const BREED_WALK_RESULT_BG_SOURCES = {
  corgi: require('../assets/images/corgi_walkresult_bg.png'),
  shiba: require('../assets/images/shiba_walkresult_bg.png'),
  retriever: require('../assets/images/Retriever_walkresult_bg.png'),
} as const satisfies Record<Breed, ImageSourcePropType>;

export function getBreedWalkResultBgSource(breed: Breed): ImageSourcePropType {
  return BREED_WALK_RESULT_BG_SOURCES[breed];
}
