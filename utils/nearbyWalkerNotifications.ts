import { NEARBY_WALKER_PUSH_BODY } from '../constants/nearbyWalkerApi';
import { presentImmediateBarkNotification } from './localNotifications';

const KIND = 'nearby_opposite_walker';

export async function presentNearbyWalkerBarkNotification(
  dogDisplayName: string
): Promise<void> {
  await presentImmediateBarkNotification({
    dogDisplayName,
    body: NEARBY_WALKER_PUSH_BODY,
    kind: KIND,
  });
}
