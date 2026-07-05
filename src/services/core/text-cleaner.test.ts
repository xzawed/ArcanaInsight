import { describe, it, expect } from "vitest";
import { cleanReadingText, parseJsonSafe, extractFallbackText, promoteNestedFields } from "./text-cleaner";

describe("cleanReadingText", () => {
  it("빈 문자열 입력 시 빈 문자열을 반환한다", () => {
    expect(cleanReadingText("")).toBe("");
  });

  it("공백만 있는 문자열은 trim 후 빈 문자열을 반환한다", () => {
    expect(cleanReadingText("   \n   ")).toBe("");
  });

  it("JSON 키 패턴 'overallReading': 를 제거한다", () => {
    const input = `"overallReading": 이 카드는 새로운 시작을 의미합니다.`;
    const result = cleanReadingText(input);
    expect(result).not.toContain('"overallReading":');
    expect(result).toContain("이 카드는 새로운 시작을 의미합니다.");
  });

  it("JSON 키 패턴 'cardInterpretations': 를 제거한다", () => {
    const input = `"cardInterpretations": 내용`;
    const result = cleanReadingText(input);
    expect(result).not.toContain('"cardInterpretations":');
  });

  it("JSON 키 패턴 'advice': 를 제거한다", () => {
    const input = `"advice": 지금은 인내가 필요한 시기입니다.`;
    const result = cleanReadingText(input);
    expect(result).not.toContain('"advice":');
    expect(result).toContain("지금은 인내가 필요한 시기입니다.");
  });

  it("JSON 키 패턴 'interpretation': 를 제거한다", () => {
    const input = `"interpretation": 카드 해석 내용`;
    const result = cleanReadingText(input);
    expect(result).not.toContain('"interpretation":');
  });

  it("JSON 키 패턴 'result': 를 제거한다", () => {
    const input = `"result": true`;
    const result = cleanReadingText(input);
    expect(result).not.toContain('"result":');
  });

  it("JSON 키 패턴 'done': 와 'error': 를 제거한다", () => {
    const input1 = `"done": false`;
    const input2 = `"error": 오류 메시지`;
    expect(cleanReadingText(input1)).not.toContain('"done":');
    expect(cleanReadingText(input2)).not.toContain('"error":');
  });

  it("이스케이프 '\\\\n\\\\n'을 실제 두 개의 개행으로 변환한다", () => {
    const input = "문단1\\n\\n문단2";
    const result = cleanReadingText(input);
    expect(result).toContain("\n\n");
    expect(result).toContain("문단1");
    expect(result).toContain("문단2");
  });

  it("이스케이프 '\\\\n'을 실제 개행으로 변환한다", () => {
    const input = "첫째 줄\\n둘째 줄";
    const result = cleanReadingText(input);
    expect(result).toContain("\n");
    expect(result).toContain("첫째 줄");
    expect(result).toContain("둘째 줄");
  });

  it("이스케이프 '\\\\t'를 공백으로 변환한다", () => {
    const input = "앞\\t뒤";
    const result = cleanReadingText(input);
    expect(result).toContain(" ");
    expect(result).not.toContain("\\t");
  });

  it("이스케이프 '\\\\r'을 제거한다", () => {
    const input = "텍스트\\r내용";
    const result = cleanReadingText(input);
    expect(result).not.toContain("\\r");
  });

  it("이스케이프 큰따옴표를 실제 큰따옴표로 변환하고 줄 양끝 따옴표는 추가 제거된다", () => {
    // \\\" → " 변환 후 줄 시작/끝 따옴표 제거 규칙이 적용됨: "인용구" → 인용구
    const input = String.raw`\"인용구\"`;
    const result = cleanReadingText(input);
    expect(result).toBe("인용구");
    expect(result).not.toContain('\\"');
  });

  it("문장 중간의 이스케이프 큰따옴표는 변환 후 보존된다", () => {
    const input = String.raw`그는 \"안녕\"이라고 말했다`;
    const result = cleanReadingText(input);
    expect(result).toContain('"안녕"');
  });

  it("줄 끝의 콤마를 제거한다", () => {
    const input = "항목 A,\n항목 B,";
    const result = cleanReadingText(input);
    expect(result).not.toMatch(/,\s*$/m);
  });

  it("3개 이상 연속 개행을 2개로 축소한다", () => {
    const input = "문단1\n\n\n\n문단2";
    const result = cleanReadingText(input);
    expect(result).not.toMatch(/\n{3,}/);
    expect(result).toContain("\n\n");
  });

  it("줄 시작과 끝의 따옴표를 제거한다", () => {
    const input = `"텍스트 내용"`;
    const result = cleanReadingText(input);
    expect(result).toBe("텍스트 내용");
  });

  it("JSON 배열 시작 패턴 '[{' 을 제거한다", () => {
    const input = `  [  {\n해석 내용`;
    const result = cleanReadingText(input);
    expect(result).not.toContain("[");
    expect(result).not.toContain("{");
  });

  it("JSON 배열 끝 패턴 '}]' 을 제거한다", () => {
    const input = `해석 내용\n}  ]`;
    const result = cleanReadingText(input);
    expect(result).not.toContain("}");
    expect(result).not.toContain("]");
  });

  it("복합 케이스: JSON 잔여물 + 이스케이프 혼합을 정리한다", () => {
    const input = `"overallReading": "첫 번째 문단\\n\\n두 번째 문단",`;
    const result = cleanReadingText(input);
    expect(result).not.toContain('"overallReading":');
    expect(result).not.toMatch(/,\s*$/m);
    expect(result).toContain("첫 번째 문단");
    expect(result).toContain("두 번째 문단");
    expect(result).toContain("\n\n");
  });

  it("일반 텍스트는 trim만 하고 그대로 반환한다", () => {
    const input = "  타로 카드 해석 결과입니다.  ";
    const result = cleanReadingText(input);
    expect(result).toBe("타로 카드 해석 결과입니다.");
  });
});

describe("parseJsonSafe", () => {
  it("빈 문자열 입력 시 null을 반환한다", () => {
    expect(parseJsonSafe("")).toBeNull();
  });

  it("JSON 구조가 없는 순수 텍스트 입력 시 null을 반환한다", () => {
    expect(parseJsonSafe("그냥 텍스트 내용입니다.")).toBeNull();
  });

  it("'{}' 구조가 없는 입력 시 null을 반환한다", () => {
    expect(parseJsonSafe("[1, 2, 3]")).toBeNull();
    expect(parseJsonSafe("키: 값")).toBeNull();
  });

  it("유효한 JSON 문자열을 파싱해 객체를 반환한다", () => {
    const input = `{"key": "value", "number": 42}`;
    const result = parseJsonSafe(input);
    expect(result).not.toBeNull();
    expect(result?.key).toBe("value");
    expect(result?.number).toBe(42);
  });

  it("중첩 JSON 객체를 올바르게 파싱한다", () => {
    const input = `{"outer": {"inner": "value"}, "list": [1, 2, 3]}`;
    const result = parseJsonSafe(input);
    expect(result).not.toBeNull();
    expect((result?.outer as Record<string, unknown>)?.inner).toBe("value");
    expect(result?.list).toEqual([1, 2, 3]);
  });

  it("<think>...</think> thinking 토큰을 제거 후 JSON을 파싱한다", () => {
    const input = `<think>내부 사고 과정</think>{"result": "성공"}`;
    const result = parseJsonSafe(input);
    expect(result).not.toBeNull();
    expect(result?.result).toBe("성공");
  });

  it("<thinking>...</thinking> 토큰도 제거 후 JSON을 파싱한다", () => {
    const input = `<thinking>긴 내부 사고\n여러 줄</thinking>\n{"status": "ok"}`;
    const result = parseJsonSafe(input);
    expect(result).not.toBeNull();
    expect(result?.status).toBe("ok");
  });

  it("마크다운 ```json ... ``` 코드블록에서 JSON을 추출해 파싱한다", () => {
    const input = "```json\n{\"name\": \"arcana\", \"type\": \"tarot\"}\n```";
    const result = parseJsonSafe(input);
    expect(result).not.toBeNull();
    expect(result?.name).toBe("arcana");
    expect(result?.type).toBe("tarot");
  });

  it("마크다운 ``` ... ``` 코드블록(언어 없음)에서도 JSON을 추출한다", () => {
    const input = "```\n{\"key\": \"value\"}\n```";
    const result = parseJsonSafe(input);
    expect(result).not.toBeNull();
    expect(result?.key).toBe("value");
  });

  it("문자열 값 내 리터럴 개행이 포함된 JSON을 2차 시도로 파싱한다", () => {
    // 실제 개행이 포함된 JSON 문자열 (1차 JSON.parse 실패 → 2차 sanitize 후 성공)
    const input = `{"text": "첫 줄\n둘째 줄"}`;
    const result = parseJsonSafe(input);
    expect(result).not.toBeNull();
    expect(typeof result?.text).toBe("string");
  });

  it("타로 리딩 응답 형태의 JSON을 파싱한다", () => {
    const input = JSON.stringify({
      cardInterpretations: [
        { cardId: "the-fool", position: 0, interpretation: "새로운 시작\\n\\n무한한 가능성" },
      ],
      overallReading: "전체적으로 긍정적입니다.",
      advice: "용기 있게 나아가세요.",
    });
    const result = parseJsonSafe(input);
    expect(result).not.toBeNull();
    expect(Array.isArray(result?.cardInterpretations)).toBe(true);
    expect(result?.overallReading).toBe("전체적으로 긍정적입니다.");
    expect(result?.advice).toBe("용기 있게 나아가세요.");
  });

  it("앞뒤 공백이 있는 JSON도 올바르게 파싱한다", () => {
    const input = `   \n  {"value": 123}  \n  `;
    const result = parseJsonSafe(input);
    expect(result).not.toBeNull();
    expect(result?.value).toBe(123);
  });

  it("50,000자 초과 입력은 null 반환 (ReDoS 방어)", () => {
    const oversized = "x".repeat(50_001);
    expect(parseJsonSafe(oversized)).toBeNull();
  });

  it("닫히지 않은 중괄호는 null 반환", () => {
    expect(parseJsonSafe('{"key": "unclosed')).toBeNull();
  });

  it("문자열 값 안에 { } 가 있어도 올바르게 파싱한다 (bracket counting 버그 재현)", () => {
    // 핵심 버그: "현재는 {도전의 시기}입니다" 에서 문자열 내 } 를 JSON 끝으로 오인
    const input = JSON.stringify({
      overallReading: "현재는 {도전의 시기}이지만 곧 좋아집니다",
      advice: "인내하세요",
    });
    const result = parseJsonSafe(input);
    expect(result).not.toBeNull();
    expect(result?.overallReading).toContain("도전의 시기");
    expect(result?.advice).toBe("인내하세요");
  });

  it("문자열 값 안에 중첩 { } 표현이 있어도 파싱한다", () => {
    const input = JSON.stringify({
      overallReading: "운세: {길흉 {대소}를 살피면}",
      advice: "조언입니다",
    });
    const result = parseJsonSafe(input);
    expect(result).not.toBeNull();
    expect(result?.overallReading).toContain("길흉");
  });

  it("이스케이프된 큰따옴표가 포함된 문자열 값을 올바르게 파싱한다", () => {
    const raw = `{"overallReading": "그는 \\"행운\\"이라 했다", "advice": "믿으세요"}`;
    const result = parseJsonSafe(raw);
    expect(result).not.toBeNull();
    expect(result?.overallReading).toContain("행운");
    expect(result?.advice).toBe("믿으세요");
  });

  it("thinking 토큰 뒤에 { } 포함 JSON 값이 있어도 파싱한다", () => {
    const input =
      `<think>내부 사고</think>` +
      JSON.stringify({ overallReading: "현재 {변화의 기로}입니다", advice: "결단하세요" });
    const result = parseJsonSafe(input);
    expect(result).not.toBeNull();
    expect(result?.overallReading).toContain("변화의 기로");
  });
});

describe("extractFallbackText", () => {
  it("빈 문자열 입력 시 빈 문자열을 반환한다", () => {
    expect(extractFallbackText("")).toBe("");
  });

  it("<think>...</think> thinking 토큰을 제거한다", () => {
    const input = `<think>내부 사고</think>\n실제 내용`;
    expect(extractFallbackText(input)).toBe("실제 내용");
  });

  it("마크다운 코드블록을 제거한다", () => {
    const input = "```json\n{...}\n```\n유용한 텍스트";
    expect(extractFallbackText(input)).toContain("유용한 텍스트");
    expect(extractFallbackText(input)).not.toContain("```");
  });

  it("중괄호·대괄호를 모두 제거한다 (tarot+saju 통합)", () => {
    const input = `{"overallReading": "해석"}\n[항목]`;
    const result = extractFallbackText(input);
    expect(result).not.toContain("{");
    expect(result).not.toContain("}");
    expect(result).not.toContain("[");
    expect(result).not.toContain("]");
  });

  it("JSON 키 패턴 '\"key\":' 를 제거한다", () => {
    const input = `"overallReading": 결과 텍스트`;
    expect(extractFallbackText(input)).not.toContain('"overallReading":');
    expect(extractFallbackText(input)).toContain("결과 텍스트");
  });

  it(String.raw`\n 이스케이프를 실제 개행으로 변환한다`, () => {
    const input = String.raw`문단1\n\n문단2`;
    expect(extractFallbackText(input)).toBe("문단1\n\n문단2");
  });

  it("3개 이상 연속 개행을 2개로 축소한다", () => {
    const input = "문단1\n\n\n\n문단2";
    expect(extractFallbackText(input)).not.toMatch(/\n{3,}/);
  });

  it("일반 텍스트는 trim 후 그대로 반환한다", () => {
    expect(extractFallbackText("  해석 결과  ")).toBe("해석 결과");
  });
});

// 2026-07-06 조사: 사주·신점 리딩 간헐 무결과 근본원인(트레일링 콤마·필드 중첩) 회귀 방지
describe("parseJsonSafe — LLM 형식 위반 내성", () => {
  it("객체 마지막 필드 뒤 트레일링 콤마를 허용해 파싱한다", () => {
    const input = `{"overallReading": "종합 해석", "advice": "조언",}`;
    const result = parseJsonSafe(input);
    expect(result).not.toBeNull();
    expect(result?.overallReading).toBe("종합 해석");
    expect(result?.advice).toBe("조언");
  });

  it("중첩 객체 마지막 필드 뒤 트레일링 콤마(실측 신점 fallback_text 패턴)를 복구한다", () => {
    const input = `{
      "shinjeomSections": {
        "spiritual": "기운",
        "future": "앞날",
      },
      "overallReading": "종합",
      "advice": "조언"
    }`;
    const result = parseJsonSafe(input);
    expect(result).not.toBeNull();
    expect(result?.overallReading).toBe("종합");
    expect((result?.shinjeomSections as Record<string, unknown>)?.future).toBe("앞날");
  });

  it("배열 마지막 요소 뒤 트레일링 콤마도 허용한다", () => {
    const input = `{"items": ["a", "b",]}`;
    const result = parseJsonSafe(input);
    expect(result).not.toBeNull();
    expect(result?.items).toEqual(["a", "b"]);
  });

  it("트레일링 콤마 + 문자열 내 실제 개행이 동시에 있어도 파싱한다", () => {
    const input = "{\n\"overallReading\": \"문단1\n문단2\",\n\"advice\": \"조언\",\n}";
    const result = parseJsonSafe(input);
    expect(result).not.toBeNull();
    expect(result?.advice).toBe("조언");
  });

  it("문자열 값 안의 콤마+중괄호는 트레일링 콤마로 오인하지 않는다", () => {
    const input = `{"advice": "먼저 A, 그다음 B}", "overallReading": "정상"}`;
    const result = parseJsonSafe(input);
    expect(result).not.toBeNull();
    expect(result?.advice).toBe("먼저 A, 그다음 B}");
    expect(result?.overallReading).toBe("정상");
  });
});

describe("promoteNestedFields", () => {
  it("섹션 내부에 잘못 중첩된 flat 필드를 top-level로 승격한다(실측 missing_fields 패턴)", () => {
    const parsed: Record<string, unknown> = {
      sajuSections: { structure: "구조", overallReading: "종합", advice: "조언" },
    };
    promoteNestedFields(parsed, "sajuSections", ["overallReading", "advice", "directAnswer"]);
    expect(parsed.overallReading).toBe("종합");
    expect(parsed.advice).toBe("조언");
  });

  it("top-level에 이미 값이 있으면 섹션 값으로 덮어쓰지 않는다", () => {
    const parsed: Record<string, unknown> = {
      overallReading: "원본",
      sajuSections: { overallReading: "섹션내부" },
    };
    promoteNestedFields(parsed, "sajuSections", ["overallReading"]);
    expect(parsed.overallReading).toBe("원본");
  });

  it("섹션 내부 값이 빈 문자열이면 승격하지 않는다", () => {
    const parsed: Record<string, unknown> = { overallReading: "", sajuSections: { overallReading: "   " } };
    promoteNestedFields(parsed, "sajuSections", ["overallReading"]);
    expect(parsed.overallReading).toBe("");
  });

  it("섹션 키가 없거나 객체가 아니면 아무것도 하지 않는다", () => {
    const parsed: Record<string, unknown> = { overallReading: "" };
    promoteNestedFields(parsed, "sajuSections", ["overallReading"]);
    expect(parsed.overallReading).toBe("");
    const parsed2: Record<string, unknown> = { sajuSections: "문자열" };
    expect(() => promoteNestedFields(parsed2, "sajuSections", ["overallReading"])).not.toThrow();
  });
});
