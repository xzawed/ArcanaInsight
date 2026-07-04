# 리딩 가독성 — 쉬운 말 계약(buildReadabilityContract) 설계 — 2026-07-04

## 문제

타로·사주·신점 리딩이 일상 대화처럼 매끄럽지 않다. 생소한 전문용어·추상 은유·화려한 문어체로 일반 사용자가 이해하기 어렵다.

## 진단 (딥리서치 + 서비스별 적대적 검증)

근본원인은 **프롬프트 지시 예산의 비대칭**이다. depth·문학성 지시는 공통·강제·정량(N문단)으로 다수인데, accessibility 지시는 비공통·정성·1줄로 열세다.

| RC | 내용 | 판정 |
|----|------|------|
| RC1 | 타로 화려·문학 문체 강제("원형적·신화적 의미 탐구", "감각적 묘사", "여운 있는 문장", 유일한 예시가 화려체) | CONFIRMED |
| RC2 | 타로 "에너지·흐름" 추상 명사로 서술 축 규정 | CONFIRMED |
| RC3 | 타로 쉬운말 지시가 종속절 1줄뿐 | CONFIRMED |
| RC4 | 사주 전문용어(용신·십성·대운…)가 JSON 스키마 필드 설명·`【】` 소제목에 박제 | CONFIRMED |
| RC5 | 신점 신명/기운/영적 어휘·`【】` 리터럴 헤더·신탁체 강제 | CONFIRMED |
| RC6 | 3서비스 공통 가독성 계약 부재, depth만 강조 | CONFIRMED |
| RC7 | "몰입·공명" 지시가 문학적 과잉 유도 | CONFIRMED |
| 추가 | 캐릭터 speechStyle(ren 문어체·zero 시적·luna 비유·hoshi 이모지)이 매 프롬프트 최상단에서 레지스터 강제 | CONFIRMED |

## 해결 원칙

**"분량 축소가 아니라 같은 분량을 쉬운 말로."** 문단 수·max_tokens 불변, 깊이의 실현 수단만 미문→구체성으로 재조준. 깊이는 어려운 단어가 아니라 구체적 상황·사례에서 온다.

- 지킬 온기: 2인칭 말 걸기, 해요체, 선명한 이미지 1컷, 열린 질문 여운, 어둠 속 빛의 균형, 캐릭터 개성
- 버릴 과잉: 원형·신화·심연 표면 노출, 추상 명사로 문장 끝내기, 묘사를 위한 묘사, 겹은유, 번역투

## 사용자 결정 (2026-07-04)

- 범위: **P0+P1 6건 + 전 캐릭터 speechStyle 손질**
- 기준 독자: **일반 성인**(운세 비전문가 누구나)
- 사주 용어: **3단 착지 병기**([용어 → 한 줄 비유 → 당신 삶에서는])

## 구현 (F1~F7)

| # | 내용 | 파일 |
|---|------|------|
| F1 | `buildReadabilityContract(domain)` → `{systemSpec, fewShot, footerReminder}` + `READABILITY_LENS`/`READABILITY_FEWSHOT` | `prompt-builder.ts` |
| F2 | 타로 `buildSystemPrompt`·`buildReadingPrompt` 화려체→구체성 재조준 + 배선 | `prompt-builder.ts` |
| F3 | 사주 `getSystemPrompt` readability 배선 + `【】` 평이 rename + 3단 착지 + 데이터 라벨 풀어쓰기 | `saju-service.ts` |
| F4 | 신점 `getSystemPrompt` 배선 + `【】` 평이 rename + 신탁체→상담체 + 중간대화 "느낌 한마디" | `shinjeom-service.ts` |
| F5 | `DIRECT_ANSWER_EVIDENCE` 탈-전문어(세운→운세 흐름, 상(象)→마음) + footer 병합 | `prompt-builder.ts` |
| F6 | 분량 하한마다 "구체적 사례 최소 1개, 추상 표현으로 늘리지 말 것" 페어링 | 3서비스 |
| F7 | 12명 speechStyle 손질(개성 어미·톤 보존, 문어체·시적·비유상시·이모지 완화) | `characters/index.ts` |

테스트: `buildReadabilityContract`(코어 원칙·도메인 렌즈·fewShot), 타로 화려체 예시 부재 회귀 assert, 사주/신점 `【】` 평이 헤더 assert + 쉬운말 계약 포함. `DIRECT_ANSWER_EVIDENCE` 변경으로 기존 directAnswer 렌즈 assert 1건 갱신.

검증: type-check·lint·coverage(98.8/91.35/98.61/99.6)·i18n·doc-links·build 그린, 1060 tests.

## 후속

- 수동 eval: 배포 후 3서비스 각 1건 실제 리딩 생성해 before/after 비교(신비감·온기 유지 + 가독성 향상 동시 확인).
- 자기검증(self-check)은 인라인 1줄 지시로 유지(스트리밍 UX 보존). 필요 시 최종 문단 2-pass는 후속.

## 방법

딥리서치(쉽게쓰기·리딩 크래프트·한국어 톤·계약 설계 4각도) + 서비스별 적대적 진단(타로·사주·신점·횡단) + 설계 합성 다이나믹 워크플로(9 에이전트). 적대 검증이 초안 오귀속(기운=신점, ren≠cairn)을 교정.
