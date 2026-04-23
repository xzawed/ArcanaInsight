import { describe, it, expect } from "vitest";
import { cleanReadingText, parseJsonSafe } from "./text-cleaner";

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
});
