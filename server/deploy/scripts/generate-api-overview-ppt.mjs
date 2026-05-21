/**
 * Walky API 필요 구간 정리 — PPT 생성
 * 실행: npm run generate:ppt:api
 * 또는: node server/deploy/scripts/generate-api-overview-ppt.mjs
 */
import pptxgen from 'pptxgenjs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const outPath = join(__dirname, '..', 'Walky-API-필요구간-정리.pptx');

const pptx = new pptxgen();
pptx.author = 'Walky';
pptx.title = 'Walky API 필요 구간 정리';
pptx.subject = '서버·앱·배포 가이드';
pptx.layout = 'LAYOUT_16x9';

const C = {
  title: '1F2937',
  body: '374151',
  accent: 'D97706',
  muted: '6B7280',
  white: 'FFFFFF',
  bg: 'FFFBEB',
};

function addTitleSlide(title, subtitle) {
  const slide = pptx.addSlide();
  slide.background = { color: C.bg };
  slide.addText(title, {
    x: 0.6,
    y: 2.0,
    w: 8.8,
    h: 1.2,
    fontSize: 32,
    bold: true,
    color: C.title,
    fontFace: 'Malgun Gothic',
  });
  if (subtitle) {
    slide.addText(subtitle, {
      x: 0.6,
      y: 3.3,
      w: 8.8,
      h: 0.8,
      fontSize: 16,
      color: C.muted,
      fontFace: 'Malgun Gothic',
    });
  }
  slide.addShape(pptx.shapes.RECTANGLE, {
    x: 0.6,
    y: 1.7,
    w: 1.2,
    h: 0.08,
    fill: { color: C.accent },
  });
}

function addSectionSlide(sectionTitle) {
  const slide = pptx.addSlide();
  slide.background = { color: C.accent };
  slide.addText(sectionTitle, {
    x: 0.6,
    y: 2.3,
    w: 8.8,
    h: 1,
    fontSize: 28,
    bold: true,
    color: C.white,
    fontFace: 'Malgun Gothic',
  });
}

function addBulletSlide(title, bullets, notes) {
  const slide = pptx.addSlide();
  slide.addText(title, {
    x: 0.5,
    y: 0.35,
    w: 9,
    h: 0.7,
    fontSize: 22,
    bold: true,
    color: C.title,
    fontFace: 'Malgun Gothic',
  });

  const rows = bullets.map((t) => ({
    text: t,
    options: {
      bullet: true,
      breakLine: true,
      fontSize: 14,
      color: C.body,
      fontFace: 'Malgun Gothic',
      paraSpaceAfter: 8,
    },
  }));

  slide.addText(rows, {
    x: 0.55,
    y: 1.15,
    w: 8.9,
    h: 4.2,
    valign: 'top',
  });

  if (notes) slide.addNotes(notes);
}

function addTableSlide(title, headers, rows, colW) {
  const slide = pptx.addSlide();
  slide.addText(title, {
    x: 0.5,
    y: 0.35,
    w: 9,
    h: 0.7,
    fontSize: 22,
    bold: true,
    color: C.title,
    fontFace: 'Malgun Gothic',
  });

  const tableRows = [
    headers.map((h) => ({
      text: h,
      options: {
        bold: true,
        fill: { color: 'FEF3C7' },
        color: C.title,
        fontSize: 12,
        fontFace: 'Malgun Gothic',
      },
    })),
    ...rows.map((row) =>
      row.map((cell) => ({
        text: cell,
        options: {
          fontSize: 11,
          color: C.body,
          fontFace: 'Malgun Gothic',
        },
      }))
    ),
  ];

  slide.addTable(tableRows, {
    x: 0.5,
    y: 1.2,
    w: 9,
    colW: colW ?? [2.0, 3.5, 3.5],
    border: { pt: 0.5, color: 'E5E7EB' },
    autoPage: false,
  });
}

function addCodeSlide(title, lines) {
  const slide = pptx.addSlide();
  slide.addText(title, {
    x: 0.5,
    y: 0.35,
    w: 9,
    h: 0.7,
    fontSize: 22,
    bold: true,
    color: C.title,
    fontFace: 'Malgun Gothic',
  });
  slide.addText(lines.join('\n'), {
    x: 0.5,
    y: 1.1,
    w: 9,
    h: 4.5,
    fontSize: 11,
    fontFace: 'Consolas',
    color: '111827',
    fill: { color: 'F3F4F6' },
    margin: 10,
  });
}

// --- Slides ---
addTitleSlide(
  'Walky API\n필요 구간 정리',
  '영상 = 가비아 정적 · 근처 산책 = Node(Railway) · 나머지 = 기기 로컬'
);

addBulletSlide('한 줄 요약', [
  '앱 대부분(홈·배고픔·산책 기록·설정)은 서버 API 없이 AsyncStorage로 동작',
  '반드시 붙는 것: 산책 화면의 근처 산책자 + 노크/채팅 (POST 2개)',
  '알림: 매일 산책 시간 = 로컬 예약 · 근처 유저 = 서버 Expo Push (이미 구현)',
  '앱 종료 중 배고픔/스탯 알림 = 서버 푸시·스케줄러 확장 권장',
  '다음 확장: 프로필 사진 업로드 · push/register · presence Redis',
]);

addTableSlide(
  '구분별 한눈에 보기',
  ['구분', '무엇', '배포 위치'],
  [
    ['정적 HTTP', 'manifest.json + mp4', 'walky.co.kr/dogs/ (가비아 FTP)'],
    ['REST (구현됨)', '근처 산책자 presence', 'Railway / Node server/'],
    ['REST (구현됨)', '노크·1:1 채팅', '같은 Node /api/nearby/social'],
    ['로컬 알림', '매일 산책 시간 알림', 'walkReminderNotifications.ts'],
    ['서버 푸시', '근처 산책자·노크', 'presence/social → exp.host'],
    ['로컬(개발)', '배고픔·8h·24h 스탯 알림', 'dogWallClock (__DEV__만)'],
    ['외부', 'Expo Push 발송', '서버 → exp.host'],
    ['로컬만', '강아지 상태·프로필 사진', 'AsyncStorage + file://'],
    ['미구현', '푸시 등록·스탯 cron·사진 업로드', '아래 슬라이드 참고'],
  ],
  [1.8, 3.2, 4.0]
);

addSectionSlide('1. 정적 에셋 (REST 아님)');

addBulletSlide('견종 영상·manifest 다운로드', [
  'URL: {WALKY_ORIGIN}/dogs/{breed}/manifest.json',
  '영상: …/dogs/{breed}/idle01.mp4 등',
  '코드: assets/BreedAssetManager.ts, constants/walkyServer.ts',
  '쓰는 화면: 품종 선택 → 로컬 캐시 후 홈/산책 재생',
  '백업 호스트: EXPO_PUBLIC_WALKY_ASSET_FALLBACK_ORIGIN (선택)',
]);

addCodeSlide('.env — 에셋·API URL', [
  'EXPO_PUBLIC_WALKY_ORIGIN=https://walky.co.kr',
  '',
  '# Railway 예시 (가비아에 Node 없을 때)',
  'EXPO_PUBLIC_NEARBY_WALKER_API_URL=',
  '  https://xxxx.up.railway.app/api/nearby/presence',
  'EXPO_PUBLIC_NEARBY_SOCIAL_API_URL=',
  '  https://xxxx.up.railway.app/api/nearby/social',
  '',
  '# 로컬 API 테스트 (실기기·같은 Wi-Fi)',
  '# http://192.168.0.10:3001/api/nearby/presence',
]);

addSectionSlide('2. Node REST API (구현됨)');

addTableSlide(
  '엔드포인트 (server/index.js)',
  ['메서드·경로', '역할', '앱 연동'],
  [
    [
      'POST /api/nearby/presence',
      'heartbeat · leave',
      'utils/nearbyWalkerPresence.ts → WalkScreen',
    ],
    [
      'POST /api/nearby/social',
      'poll · knock · respond · message',
      'utils/nearbyWalkerSocial.ts → WalkScreen',
    ],
    ['GET /health', '헬스체크', '배포 확인용'],
  ],
  [2.6, 3.2, 3.2]
);

addBulletSlide('POST /api/nearby/presence', [
  'action: heartbeat — lat/lng, gender, dogName, nickname, pushToken',
  '응답: nearbyWalkers[] (이성, 반경 기본 50m), notifySelf 등',
  'action: leave — 산책 종료 시 presence 제거',
  '서버: server/nearbyPresence.js (인메모리 Map)',
  '알림: pushToken 있으면 Expo Push (exp.host) — alertsEnabled 일 때',
]);

addTableSlide(
  'POST /api/nearby/social — action',
  ['action', '용도', '비고'],
  [
    ['poll', '들어온 노크·채팅 세션/메시지', 'WalkScreen 3초 폴링'],
    ['knock', '근처 유저에게 노크', '409 = not_nearby'],
    ['respondKnock', '수락/거절', '수락 시 세션 생성'],
    ['sendMessage', '1:1 채팅', '세션당 메시지 제한 있음'],
  ],
  [2.0, 3.5, 3.5]
);

addBulletSlide('social 제한·플랫폼', [
  '서버: server/nearbySocial.js — knocks/sessions 인메모리',
  '웹(Expo web): social API 호출 안 함 (Platform.OS === web)',
  '재시작 시 목록·채팅 초기화 → 프로덕션은 Redis 권장',
]);

addSectionSlide('3. 알림 — 로컬 vs 서버 푸시');

addTableSlide(
  '알림 종류별 (포그라운드 밖)',
  ['알림', '방식', '앱 꺼져도?'],
  [
    [
      '매일 산책 시간',
      '로컬 DAILY 예약',
      'O — OS가 지정 시각에 표시',
    ],
    [
      '근처 이성 산책자',
      '서버 → Expo Push',
      'O — 산책 중 heartbeat 시',
    ],
    ['노크·채팅', '서버 → Expo Push', 'O — social 핸들러'],
    [
      '배고픔 80/100·8h·24h',
      '로컬 (dogWallClock)',
      '△ — __DEV__만, 앱 틱 필요',
    ],
  ],
  [2.4, 3.3, 3.3]
);

addBulletSlide('로컬 알림 — 매일 산책 (서버 불필요)', [
  'WalkHabit: usualWalkHour / usualWalkMinute 저장',
  'utils/walkReminderNotifications.ts — scheduleNotificationAsync(DAILY)',
  'App.tsx·Settings 저장 시 syncDailyWalkReminderFromProfile 호출',
  '앱 종료·백그라운드에서도 “오늘 산책 안 나가?” 표시 가능',
  '한계: 기기 변경·OS 예약 삭제 시 재등록 필요 → 서버 백업 선택',
]);

addBulletSlide('서버 푸시 — 이미 있는 것', [
  '앱: getExpoPushTokenOrNull() → presence heartbeat에 pushToken',
  '서버: nearbyPresence.js · nearbySocial.js → exp.host/v2/push/send',
  '조건: nearbyWalkerAlerts !== false, 상대도 pushToken 등록',
  '한계: 토큰이 WalkScreen 산책 중에만 올라감 — 홈에서도 등록 권장',
]);

addBulletSlide('서버 푸시가 필요한 이유 (스탯·게임)', [
  '앱이 꺼지면 dogWallClock 30초 틱이 멈춤 → 배고픔 알림 안 감',
  '출시 빌드: ENABLE_DOG_CONDITIONAL_LOCAL_NOTIFICATIONS = false',
  '해결: 서버에 lastFedAt·hunger 등 저장 + cron이 임계값에서 Push',
  '또는 로컬로 수십 개 미리 예약 (복잡·OS 제한) — 실무는 서버 권장',
]);

addCodeSlide('추가 권장 API (미구현)', [
  'POST /api/push/register',
  '  userId, pushToken, timezone',
  '  usualWalkHour, usualWalkMinute, alertsEnabled',
  '',
  '서버 cron (Railway worker / 외부 스케줄러):',
  '  · 매일 산책 시간 — 로컬 알림 백업',
  '  · hunger >= 80 / 100, 8h 미급식, 24h 미산책',
  '',
  '앱 변경:',
  '  · 온보딩/홈 진입 시 register (산책만 X)',
  '  · dogState 스냅샷 주기 동기화 (선택)',
]);

addTableSlide(
  '푸시 로드맵',
  ['단계', '내용', '비고'],
  [
    ['현재', '근처·노크 서버 Push', 'presence/social'],
    ['현재', '매일 산책 로컬 DAILY', 'walkReminderNotifications'],
    ['1단계', 'POST /api/push/register', '토큰·습관·타임존'],
    ['2단계', 'cron 산책 리마인더', '로컬 실패 백업'],
    ['3단계', 'cron 스탯 알림', '서버 dog state 필요'],
  ],
  [1.6, 3.7, 3.7]
);

addSectionSlide('4. 앱에서 API 쓰는 화면');

addTableSlide(
  '코드 위치',
  ['기능', '파일', '화면'],
  [
    ['위치 heartbeat', 'nearbyWalkerPresence.ts', 'WalkScreen'],
    ['노크·채팅', 'nearbyWalkerSocial.ts', 'WalkScreen 모달'],
    ['영상 다운로드', 'BreedAssetManager.ts', 'BreedSelect 등'],
    ['userId', 'walkyUserId.ts', 'AsyncStorage (로그인 API 없음)'],
    ['프로필 사진', 'profilePhotoStorage.ts', '로컬 file만 (업로드 X)'],
    ['매일 산책 알림', 'walkReminderNotifications.ts', '로컬 (API 없음)'],
    ['스탯 알림', 'dogWallClock.ts', '로컬·개발 플래그'],
    ['Expo Push 토큰', 'expoPushToken.ts', 'WalkScreen → presence'],
  ],
  [2.0, 3.5, 3.5]
);

addSectionSlide('5. API 없이 동작');

addBulletSlide('기기만으로 되는 기능', [
  '홈: 배고픔·산책욕구·idle/hungry 영상 (dogWallClock + 로컬 state)',
  '산책: GPS·걸음·완료 판정 (walkMetrics)',
  '온보딩·설정·보상·로컬 알림 (expo-notifications)',
  '프로필: 닉네임·성별·산책 습관 — profilePhotoUri는 기기 경로',
  '계정: JWT/로그인 API 없음 — walkyUserId를 API에 전달',
]);

addSectionSlide('6. 아직 없는 API');

addBulletSlide('추가 예정·권장', [
  'POST /api/push/register — pushToken·산책 습관·알림 설정',
  'cron: 매일 산책 + 배고픔/미급식/미산책 (서버 스탯 동기화 시)',
  'POST /api/profile/photo — multipart → 공개 HTTPS URL',
  'presence/social + profilePhotoUrl · Redis 영속화',
  '상세: Walky-프로필사진-업로드API.pptx · 장기 JWT',
]);

addSectionSlide('7. 배포 구조');

addBulletSlide('가비아 + Railway (권장)', [
  '가비아 walky.co.kr: /dogs/{breed}/ manifest + mp4 (FTP)',
  'Railway: server/ 폴더 → /api/nearby/presence · /social',
  '앱 .env: NEARBY_* URL만 Railway, WALKY_ORIGIN은 가비아',
  'Expo: Push projectId · 실기기에서 근처 알림 테스트',
  '문서: server/deploy/README-RAILWAY.md',
]);

addCodeSlide('아키텍처 (요약)', [
  '  [앱] GET /dogs/... → [가비아 정적]',
  '',
  '  [앱] DAILY 로컬 예약 → [OS 알림] 산책 시간',
  '       (walkReminderNotifications)',
  '',
  '  [앱 WalkScreen] POST presence/social',
  '       pushToken → [Railway] → [exp.host Push]',
  '       근처·노크 (앱 종료 OK)',
  '',
  '  [미래] register + cron → [Railway] → Push',
  '       스탯·산책 백업 (앱 종료 OK)',
  '',
  '  [홈] AsyncStorage + dogWallClock (앱 켤 때)',
]);

addTableSlide(
  '배포 체크리스트',
  ['항목', '확인', '비고'],
  [
    ['□', '가비아 dogs/ manifest·mp4', '품종별 폴더'],
    ['□', 'Railway API URL .env', 'expo start --clear'],
    ['□', 'health 200', 'GET /health'],
    ['□', '실기기 산책·노크', '웹은 social 미지원'],
    ['□', '매일 산책 로컬 알림', 'WalkHabit 저장 후 실기기'],
    ['□', '근처 푸시', '산책 중·알림 허용'],
    ['□', '(선택) push/register + cron', '스탯·백업'],
    ['□', '(선택) 프로필 업로드 API', '별도 PPT'],
  ],
  [0.6, 4.0, 4.4]
);

addTitleSlide(
  '다운로드·재생성',
  '파일: server/deploy/Walky-API-필요구간-정리.pptx\n명령: npm run generate:ppt:api'
);

await pptx.writeFile({ fileName: outPath });
console.log('Created:', outPath);
