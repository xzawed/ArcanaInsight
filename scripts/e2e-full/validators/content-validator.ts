import Anthropic from '@anthropic-ai/sdk';
import type { TestCase, ValidationResult } from '../types';

const TOPIC_KEYWORDS: Record<string, string[]> = {
  love: ['연애', '사랑', '감정', '관계'],
  'love-single': ['연애', '인연', '만남', '사랑'],
  'love-couple': ['관계', '연인', '사랑', '커플'],
  finance: ['재물', '금전', '돈', '재정'],
  career: ['직장', '일', '커리어', '업무'],
  health: ['건강', '몸', '체력', '컨디션'],
  general: ['운세', '전반', '흐름', '기운'],
  'saju-general': ['사주', '운세', '오행'],
  'saju-love-single': ['연애', '인연', '사주'],
  'saju-love-couple': ['관계', '사주', '궁합'],
  'saju-career': ['직장', '사주', '커리어'],
  'saju-health': ['건강', '사주', '몸'],
  'saju-personality': ['성격', '기질', '사주'],
  'saju-compatibility': ['궁합', '사주', '관계'],
  'saju-auspicious-date': ['길일', '날', '택일'],
  'shinjeom-general': ['운세', '신수', '기운'],
  'shinjeom-love': ['연애', '사랑', '인연'],
  'shinjeom-wealth': ['재물', '돈', '재정'],
  'shinjeom-career': ['직장', '일', '커리어'],
  'shinjeom-health': ['건강', '몸', '기운'],
  'shinjeom-auspicious': ['길일', '날', '택일'],
};

function buildChecklist(tc: TestCase): string {
  const kw = TOPIC_KEYWORDS[tc.topic] ?? [];
  if (tc.service === 'tarot') return `
- card_name_mentioned: 카드 한국어 이름(달/태양/연인/별 등) 언급 여부
- position_label_present: 스프레드 위치(과거/현재/미래 또는 1번/2번 위치) 언급 여부
- topic_keyword_match: [${kw.join(', ')}] 중 1개 이상 포함
- no_cross_service: 천간/지지/오행/사주 미포함 (true=정상)`;
  if (tc.service === 'saju') return `
- saju_terminology: 사주/오행/천간/지지/운세 중 1개 이상 포함
- topic_alignment: [${kw.join(', ')}] 중 1개 이상 포함
- time_period_mentioned: 올해/이번달/이번주 중 1개 이상 언급
- no_cross_service: 카드/타로/스프레드 미포함 (true=정상)`;
  return `
- question_responded: [${kw.join(', ')}] 중 1개 이상 포함
- shinjeom_vocabulary: 신점/운/기운/점 중 1개 이상 포함
- multiturn_consistency: 방향성 또는 조언 문장 포함
- definitive_guidance: 구체적 결론 또는 조언 포함`;
}

export async function runContentValidation(
  responseText: string,
  testCase: TestCase,
  selectedCards: string[] = []
): Promise<ValidationResult> {
  if (!process.env.ANTHROPIC_API_KEY) {
    return { passed: true, score: 100, checks: {}, reason: 'ANTHROPIC_API_KEY 미설정 — 콘텐츠 검증 건너뜀', warning: true };
  }

  const client = new Anthropic();
  const prompt = `당신은 운세 서비스 QA 검증 에이전트입니다.
서비스: ${testCase.service} | 캐릭터: ${testCase.characterId} | 주제: ${testCase.topic}
선택 카드(타로): ${selectedCards.join(', ') || '없음'}

평가 항목 (각 항목을 true/false로 판정):
${buildChecklist(testCase)}

응답 텍스트 (최대 2000자):
${responseText.slice(0, 2000)}

반드시 다음 JSON 형식으로만 응답하세요 (다른 텍스트 없이):
{"passed":true,"score":95,"checks":{"체크키":true},"reason":"한 줄 설명"}`;

  const msg = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 400,
    messages: [{ role: 'user', content: prompt }],
  });

  const raw = msg.content[0].type === 'text' ? msg.content[0].text.trim() : '{}';
  try {
    const result = JSON.parse(raw) as ValidationResult;
    const passCount = Object.values(result.checks).filter(Boolean).length;
    const total = Object.keys(result.checks).length;
    result.passed = total > 0 && passCount >= total - 1;
    result.score = total > 0 ? Math.round((passCount / total) * 100) : 0;
    return result;
  } catch {
    return { passed: false, score: 0, checks: {}, reason: `JSON 파싱 실패: ${raw.slice(0, 80)}` };
  }
}
