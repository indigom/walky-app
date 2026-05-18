import type { ImageSourcePropType } from 'react-native';

import type { Breed } from '../types';

/**
 * 홈 빈 방 정지 화면용 이미지 (견종별).
 * 새 견종: `types`의 `Breed`에 추가한 뒤, 아래 Record에 항목을 넣고
 * `assets/images/{파일명}` 파일을 추가하면 됩니다. (Metro는 정적 require만 지원)
 */
const BREED_EMPTY_ROOM_SOURCES = {
  corgi: require('../assets/images/corgi-emptyroom.png'),
  shiba: require('../assets/images/shiba-emptyroom.png'),
  retriever: require('../assets/images/Retriever-emptyroom.png'),
} as const satisfies Record<Breed, ImageSourcePropType>;

export function getBreedEmptyRoomImageSource(breed: Breed): ImageSourcePropType {
  return BREED_EMPTY_ROOM_SOURCES[breed];
}
