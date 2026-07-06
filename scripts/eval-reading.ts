/**
 * 리딩 품질 eval 하네스 — 타로·사주·신점 리딩 API에 익명 요청을 보내 SSE를 파싱하고
 * 프리미엄 리딩 계약(directAnswer·4섹션·parseError·본문 길이)을 검증한다.
 *
 * 최근 리딩 작업(directAnswer #467·readability #471·섹션 영속 #474·무결과 근본수정 #480)의
 * 프로덕션 수동 fetch+SSE 파싱을 재사용 가능한 회귀 하네스로 대체한다.
 *
 * 사용:
 *   pnpm eval:reading                          # 프로덕션 대상
 *   EVAL_BASE_URL=http://localhost:3000 pnpm eval:reading   # 로컬 dev 서버 대상
 *   pnpm eval:reading -- --service=tarot       # 특정 서비스만
 *
 * ⚠️ 실제 AI 생성을 호출한다(비용 발생·익명 세션 row 생성 가능). CI 자동 실행용이 아닌 온디맨드 도구다.
 */

const BASE = process.env.EVAL_BASE_URL ?? "https://arcanainsight-production.up.railway.app";
const TIMEOUT_MS = 285_000;
const CONCURRENCY = 3;

const onlyService = process.argv.find((a) => a.startsWith("--service="))?.split("=")[1];

type Json = Record<string, unknown>;

const userInfo = {
  name: "검증",
  birthDate: "1993-05-14",
  gender: "male",
  birthTime: "09:30",
  mbti: "INFJ",
};

const tarotCards = (n: number) =>
  Array.from({ length: n }, (_, i) => ({
    cardId: `major-${String(i).padStart(2, "0")}`,
    position: i,
    isReversed: i % 3 === 0,
  }));

interface Task {
  service: string;
  path: string;
  body: Json;
  question: string;
}

const ALL_TASKS: Task[] = [
  {
    service: "tarot",
    path: "/api/tarot/reading",
    question: "이직 시기가 궁금해요.",
    body: {
      topic: "love",
      spreadType: "three-card",
      characterId: "arcana",
      userInfo,
      freeQuestion: "이직 시기가 궁금해요.",
      cards: tarotCards(3),
    },
  },
  {
    service: "saju",
    path: "/api/saju/reading",
    question: "올해 재물운은?",
    body: {
      topic: "saju-general",
      timeRange: "this-year",
      includeMonthly: false,
      characterId: "seonhwa",
      freeQuestion: "올해 재물운은?",
      userInfo,
    },
  },
  {
    service: "shinjeom",
    path: "/api/shinjeom/message",
    question: "요즘 일이 안 풀려 답답해요. 앞으로 어떻게 될까요?",
    body: {
      topic: "shinjeom-general",
      characterId: "luna",
      userInfo,
      isFinalTurn: true,
      messageIndex: 2,
      chatHistory: [
        { id: "u1", role: "user", content: "요즘 일이 안 풀려 답답해요. 앞으로 어떻게 될까요?", timestamp: Date.now() },
        { id: "c1", role: "character", content: "많이 힘드셨겠어요. 어떤 일이 가장 걸리나요?", mood: "default", timestamp: Date.now() },
      ],
    },
  },
];

const nonEmpty = (v: unknown): boolean => typeof v === "string" && v.trim().length > 0;

interface CheckResult {
  service: string;
  term: string;
  ms: number;
  chunks: number;
  checks: { name: string; pass: boolean; detail?: string }[];
  err?: string;
}

/** 서비스별 프리미엄 리딩 계약 검증 */
function verifyContract(service: string, result: Json): CheckResult["checks"] {
  const checks: CheckResult["checks"] = [];
  const add = (name: string, pass: boolean, detail?: string) => checks.push({ name, pass, detail });

  add("parseError 없음", !result.parseError, result.parseError ? String(result.parseError) : undefined);
  add("directAnswer 존재", nonEmpty(result.directAnswer), `len=${String(result.directAnswer ?? "").length}`);
  add("overallReading 존재", nonEmpty(result.overallReading), `len=${String(result.overallReading ?? "").length}`);
  add("advice 존재", nonEmpty(result.advice), `len=${String(result.advice ?? "").length}`);

  if (service === "tarot") {
    const ci = result.cardInterpretations;
    const arr = Array.isArray(ci) ? (ci as Json[]) : [];
    add("cardInterpretations 존재", arr.length > 0, `count=${arr.length}`);
    if (arr.length > 0) {
      const first = arr[0];
      const has3 = nonEmpty(first.symbolism) && nonEmpty(first.situation) && nonEmpty(first.action);
      const hasLegacy = nonEmpty(first.interpretation);
      add("카드 3-섹션(symbolism/situation/action)", has3 || hasLegacy, hasLegacy && !has3 ? "legacy interpretation" : undefined);
    }
  } else if (service === "saju" || service === "shinjeom") {
    add("topicReading 존재", nonEmpty(result.topicReading), `len=${String(result.topicReading ?? "").length}`);
  }

  return checks;
}

async function runTask(task: Task): Promise<CheckResult> {
  const start = Date.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  const out: CheckResult = { service: task.service, term: "?", ms: 0, chunks: 0, checks: [] };

  try {
    const res = await fetch(BASE + task.path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(task.body),
      signal: controller.signal,
    });
    if (!res.ok || !res.body) {
      out.term = `http_${res.status}`;
      try {
        const j = (await res.json()) as Json;
        out.err = String(j.error ?? `HTTP ${res.status}`);
      } catch {
        /* no json body */
      }
      return out;
    }

    let buf = "";
    const decoder = new TextDecoder();
    let done = false;
    let result: Json | null = null;

    for await (const chunk of res.body as unknown as AsyncIterable<Uint8Array>) {
      buf += decoder.decode(chunk, { stream: true });
      const lines = buf.split("\n");
      buf = lines.pop() ?? "";
      for (const line of lines) {
        if (!line.startsWith("data: ")) continue;
        let evt: Json;
        try {
          evt = JSON.parse(line.slice(6)) as Json;
        } catch {
          continue;
        }
        if (evt.chunk) {
          out.chunks++;
          continue;
        }
        if (evt.error) {
          out.term = "error";
          out.err = String(evt.error).slice(0, 160);
          done = true;
          break;
        }
        if (evt.done) {
          result = (evt.result as Json) ?? null;
          out.term = "done";
          done = true;
          break;
        }
      }
      if (done) break;
    }
    if (out.term === "?") out.term = "closed_no_done";
    if (result) out.checks = verifyContract(task.service, result);
    else if (out.term === "done") out.checks = [{ name: "result 페이로드 존재", pass: false }];
  } catch (e) {
    const err = e as { name?: string; message?: string };
    out.term = err?.name === "AbortError" ? "timeout" : "exception";
    out.err = (err?.message ?? String(e)).slice(0, 160);
  } finally {
    clearTimeout(timer);
    out.ms = Date.now() - start;
  }
  return out;
}

async function main() {
  const tasks = onlyService ? ALL_TASKS.filter((t) => t.service === onlyService) : ALL_TASKS;
  if (tasks.length === 0) {
    console.error(`알 수 없는 서비스: ${onlyService} (tarot|saju|shinjeom)`);
    process.exit(2);
  }
  console.log(`리딩 eval 하네스 — 대상: ${BASE}\n서비스: ${tasks.map((t) => t.service).join(", ")}\n`);

  const results: CheckResult[] = [];
  let next = 0;
  async function worker() {
    while (next < tasks.length) {
      const i = next++;
      const r = await runTask(tasks[i]);
      results.push(r);
      const failed = r.checks.filter((c) => !c.pass);
      const status = r.term === "done" && failed.length === 0 ? "✅ PASS" : "❌ FAIL";
      console.log(`${status}  ${r.service.padEnd(9)} ${r.term.padEnd(13)} ${(r.ms / 1000).toFixed(1)}s  chunks=${r.chunks}${r.err ? "  err=" + r.err : ""}`);
      for (const c of r.checks) {
        console.log(`   ${c.pass ? "✓" : "✗"} ${c.name}${c.detail ? `  (${c.detail})` : ""}`);
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, tasks.length) }, () => worker()));

  const passed = results.filter((r) => r.term === "done" && r.checks.every((c) => c.pass)).length;
  console.log(`\n결과: ${passed}/${results.length} 서비스 계약 통과`);
  if (passed !== results.length) process.exit(1);
}

main().catch((e) => {
  console.error("eval 하네스 실행 오류:", e);
  process.exit(1);
});
