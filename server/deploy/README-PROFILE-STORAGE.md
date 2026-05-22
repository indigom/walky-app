# 프로필 사진 저장 — 가비아 SFTP 차단 시 대안

Railway IP에서 가비아 **SFTP(22)** 가 막히면 `502 Failed to store profile photo` 가 납니다.  
아래 **A / B / C** 중 하나를 선택하세요.

| 방식 | 사진 URL | Railway 설정 | 난이도 |
|------|----------|--------------|--------|
| **A. Cloudflare R2** | R2 공개 URL 또는 커스텀 CDN | `PROFILE_STORAGE=s3` + `S3_*` | 중 (R2 계정) |
| **B. 가비아 HTTPS 릴레이** | `https://walky.co.kr/profile/...` | `PROFILE_STORAGE=gabia-http` + 가비아에 업로드 API | 중 (SSH + 프록시) |
| **C. 앱 → 가비아 직접** | `https://walky.co.kr/profile/...` | Railway는 닉네임·URL만 (`profilePhotoUrl`) | 중 (B와 같은 API) |

진단: `GET /api/admin/storage-test` (헤더 `x-walky-admin-key`)

---

## A. Cloudflare R2 (Railway 권장) ← **현재 권장**

**단계별 설정:** [`README-R2.md`](./README-R2.md)

요약 Railway Variables:

```env
PROFILE_STORAGE=s3
S3_ENDPOINT=https://<ACCOUNT_ID>.r2.cloudflarestorage.com
S3_REGION=auto
S3_BUCKET=walky-profiles
S3_ACCESS_KEY_ID=...
S3_SECRET_ACCESS_KEY=...
S3_PUBLIC_BASE_URL=https://pub-xxxx.r2.dev
S3_KEY_PREFIX=profiles
```

SFTP 변수는 제거하세요. 앱 `.env` 추가 변경 없음.

---

## B. 가비아 서버에 HTTPS 업로드 API

PC FileZilla는 되고 Railway SFTP만 안 될 때, **같은 서버에 HTTP** 로 올립니다.  
(휴대폰·Railway → `https://walky.co.kr/...` 는 SFTP와 다른 경로라 허용되는 경우가 많습니다.)

### 1) 가비아 SSH에 업로드 서비스 설치

```bash
# PC에서 복사 (예)
scp -r server/gabia-profile-upload walkygom@211.47.74.48:~/gabia-profile-upload/
ssh walkygom@211.47.74.48
cd ~/gabia-profile-upload
npm install --production
```

### 2) 실행 (비밀키는 Railway·앱과 동일하게)

```bash
export UPLOAD_API_KEY='긴랜덤문자열'
export SAVE_DIR=/www_root/profiles
export PUBLIC_BASE_URL=https://walky.co.kr/profile
export PORT=3002
node index.js
# 운영: pm2 start index.js --name walky-profile-upload
```

### 3) 웹 프록시

가비아에서 `https://walky.co.kr/api/profile-upload` → `http://127.0.0.1:3002/upload`  
(리버스 프록시·URL 프록시 — `README-GABIA.md` 참고)

### 4) Railway Variables

```env
PROFILE_STORAGE=gabia-http
GABIA_PROFILE_UPLOAD_URL=https://walky.co.kr/api/profile-upload
GABIA_UPLOAD_API_KEY=위와_동일한_UPLOAD_API_KEY
PROFILE_PUBLIC_BASE_URL=https://walky.co.kr/profile
```

테스트:

```bash
curl -X POST -H "x-walky-upload-key: KEY" \
  -F "userId=w_test" -F "photo=@test.jpg" \
  https://walky.co.kr/api/profile-upload
```

---

## C. 앱이 가비아에 직접 업로드 (B와 같은 API)

사진 바이너리는 **Railway를 거치지 않습니다.**

`.env` (Expo):

```env
EXPO_PUBLIC_PROFILE_UPLOAD_URL=https://walky.co.kr/api/profile-upload
EXPO_PUBLIC_PROFILE_UPLOAD_KEY=가비아_UPLOAD_API_KEY와_동일
EXPO_PUBLIC_PROFILE_API_URL=https://walky-app-production-ace0.up.railway.app/api/profile
```

흐름: 앱 → 가비아 `/upload` → URL 수신 → Railway `POST /api/profile` (닉네임 + `profilePhotoUrl` 만)

> 업로드 키가 앱 번들에 포함됩니다. 전용 키·주기적 교체를 권장합니다.

---

## SFTP (기존, Railway에서만 실패 시 제외)

```env
PROFILE_STORAGE=sftp
SFTP_HOST=211.47.74.48
...
```

---

## 앱 재시작

환경 변수 변경 후:

```bash
npx expo start --clear
```
