# Studio Wit Frontend

AI 기반 이미지/비디오 생성 서비스 **Studio Wit**의 프론트엔드 애플리케이션입니다.

## Tech Stack

- **Framework:** Next.js 16 (App Router)
- **Language:** TypeScript
- **Styling:** TailwindCSS v4, CSS Variables (OKLch)
- **UI Components:** @base-ui/react + shadcn
- **Auth:** NextAuth v5 (Google OAuth)
- **i18n:** next-intl (한국어/English)
- **State Management:** Zustand
- **Package Manager:** Yarn 4+ (Corepack)

## Getting Started

### Prerequisites

- Node.js 22+
- Corepack 활성화: `corepack enable`

### 환경변수 설정

`.env.local` 파일을 생성하고 다음 값을 설정합니다:

```env
GOOGLE_CLIENT_ID=<your-google-client-id>
GOOGLE_CLIENT_SECRET=<your-google-client-secret>
AUTH_SECRET=<your-auth-secret>
```

### 설치 및 실행

```bash
yarn install    # 의존성 설치
yarn dev        # 개발 서버 실행 (http://localhost:3000)
```

### 주요 명령어

| 명령어 | 설명 |
|---|---|
| `yarn dev` | 개발 서버 실행 |
| `yarn build` | 프로덕션 빌드 |
| `yarn start` | 프로덕션 서버 실행 |
| `yarn lint` | ESLint 검사 |
| `yarn format` | Prettier 코드 포맷팅 |
| `yarn format:check` | 포맷팅 검사 |

## Project Structure

```
src/
├── app/
│   ├── [locale]/          # i18n 라우팅 (ko, en)
│   │   ├── page.tsx       # 홈 (랜딩 페이지)
│   │   ├── image/         # 이미지 생성
│   │   ├── video/         # 비디오 생성
│   │   └── gallery/       # 커뮤니티 갤러리
│   ├── api/auth/          # NextAuth API 라우트
│   ├── layout.tsx         # 루트 레이아웃
│   └── globals.css        # 글로벌 스타일 & CSS 변수
├── components/
│   ├── Header/, Hero/, Features/, Gallery/, Footer/
│   ├── LanguageSwitcher/
│   └── ui/                # 공통 UI 컴포넌트 (Button, Card, Badge 등)
├── i18n/                  # next-intl 설정 (config, routing, request)
├── auth.ts                # NextAuth 설정
├── middleware.ts           # locale 라우팅 미들웨어
└── lib/utils.ts           # cn() 유틸리티
messages/
├── ko.json                # 한국어 번역
└── en.json                # 영어 번역
```

## i18n (다국어 지원)

- 기본 언어: **한국어(ko)**
- 지원 언어: 한국어, English
- 번역 파일: `messages/ko.json`, `messages/en.json`
- 내부 네비게이션 시 `src/i18n/routing.ts`에서 export하는 `Link`, `useRouter` 등을 사용해야 합니다.

## Deployment

Docker 멀티스테이지 빌드로 배포합니다:

```bash
docker build -t studio-wit-frontend .
docker run -p 3000:3000 studio-wit-frontend
```

Nginx가 리버스 프록시로 프론트엔드(port 3000)와 백엔드 API를 연결합니다.
