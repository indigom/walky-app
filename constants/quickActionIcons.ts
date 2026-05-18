import type { ImageSourcePropType } from 'react-native';

export type QuickActionType = 'feed' | 'rest';

/**
 * Icon sources for quick actions. Replace the files under assets/ui/
 * (feed.png, rest.png) to change visuals without editing screens.
 */
export const QUICK_ACTION_ICONS: Record<QuickActionType, ImageSourcePropType> = {
  feed: require('../assets/ui/feed.png'),
  rest: require('../assets/ui/rest.png'),
};
