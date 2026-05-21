/**
 * Walky 프로필 사진 업로드 API — PPT 생성
 * 실행: node server/deploy/scripts/generate-profile-photo-api-ppt.mjs
 */
import pptxgen from 'pptxgenjs';
import { writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const outPath = join(__dirname, '..', 'Walky-프로필사진-업로드API.pptx');

const pptx = new pptxgen();
pptx.author = 'Walky';
pptx.title = 'Walky 프로필 사진 업로드 API 구성';
pptx.subject = '서버·앱 연동 가이드';
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

  if (notes) {
    slide.addNotes(notes);
  }
}

function addTableSlide(title, headers, rows) {
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
    colW: [2.2, 3.4, 3.4],
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
  'Walky 프로필 사진\n업로드 API 구성',
  '영상·manifest = 가비아 · 근처 API = Railway · 사진 = 공개 HTTPS URL'
);

addBulletSlide('한 줄 요약', [
  '앱 → Railway 업로드 API → 파일 저장소 → 공개 HTTPS URL',
  '근처 산책·노크 API에는 URL만 전달, 상대 앱은 Image로 표시',
  '로컬 file:// 은 내 기기용, 다른 사람에게는 profilePhotoUrl 사용',
]);

addSectionSlide('1. 저장소 선택');

addTableSlide(
  '어디에 파일을 둘까?',
  ['방식', '장점', '단점'],
  [
    [
      'A. 가비아 www/profiles/',
      'walky.co.kr 동일 도메인, dogs/와 같은 운영',
      'Railway → FTP/SFTP 연동 필요',
    ],
    [
      'B. 객체 스토리지 (R2, S3)',
      '재배포해도 유지, 업로드 단순',
      '별도 서비스·도메인 설정',
    ],
    ['C. Railway 디스크', '구현 가장 빠름', '재배포 시 파일 삭제 → 비권장'],
  ]
);

addBulletSlide('권장', [
  '실무: B(R2 등) 또는 가비아 FTP를 이미 쓰면 A',
  '공개 URL 예: https://walky.co.kr/profiles/w_abc123.jpg',
  '읽기 = 정적 HTTPS · 쓰기 = API만',
]);

addSectionSlide('2. API 설계');

addCodeSlide('POST /api/profile/photo', [
  'Content-Type: multipart/form-data',
  '',
  '필드:',
  '  userId  — getWalkyUserId() 와 동일',
  '  photo   — jpeg / png / webp',
  '',
  '응답:',
  '{',
  '  "ok": true,',
  '  "profilePhotoUrl": "https://walky.co.kr/profiles/w_xxx.jpg",',
  '  "updatedAt": 1716123456789',
  '}',
  '',
  '조회: 별도 API 없이 GET 정적 URL',
  '삭제(선택): DELETE /api/profile/photo + userId',
]);

addBulletSlide('서버 처리 순서', [
  '검증: 용량(예 3MB), MIME, userId 형식',
  '가공: sharp → 256×256 JPEG, EXIF 제거',
  '저장: profiles/{userId}.jpg 덮어쓰기',
  '보안(현재): rate limit · 나중에 JWT로 userId 서버 결정',
]);

addSectionSlide('3. 근처 산책 API 연동');

addCodeSlide('presence heartbeat 확장', [
  'POST /api/nearby/presence',
  '{',
  '  "action": "heartbeat",',
  '  "userId": "w_...",',
  '  "profilePhotoUrl": "https://walky.co.kr/profiles/w_....jpg",',
  '  "lat": ..., "lng": ..., "gender": "male"',
  '}',
  '',
  '응답 nearbyWalkers[] 항목에도 profilePhotoUrl 추가',
  '→ 근처 목록·노크·채팅 아바타에 Image { uri }',
]);

addSectionSlide('4. 앱(클라이언트)');

addBulletSlide('온보딩·산책 연동', [
  '1. 사진 선택 → 로컬 persistProfilePhoto (오프라인용)',
  '2. FormData로 POST /api/profile/photo',
  '3. UserProfile에 profilePhotoUrl 저장',
  '4. reportNearbyWalkerPresence에 profilePhotoUrl 포함',
  '',
  'EXPO_PUBLIC_PROFILE_PHOTO_API_URL=',
  '  https://xxxx.up.railway.app/api/profile/photo',
]);

addSectionSlide('5. 배포 체크리스트');

addBulletSlide('Railway + 가비아', [
  '□ multer, sharp 추가 (JSON 32kb와 별도 multipart 라우트)',
  '□ Railway 디스크만 저장 금지',
  '□ 가비아: profiles/ 폴더 + FTP env 변수',
  '□ presence/social 배포 후 앱 필드 연동',
  '□ .env.example 문서화',
]);

addTableSlide(
  '단계별 로드맵',
  ['단계', '내용', '비고'],
  [
    ['1단계', 'POST 업로드 + R2 또는 가비아 FTP', '공개 URL 반환'],
    ['2단계', 'presence/social에 URL 전달', '목록·채팅 UI'],
    ['3단계', '로그인·JWT', 'userId 서버 결정·인증'],
  ]
);

addTitleSlide('질문 & 다음 작업', '저장소: 가비아 FTP vs R2 결정 후 server/profilePhoto.js 구현');

await pptx.writeFile({ fileName: outPath });
console.log('Created:', outPath);
