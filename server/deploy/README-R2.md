# 프로필 사진 — Cloudflare R2 (A안)

가비아 SFTP 없이 **Railway → R2** 로 저장합니다. 앱 `.env`는 기존 `EXPO_PUBLIC_PROFILE_API_URL` 만 있으면 됩니다.

---

## 1. Cloudflare R2 버킷

1. [Cloudflare Dashboard](https://dash.cloudflare.com) 로그인  
2. **R2 Object Storage** → **Create bucket**  
3. 이름 예: `walky-profiles` (아래 `S3_BUCKET` 과 동일)

### 공개 URL (필수)

프로필 사진은 앱·다른 사용자 기기에서 **HTTPS로 열려야** 합니다.

**방법 1 — R2.dev 공개 URL (가장 빠름)**

1. 버킷 → **Settings**  
2. **Public access** → **Allow Access** / **Enable**  
3. 표시되는 URL 복사 (예: `https://pub-xxxxxxxx.r2.dev`)  
   → Railway `S3_PUBLIC_BASE_URL` 에 넣습니다 (끝에 `/` 없이).

**방법 2 — 커스텀 도메인** (나중에 `cdn.walky.co.kr` 등 연결 가능)

버킷 Settings → **Custom Domains** 에서 Cloudflare DNS 연결 후,  
`S3_PUBLIC_BASE_URL=https://cdn.walky.co.kr` 처럼 설정합니다.

---

## 2. API 토큰 (S3 호환 키)

1. R2 → **Manage R2 API Tokens** → **Create API token**  
2. 권한: 해당 버킷 **Object Read & Write** (또는 Admin Read & Write)  
3. 생성 직후만 보이는 값 복사:  
   - **Access Key ID** → `S3_ACCESS_KEY_ID`  
   - **Secret Access Key** → `S3_SECRET_ACCESS_KEY`

### S3 API 엔드포인트

토큰 생성 화면 또는 R2 개요에 나오는 **S3 API** URL:

```text
https://<ACCOUNT_ID>.r2.cloudflarestorage.com
```

`<ACCOUNT_ID>` 는 Cloudflare 계정 ID (대시보드 URL·R2 설정에 표시).

---

## 3. Railway Variables

서비스 → **Variables** (Raw Editor 가능).

```env
PROFILE_STORAGE=s3

S3_ENDPOINT=https://<ACCOUNT_ID>.r2.cloudflarestorage.com
S3_REGION=auto
S3_BUCKET=walky-profiles
S3_ACCESS_KEY_ID=복사한_Access_Key
S3_SECRET_ACCESS_KEY=복사한_Secret

S3_PUBLIC_BASE_URL=https://pub-xxxxxxxx.r2.dev
S3_KEY_PREFIX=profiles
```

### 정리

| 변수 | 설명 |
|------|------|
| `PROFILE_STORAGE` | 반드시 `s3` (SFTP보다 우선 고정) |
| `S3_ENDPOINT` | `*.r2.cloudflarestorage.com` (공개 URL 아님) |
| `S3_PUBLIC_BASE_URL` | 브라우저에서 JPG가 열리는 **pub-…r2.dev** 또는 CDN |
| `S3_KEY_PREFIX` | 객체 경로 접두. `profiles` → `profiles/w_xxx.jpg` |

**제거·비우기 권장** (502/SFTP 혼선 방지):  
`SFTP_HOST`, `SFTP_USER`, `SFTP_PASSWORD`, `SFTP_REMOTE_DIR`

`ADMIN_API_KEY` 는 진단용으로 유지해도 됩니다.

저장 후 **Deploy** 또는 **Redeploy** 한 번 실행.

---

## 4. 동작 확인

### A) 저장 백엔드

```cmd
curl.exe https://walky-app-production-ace0.up.railway.app/health
```

`profileStorage.mode` 가 `"s3"` 이어야 합니다.

### B) 버킷·권한 (ADMIN_API_KEY 설정 시)

```cmd
curl.exe -H "x-walky-admin-key: YOUR_ADMIN_KEY" https://walky-app-production-ace0.up.railway.app/api/admin/storage-test
```

`ok: true`, `sampleUrl` 예: `https://pub-xxx.r2.dev/profiles/w_test.jpg`

### C) 앱에서 프로필 사진 업로드

1. PC `.env` — `EXPO_PUBLIC_PROFILE_API_URL` 이 Railway `/api/profile` 인지 확인  
2. `npx expo start --clear`  
3. 프로필 사진 등록 → 성공 시 `profilePhotoUrl` 이 `https://pub-....r2.dev/profiles/w_....jpg` 형태  
4. 그 URL을 PC 브라우저에서 열어 이미지가 보이는지 확인  

---

## 5. 자주 나는 오류

| 증상 | 조치 |
|------|------|
| `storage.mode` null | `S3_*` 4개 + `S3_PUBLIC_BASE_URL` 모두 설정했는지 확인 |
| storage-test `Access Denied` | API 토큰 권한·버킷 이름 일치 |
| storage-test OK, 업로드 502 | Deploy Logs 의 `detail` 확인. `S3_ENDPOINT` 오타 |
| 업로드 OK, URL 404 | 버킷 **Public access** 미설정 또는 `S3_PUBLIC_BASE_URL` 이 pub URL 과 불일치 |
| 예전 SFTP 502 | SFTP 변수 삭제, `PROFILE_STORAGE=s3` 명시 후 Redeploy |

---

## 6. 비용·한도

R2 무료 구간(스토리지·Class A/B 요청) 안에서 프로필 사진 규모(256×256 JPEG)는 보통 소량입니다.  
대시보드에서 사용량만 가끔 확인하면 됩니다.

---

## 앱 설정 (변경 없음)

R2 사용 시 **추가 Expo 변수 불필요** (`EXPO_PUBLIC_PROFILE_UPLOAD_URL` 없음).

```env
EXPO_PUBLIC_PROFILE_API_URL=https://walky-app-production-ace0.up.railway.app/api/profile
```

서버가 반환한 `profilePhotoUrl` 을 앱이 그대로 저장·표시합니다.
