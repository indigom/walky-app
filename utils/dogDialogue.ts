import { resolveAmbientDogVideoState } from '../assets/DogVideoResolver';
import type { DogState, DogVideoState } from '../types';
import type { DogDialogueContext } from '../types/dogDialogues';
import {
  applyDogNameTemplate,
  getDogDialoguesPack,
} from './dogDialoguesPack';

export type { DogDialogueContext } from '../types/dogDialogues';

const ONE_HOUR = 1000 * 60 * 60;

export const EMPTY_ROOM_DIALOGUE_INTERVAL_MS = 25_000;

function randomPick(messages: string[]) {
  const index = Math.floor(Math.random() * messages.length);
  return messages[index];
}

function getHoursPassed(dateString: string | null) {
  if (!dateString) return 0;

  const targetTime = new Date(dateString).getTime();

  if (Number.isNaN(targetTime)) return 0;

  const now = Date.now();
  return Math.floor((now - targetTime) / ONE_HOUR);
}

function getTimedTierDialogue(
  hoursPassed: number,
  tier: { default: string[]; hours1: string[]; hours10: string[]; hours24: string[] }
) {
  if (hoursPassed >= 24) return randomPick(tier.hours24);
  if (hoursPassed >= 10) return randomPick(tier.hours10);
  if (hoursPassed >= 1) return randomPick(tier.hours1);
  return randomPick(tier.default);
}

function getHungerDialogue(dogState: DogState) {
  const { hunger: tiers } = getDogDialoguesPack();
  const hunger = dogState.hunger;
  const hoursPassed = getHoursPassed(dogState.hungerReachedMaxAt ?? null);

  if (hunger >= 100) {
    return getTimedTierDialogue(hoursPassed, tiers.tier100);
  }

  if (hunger >= 90) return randomPick(tiers.tier90);
  if (hunger >= 80) return randomPick(tiers.tier80);
  if (hunger >= 70) return randomPick(tiers.tier70);

  return null;
}

function getHighEnergyDialogue(dogState: DogState) {
  const { energy: tiers } = getDogDialoguesPack();
  const energy = dogState.energy;
  const hoursPassed = getHoursPassed(dogState.energyReachedMaxAt ?? null);

  if (energy >= 100) {
    return getTimedTierDialogue(hoursPassed, tiers.tier100);
  }

  if (energy >= 90) return randomPick(tiers.tier90);
  if (energy >= 80) return randomPick(tiers.tier80);
  if (energy >= 70) return randomPick(tiers.tier70);

  return null;
}

function getMoodDialogue(dogState: DogState) {
  const { mood } = getDogDialoguesPack();

  if (dogState.mood <= 30) return randomPick(mood.lowMood);
  if (dogState.energy <= 25) return randomPick(mood.lowEnergy);
  if (dogState.affection >= 85) return randomPick(mood.highAffection);

  return null;
}

/**
 * `resolveAmbientDogVideoState`와 동일한 룰이 영상을 고르므로,
 * 말풍선도 같은 상태 구간에서 같은 성격의 대사를 쓴다.
 * 우선순위: 산책욕구 트랙 → 배고픔 트랙 → 심심·방치/휴식·일상
 */
function dialogueForAmbientVideoState(
  ambient: DogVideoState,
  dogState: DogState
): string {
  const { contexts } = getDogDialoguesPack();

  switch (ambient) {
    case 'walkIgnored3Days':
    case 'walkWantCritical':
    case 'walkWantStrong':
    case 'walkWantMedium':
      return (
        getHighEnergyDialogue(dogState) ??
        randomPick(contexts['walk-desire'])
      );

    case 'hungryIgnored3Days':
    case 'hungryCritical':
    case 'hungryStrong':
    case 'hungryMedium':
      return getHungerDialogue(dogState) ?? randomPick(contexts.hungry);

    case 'neglected3Days':
      return getMoodDialogue(dogState) ?? randomPick(contexts.home);

    case 'sleep':
      return getMoodDialogue(dogState) ?? randomPick(contexts.home);

    case 'idle':
    case 'empty':
      return getMoodDialogue(dogState) ?? randomPick(contexts.home);

    default:
      return getMoodDialogue(dogState) ?? randomPick(contexts.home);
  }
}

export function getIdleLookDialogue(): string {
  return randomPick(getDogDialoguesPack().idleLook);
}

export function getEmptyRoomDialogue(): string {
  return randomPick(getDogDialoguesPack().emptyRoom);
}

export function getNameCallDialogue(): string {
  return getDogDialoguesPack().phrases.nameCall;
}

export function getIdleBridgeDialogue(): string {
  return getDogDialoguesPack().phrases.idleBridge;
}

export function getWalkCheerMessage(index: number): string {
  const messages = getDogDialoguesPack().walkCheer;
  return messages[index % messages.length];
}

export function getWalkResultMessage(dogState: DogState): string {
  const { phrases } = getDogDialoguesPack();

  if (dogState.energy < 30) {
    return applyDogNameTemplate(phrases.walkResultTired, dogState.name);
  }

  if (dogState.mood >= 85 || dogState.affection >= 75) {
    return applyDogNameTemplate(phrases.walkResultLiked, dogState.name);
  }

  return applyDogNameTemplate(phrases.walkResultDefault, dogState.name);
}

export function getInsufficientWalkEnergyMessage(): string {
  return getDogDialoguesPack().phrases.insufficientWalkEnergy;
}

export function getDogDialogue(
  dogState: DogState,
  context: DogDialogueContext = 'home'
) {
  const { contexts } = getDogDialoguesPack();

  if (context === 'hungry') {
    return getHungerDialogue(dogState) ?? randomPick(contexts.hungry);
  }

  if (context === 'walk-desire' || context === 'walk-ready') {
    return (
      getHighEnergyDialogue(dogState) ?? randomPick(contexts[context])
    );
  }

  if (context === 'home') {
    return dialogueForAmbientVideoState(
      resolveAmbientDogVideoState(dogState),
      dogState
    );
  }

  return randomPick(contexts[context]);
}
