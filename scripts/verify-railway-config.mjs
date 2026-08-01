/**
 * Railway 서비스 config 검증 — standalone 배포의 필수 2조건이 repo가 아닌 서비스 config에 있어
 * 서비스 재생성 시 유실되면 배포가 파탄난다(2026-07-06 ~7회 배포 실패의 근원).
 * 이 스크립트가 그 2조건을 assert해 재발 전에 감지하는 안전망.
 *
 * 검증(필수 — 실패 시 exit 1):
 *   1. serviceInstance.startCommand === "node server.js"
 *      (Railway가 startCommand를 shell 없이 argv 분해 → env 프리픽스·따옴표·sh -c 금지)
 *   2. 서비스 변수 HOSTNAME === "0.0.0.0"
 *      (컨테이너 HOSTNAME은 IPv6 우선 해석 → 미설정 시 IPv4 헬스체크 미도달로 배포 FAILED)
 *   healthcheckPath·builder는 railway.toml이 제공하므로 정보로만 출력(assert 안 함).
 *
 * 인증 — **토큰 종류마다 헤더가 다르다**(Railway 규약, 섞으면 `Not Authorized`):
 *   RAILWAY_TOKEN      프로젝트 토큰 → `Project-Access-Token: <token>`
 *   RAILWAY_API_TOKEN  계정/팀 토큰  → `Authorization: Bearer <token>`
 *   (둘 다 없으면 `~/.railway/config.json` = `railway login` 토큰을 계정 토큰으로 사용)
 * 이름만 바꾸고 헤더를 그대로 두면 인증이 조용히 깨진다 — 그래서 이름으로 헤더를 고른다.
 *
 * 사용: pnpm verify:railway-config   (또는 node scripts/verify-railway-config.mjs)
 * 상세: docs/operations/deploy-safety-guide.md
 */

import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

// 안정적 식별자(시크릿 아님). 서비스 재생성 시 갱신 필요할 수 있음.
const SERVICE = "9b5dc650-afb8-47a8-965e-d6f402875b34";
const ENVIRONMENT = "acf5fdb8-b2d0-4bc8-b575-1bd2e6a333f6";
const PROJECT = "24bdc6b7-db99-4487-896e-d4bd68dbb6b3";

const EXPECTED_START = "node server.js";
const EXPECTED_HOSTNAME = "0.0.0.0";

/** 토큰과 **그에 맞는 인증 헤더**를 함께 돌려준다. 헤더를 호출부가 고르게 두면 어긋난다. */
function resolveAuth() {
  if (process.env.RAILWAY_TOKEN) {
    return { header: { "Project-Access-Token": process.env.RAILWAY_TOKEN }, kind: "프로젝트 토큰(RAILWAY_TOKEN)" };
  }
  if (process.env.RAILWAY_API_TOKEN) {
    return { header: { Authorization: `Bearer ${process.env.RAILWAY_API_TOKEN}` }, kind: "계정 토큰(RAILWAY_API_TOKEN)" };
  }
  try {
    const cfg = JSON.parse(readFileSync(join(homedir(), ".railway", "config.json"), "utf8"));
    const t = cfg.user?.token || cfg.user?.accessToken;
    return t ? { header: { Authorization: `Bearer ${t}` }, kind: "railway login 토큰" } : null;
  } catch {
    return null;
  }
}

async function gql(auth, query, variables) {
  const res = await fetch("https://backboard.railway.com/graphql/v2", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...auth.header },
    body: JSON.stringify({ query, variables }),
    signal: AbortSignal.timeout(20000),
  });
  const j = await res.json();
  if (j.errors) throw new Error(JSON.stringify(j.errors).slice(0, 200));
  return j.data;
}

async function main() {
  const auth = resolveAuth();
  if (!auth) {
    console.error(
      "❌ Railway 토큰 없음. 아래 중 하나를 하세요:\n" +
        "   RAILWAY_TOKEN=<프로젝트 토큰>      (Railway 대시보드 → Project Settings → Tokens)\n" +
        "   RAILWAY_API_TOKEN=<계정/팀 토큰>   (Account Settings → Tokens)\n" +
        "   railway login",
    );
    process.exit(2);
  }

  console.log(`Railway 서비스 config 검증 (ArcanaInsight production) — 인증: ${auth.kind}\n`);

  const si = (await gql(auth,
    `query($s:String!,$e:String!){serviceInstance(serviceId:$s,environmentId:$e){startCommand healthcheckPath builder}}`,
    { s: SERVICE, e: ENVIRONMENT })).serviceInstance;
  const vars = await gql(auth,
    `query($p:String!,$e:String!,$s:String!){variables(projectId:$p,environmentId:$e,serviceId:$s)}`,
    { p: PROJECT, e: ENVIRONMENT, s: SERVICE });
  const hostname = vars.variables?.HOSTNAME;

  const checks = [
    { name: "startCommand", actual: si.startCommand, expected: EXPECTED_START },
    { name: "HOSTNAME 변수", actual: hostname, expected: EXPECTED_HOSTNAME },
  ];

  let failed = 0;
  for (const c of checks) {
    if (c.actual === c.expected) {
      console.log(`✅ ${c.name} = "${c.actual}"`);
    } else {
      console.log(`❌ ${c.name} = ${JSON.stringify(c.actual)} (기대: "${c.expected}") — standalone 배포 실패 위험!`);
      failed++;
    }
  }
  console.log(`ℹ️  healthcheckPath=${JSON.stringify(si.healthcheckPath)} · builder=${si.builder} (railway.toml 제공, assert 안 함)`);

  // 배포 트리거의 CI 게이팅. 2026-08-01에 이게 보이지 않아 "배포가 안 되는데 실패 로그도 없는"
  // 상태를 하루 넘게 헤맸다(checkSuites=true → 체크 실패 시 배포가 SKIPPED, 빌드 자체가 없음).
  // assert하지 않는다 — 켜 두는 것도 정당한 선택이다. 다만 **보이게** 한다.
  try {
    const trg = await gql(auth,
      `query($p:String!,$e:String!,$s:String!){deploymentTriggers(projectId:$p,environmentId:$e,serviceId:$s){edges{node{branch checkSuites validCheckSuites}}}}`,
      { p: PROJECT, e: ENVIRONMENT, s: SERVICE });
    for (const { node: t } of trg.deploymentTriggers?.edges ?? []) {
      const gate = t.checkSuites
        ? `⚠️  GitHub 체크 ${t.validCheckSuites}개가 모두 통과해야 배포 — 하나라도 실패하면 배포 SKIPPED(로그 없음)`
        : "체크 게이팅 없음";
      console.log(`ℹ️  배포 트리거 @${t.branch}: ${gate}`);
    }
  } catch {
    console.log("ℹ️  배포 트리거 조회 실패(권한 부족 가능) — 검증 결과에는 영향 없음");
  }

  if (failed > 0) {
    console.error(`\n결과: ${failed}건 불일치 — deploy-safety-guide.md §3 참고해 서비스 config 교정 필요.`);
    console.error(`  예: railway variable set HOSTNAME=0.0.0.0 -s ArcanaInsight -e production`);
    process.exit(1);
  }
  console.log("\n결과: standalone 배포 필수 2조건 모두 충족 ✅");
}

main().catch((e) => { console.error("검증 실행 오류:", e); process.exit(1); });
