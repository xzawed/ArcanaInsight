# ArcanaInsight

타로 카드 및 점술 기반 웹 애플리케이션

## 프로젝트 개요

ArcanaInsight는 사용자에게 타로 카드 리딩, 운세, 점술 서비스를 제공하는 웹 애플리케이션입니다.

## 기술 스택

- **언어**: TypeScript
- **프레임워크**: Next.js (App Router)
- **스타일링**: Tailwind CSS
- **상태관리**: 필요 시 Zustand
- **데이터베이스**: 필요 시 결정
- **패키지 매니저**: pnpm
- **CI/CD**: GitHub Actions → Railway 자동 배포
- **호스팅**: Railway

## 프로젝트 구조

```
src/
├── app/          # Next.js App Router 페이지
├── components/   # 재사용 가능한 컴포넌트
├── lib/          # 유틸리티, 헬퍼 함수
├── types/        # TypeScript 타입 정의
├── data/         # 타로 카드 데이터, 점술 데이터
└── styles/       # 글로벌 스타일
public/
├── images/       # 타로 카드 이미지 등 정적 리소스
└── fonts/        # 커스텀 폰트
```

## 코딩 컨벤션

### 일반 규칙

- 한국어 주석 및 커밋 메시지 사용
- 함수/변수명은 영어 camelCase
- 컴포넌트명은 PascalCase
- 파일명은 kebab-case (컴포넌트 파일 제외)

### TypeScript

- `any` 타입 사용 금지, 명시적 타입 정의
- interface 우선 사용 (type alias는 유니온/인터섹션에만)
- strict 모드 활성화

### React/Next.js

- 서버 컴포넌트를 기본으로 사용, 클라이언트 컴포넌트는 필요한 경우에만 `'use client'` 명시
- 컴포넌트는 named export 사용
- Props는 interface로 정의

### 스타일링

- Tailwind CSS 유틸리티 클래스 우선
- 복잡한 애니메이션은 CSS 모듈 또는 Framer Motion 사용
- 다크 모드를 기본 테마로 고려 (점술/타로의 신비로운 분위기)

## 명령어

```bash
pnpm dev          # 개발 서버 실행
pnpm build        # 프로덕션 빌드
pnpm lint         # ESLint 실행
pnpm type-check   # TypeScript 타입 체크
```

## Git 브랜치 전략

- `main`: 프로덕션 브랜치 (Railway 자동 배포 트리거)
- `dev`: 개발 브랜치
- `feature/*`: 기능 개발 브랜치
- `fix/*`: 버그 수정 브랜치

## CI/CD 파이프라인

### GitHub Actions (`.github/workflows/deploy.yml`)

- **PR → main**: lint + type-check + build 검증
- **push → main**: lint + type-check + build + Railway 배포

### Railway 설정

- `railway.toml`에 빌드/배포 설정 정의
- GitHub Secrets 필요:
  - `RAILWAY_TOKEN`: Railway API 토큰
  - `RAILWAY_SERVICE_ID`: Railway 서비스 ID

## 작업 시 주의사항

- 타로 카드 데이터는 `src/data/` 디렉토리에 정적으로 관리
- 이미지 리소스는 `public/images/`에 저장
- 사용자 프라이버시 중시 - 점술 결과는 서버에 저장하지 않음 (클라이언트 사이드 처리 우선)
- 접근성(a11y)을 고려한 UI 구현
- 모바일 퍼스트 반응형 디자인
- `main` 브랜치에 직접 push 금지, PR을 통해 머지
- `.env` 파일은 절대 커밋하지 않음 (Railway 환경변수로 관리)
