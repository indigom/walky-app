import { useEffect, useState } from 'react';

import type {
  DogDialoguesPack,
  PartialDogDialoguesPack,
  TimedTierMessages,
} from '../types/dogDialogues';
import { DEFAULT_DOG_DIALOGUES_PACK } from './dogDialoguesDefaults';

const listeners = new Set<() => void>();
let revision = 0;
let activePack: DogDialoguesPack = DEFAULT_DOG_DIALOGUES_PACK;

function mergeStringArrays(
  remote: string[] | undefined,
  fallback: string[]
): string[] {
  if (!remote || remote.length === 0) return fallback;
  return remote;
}

function mergeTimedTier(
  remote: Partial<TimedTierMessages> | undefined,
  fallback: TimedTierMessages
): TimedTierMessages {
  return {
    default: mergeStringArrays(remote?.default, fallback.default),
    hours1: mergeStringArrays(remote?.hours1, fallback.hours1),
    hours10: mergeStringArrays(remote?.hours10, fallback.hours10),
    hours24: mergeStringArrays(remote?.hours24, fallback.hours24),
  };
}

export function mergeDogDialoguesPack(
  remote: PartialDogDialoguesPack,
  fallback: DogDialoguesPack = DEFAULT_DOG_DIALOGUES_PACK
): DogDialoguesPack {
  return {
    version: remote.version ?? fallback.version,
    idleLook: mergeStringArrays(remote.idleLook, fallback.idleLook),
    emptyRoom: mergeStringArrays(remote.emptyRoom, fallback.emptyRoom),
    contexts: {
      home: mergeStringArrays(remote.contexts?.home, fallback.contexts.home),
      pet: mergeStringArrays(remote.contexts?.pet, fallback.contexts.pet),
      eat: mergeStringArrays(remote.contexts?.eat, fallback.contexts.eat),
      'walk-ready': mergeStringArrays(
        remote.contexts?.['walk-ready'],
        fallback.contexts['walk-ready']
      ),
      'walk-start': mergeStringArrays(
        remote.contexts?.['walk-start'],
        fallback.contexts['walk-start']
      ),
      'walk-result': mergeStringArrays(
        remote.contexts?.['walk-result'],
        fallback.contexts['walk-result']
      ),
      hungry: mergeStringArrays(remote.contexts?.hungry, fallback.contexts.hungry),
      'walk-desire': mergeStringArrays(
        remote.contexts?.['walk-desire'],
        fallback.contexts['walk-desire']
      ),
    },
    hunger: {
      tier70: mergeStringArrays(remote.hunger?.tier70, fallback.hunger.tier70),
      tier80: mergeStringArrays(remote.hunger?.tier80, fallback.hunger.tier80),
      tier90: mergeStringArrays(remote.hunger?.tier90, fallback.hunger.tier90),
      tier100: mergeTimedTier(remote.hunger?.tier100, fallback.hunger.tier100),
    },
    energy: {
      tier70: mergeStringArrays(remote.energy?.tier70, fallback.energy.tier70),
      tier80: mergeStringArrays(remote.energy?.tier80, fallback.energy.tier80),
      tier90: mergeStringArrays(remote.energy?.tier90, fallback.energy.tier90),
      tier100: mergeTimedTier(remote.energy?.tier100, fallback.energy.tier100),
    },
    mood: {
      lowMood: mergeStringArrays(remote.mood?.lowMood, fallback.mood.lowMood),
      lowEnergy: mergeStringArrays(
        remote.mood?.lowEnergy,
        fallback.mood.lowEnergy
      ),
      highAffection: mergeStringArrays(
        remote.mood?.highAffection,
        fallback.mood.highAffection
      ),
    },
    phrases: {
      nameCall: remote.phrases?.nameCall?.trim() || fallback.phrases.nameCall,
      idleBridge:
        remote.phrases?.idleBridge?.trim() || fallback.phrases.idleBridge,
      walkResultTired:
        remote.phrases?.walkResultTired?.trim() ||
        fallback.phrases.walkResultTired,
      walkResultLiked:
        remote.phrases?.walkResultLiked?.trim() ||
        fallback.phrases.walkResultLiked,
      walkResultDefault:
        remote.phrases?.walkResultDefault?.trim() ||
        fallback.phrases.walkResultDefault,
      insufficientWalkEnergy:
        remote.phrases?.insufficientWalkEnergy?.trim() ||
        fallback.phrases.insufficientWalkEnergy,
    },
    walkCheer: mergeStringArrays(remote.walkCheer, fallback.walkCheer),
  };
}

function notifyListeners(): void {
  revision += 1;
  listeners.forEach((listener) => listener());
}

export function getDogDialoguesRevision(): number {
  return revision;
}

export function subscribeDogDialoguesPack(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useDogDialoguesRevision(): number {
  const [currentRevision, setCurrentRevision] = useState(revision);

  useEffect(
    () =>
      subscribeDogDialoguesPack(() => {
        setCurrentRevision(getDogDialoguesRevision());
      }),
    []
  );

  return currentRevision;
}

export function getDogDialoguesPack(): DogDialoguesPack {
  return activePack;
}

export function setDogDialoguesPack(
  remote: PartialDogDialoguesPack,
  fallback: DogDialoguesPack = DEFAULT_DOG_DIALOGUES_PACK
): DogDialoguesPack {
  activePack = mergeDogDialoguesPack(remote, fallback);
  notifyListeners();
  return activePack;
}

export function resetDogDialoguesPackToDefaults(): DogDialoguesPack {
  activePack = DEFAULT_DOG_DIALOGUES_PACK;
  notifyListeners();
  return activePack;
}

export function applyDogNameTemplate(template: string, name: string): string {
  return template.replace(/\{name\}/g, name);
}
