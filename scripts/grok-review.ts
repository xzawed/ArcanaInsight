/**
 * SuperGrok 기획/검토 유틸리티
 *
 * Claude CLI가 작업 수행 시 Grok API를 호출하여:
 * 1. 기획/설계: 사용자 요청을 분석하여 구현 방향 제시
 * 2. 검토: 구현 결과를 평가하여 개선점 제시
 *
 * 사용법:
 *   npx tsx scripts/grok-review.ts plan "사용자 요청 내용"
 *   npx tsx scripts/grok-review.ts review "변경 사항 요약"
 */

const GROK_API_KEY = process.env.GROK_API_KEY;
const GROK_MODEL = process.env.GROK_MODEL || "grok-3";
const BASE_URL = "https://api.x.ai/v1";

if (!GROK_API_KEY) {
  console.error("GROK_API_KEY 환경변수가 필요합니다.");
  process.exit(1);
}

const mode = process.argv[2] as "plan" | "review";
const input = process.argv.slice(3).join(" ");

if (!mode || !input || !["plan", "review"].includes(mode)) {
  console.error("사용법: npx tsx scripts/grok-review.ts <plan|review> <내용>");
  process.exit(1);
}

const systemPrompts: Record<string, string> = {
  plan: `당신은 ArcanaInsight 프로젝트의 기획/설계 전문가입니다.
사용자의 요청을 분석하여 구현 방향을 제시합니다.

프로젝트 정보:
- 타로·사주 운세 웹 애플리케이션 (Next.js + React + TypeScript)
- 12명의 애니메이션 캐릭터가 AI 리딩 결과를 전달
- Grok API(1순위) + Claude API(fallback) 이중 AI 구조

응답 형식:
## 요청 분석
(사용자가 원하는 것이 무엇인지 정리)

## 구현 방향
(어떻게 구현할지 기술적 방향 제시)

## 주의사항
(구현 시 고려해야 할 점)

## 예상 영향 범위
(수정이 필요한 파일/영역)`,

  review: `당신은 ArcanaInsight 프로젝트의 코드 리뷰 전문가입니다.
구현된 변경 사항을 검토하여 품질을 평가합니다.

프로젝트 정보:
- 타로·사주 운세 웹 애플리케이션 (Next.js + React + TypeScript)
- 크로스 플랫폼 (Desktop Chrome, Android, iOS Safari)
- 6단계 코드 변경 프로세스 준수 필수

응답 형식:
## 변경 요약
(무엇이 변경되었는지 정리)

## 품질 평가
(코드 품질, 아키텍처 일관성, 크로스 플랫폼 영향)

## 발견된 문제
(있다면 구체적으로, 없으면 "발견된 문제 없음")

## 개선 제안
(선택적 개선 사항)

## 최종 판정
✅ 승인 / ⚠️ 조건부 승인 / ❌ 수정 필요`,
};

async function callGrok(systemPrompt: string, userPrompt: string): Promise<string> {
  const response = await fetch(`${BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${GROK_API_KEY}`,
    },
    body: JSON.stringify({
      model: GROK_MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.5,
      max_tokens: 2000,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Grok API error (${response.status}): ${error}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || "(빈 응답)";
}

async function main() {
  const label = mode === "plan" ? "🎯 SuperGrok 기획/설계" : "🔍 SuperGrok 검토";
  console.log(`\n${label}\n${"=".repeat(50)}\n`);

  try {
    const result = await callGrok(systemPrompts[mode], input);
    console.log(result);
    console.log(`\n${"=".repeat(50)}\n`);
  } catch (e) {
    console.error("Grok API 호출 실패:", e instanceof Error ? e.message : e);
    process.exit(1);
  }
}

main();
