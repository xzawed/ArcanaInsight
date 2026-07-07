# 아카이브된 설계(spec) 인덱스

> 구현 완료 + 활성 문서에서 미참조된 설계 문서를 보관하는 디렉토리. 활성 작업 디렉토리(`docs/superpowers/specs/`)를 깔끔하게 유지하기 위해 분리.

## 보관 정책

- **구현 완료 + 활성 문서 미참조** spec은 본 디렉토리로 이동한다.
- **정본으로 참조 중이거나 여전히 활성**인 spec은 구현 완료 여부와 무관하게 상위 `specs/`에 유지한다 (예: `CLAUDE.md`·`docs/architecture/*.md`·`docs/operations/known-issues.md`가 링크하는 설계 문서).
- 파일 자체는 삭제하지 않는다 (의사결정 흐름·논의 맥락 보존).
- 새 설계 문서를 작성하면 부모 디렉토리에 위치시키고, 구현 완료·미참조 확인 후 본 디렉토리로 옮긴다. 이동 전 `grep -rn "<파일명>" docs/ CLAUDE.md .claude/`로 인바운드 참조 0건을 확인한다.

## 인벤토리 (25개)

| 파일 | 작성 시점 | 주제 |
|---|---|---|
| `01-arcana-insight-design.md` | 2026-03-29 | MVP 초기 설계 (캐릭터 4→12명 등 구현 시 변경) |
| `02-character-selection-jrpg-design.md` | 2026-03-29 | JRPG 풍 캐릭터 선택 설계 (성별 필터 추가로 변경) |
| `03-premium-home-redesign.md` | 2026-03-29 | 프리미엄 홈 리디자인 (섹션 8→10개로 변경) |
| `04-tarot-visual-upgrade-design.md` | 2026-03-29 | 타로 비주얼 업그레이드 (스프라이트 시트 방식 미채택) |
| `05-user-info-input-design.md` | 2026-03-30 | UserInfo 입력 폼 설계 |
| `06-card-skin-system-design.md` | 2026-03-31 | 카드 스킨 시스템 설계 |
| `07-saju-service-design.md` | 2026-03-31 | 사주 서비스 최초 설계 (2026-04-02 전면 재설계로 대체) |
| `2026-04-02-saju-matrix-redesign.md` | 2026-04-02 | 사주 프로세스 재설계: 시간단위 × 분석영역 매트릭스 |
| `2026-04-11-db-provider-migration-design.md` | 2026-04-11 | DB Provider 마이그레이션(Drizzle) 설계 |
| `2026-04-26-railway-sonarcloud-mcp-design.md` | 2026-04-26 | Railway+SonarCloud MCP 연동 설계 (이상 감지 시 자동 진단) |
| `2026-05-01-code-doc-cleanup-design.md` | 2026-05-01 | 전체 코드·문서 멀티 에이전트 심층 정리 설계 |
| `2026-05-01-e2e-multiagent-design.md` | 2026-05-01 | 가상 실사용자 멀티 에이전트 E2E 전수 검증 설계 (~252 조합) |
| `2026-05-01-ui-revitalization-meeting-minutes.md` | 2026-05-01 | UI 활성화(Visual FX) 디자인 회의록 |
| `2026-05-01-visual-fx-revitalization-design.md` | 2026-05-01 | Visual FX Revitalization 설계 |
| `2026-05-02-shuffle-ceremony-design.md` | 2026-05-02 | 타로 카드 셔플 의식(ShuffleCeremony) 설계 |
| `2026-05-09-arcana-character-effect-review.md` | 2026-05-09 | Arcana 캐릭터 이펙트 브라우저 리뷰 |
| `2026-05-09-arcana-image-upscale-sample.md` | 2026-05-09 | 캐릭터 이미지 업스케일 샘플 검토 |
| `2026-05-09-theme-atmosphere-character-polish-design.md` | 2026-05-09 | 테마 분위기·캐릭터 엣지 폴리시 설계 |
| `2026-05-09-theme-atmosphere-flow-coverage-design.md` | 2026-05-09 | 테마 분위기 플로우 커버리지 설계 |
| `2026-05-10-doc-audit-role-alignment-design.md` | 2026-05-10 | 문서 감사 및 역할 정렬 설계 |
| `2026-05-10-visual-overhaul-design.md` | 2026-05-10 | Visual Overhaul(초고퀄리티 일러스트+테마 통합 이펙트) 설계 |
| `2026-05-11-daily-fortune-design.md` | 2026-05-11 | Daily Fortune Widget(오늘의운세 확장) 설계 |
| `2026-05-12-userinfo-birthtime-mbti-design.md` | 2026-05-12 | UserInfo 개선: 출생 시각 정밀 입력 + MBTI 선택 설계 |
| `2026-05-15-code-doc-cleanup-design.md` | 2026-05-15 | 전체 코드·문서 정리 설계 (262파일/~31K 라인) |
| `2026-05-29-tarot-reading-quality-design.md` | 2026-05-29 | 타로 리딩 품질 개선(3섹션 카드 해석 + directAnswer) 설계 |

## 상위 디렉토리(활성 `specs/`) 현재 파일 수

7개 — 정본으로 참조되거나 완료 후 재검토 보류 중인 설계 문서. 개별 목록은 `docs/superpowers/specs/` 디렉토리를 참고한다.
