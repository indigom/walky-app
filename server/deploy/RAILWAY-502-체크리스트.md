# Railway 502 / Application failed to respond — 체크리스트

로그에 `Walky API listening on ...` 가 있는데 URL만 502일 때, **거의 항상 “도메인이 다른 서비스에 붙음”** 또는 **Target Port 불일치**입니다.

## 1. 도메인이 붙은 “서비스” 찾기 (가장 중요)

한 **프로젝트** 안에 서비스가 **2개**일 수 있습니다 (예: Expo + API).

1. Railway → 프로젝트 (`truthful-elegance` 등) 열기
2. **서비스가 2개**면 각각 클릭
3. **Settings → Networking** 에서  
   `walky-app-production-778c.up.railway.app` 가 **어느 서비스**에 있는지 확인
4. **Deployments → Logs** 에 `Walky API listening` 이 있는 서비스와 **같은 서비스**에 도메인이 있어야 함

**다른 서비스에 도메인이 있으면:**  
그 도메인 **삭제** → API 로그 있는 서비스 → **Generate Domain** (새 URL 사용)

## 2. Railway가 알려 주는 URL로 열기

API 서비스 → **Deployments** → **Active(초록)** 배포 → **View logs** 옆  
**Open / Visit / Public URL** 버튼이 있으면 그걸로 `/health` 접속.

수동 URL보다 **이 링크가 Target Port를 맞춘 경우**가 많습니다.

## 3. Target Port

1. Logs: `Walky API listening on http://0.0.0.0:XXXX`
2. **Networking → Target Port** = **XXXX** (8080·8081 등 고정 가정 금지)
3. 안 되면 Target Port **삭제(Auto)** 후 Redeploy → 도메인 다시 Generate

## 4. Variables

- `PORT` 를 **직접 넣지 않음** (Railway 자동 값과 Target Port가 어긋남)

## 5. GitHub Source `Failed to fetch`

자동 배포가 안 됨 → Settings → Source → repo 재연결 → Redeploy.

## 6. 그래도 안 되면 — 새 프로젝트 1개만

1. **New Project** → Deploy from GitHub → `indigom/walky-app`
2. **서비스 1개만** → Root Directory `server`
3. **Generate Domain** (새 주소)
4. `/health` → JSON 확인 후 `.env` URL 교체
5. 옛 프로젝트 2개 삭제

성공 시: `{"ok":true,"service":"walky-api","port":8080}`
