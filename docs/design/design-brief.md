# ArcanaInsight — Claude Design 의뢰서
> **제출처:** Claude Design (Anthropic Research Preview)  
> **프로젝트 타입:** Design System + Prototype  
> **작성 기준:** 첨부 스크린샷 + 캐릭터 이미지 참조

---

## 1. 서비스 개요

**ArcanaInsight**는 일본 애니메이션 스타일의 AI 캐릭터 12명과 1:1로 대화하며 타로(카드 점), 사주(사주팔자), 신점(신비 점술) 리딩을 받는 **AI 운세 종합 플랫폼**입니다. 사용자는 상담사(캐릭터)를 선택하고, 카드를 뽑거나 생년월일을 입력하면 캐릭터가 실시간 스트리밍으로 운세 해석을 건네줍니다.

현재 서비스는 기능 완성 단계이며, **이번 의뢰는 전체 UI를 고급 콘텐츠 서비스 수준으로 시각적 대재편**하는 것이 목적입니다. 참고 레퍼런스: Genshin Impact UI 품질, Honkai Star Rail 분위기 전환, Golden Thread Tarot 앱 신비감.

---

## 2. 현재 서비스 화면 구성 (첨부 스크린샷 참조)

| 스크린 | 설명 | 첨부 파일명 |
|---|---|---|
| 홈(/) | HeroSection + 캐릭터 갤러리 + 서비스 선택 CTA | `screenshot_home.png` |
| 타로 세션 — 카드 선택 | 좌: 캐릭터, 우: 카드 덱/스프레드 선택 | `screenshot_tarot_select.png` |
| 타로 세션 — 리딩 중 | 카드 공개 중, AI 스트리밍 텍스트 | `screenshot_tarot_reading.png` |
| 타로 결과 | 카드별 해석 + 종합 해석 + 공유 버튼 | `screenshot_tarot_result.png` |
| 사주 세션 | 생년월일 입력 → 리딩 결과 | `screenshot_saju.png` |
| 신점 세션 | 채팅형 인터페이스 | `screenshot_shinjeom.png` |
| 테마 변형 | midnight/dawn/spring 테마 적용 화면 | `screenshot_theme_*.png` |

**레이아웃 기본 구조 (타로/사주 세션):**
- 데스크탑: 화면을 정확히 5:5로 분할 — 왼쪽 캐릭터 영역, 오른쪽 콘텐츠 영역
- 모바일: 상단 25% 캐릭터 (가로 전체), 하단 75% 콘텐츠
- 배경: 3레이어 — MysticBackground(SVG) + ThemeAtmosphere(파티클) + ParticleOverlay(부동 점)

---

## 3. 캐릭터 로스터 (12명) — 첨부 이미지 참조

> 모든 캐릭터 이미지는 1408×768px PNG 누끼(배경 제거) 파일입니다.

| ID | 이름 | 성별 | 외형 | 성격/말투 | 오라 컬러 | 파티클 타입 |
|---|---|---|---|---|---|---|
| arcana | 아르카나 | 여 | 고양이귀 은발 소녀, 보라 눈동자, 수정구슬 | 신비롭고 따뜻한 마녀, 부드러운 어미 | `#a78bfa` / `#c084fc` | sparkle |
| miko | 미코 | 여 | 검은 장발+붉은 리본, 흰 하카마 | 엄숙하고 자비로운 무녀, 격식체 | `#ef4444` / `#fbbf24` | petal |
| seonhwa | 선화 | 여 | 갈색 장발+벚꽃장식, 분홍 한복+부채 | 우아하고 지혜로운 선녀 | `#f9a8d4` / `#fde68a` | petal |
| hoshi | 호시 | 여 | 파스텔 숏컷, 파란 눈, 별자리 의상 | 발랄하고 에너지 넘치는 별의 정령 | `#60a5fa` / `#c084fc` | star |
| luna | 루나 | 여 | 은청색 롱헤어, 별자리 드레스, 반투명 망토 | 신비롭고 따뜻한 달의 수호자 | `#93c5fd` / `#c4b5fd` | bubble |
| rei | 레이 | 여 | 순백 숏컷, 붉은 눈, 검은 장갑 | 냉철하고 정확한 분석가, 건조한 말투 | `#f8fafc` / `#dc2626` | snowflake |
| cairn | 카이른 | 남 | 짙은 남색 헤어, 금빛 눈, 블레이저+마법 브로치 | 귀족적 젠틀맨 마법사, 격식 있는 말투 | `#fbbf24` / `#1e3a5f` | sparkle |
| zero | 제로 | 남 | 검붉은 헤어(한쪽 눈 가림), 검은 후드코트+체인 | 미스터리한 다크 로맨티스트 | `#dc2626` / `#1a1a2e` | flame |
| haru | 하루 | 남 | 밝은 금발, 흰 셔츠+청바지+별 귀걸이 | 따뜻하고 듬직한 햇살 같은 상담사 | `#fbbf24` / `#fb923c` | star |
| ren | 렌 | 남 | 흑발 장발 묶음, 동양풍+연꽃 장식, 부채 | 고요하고 지혜로운 도사, 고풍 문어체 | `#2dd4bf` / `#064e3b` | rune |
| lix | 릭스 | 남 | 네온그린+퍼플 투톤, 헤드폰, 디지털 재킷 | 장난꾸러기 트릭스터, 장난스러운 말투 | `#4ade80` / `#a855f7` | lightning |
| ethan | 에단 | 남 | 샴페인골드 헤어, 에메랄드×금 오드아이, 은테 안경, 블랙+골드 예복 | 성좌의 대마법사, 학구적이고 친절 | `#fbbf24` / `#10b981` | rune |

**첨부 캐릭터 이미지:**
- `arcana_default.png` — 대표 여성 캐릭터 (신비/마법)
- `zero_default.png` — 대표 다크 남성 캐릭터
- `hoshi_default.png` — 대표 발랄 여성 캐릭터
- `ethan_default.png` — 대표 귀족 남성 캐릭터

---

## 4. 테마 시스템 (8종)

현재 테마는 CSS 변수로 색상만 교체됩니다. 각 테마에 **고유한 자연 이펙트**가 없어 몰입감이 부족합니다.

| 테마 ID | 한국어명 | 현재 주요 색상 | 목표 시그니처 이펙트 | 자연 현상 |
|---|---|---|---|---|
| midnight | 자정 | `#1a1a2e`, `#7c3aed`, `#a78bfa` | 별똥별 + 오로라 흐름 | 밤하늘 |
| dawn | 새벽 | `#1e1b4b`, `#7c3aed`, `#c084fc` | 아침 이슬 방울 + 빛 rays | 일출 |
| sunset | 황혼 | `#2d1b69`, `#db2777`, `#f97316` | 황혼 빛 산란 + 먼지 입자 | 석양 |
| spring | 봄 | `#1a2e1a`, `#16a34a`, `#4ade80` | 벚꽃 낙화 + 나비 실루엣 | 봄바람 |
| summer | 여름 | `#1a2e1a`, `#0ea5e9`, `#fbbf24` | 반딧불 + 열기 아지랑이 | 여름밤 |
| autumn | 가을 | `#2d1b00`, `#b45309`, `#fbbf24` | 단풍잎 낙엽 + 바람결 | 가을바람 |
| winter | 겨울 | `#0c1a2e`, `#0ea5e9`, `#e2e8f0` | 눈송이 낙설 + 성에 결정 | 눈보라 |
| dark | 암흑 | `#000000`, `#dc2626`, `#7c3aed` | 심연 왜곡 + 어둠의 파동 | 심연 |

---

## 5. 디자인 요청 — 5개 영역

---

### 영역 A — 캐릭터 생동감 (PRIORITY 1)

**현재 문제 (스크린샷 참조):**
- 캐릭터가 완전히 정적인 PNG로만 표시됨
- 감정(mood) 변화가 이미지 교체만으로 처리되어 어색한 점프 발생
- 캐릭터 주변 오라가 단순 글로우 원형이며 캐릭터 개성이 없음
- 데스크탑 5:5 레이아웃에서 캐릭터가 실제 차지하는 화면 비율이 낮음

**목표:**
- 캐릭터별 **idle 애니메이션** — arcana/luna: 부드러운 float(상하 8px, 4초), hoshi: bounce(활발), rei: 미세 breathe(가슴 1.01x), zero: 느린 drift(옆으로 흔들림)
- 감정 변화 시 **자연스러운 크로스페이드** (opacity 교차, 0.3초)
- 캐릭터 주변 **개성 오라** — 캐릭터별 색상 + particleStyle 기반 (위 표 참조)
  - sparkle: 빛나는 마름모 입자 (arcana, cairn, ethan)
  - petal: 꽃잎 형태 (miko, seonhwa)
  - star: 별 형태 (hoshi, haru)
  - bubble: 방울 형태 (luna)
  - snowflake: 눈결정 (rei)
  - flame: 불꽃 형태 (zero)
  - rune: 룬 문자 형태 (ren, ethan)
  - lightning: 전기 번개 (lix)
- 데스크탑에서 캐릭터 높이를 **뷰포트의 85~90%**까지 확대

**요청 산출물:**
1. 캐릭터 idle 애니메이션 스펙 시트 (4종 패턴: float/bounce/breathe/drift)
2. 오라 8종 파티클 시각 참고 — 형태, 크기, 움직임 방향, 투명도 범위
3. 감정 전환 모션 가이드 (default→smile, default→mystical 등 주요 6가지)
4. 타로 세션 캐릭터 영역 Before/After 목업 (데스크탑 + 모바일)

---

### 영역 B — 배경 오브젝트 & 심도 (PRIORITY 2)

**현재 문제:**
- 배경이 단일 레이어로 flat하게 느껴짐
- 타로/사주/신점 서비스 배경이 사실상 동일
- 배경 오브젝트가 랜덤 부동만 있어 테마 정체성 없음

**목표:**
- **3단계 Parallax 레이어:**
  - Far(원거리): 느린 이동, 낮은 opacity, 큰 오브젝트 — 마우스 이동에 `translateX/Y ±5px`
  - Mid(중거리): 중간 이동, 중간 opacity — `±15px`
  - Near(근거리): 빠른 이동, 높은 opacity, 작은 오브젝트 — `±30px`
- **서비스별 시그니처 오브젝트:**
  - 타로: 유성, 회전하는 카드 실루엣, 별자리선 패턴
  - 사주: 오행(화/수/목/금/토) 심볼 원형, 팔괘 회전 패턴
  - 신점: 수정구 반짝임, 안개 흐름, 불꽃 일렁임
- **phase별 배경 강도 변화:**
  - 카드 선택 중: 기본 밝기 (100%)
  - 리딩 대기 중: 어두워짐 (60%), 집중 분위기
  - 결과 완료: 밝아짐 (130%), 파티클 증가, 축하 분위기

**요청 산출물:**
1. 서비스 3종 × 테마 3종 배경 비주얼 시안 (9개 섬네일, 각 400×300px)
2. Parallax 3레이어 구성도 (오버레이 설명도)
3. 서비스별 시그니처 오브젝트 디자인 (SVG 아이콘 수준)

---

### 영역 C — 테마별 자연 이펙트 (PRIORITY 2)

**현재 문제:**
- 테마 간 색상만 다르고 파티클이 모두 단순 원형 점
- 계절/시간대 이펙트(눈, 비, 꽃잎, 반딧불)가 미구현
- 테마 전환 시 즉각적 교체로 어색함

**목표:**
- 7테마 각각 **고유 자연 현상 파티클:**
  - midnight: 별똥별(선형 궤적, 빠른 소멸), 오로라(느린 흔들림 커튼)
  - dawn: 이슬방울(타원 방울, 천천히 낙하), 빛 줄기(방사형 rays)
  - sunset: 먼지 입자(불규칙 부동), 황혼 빛 산란(gradient shimmer)
  - spring: 벚꽃 꽃잎(회전하며 낙하), 나비 실루엣(8자 패스)
  - summer: 반딧불(발광 점, 랜덤 궤적), 아지랑이(수직 왜곡)
  - autumn: 단풍잎(회전+낙하), 바람결(수평 흐름선)
  - winter: 눈송이(6각 결정, 천천히 낙설), 성에 파편
- **테마 전환 크로스페이드** 1초 — 구 파티클 fade-out + 신 파티클 fade-in 동시

**요청 산출물:**
1. 7테마 무드보드 (각 테마당 1장, 분위기/색온도/이펙트 방향 표현)
2. 파티클 스펙 시트:
   - 각 테마별: 파티클 형태(shape), 크기(px), 수량, 속도(px/s), opacity 범위, 색상
3. 테마 전환 트랜지션 시퀀스 도식 (비주얼)

---

### 영역 D — 홈 페이지 고도화 (PRIORITY 3)

**현재 문제:**
- HeroSection이 텍스트+캐릭터 나열 수준으로 첫인상 약함
- 서비스(타로/사주/신점) 선택이 단순 버튼 리스트
- 캐릭터 갤러리가 평면 그리드

**목표:**
- **풀스크린 인터랙티브 히어로:**
  - 배경 전체가 살아있는 우주/신비 공간
  - 캐릭터 1인이 화면 80%를 차지하며 등장
  - 파티클이 캐릭터를 감싸며 흐름
  - 하단에 "운세 보러가기" CTA
- **서비스 선택 화면:**
  - 타로/사주/신점 세 카드 hover 시 해당 서비스 배경 미리보기
  - 선택 시 배경이 서비스 테마로 전환되며 화면 전체 인터랙션
- **캐릭터 갤러리:**
  - 스크롤 시 3D perspective — 앞쪽 캐릭터 크게, 뒤쪽 작게
  - 캐릭터 hover 시 오라 활성화 + 인사말 타이핑

**요청 산출물:**
1. 히어로 섹션 고해상도 목업 (데스크탑 1440px + 모바일 390px)
2. 서비스 선택 인터랙션 플로우 (hover/click 상태 3종)
3. 캐릭터 갤러리 3D 배치 레이아웃 가이드

---

### 영역 E — 카드 공개 & 리딩 결과 고도화 (PRIORITY 3)

**현재 문제:**
- 카드 공개 애니메이션이 단순 Y축 flip
- 리딩 완료 후 "완료" 축하 연출이 없음
- 결과 텍스트 카드가 일반 배경 박스

**목표:**
- **카드 공개 시 빛 폭발 reveal:**
  - 뒤집히는 순간 glow burst (0.3초, 카드 테마 색상)
  - 주변 파티클 방사 (15개, 0.5초 소멸)
  - lens flare 효과 (카드 상단 우측)
- **리딩 완료 축하 연출:**
  - 캐릭터가 smile 표정으로 전환 + float 강도 증가
  - 배경 파티클 2배 증가, 밝기 +30%
  - 화면 상단에서 confetti-style 파티클 낙하 (1.5초)
- **결과 텍스트 카드:**
  - 테마색 흐르는 테두리 애니메이션 (gradient border animation)
  - 텍스트 나타남 시 glow fade-in
- **공유 이미지:**
  - 배경: 테마별 프리미엄 그라데이션
  - 상단: 캐릭터 이름 + 로고
  - 하단: 핵심 리딩 텍스트 + 별자리 장식

**요청 산출물:**
1. 카드 reveal 모션 스토리보드 (6프레임: 뒤집기 전 → burst → 안정)
2. 리딩 완료 화면 Before/After 목업
3. 공유 이미지 카드 디자인 템플릿 (3종: arcana/zero/hoshi 버전)

---

## 6. 레퍼런스 에스테틱

**참고 작품:**
- **Genshin Impact UI** — 캐릭터 생동감, 배경 파티클 밀도, 부드러운 전환
- **Honkai Star Rail 로비** — 테마별 분위기 전환 퀄리티, 스타필드 효과
- **Golden Thread Tarot 앱** — 타로 특유의 신비감, 카드 reveal 연출
- **Alto's Odyssey** — 자연 이펙트(눈, 새벽빛)의 자연스러움과 시적 분위기

**디자인 핵심 원칙:**
1. **Alive** — 화면에 정지한 요소가 없어야 한다 (최소 subtle breathing)
2. **Immersive** — 서비스 화면 밖의 신비로운 세계가 느껴져야 한다
3. **Theme-authentic** — 테마마다 "이 테마다"라고 즉각 체감되어야 한다
4. **Character-driven** — 모든 시각 요소가 캐릭터의 존재감을 지원해야 한다

---

## 7. 기술 제약 (구현 팀 전달용)

| 항목 | 제약 |
|---|---|
| 애니메이션 라이브러리 | **Framer Motion v12** 사용 중 — 이 범위 내 구현 필요 |
| CSS 시스템 | **Tailwind CSS v4** + CSS 변수 기반 테마 (`--theme-glow-color` 등) |
| 캐릭터 이미지 | `1408×768px` 누끼 PNG, 경로: `/images/characters/[id]/nukki-enhanced/[mood].png` |
| SSR | Next.js App Router — `Date`, `Math.random`, `window` 객체는 `useEffect` 내에서만 |
| 접근성 | `prefers-reduced-motion` CSS 미디어 쿼리 — 모든 애니메이션에 감소 fallback 필수 |
| 모바일 성능 | iOS Safari 기준 파티클 최대 **30개** 제한 |
| 데스크탑 성능 | 60fps 유지 목표, 파티클 최대 **80개** |
| 레이아웃 고정 규칙 | 캐릭터 등장 페이지: 데스크탑 정확히 **50:50** 분할 (md:w-[50%]) |
| 프레임워크 | Next.js 16.2.11 App Router, React 19.2.4 |

---

## 8. 첨부 파일 체크리스트

> **모든 파일은 `docs/design/` 하위에 준비 완료** (Playwright 자동 캡처 + 이미지 복사)

### 스크린샷 — `docs/design/screenshots/` (13장)
- [x] `screenshot_home.png` — 홈 페이지 (1440×900, spring 테마)
- [x] `screenshot_tarot_select.png` — 타로 카드 선택 화면 (아르카나 세션)
- [x] `screenshot_tarot_topic.png` — 타로 주제 선택 화면
- [x] `screenshot_tarot_spread.png` — 타로 스프레드 선택 화면
- [x] `screenshot_tarot_reading.png` — 타로 리딩 중 (AI 스트리밍)
- [x] `screenshot_tarot_result.png` — 타로 결과 완료 화면
- [x] `screenshot_saju.png` — 사주 서비스 화면
- [x] `screenshot_shinjeom.png` — 신점 서비스 화면
- [x] `screenshot_theme_midnight.png` — 한밤의 신비(midnight) 테마
- [x] `screenshot_theme_spring.png` — 벚꽃 봄바람(spring) 테마
- [x] `screenshot_theme_panel.png` — 테마 선택 패널 UI
- [x] `screenshot_mobile_session.png` — 모바일(390×844) 타로 세션
- [x] `screenshot_mobile_home.png` — 모바일(390×844) 홈 화면

### 캐릭터 이미지 — `docs/design/characters/` (12명 × 7표정 = 84장)

> 파일명 규칙: `{캐릭터ID}_{표정}.png` / 원본: `public/images/characters/{id}/nukki-enhanced/{mood}.png`  
> 표정 7종: `default` · `idle` · `mystical` · `serious` · `smile` · `surprised` · `wink`

| 캐릭터 | 성별 | 오라 | 파티클 | 이미지 파일 (7장) |
|---|---|---|---|---|
| arcana (아르카나) | 여 | `#a78bfa`/`#c084fc` | sparkle | `arcana_default/idle/mystical/serious/smile/surprised/wink.png` |
| miko (미코) | 여 | `#ef4444`/`#fbbf24` | petal | `miko_default/idle/mystical/serious/smile/surprised/wink.png` |
| seonhwa (선화) | 여 | `#f9a8d4`/`#fde68a` | petal | `seonhwa_default/idle/mystical/serious/smile/surprised/wink.png` |
| hoshi (호시) | 여 | `#60a5fa`/`#c084fc` | star | `hoshi_default/idle/mystical/serious/smile/surprised/wink.png` |
| luna (루나) | 여 | `#93c5fd`/`#c4b5fd` | bubble | `luna_default/idle/mystical/serious/smile/surprised/wink.png` |
| rei (레이) | 여 | `#f8fafc`/`#dc2626` | snowflake | `rei_default/idle/mystical/serious/smile/surprised/wink.png` |
| cairn (카이른) | 남 | `#fbbf24`/`#1e3a5f` | sparkle | `cairn_default/idle/mystical/serious/smile/surprised/wink.png` |
| zero (제로) | 남 | `#dc2626`/`#1a1a2e` | flame | `zero_default/idle/mystical/serious/smile/surprised/wink.png` |
| haru (하루) | 남 | `#fbbf24`/`#fb923c` | star | `haru_default/idle/mystical/serious/smile/surprised/wink.png` |
| ren (렌) | 남 | `#2dd4bf`/`#064e3b` | rune | `ren_default/idle/mystical/serious/smile/surprised/wink.png` |
| lix (릭스) | 남 | `#4ade80`/`#a855f7` | lightning | `lix_default/idle/mystical/serious/smile/surprised/wink.png` |
| ethan (에단) | 남 | `#fbbf24`/`#10b981` | rune | `ethan_default/idle/mystical/serious/smile/surprised/wink.png` |

---

## 9. 작업 순서 제안

Claude Design에서의 권장 작업 순서:

1. **[Design System]** 영역 C — 테마 7종 무드보드 + 파티클 스펙 시트 ← 첫 번째
2. **[Prototype]** 영역 A — 캐릭터 idle 애니메이션 + 오라 시각화 ← 두 번째
3. **[Prototype]** 영역 B — 배경 Parallax 구성 + 서비스별 오브젝트 ← 세 번째
4. **[Prototype]** 영역 D — 홈 페이지 히어로 + 캐릭터 갤러리 목업 ← 네 번째
5. **[Slide deck]** 영역 E — 카드 reveal 스토리보드 + 결과 페이지 Before/After ← 다섯 번째
