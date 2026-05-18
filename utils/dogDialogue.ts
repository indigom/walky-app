import { resolveAmbientDogVideoState } from '../assets/DogVideoResolver';
import type { DogState, DogVideoState } from '../types';

export type DogDialogueContext =
  | 'home'
  | 'pet'
  | 'eat'
  | 'walk-ready'
  | 'walk-start'
  | 'walk-result'
  | 'hungry'
  | 'walk-desire';

const ONE_HOUR = 1000 * 60 * 60;

/** 홈 무상호작용 후 look(idleLook) 재생 시 말풍선 */
const IDLE_LOOK_DIALOGUES = [
  '뭐야?',
  '안놀아줘?',
  '나 심심한데',
  '그냥 바라만보기인감?',
  '조금 있으면 나 삐질 것 같아',
] as const;

export function getIdleLookDialogue(): string {
  return randomPick([...IDLE_LOOK_DIALOGUES]);
}

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

function getHungerDialogue(dogState: DogState) {
  const hunger = dogState.hunger;
  const hoursPassed = getHoursPassed(dogState.hungerReachedMaxAt ?? null);

  if (hunger >= 100) {
    if (hoursPassed >= 24) {
      return randomPick([
        '오늘은 그냥 조용히 있을게…',
        '밥 생각도 이제 조금 멀어진 것 같아.',
        '나 많이 기다렸어…',
      ]);
    }

    if (hoursPassed >= 10) {
      return randomPick([
        '나 밥그릇 앞에서 계속 기다리고 있었어…',
        '혹시 내 밥 잊은 건 아니지?',
        '배고픈데 조금 서운해졌어.',
      ]);
    }

    if (hoursPassed >= 1) {
      return randomPick([
        '아직 밥은 멀었어?',
        '나 너무 배고픈데…',
        '밥그릇이 자꾸 눈에 보여.',
      ]);
    }

    return randomPick([
      '나 너무 배고파…',
      '지금은 밥 생각밖에 안 나.',
      '배에서 꼬르륵 소리가 크게 나.',
    ]);
  }

  if (hunger >= 90) {
    return randomPick([
      '배에서 꼬르륵 소리가 나.',
      '나 이제 꽤 배고픈 것 같아.',
      '밥 먹을 시간이 된 것 같아.',
    ]);
  }

  if (hunger >= 80) {
    return randomPick([
      '밥 생각이 자꾸 나…',
      '조금 많이 출출해졌어.',
      '밥그릇 쪽이 신경 쓰여.',
    ]);
  }

  if (hunger >= 70) {
    return randomPick([
      '나 조금 출출한 것 같아.',
      '혹시 간식 생각 안 나?',
      '슬슬 배가 고파지는 것 같아.',
    ]);
  }

  return null;
}

function getHighEnergyDialogue(dogState: DogState) {
  const energy = dogState.energy;
  const hoursPassed = getHoursPassed(dogState.energyReachedMaxAt ?? null);

  if (energy >= 100) {
    if (hoursPassed >= 24) {
      return randomPick([
        '창밖만 계속 보고 있었어.',
        '오늘은 산책 없는 날인가 봐…',
        '밖에 나가고 싶은 마음이 조금 가라앉았어.',
      ]);
    }

    if (hoursPassed >= 10) {
      return randomPick([
        '오늘 산책은 없는 날인가 봐…',
        '문 앞에서 한참 기다렸어.',
        '나 아직도 밖에 나가고 싶어.',
      ]);
    }

    if (hoursPassed >= 1) {
      return randomPick([
        '아직 산책 안 가는 거야?',
        '밖에 나가고 싶은데…',
        '리드줄 소리가 들릴까 봐 기다리고 있어.',
      ]);
    }

    return randomPick([
      '나 지금 당장 나가고 싶어!',
      '산책 가자! 지금!',
      '문 앞까지 먼저 가 있어도 돼?',
    ]);
  }

  if (energy >= 90) {
    return randomPick([
      '산책 가방만 봐도 두근거려.',
      '밖에 나가면 정말 좋을 것 같아.',
      '오늘 냄새 맡을 곳이 많을 것 같아.',
    ]);
  }

  if (energy >= 80) {
    return randomPick([
      '문 쪽이 자꾸 신경 쓰여.',
      '밖에 나가고 싶은 기분이야.',
      '산책 생각이 자꾸 나.',
    ]);
  }

  if (energy >= 70) {
    return randomPick([
      '밖에 냄새 맡으러 가고 싶어.',
      '오늘 산책 가면 좋겠다.',
      '조금만 걸어도 기분 좋아질 것 같아.',
    ]);
  }

  return null;
}

function getMoodDialogue(dogState: DogState) {
  if (dogState.mood <= 30) {
    return randomPick([
      '오늘은 기분이 조금 가라앉았어.',
      '조금만 같이 있어줄래?',
      '네 옆에 조용히 있고 싶어.',
    ]);
  }

  if (dogState.energy <= 25) {
    return randomPick([
      '오늘은 조금 졸려…',
      '잠깐 쉬어도 괜찮을까?',
      '네 옆에서 자도 돼?',
    ]);
  }

  if (dogState.affection >= 85) {
    return randomPick([
      '나는 네가 제일 좋아.',
      '너랑 있으면 마음이 편해.',
      '오늘도 내 사람이네.',
    ]);
  }

  return null;
}

const CONTEXT_MESSAGES: Record<DogDialogueContext, string[]> = {
  home: [
    '오늘은 어떤 하루였어?',
    '나랑 조금 놀아줄래?',
    '같이 있으면 심심하지 않아.',
    '나 여기 있어.',
  ],

  pet: [
    '헤헤… 좋아.',
    '거기 좋아!',
    '조금 더 쓰다듬어줘.',
    '꼬리가 저절로 움직여.',
  ],

  eat: [
    '아작아작… 맛있어!',
    '이거 진짜 좋아!',
    '배부르게 먹을래.',
    '고마워, 잘 먹었어!',
  ],

  'walk-ready': [
    '산책 갈 준비 됐어?',
    '천천히 걸어도 좋아.',
    '오늘은 어떤 냄새가 날까?',
  ],

  'walk-start': [
    '출발이다!',
    '같이 걷자.',
    '너랑 걷는 거 좋아.',
  ],

  'walk-result': [
    '오늘 산책 정말 좋았어.',
    '너랑 걸어서 행복했어.',
    '다음에도 같이 걷자.',
  ],

  hungry: [
    '배고파…',
    '간식 생각이 나.',
    '밥그릇이 비어 있는 것 같아.',
  ],

  'walk-desire': [
    '산책 가고 싶어.',
    '밖에 나가고 싶어.',
    '문 앞이 자꾸 신경 쓰여.',
  ],
};

/**
 * `resolveAmbientDogVideoState`와 동일한 룰이 영상을 고르므로,
 * 말풍선도 같은 상태 구간에서 같은 성격의 대사를 쓴다.
 * 우선순위: 산책욕구 트랙 → 배고픔 트랙 → 심심·방치/휴식·일상
 */
function dialogueForAmbientVideoState(
  ambient: DogVideoState,
  dogState: DogState
): string {
  switch (ambient) {
    case 'walkIgnored3Days':
    case 'walkWantCritical':
    case 'walkWantStrong':
    case 'walkWantMedium':
      return (
        getHighEnergyDialogue(dogState) ??
        randomPick(CONTEXT_MESSAGES['walk-desire'])
      );

    case 'hungryIgnored3Days':
    case 'hungryCritical':
    case 'hungryStrong':
    case 'hungryMedium':
      return (
        getHungerDialogue(dogState) ?? randomPick(CONTEXT_MESSAGES.hungry)
      );

    case 'neglected3Days':
      return (
        getMoodDialogue(dogState) ?? randomPick(CONTEXT_MESSAGES.home)
      );

    case 'sleep':
      return getMoodDialogue(dogState) ?? randomPick(CONTEXT_MESSAGES.home);

    case 'idle':
    case 'empty':
      return (
        getMoodDialogue(dogState) ?? randomPick(CONTEXT_MESSAGES.home)
      );

    default:
      return (
        getMoodDialogue(dogState) ?? randomPick(CONTEXT_MESSAGES.home)
      );
  }
}

export function getDogDialogue(
  dogState: DogState,
  context: DogDialogueContext = 'home'
) {
  if (context === 'hungry') {
    return getHungerDialogue(dogState) ?? randomPick(CONTEXT_MESSAGES.hungry);
  }

  if (context === 'walk-desire' || context === 'walk-ready') {
    return (
      getHighEnergyDialogue(dogState) ??
      randomPick(CONTEXT_MESSAGES[context])
    );
  }

  if (context === 'home') {
    return dialogueForAmbientVideoState(
      resolveAmbientDogVideoState(dogState),
      dogState
    );
  }

  return randomPick(CONTEXT_MESSAGES[context]);
}