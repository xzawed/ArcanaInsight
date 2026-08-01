/**
 * 배포 후 프로덕션 스모크 검증 — 헬스체크 통과가 보장하지 못하는 "기능적 정상"을 확인한다.
 *
 * 배경(2026-07-06 배포 사고): standalone IPv6 바인딩·`NEXT_PUBLIC_ASSET_BASE_URL` 누락 등으로
 * `/api/health`는 200인데 실제로는 홈이 안 뜨거나 캐릭터 이미지가 404가 나는 경우가 있었다.
 * 이 스모크는 그 사각(healthcheck green이지만 기능 broken)을 잡는다.
 *
 * 검사(무비용, AI 호출 없음):
 *   1. GET /api/health            → 200
 *   1-b. GET /api/health/db       → 200 + db:"ok" (DB 일시정지·자격증명 장애 감지)
 *   2. GET /                      → 200 + 본문에 자산 호스트(cdn.xzawed.xyz) 포함
 *                                    (= NEXT_PUBLIC_ASSET_BASE_URL 빌드 인라인 확인)
 *   3. GET <asset>/characters/... → 200 (R2 캐릭터 이미지 서빙 확인)
 *   (--reading 플래그 시 익명 타로 리딩 1건 SSE 확인 — AI 비용 발생, 기본 off)
 *
 * 사용:
 *   node scripts/smoke-prod.mjs                         # 프로덕션
 *   SMOKE_BASE_URL=https://staging... node scripts/smoke-prod.mjs
 *   node scripts/smoke-prod.mjs --reading              # 리딩 1건 포함(AI 비용)
 *
 * 실패 시 exit 1. CI(post-deploy-smoke.yml) + 수동(`pnpm smoke:prod`) 공용.
 */

import { pathToFileURL } from "node:url";

const BASE = (process.env.SMOKE_BASE_URL ?? "https://arcanainsight-production.up.railway.app").replace(/\/$/, "");
const ASSET_HOST = process.env.SMOKE_ASSET_HOST ?? "cdn.xzawed.xyz";
// 마스터(변형이 꺼졌을 때의 폴백 경로)와 **라이브 변형** 양쪽을 본다.
// 예전에는 마스터 default.png 하나만 봤는데, 변형이 프로덕션에 켜진 뒤로는
// **변형이 전부 깨져도 이 검사는 초록**이었다 — 스모크가 잡아야 할 바로 그 유형이다.
const ASSET_MASTER = `https://${ASSET_HOST}/characters/arcana/nukki-enhanced/idle.png`;
const ASSET_VARIANT = `https://${ASSET_HOST}/characters/arcana/nukki-enhanced/idle-320.webp`;
const WITH_READING = process.argv.includes("--reading");
// 기대 커밋(7자리). 주면 프로덕션이 그 커밋이 아닐 때 실패한다 — 배포 누락 감지용.
const EXPECT_COMMIT = process.env.SMOKE_EXPECT_COMMIT?.slice(0, 7) || "";
const RETRIES = 3;
const RETRY_GAP_MS = 8000;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** 단일 검사를 RETRIES회까지 재시도(배포 타이밍/일시 blip 흡수) */
async function check(name, fn) {
  let lastErr = "";
  for (let attempt = 1; attempt <= RETRIES; attempt++) {
    try {
      const detail = await fn();
      console.log(`✅ ${name}${detail ? `  (${detail})` : ""}`);
      return true;
    } catch (e) {
      lastErr = e instanceof Error ? e.message : String(e);
      if (attempt < RETRIES) await sleep(RETRY_GAP_MS);
    }
  }
  console.log(`❌ ${name}  — ${lastErr}`);
  return false;
}

async function status(url, opts = {}) {
  const res = await fetch(url, { signal: AbortSignal.timeout(20000), ...opts });
  return res;
}

/**
 * 타로 리딩 스모크의 요청 본문 — **export하는 이유**: 이 body가 `TarotReadingSchema`와 어긋나면
 * 요청이 400으로 죽는데, `--reading`은 수동 실행(workflow_dispatch) 전용이라 아무도 안 눌러
 * 드리프트가 조용히 방치된다. 실제로 `birthTime` 누락으로 이 경로가 죽어 있었다(~2026-08-01).
 * `src/__tests__/smoke-request-schema.test.ts`가 AI 호출 없이 스키마 정합성을 검증한다.
 */
export const TAROT_SMOKE_BODY = {
  topic: "general", spreadType: "three-card", characterId: "arcana",
  // birthTime은 nullable이지만 **필수 키**다(TarotReadingSchema). 빠뜨리면 항상 400이라
  // --reading 검증 경로가 통째로 죽는다 — 2026-08-01까지 실제로 그 상태였다.
  userInfo: { name: "smoke", birthDate: "1993-05-14", gender: "male", birthTime: null },
  freeQuestion: "smoke test",
  cards: [0, 1, 2].map((i) => ({ cardId: `major-0${i}`, position: i, isReversed: false })),
};

async function readingSmoke() {
  const body = TAROT_SMOKE_BODY;
  const res = await fetch(`${BASE}/api/tarot/reading`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body), signal: AbortSignal.timeout(120000),
  });
  if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`);
  let buf = "", dec = new TextDecoder(), ok = false, perr = null;
  for await (const ch of res.body) {
    buf += dec.decode(ch, { stream: true });
    const lines = buf.split("\n"); buf = lines.pop() ?? "";
    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;
      let d; try { d = JSON.parse(line.slice(6)); } catch { continue; }
      if (d.done) { ok = !!(d.result?.overallReading); perr = d.result?.parseError ?? null; }
      if (d.error) throw new Error(`SSE error: ${String(d.error).slice(0, 80)}`);
    }
  }
  if (!ok) throw new Error("리딩 결과 없음");
  if (perr) throw new Error(`parseError=${perr}`);
  return "리딩 생성 OK";
}

async function main() {
  console.log(`배포 후 스모크 — 대상: ${BASE}\n`);
  const results = [];
  // 배포된 커밋을 함께 남긴다. 2026-08-01, main 머지가 하루 넘게 배포되지 않았는데
  // 새 엔드포인트 404가 "배포 안 됨"인지 "코드 결함"인지 구분되지 않아 진단이 오래 걸렸다.
  // EXPECT_COMMIT(선택)을 주면 격차를 실패로 만든다 — CI가 배포 누락을 잡을 수 있다.
  let deployedCommit = "unknown";
  results.push(await check("GET /api/health = 200", async () => {
    const r = await status(`${BASE}/api/health`);
    if (r.status !== 200) throw new Error(`status ${r.status}`);
    const body = await r.json().catch(() => ({}));
    deployedCommit = body.commit ?? "unknown";
    if (EXPECT_COMMIT && deployedCommit !== EXPECT_COMMIT) {
      throw new Error(`배포된 커밋 ${deployedCommit} ≠ 기대 ${EXPECT_COMMIT} — 프로덕션이 main보다 뒤처져 있습니다`);
    }
    return `200, commit=${deployedCommit}`;
  }));
  // DB 준비 상태 — /api/health는 DB를 안 보므로 여기서 따로 확인한다.
  // 2026-07-23~08-01 Supabase 일시정지 때 모든 자동 신호가 초록인 채로 DB가 죽어 있었다.
  results.push(await check("GET /api/health/db = DB 연결 OK", async () => {
    const r = await status(`${BASE}/api/health/db`);
    const body = await r.json().catch(() => ({}));
    if (r.status !== 200 || body.db !== "ok") {
      throw new Error(`status ${r.status} db=${body.db ?? "?"} ${String(body.error ?? "").slice(0, 120)}`);
    }
    return `${body.latencyMs}ms`;
  }));
  results.push(await check("GET / = 200 + 자산 호스트 인라인", async () => {
    const r = await status(`${BASE}/`);
    if (r.status !== 200) throw new Error(`status ${r.status}`);
    const html = await r.text();
    if (!html.includes(ASSET_HOST)) throw new Error(`홈 본문에 ${ASSET_HOST} 없음 (NEXT_PUBLIC_ASSET_BASE_URL 미인라인 의심)`);
    return `200, ${ASSET_HOST} 인라인`;
  }));
  results.push(await check("캐릭터 마스터(R2) = 200", async () => {
    const r = await status(ASSET_MASTER, { method: "GET" });
    if (r.status !== 200) throw new Error(`${ASSET_MASTER} status ${r.status}`);
    return "R2 서빙 OK";
  }));
  results.push(await check("캐릭터 변형(WebP) = 200", async () => {
    const r = await status(ASSET_VARIANT, { method: "GET" });
    if (r.status !== 200) throw new Error(`${ASSET_VARIANT} status ${r.status}`);
    const ct = r.headers.get("content-type") ?? "";
    if (!ct.includes("image/webp")) throw new Error(`${ASSET_VARIANT} content-type ${ct}`);
    return "변형 서빙 OK";
  }));
  results.push(await check("홈이 변형 URL을 실제로 사용", async () => {
    // 배포가 NEXT_PUBLIC_CHARACTER_VARIANTS를 잃어버리면 조용히 런타임 최적화로 되돌아간다.
    // 자산이 멀쩡해도 앱이 안 쓰면 의미가 없으므로 HTML에서 직접 확인한다.
    const r = await status(`${BASE}/`, { method: "GET" });
    const html = await r.text();
    if (!/\/characters\/[a-z]+\/nukki-enhanced\/[a-z]+-\d+\.webp/.test(html)) {
      throw new Error("홈 HTML에 변형 URL이 없음 (NEXT_PUBLIC_CHARACTER_VARIANTS 미설정 의심)");
    }
    return "변형 URL 인라인 확인";
  }));
  if (WITH_READING) {
    results.push(await check("타로 리딩 1건(SSE)", readingSmoke));
  }

  const passed = results.filter(Boolean).length;
  console.log(`\n결과: ${passed}/${results.length} 통과`);
  if (passed !== results.length) process.exit(1);
}

// **직접 실행일 때만** 돌린다. 이 모듈은 요청 본문(TAROT_SMOKE_BODY)을 export하고
// 단위 테스트가 그것을 import하는데, 무조건 실행하면 CI 테스트가 프로덕션에 실제 요청을 보낸다.
const invokedDirectly = process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url;
if (invokedDirectly) {
  main().catch((e) => { console.error("스모크 실행 오류:", e); process.exit(1); });
}
