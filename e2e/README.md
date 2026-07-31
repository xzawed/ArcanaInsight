# ArcanaInsight E2E 테스트

> **전체 가이드**: **[docs/tests/e2e-testing.md](../docs/tests/e2e-testing.md)**
>
> 실행 방법 · CI 파이프라인 · 셀렉터 패턴 · Helper 사용법 · 유지보수 규칙은 위 문서를 참조하세요.

---

## 빠른 실행

```bash
pnpm test:e2e          # 3개 디바이스 전체 (headless)
pnpm test:e2e:ui       # UI 모드 (시각적 디버깅)
```

Windows(Claude Code)에서는 Docker 필수 → [§1.2 Windows Docker 실행](../docs/tests/e2e-testing.md#12-windows-docker-실행-필수)

## 구성

- **27개 spec 파일** / **197개 테스트** (Desktop Chrome 기준)
- **3개 디바이스**: Desktop Chrome · Mobile Android (Pixel 7) · Mobile iOS (iPhone 14)
- **Playwright**: `v1.59.1` — CI Docker 이미지와 버전 고정

```
e2e/
├── *.spec.ts           # 27개 테스트 파일
├── helpers/
│   └── sse-mock.ts     # SSE 스트리밍 mock 유틸리티
└── README.md           # 이 파일 (요약 + 리다이렉트)
```
