# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
yarn dev          # 개발 서버 실행
yarn build        # 프로덕션 빌드
yarn lint         # ESLint 실행
yarn format       # Prettier로 코드 포맷팅
yarn format:check # 포맷팅 검사만 수행
```

패키지 매니저는 Yarn 4+ (corepack)이며, `.yarnrc.yml`에서 `nodeLinker: node-modules`로 설정되어 있다.

## Architecture

Next.js 16 App Router 기반 프론트엔드로, AI 이미지/비디오 생성 서비스(Studio Wit)의 랜딩 및 갤러리 UI를 담당한다.

### Routing & i18n

- `next-intl`을 사용하여 한국어(ko, 기본)/영어(en) 지원
- 모든 페이지는 `src/app/[locale]/` 하위에 위치하며, `src/middleware.ts`가 locale prefix 라우팅 처리
- 번역 파일은 `messages/ko.json`, `messages/en.json`
- 커스텀 네비게이션 훅(Link, redirect, usePathname, useRouter)은 `src/i18n/routing.ts`에서 export

### Authentication

- NextAuth v5 beta (`next-auth@5.0.0-beta.30`) + Google OAuth
- 설정: `src/auth.ts` → 핸들러: `src/app/api/auth/[...nextauth]/route.ts`
- 환경변수: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`

### Component Pattern

각 컴포넌트는 폴더 단위로 구성:
- `index.tsx` — 컴포넌트 구현
- `const.ts` — 상수/설정값 (CVA variants 포함)
- `types.ts` — TypeScript 인터페이스

UI 컴포넌트(`src/components/ui/`)는 `@base-ui/react` 기반 shadcn 스타일이며, `cn()` 유틸리티(`clsx` + `tailwind-merge`)로 클래스를 병합한다.

### Styling

- TailwindCSS v4 + CSS variables (OKLch 색상 공간)
- 다크 모드가 기본 활성화 (`className="dark"`)
- 글로벌 스타일/커스텀 프로퍼티: `src/app/globals.css`

### Deployment

- `output: "standalone"` 설정으로 Docker 컨테이너 배포에 최적화
- 멀티스테이지 Dockerfile (node:22-alpine)
- Nginx가 프론트(port 80→3000) 리버스 프록시 및 `/api` → 백엔드(`http://13.125.226.36:8000`) 라우팅 담당

## Code Style

- Prettier: 세미콜론 사용, 더블쿼트, tabWidth 2, trailingComma "all", printWidth 80
- ESLint: next/core-web-vitals + next/typescript + prettier
- TypeScript strict 모드 미사용
- Path alias: `@/*` → `./src/*`
