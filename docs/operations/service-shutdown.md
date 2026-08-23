# 서비스 종료 런북

ArcanaInsight 운영 종료와 저장소 폐쇄 절차의 **정본**이다.

| 항목 | 확정 값 |
|---|---|
| 공지일 | 2026-08-23 |
| 서비스 종료 | 2026-08-31 24:00 (KST) |
| 데이터 파기 | 2026-09-01 |
| 이용자 데이터 | 종료와 동시에 **전량 파기** (내보내기 기능 미제공) |
| GitHub 저장소 | **Private 전환 + Archive** (삭제하지 않음) |

---

## 왜 순서가 중요한가

각 단계는 앞 단계에 의존한다. 순서를 바꾸면 다음이 실제로 깨진다.

- **인프라를 먼저 내리면** `weekly-qa.yml`(매주 토 cron)·`post-deploy-smoke.yml`이 죽은 프로덕션을 찔러 실패 Issue를 계속 만든다.
- **Secrets를 먼저 지우면** 아직 남은 워크플로가 전부 붉게 실패해 종료 이력이 지저분해진다.
- **저장소를 먼저 Archive하면** 워크플로 비활성화·Secrets 삭제 같은 쓰기 작업이 막힌다. Archive는 **가장 마지막**이다.
- **DB를 먼저 지우면** 종료 시각 전까지 서비스가 500을 뱉는다. 파기는 서비스 중단 **이후**다.

---

## 1단계 — 종료 공지 (2026-08-23, 완료)

약관 제3조가 "공지 후 7일 경과"를 효력 기준으로 두므로 8/31 종료를 위해 8/23~24 게시가 필요했다.

- `/notice` 공지 페이지 (ko/en/ja) — 종료 일정·파기 대상·보관 안내·문의처
- `ServiceClosureBanner` — `(site)` 라우트 그룹 `main` 최상단 상시 노출
- Footer 정보 컬럼에 공지 링크

> 배너를 Header 위/안에 넣지 않은 이유: Header가 `fixed h-14`이고 각 라우트 그룹이 `pt-14`로 오프셋하므로, 그 위에 얹으면 `pt-14`와 몰입형 스테이지 `calc(100dvh-7rem)` 계산이 함께 어긋나 이중 스크롤이 생긴다. 자세한 높이 계약은 [`../conventions/cross-platform.md`](../conventions/cross-platform.md).

## 2단계 — 운영 유지 (2026-08-24 ~ 08-31)

종료 시각까지 **기존 기능을 그대로 제공한다.** 신규 가입 차단은 하지 않는다 — 남은 기간이 짧고, 가입을 막아도 파기 대상만 줄어들 뿐 이용자 이익이 없다.

이 기간에 새 기능·리팩토링·의존성 업그레이드를 넣지 않는다. 배포가 실패하면 되돌릴 시간이 없다.

## 3단계 — 서비스 중단 (2026-08-31 24:00 KST)

1. Railway 대시보드 → ArcanaInsight 서비스 → 배포 중지(또는 서비스 삭제).
2. 중단 직후 `/api/health`가 응답하지 않는 것을 확인한다.

중단 방식은 두 가지다. **Railway 서비스를 즉시 내리면** 도메인이 502를 반환하고, **정적 안내 페이지로 교체하면** 종료 사실을 계속 알릴 수 있다. 후자를 택할 경우 5단계의 R2·도메인 해지를 그만큼 미뤄야 한다.

## 4단계 — 데이터 파기 (2026-09-01)

개인정보처리방침의 "복구 불가능한 방법으로 영구 삭제" 원칙을 따른다. 파기 대상:

- `users` / Supabase Auth 계정 — 이메일, 소셜 로그인 연동 정보
- 타로·사주·신점 세션 및 리딩 기록, `share_token` 발급 이력
- 사주·신점 입력값 — 생년월일시, 성별, MBTI

절차:

1. Supabase 대시보드 → Auth → 사용자 전량 삭제
2. Supabase → Database → 애플리케이션 테이블 전량 삭제
3. **Supabase 프로젝트 자체를 삭제** — 테이블만 비우면 백업 스냅샷에 데이터가 남는다
4. Cloudflare R2 버킷 정리 — 카드 아트·배경·스킨·캐릭터 이미지는 개인정보가 아니므로 보존 여부는 선택

> 마이그레이션 이력(001~025)은 저장소에 남지만 스키마 정의일 뿐 이용자 데이터가 아니다.

## 5단계 — 자동화·시크릿 정리 (2026-09-01)

**Archive 이전에** 끝내야 하는 쓰기 작업이다.

1. GitHub → Actions → 워크플로 비활성화: `weekly-qa.yml`, `qa-recheck.yml`, `post-deploy-smoke.yml`, `deploy.yml`, `docs-sync.yml`, `sonar.yml`
2. GitHub → Settings → Secrets 삭제: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `GROK_API_KEY`, `SONAR_TOKEN`, `CODECOV_TOKEN`
3. 외부 API 키 폐기 — 저장소에서 지워도 키 자체는 살아 있으므로 발급처에서 revoke한다:
   - xAI(Grok) `GROK_API_KEY`
   - Anthropic `ANTHROPIC_API_KEY`
   - Replicate `REPLICATE_API_KEY`
   - Upstash Redis `UPSTASH_REDIS_REST_TOKEN`
   - Cloudflare R2 액세스 키
   - Google OAuth 클라이언트 (`postgres` 프로바이더 전환용, 미사용 시에도 정리)
4. SonarCloud·Codecov 프로젝트 삭제
5. Railway 프로젝트 삭제, Cloudflare 도메인/R2 정리

전체 환경변수 목록은 [`env-variables.md`](env-variables.md)가 정본이다.

## 6단계 — 저장소 폐쇄 (2026-09-02)

1. 로컬 전체 백업 확보 — `git bundle create arcanainsight.bundle --all`
2. GitHub → Settings → Change visibility → **Private**
3. GitHub → Settings → **Archive this repository**

Archive는 되돌릴 수 있다(Unarchive). 저장소 **삭제는 되돌릴 수 없으므로** 하지 않는다.

---

## 완료 확인

- [ ] `/notice` 공지가 3개 언어로 노출된다
- [ ] 종료 시각 이후 프로덕션이 응답하지 않는다
- [ ] Supabase 프로젝트가 삭제되어 이용자 데이터가 남아 있지 않다
- [ ] 워크플로가 모두 비활성화되어 실패 알림이 오지 않는다
- [ ] 외부 API 키가 발급처에서 revoke되었다
- [ ] 로컬 번들 백업이 존재한다
- [ ] 저장소가 Private + Archived 상태다
