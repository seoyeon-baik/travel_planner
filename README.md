# Blueway 여행 플래너

HTML/CSS/JavaScript + Express + Neon PostgreSQL. Node.js 24를 사용합니다.

## 로컬 실행

```sh
npm install
cp .env.example .env  # 기존 .env가 있다면 복사하지 마세요.
# .env의 DATABASE_URL에 Neon Console의 연결 문자열 입력
npm start
```

http://localhost:3000 에 접속합니다. **DATABASE_URL은 필수**이며, 로컬과 배포 환경 모두 Neon PostgreSQL만 사용합니다. `.env`는 서버에서 읽고 Git과 배포 파일에서 제외됩니다. 실제 연결 문자열은 `.env.example`이나 프론트엔드 코드에 넣지 마세요.

SQLite에서 이전한 데이터는 Neon의 `blueway` 스키마에 저장되어 있습니다. 앱에서 사용하는 테이블은 `trips`, `schedules`, `expenses`이며, 서버 재시작·재배포 후에도 유지됩니다. 이전 이력 테이블 `metadata`는 보존되어 있지만 현재 앱에서는 사용하지 않습니다.

이전 전 SQLite 원본·백업·검증 보고서는 `data/`에 보관하고 Git과 Vercel 업로드에서 제외합니다. 현재 앱은 이 파일을 읽거나 변경하지 않습니다. 과제 설명 HTML도 유지합니다.

## GitHub + Vercel 배포

1. `.env`, `data/`, `node_modules/`가 제외된 소스를 GitHub 저장소에 올립니다.
2. Vercel에서 해당 GitHub 저장소를 Import하고 Framework Preset을 **Express**로 선택합니다.
3. 환경변수 **DATABASE_URL**에 Neon의 연결 문자열을 설정합니다. 동시 연결을 위해 Neon의 pooled URL을 권장합니다.
4. Node.js 버전을 **24.x**, Build Command를 **npm run build**로 설정합니다. Output Directory는 별도로 지정하지 않습니다.
5. Deploy 후 `/api/health`에서 `storage: "postgres"`를 확인합니다.

`app.js`가 Vercel 진입점입니다. 빌드는 `index.html`, `css/`, `js/`를 `public/`에 복사하며, Vercel은 이를 정적 파일로 제공합니다. 로컬 `.env`는 Vercel로 업로드하지 않고 Vercel 프로젝트의 Environment Variables에 직접 설정합니다. Preview가 별도 테스트 데이터베이스를 사용해야 한다면 해당 환경에 다른 DATABASE_URL을 지정하세요.

현재 로그인 및 사용자별 데이터 분리는 없으며 같은 서버에 접속하는 사용자가 같은 여행을 관리합니다. `.env`의 `APP_PASSWORD`는 현재 앱에서 사용하지 않습니다.

참고: [Vercel Express 배포](https://vercel.com/docs/frameworks/backend/express), [Neon 연결](https://neon.com/docs/get-started/connect-neon)

## 주요 파일

- `server/app.js`: API와 입력 검증
- `server/postgres-store.js`: Neon 저장소·트랜잭션
- `server/env.js`: 로컬 .env 로드
- `scripts/build.js`: Vercel 정적 파일 준비
- `app.js`: Vercel Express 진입점
- `server/index.js`: localhost 서버 실행
- `js/app.js`: API 기반 프론트엔드

## API

| 메서드 | 경로 | 동작 |
| --- | --- | --- |
| GET | `/api/health` | 서버·DB 상태 |
| GET | `/api/trips` | 전체 여행 조회 |
| GET | `/api/trips/:id` | 여행 상세 조회 |
| POST | `/api/trips` | 여행 생성 |
| PUT | `/api/trips/:id` | 여행과 하위 일정·비용 갱신 |
| DELETE | `/api/trips/:id` | 여행과 하위 데이터 삭제 |

POST/PUT은 여행명·여행지·기간·예산·schedules·extraExpenses를 JSON으로 전달합니다. 비용 합계를 서버에서 계산하며, 여행 삭제 시 연결된 일정과 비용도 삭제됩니다. PUT은 여행 전체를 교체하므로 여러 탭에서 동시에 수정하면 마지막 저장이 적용됩니다.

## 검사

```sh
npm test                 # 외부 DB를 변경하지 않는 API·프론트엔드 회귀 테스트
npm run build            # Vercel 정적 파일 빌드
node scripts/check-neon.js # 실제 Neon API 검증: 임시 여행을 생성 후 삭제
```

회귀 테스트는 테스트 전용 저장소를 주입해 입력 검증과 API 연결을 검사합니다. 실제 PostgreSQL 저장·조회·삭제 검증은 `node scripts/check-neon.js`로 분리합니다.
