/**
 * STT 문자열과 등록된 강아지 이름 매칭 (한국어 애칭·호칭 대략 대응)
 * - 이름이 "○○이"일 때 ○○아, ○○야 등을 같은 이름으로 봅니다.
 * - 너무 짧은 이름(실질 1글자)은 텍스트에 그 글자가 단독·호칭으로만 나오면 매칭합니다.
 */

const NAME_MATCH_STRIP_RE =
  /[\s,.!?~…·\u2018\u2019\u201c\u201d'"`\-—]/g;

export function normalizeForNameMatch(raw: string): string {
  return raw.replace(NAME_MATCH_STRIP_RE, '');
}

/** 등록 이름에서 부를 때 나올 수 있는 문자열 목록 */
export function buildDogNameCallAliases(registeredName: string): string[] {
  const trimmed = registeredName.trim();
  if (!trimmed) return [];

  const collapsed = trimmed.replace(/\s+/g, '');
  const set = new Set<string>([collapsed]);

  if (collapsed.endsWith('이') && collapsed.length >= 2) {
    const base = collapsed.slice(0, -1);
    if (base.length > 0) {
      set.add(base);
      set.add(`${base}아`);
      set.add(`${base}야`);
      set.add(`${base}아야`);
    }
  }

  return [...set];
}

export function transcriptsMatchesDogCall(
  transcriptRaw: string,
  registeredName: string
): boolean {
  const t = normalizeForNameMatch(transcriptRaw);
  if (!t) return false;

  const aliases = buildDogNameCallAliases(registeredName);
  if (aliases.length === 0) return false;

  for (const alias of aliases) {
    const a = normalizeForNameMatch(alias);
    if (!a) continue;

    if (a.length >= 2) {
      if (t.includes(a)) return true;
      continue;
    }

    if (t === a || t === `${a}아` || t === `${a}야` || t === `${a}아야`) {
      return true;
    }
  }

  return false;
}
