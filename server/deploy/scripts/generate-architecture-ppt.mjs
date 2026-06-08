/**
 * Walky 전체 구조도 — PPT 생성
 * 실행: npm run generate:ppt:architecture
 * 또는: node server/deploy/scripts/generate-architecture-ppt.mjs
 */
import pptxgen from 'pptxgenjs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const outPath = join(__dirname, '..', 'Walky-구조도.pptx');

const pptx = new pptxgen();
pptx.author = 'Walky';
pptx.title = 'Walky 시스템 구조도';
pptx.subject = 'App · GitHub · Railway · Cloudflare · walky.co.kr';
pptx.layout = 'LAYOUT_16x9';

const C = {
  title: '1F2937',
  body: '374151',
  accent: 'D97706',
  accent2: '2563EB',
  accent3: '059669',
  accent4: '7C3AED',
  muted: '6B7280',
  white: 'FFFFFF',
  bg: 'FFFBEB',
  boxBg: 'F3F4F6',
  boxBorder: 'D1D5DB',
};

const FONT = 'Malgun Gothic';

function addTitleSlide(title, subtitle) {
  const slide = pptx.addSlide();
  slide.background = { color: C.bg };
  slide.addShape(pptx.shapes.RECTANGLE, {
    x: 0.6,
    y: 1.7,
    w: 1.2,
    h: 0.08,
    fill: { color: C.accent },
  });
  slide.addText(title, {
    x: 0.6,
    y: 2.0,
    w: 8.8,
    h: 1.2,
    fontSize: 32,
    bold: true,
    color: C.title,
    fontFace: FONT,
  });
  if (subtitle) {
    slide.addText(subtitle, {
      x: 0.6,
      y: 3.3,
      w: 8.8,
      h: 0.8,
      fontSize: 16,
      color: C.muted,
      fontFace: FONT,
    });
  }
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
    fontFace: FONT,
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
    fontFace: FONT,
  });
  slide.addText(
    bullets.map((t) => ({
      text: t,
      options: {
        bullet: true,
        breakLine: true,
        fontSize: 14,
        color: C.body,
        fontFace: FONT,
        paraSpaceAfter: 8,
      },
    })),
    { x: 0.55, y: 1.15, w: 8.9, h: 4.2, valign: 'top' }
  );
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
    fontFace: FONT,
  });
  slide.addTable(
    [
      headers.map((h) => ({
        text: h,
        options: {
          bold: true,
          fill: { color: 'FEF3C7' },
          color: C.title,
          fontSize: 12,
          fontFace: FONT,
        },
      })),
      ...rows.map((row) =>
        row.map((cell) => ({
          text: cell,
          options: { fontSize: 11, color: C.body, fontFace: FONT },
        }))
      ),
    ],
    {
      x: 0.5,
      y: 1.2,
      w: 9,
      colW: colW ?? [2.0, 3.5, 3.5],
      border: { pt: 0.5, color: 'E5E7EB' },
      autoPage: false,
    }
  );
}

function addBox(slide, { x, y, w, h, title, lines, fill, border }) {
  slide.addShape(pptx.shapes.ROUNDED_RECTANGLE, {
    x,
    y,
    w,
    h,
    fill: { color: fill ?? C.boxBg },
    line: { color: border ?? C.boxBorder, width: 1 },
    rectRadius: 0.08,
  });
  slide.addText(title, {
    x: x + 0.08,
    y: y + 0.08,
    w: w - 0.16,
    h: 0.35,
    fontSize: 13,
    bold: true,
    color: C.title,
    fontFace: FONT,
  });
  if (lines?.length) {
    slide.addText(lines.join('\n'), {
      x: x + 0.1,
      y: y + 0.42,
      w: w - 0.2,
      h: h - 0.5,
      fontSize: 10,
      color: C.body,
      fontFace: FONT,
      valign: 'top',
    });
  }
}

function addArrow(slide, x1, y1, x2, y2, label) {
  slide.addShape(pptx.shapes.LINE, {
    x: x1,
    y: y1,
    w: x2 - x1,
    h: y2 - y1,
    line: { color: C.muted, width: 1.5, endArrowType: 'triangle' },
  });
  if (label) {
    slide.addText(label, {
      x: (x1 + x2) / 2 - 0.8,
      y: (y1 + y2) / 2 - 0.25,
      w: 1.6,
      h: 0.35,
      fontSize: 9,
      color: C.muted,
      fontFace: FONT,
      align: 'center',
    });
  }
}

function addArchitectureDiagramSlide() {
  const slide = pptx.addSlide();
  slide.addText('Walky 전체 구조도 (한 장 요약)', {
    x: 0.5,
    y: 0.25,
    w: 9,
    h: 0.55,
    fontSize: 22,
    bold: true,
    color: C.title,
    fontFace: FONT,
  });

  // Client
  addBox(slide, {
    x: 0.4,
    y: 1.0,
    w: 2.0,
    h: 1.55,
    title: '📱 Walky App',
    lines: [
      'Expo / React Native',
      'AsyncStorage · GPS',
      '로컬 영상 캐시',
      'EAS로 APK/IPA 빌드',
    ],
    fill: 'DBEAFE',
    border: '93C5FD',
  });

  // GitHub
  addBox(slide, {
    x: 0.4,
    y: 2.85,
    w: 2.0,
    h: 1.2,
    title: '🐙 GitHub',
    lines: ['indigom/walky-app', '소스·이미지·server/', 'push → CI 트리거'],
    fill: 'F3F4F6',
    border: '9CA3AF',
  });

  // EAS
  addBox(slide, {
    x: 0.4,
    y: 4.25,
    w: 2.0,
    h: 0.95,
    title: '⚙️ Expo EAS',
    lines: ['development / preview APK', '앱 바이너리 빌드'],
    fill: 'EDE9FE',
    border: 'C4B5FD',
  });

  // walky.co.kr
  addBox(slide, {
    x: 3.0,
    y: 1.0,
    w: 2.35,
    h: 1.75,
    title: '🌐 walky.co.kr',
    lines: [
      '가비아 웹호스팅 (정적)',
      '/dogs/{breed}/ manifest·mp4',
      '/rewards/{breed}/ 에피소드',
      'nginx → (선택) /api/ 프록시',
    ],
    fill: 'FEF3C7',
    border: 'FCD34D',
  });

  // Railway
  addBox(slide, {
    x: 5.85,
    y: 1.0,
    w: 2.35,
    h: 1.75,
    title: '🚂 Railway',
    lines: [
      'Node API (server/)',
      'GitHub 연동 자동 배포',
      '/api/nearby/presence',
      '/api/nearby/social',
      '/api/profile',
    ],
    fill: 'D1FAE5',
    border: '6EE7B7',
  });

  // Cloudflare R2
  addBox(slide, {
    x: 5.85,
    y: 2.95,
    w: 2.35,
    h: 1.05,
    title: '☁ Cloudflare R2',
    lines: ['프로필 사진 객체 저장', 'pub-….r2.dev 공개 URL'],
    fill: 'FFEDD5',
    border: 'FDBA74',
  });

  // Expo Push
  addBox(slide, {
    x: 5.85,
    y: 4.2,
    w: 2.35,
    h: 0.95,
    title: '🔔 Expo Push',
    lines: ['exp.host', '근처·노크 알림 발송'],
    fill: 'FCE7F3',
    border: 'F9A8D4',
  });

  // Dev PC
  addBox(slide, {
    x: 8.45,
    y: 1.0,
    w: 1.35,
    h: 1.2,
    title: '💻 개발 PC',
    lines: ['npm start', '.env 설정', 'Metro 번들'],
    fill: 'E5E7EB',
    border: '9CA3AF',
  });

  // Arrows
  addArrow(slide, 2.4, 1.6, 3.0, 1.6, 'GET dogs/');
  addArrow(slide, 2.4, 2.1, 5.85, 1.7, 'POST API');
  addArrow(slide, 8.2, 1.5, 2.4, 1.5, 'dev');
  addArrow(slide, 2.4, 3.4, 5.85, 1.5, 'deploy');
  addArrow(slide, 2.4, 4.7, 2.4, 1.55, 'build');
  addArrow(slide, 8.2, 3.5, 5.85, 3.4, 'photo');
  addArrow(slide, 7.5, 2.0, 7.5, 4.2, 'push');

  slide.addText(
    '※ 홈·산책 기록·강아지 스탯 대부분은 기기 로컬. 서버는 영상 CDN + 산책 중 소셜 API + (선택) 프로필·푸시.',
    {
      x: 0.5,
      y: 5.15,
      w: 9,
      h: 0.4,
      fontSize: 10,
      color: C.muted,
      fontFace: FONT,
    }
  );
}

function addFlowSlide(title, steps) {
  const slide = pptx.addSlide();
  slide.addText(title, {
    x: 0.5,
    y: 0.35,
    w: 9,
    h: 0.7,
    fontSize: 22,
    bold: true,
    color: C.title,
    fontFace: FONT,
  });

  steps.forEach((step, i) => {
    const y = 1.15 + i * 0.72;
    slide.addShape(pptx.shapes.OVAL, {
      x: 0.55,
      y,
      w: 0.35,
      h: 0.35,
      fill: { color: C.accent },
    });
    slide.addText(String(i + 1), {
      x: 0.55,
      y,
      w: 0.35,
      h: 0.35,
      fontSize: 12,
      bold: true,
      color: C.white,
      fontFace: FONT,
      align: 'center',
      valign: 'middle',
    });
    slide.addText(step, {
      x: 1.05,
      y: y - 0.02,
      w: 8.3,
      h: 0.55,
      fontSize: 13,
      color: C.body,
      fontFace: FONT,
      valign: 'middle',
    });
    if (i < steps.length - 1) {
      slide.addShape(pptx.shapes.LINE, {
        x: 0.72,
        y: y + 0.35,
        w: 0,
        h: 0.37,
        line: { color: 'D1D5DB', width: 1 },
      });
    }
  });
}

// --- Slides ---
addTitleSlide(
  'Walky 시스템 구조도',
  'App · GitHub · Railway · Cloudflare R2 · walky.co.kr · EAS · Expo Push'
);

addBulletSlide('한 줄 요약', [
  'Walky = Expo 모바일 앱 + 가비아 정적 CDN(walky.co.kr) + Railway Node API + Cloudflare R2',
  '소스는 GitHub(walky-app) — push 시 Railway 자동 배포, EAS로 앱 바이너리 별도 빌드',
  '강아지 영상·리워드는 HTTPS 파일 다운로드, 근처 산책·노크만 실시간 REST API',
  '프로필 사진은 Railway가 R2에 저장 후 공개 URL 반환 (가비아 SFTP 대안)',
  '대부분 게임 상태는 기기 AsyncStorage — 서버 없이도 홈·산책 기록 동작',
]);

addArchitectureDiagramSlide();

addSectionSlide('1. 구성 요소 역할');

addTableSlide(
  '플랫폼별 역할',
  ['구성 요소', '역할', 'Walky에서 하는 일'],
  [
    [
      '📱 Walky App',
      '사용자 기기',
      '홈·산책·온보딩 UI, GPS/걸음, 로컬 상태, 영상 재생',
    ],
    [
      '🐙 GitHub',
      '소스 저장소',
      'walky-app 레포 — app/, server/, assets/images, 배포 manifest',
    ],
    [
      '⚙️ Expo EAS',
      '앱 빌드',
      'development/preview APK, production AAB — GitHub와 별도 파이프라인',
    ],
    [
      '🌐 walky.co.kr',
      '가비아 호스팅',
      '정적 HTTPS: /dogs/, /rewards/ — Node 실행 불가 (파일만)',
    ],
    [
      '🚂 Railway',
      'Node 런타임',
      'server/ 배포 — 근처 산책 API, 프로필 API, (선택) nginx /api/ 대체',
    ],
    [
      '☁ Cloudflare R2',
      '객체 스토리지',
      '프로필 JPG 저장 — S3 호환, pub URL로 앱·타 유저에게 표시',
    ],
    [
      '🔔 Expo Push',
      '푸시 중계',
      'Railway → exp.host — 근처 산책자·노크 알림 (앱 종료 OK)',
    ],
    [
      '💻 개발 PC',
      '로컬 개발',
      'expo start / dev client — Metro가 JS 번들 제공, .env로 URL 지정',
    ],
  ],
  [1.7, 2.2, 5.1]
);

addSectionSlide('2. 데이터·요청 흐름');

addFlowSlide('견종 영상 로딩 (홈·산책)', [
  '[앱] 품종 선택 → GET https://walky.co.kr/dogs/{breed}/manifest.json',
  '[앱] manifest 목록의 mp4를 기기 documentDirectory/dogs/ 에 다운로드·캐시',
  '[앱] DogVideoResolver가 상태(idle/hungry/walk…)에 맞는 클립 재생',
  '※ assets/videos/ 는 레거시 — repo·앱 번들에 포함하지 않음',
]);

addFlowSlide('산책 리워드 영상 (5km 달성)', [
  '[앱] 오늘 누적 5km + 미수령 → WalkResult에서 "리워드 영상 보기"',
  '[앱] GET https://walky.co.kr/rewards/{breed}/{breed}_001.mp4 (스트리밍)',
  '[앱] rewardProgress를 AsyncStorage에 저장 — 다음은 _002.mp4',
  '※ 서버 업로드만으로 교체 가능 — APK 재빌드 불필요',
]);

addFlowSlide('근처 산책자·노크 (산책 중)', [
  '[앱 WalkScreen] GPS + pushToken → POST Railway /api/nearby/presence (heartbeat)',
  '[Railway] 반경 내 이성 산책자 목록 반환 + (조건 충족 시) Expo Push 발송',
  '[앱] POST /api/nearby/social — poll · knock · respondKnock · sendMessage',
  '[Railway] 인메모리 저장 (재시작 시 초기화 — 프로덕션은 Redis 권장)',
  '※ 웹(Expo web)은 social API 미지원',
]);

addFlowSlide('프로필 사진', [
  '[앱] POST multipart → EXPO_PUBLIC_PROFILE_API_URL (Railway /api/profile)',
  '[Railway] PROFILE_STORAGE=s3 → Cloudflare R2 버킷에 업로드',
  '[Railway] 응답: profilePhotoUrl = https://pub-….r2.dev/profiles/w_….jpg',
  '[앱] URL을 user 프로필에 저장 — 근처 산책 API에 nickname·photoUrl 전달',
  '[대안] 가비아 HTTPS 업로드 API 또는 SFTP (문서: README-PROFILE-STORAGE.md)',
]);

addSectionSlide('3. 배포·개발 파이프라인');

addTableSlide(
  'GitHub → 어디로 가는가',
  ['변경 대상', '배포 경로', '결과'],
  [
    ['server/ 코드 push', 'GitHub → Railway (Root: server/)', 'API 자동 재배포'],
    ['app/ · screens/ push', '개발 PC expo start 또는 EAS build', '앱 JS/바이너리 갱신'],
    ['dogs/ mp4·manifest', '가비아 FTP → walky.co.kr/dogs/', '앱이 다음 동기화 시 다운로드'],
    ['rewards/ mp4', '가비아 FTP → walky.co.kr/rewards/', '즉시 URL 스트리밍'],
    ['assets/images/ (emptyroom 등)', 'GitHub → EAS build에 번들', '앱에 정적 포함'],
    ['R2 버킷·토큰', 'Cloudflare + Railway Variables', '프로필 업로드 백엔드 변경'],
  ],
  [2.0, 3.2, 3.8]
);

addBulletSlide('개발 PC vs 프로덕션 앱', [
  '개발: npm run start:dev — dev client APK + Metro (같은 Wi-Fi)',
  '테스트 APK: eas build --profile preview — JS 번들 없음, dev client와 유사',
  '앱은 walky.co.kr·Railway URL을 .env (EXPO_PUBLIC_*) 로 주입 — 빌드 시 고정',
  '가비아는 Node 없음 — API만 Railway 쓸 때 NEARBY_* URL을 Railway 도메인으로',
  '선택: api.walky.co.kr CNAME → Railway (한 도메인으로 통합 가능)',
]);

addSectionSlide('4. 앱 내부 vs 외부');

addTableSlide(
  '로컬(기기) vs 서버',
  ['기능', '저장·처리', '서버 필요'],
  [
    ['강아지 mood/energy/hunger/affection', 'AsyncStorage + dogWallClock', '❌'],
    ['산책 기록·포인트·리워드 진행', 'AsyncStorage', '❌'],
    ['매일 산책 시간 알림', 'expo-notifications 로컬 DAILY', '❌'],
    ['홈/산책 영상', 'CDN 다운로드 → 기기 캐시', '✅ (정적만)'],
    ['리워드 에피소드', 'CDN URL 스트리밍', '✅ (정적만)'],
    ['근처 산책자·노크·채팅', 'Railway REST + Push', '✅'],
    ['프로필 닉네임·습관', 'AsyncStorage + (선택) profile sync', '△'],
    ['프로필 사진 파일', 'R2 공개 URL', '✅'],
    ['빈 방·walkresult 배경 PNG', '앱 번들 assets/images/', '❌'],
  ],
  [2.4, 3.5, 3.1]
);

addSectionSlide('5. URL · 환경 변수');

addTableSlide(
  '앱 .env (EXPO_PUBLIC_*)',
  ['변수', '기본·예시', '용도'],
  [
    ['EXPO_PUBLIC_WALKY_ORIGIN', 'https://walky.co.kr', 'dogs/ · rewards/ 기준 URL'],
    [
      'EXPO_PUBLIC_NEARBY_WALKER_API_URL',
      'Railway …/api/nearby/presence',
      '산책 heartbeat',
    ],
    [
      'EXPO_PUBLIC_NEARBY_SOCIAL_API_URL',
      'Railway …/api/nearby/social',
      '노크·채팅',
    ],
    [
      'EXPO_PUBLIC_PROFILE_API_URL',
      'Railway …/api/profile',
      '프로필·사진 업로드',
    ],
  ],
  [2.8, 3.5, 2.7]
);

addTableSlide(
  'Railway Variables (서버)',
  ['변수', '예시', '용도'],
  [
    ['PROFILE_STORAGE', 's3', 'R2 사용 시'],
    ['S3_* + S3_PUBLIC_BASE_URL', 'r2.cloudflarestorage.com', '프로필 객체 저장'],
    ['ADMIN_API_KEY', '(비밀)', 'storage-test·admin API'],
    ['PORT', '(Railway 자동)', '직접 설정 비권장'],
  ],
  [2.4, 3.6, 3.0]
);

addSectionSlide('6. 상관관계 다이어그램 (텍스트)');

addBulletSlide('의존 관계', [
  'GitHub ──deploy──▶ Railway (server/) ──read/write──▶ Cloudflare R2',
  'GitHub ──source──▶ EAS Build ──▶ 사용자 기기 APK/IPA',
  '개발 PC ──Metro──▶ dev client (EAS로 빌드한 앱)',
  'Walky App ──HTTPS GET──▶ walky.co.kr (dogs/, rewards/)',
  'Walky App ──HTTPS POST──▶ Railway (presence, social, profile)',
  'Railway ──HTTPS POST──▶ Expo Push (exp.host) ──▶ Walky App',
  'walky.co.kr (가비아) ⟂ Railway — 물리 분리, .env로 앱이 각 URL 연결',
]);

addTableSlide(
  '장애 시 영향 범위',
  ['장애', '영향', '앱 동작'],
  [
    ['walky.co.kr down', '영상·리워드 로드 실패', '홈 영상 X — walky.co.kr 복구 필요'],
    ['Railway down', '근처·노크·프로필 sync', '홈·산책 기록은 가능'],
    ['R2 misconfig', '프로필 사진만', '로컬 사진 URI는 유지'],
    ['GitHub down', '새 배포만', '이미 배포된 앱·서버는 동작'],
    ['EAS down', '앱 빌드만', '기존 설치 앱·expo start는 영향 적음'],
  ],
  [1.8, 3.2, 4.0]
);

addTitleSlide(
  '재생성',
  '파일: server/deploy/Walky-구조도.pptx\n명령: npm run generate:ppt:architecture'
);

await pptx.writeFile({ fileName: outPath });
console.log('Created:', outPath);
