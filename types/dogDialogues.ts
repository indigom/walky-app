export type DogDialogueContext =
  | 'home'
  | 'pet'
  | 'eat'
  | 'walk-ready'
  | 'walk-start'
  | 'walk-result'
  | 'hungry'
  | 'walk-desire';

/** hunger/energy 100% 구간 — 경과 시간별 대사 */
export type TimedTierMessages = {
  default: string[];
  hours1: string[];
  hours10: string[];
  hours24: string[];
};

export type StatTierMessages = {
  tier70: string[];
  tier80: string[];
  tier90: string[];
  tier100: TimedTierMessages;
};

export type DogDialoguesPack = {
  version: number;
  idleLook: string[];
  emptyRoom: string[];
  contexts: Record<DogDialogueContext, string[]>;
  hunger: StatTierMessages;
  energy: StatTierMessages;
  mood: {
    lowMood: string[];
    lowEnergy: string[];
    highAffection: string[];
  };
  phrases: {
    nameCall: string;
    idleBridge: string;
    walkResultTired: string;
    walkResultLiked: string;
    walkResultDefault: string;
    insufficientWalkEnergy: string;
  };
  walkCheer: string[];
};

export type PartialDogDialoguesPack = {
  version?: number;
  idleLook?: string[];
  emptyRoom?: string[];
  contexts?: Partial<Record<DogDialogueContext, string[]>>;
  hunger?: Partial<StatTierMessages> & {
    tier100?: Partial<TimedTierMessages>;
  };
  energy?: Partial<StatTierMessages> & {
    tier100?: Partial<TimedTierMessages>;
  };
  mood?: Partial<DogDialoguesPack['mood']>;
  phrases?: Partial<DogDialoguesPack['phrases']>;
  walkCheer?: string[];
};
