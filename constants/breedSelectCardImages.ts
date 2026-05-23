import type { ImageSourcePropType } from 'react-native';

import type { Breed } from '../types';

/** 견종 선택 카드 전체 배경 (`assets/dog/{breed}.png`) */
const BREED_SELECT_CARD_SOURCES = {
  corgi: require('../assets/dog/corgi.png'),
  shiba: require('../assets/dog/shiba.png'),
  retriever: require('../assets/dog/retriever.png'),
} as const satisfies Record<Breed, ImageSourcePropType>;

export function getBreedSelectCardImageSource(breed: Breed): ImageSourcePropType {
  return BREED_SELECT_CARD_SOURCES[breed];
}
