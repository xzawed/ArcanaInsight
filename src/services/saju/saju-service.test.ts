import { describe, it, expect, vi, beforeEach } from "vitest";
import { CharacterConfig } from "@/types/character";

// 캐릭터 데이터 모킹
vi.mock("@/data/characters", () => ({
  getCharacterById: vi.fn((id: string): CharacterConfig | undefined => {
    if (id === "seonhwa") {
      return {
        id: "seonhwa",
        name: "선화",
        nameJp: "ソナ",
        gender: "female",
        greeting: "안녕하세요",
        speechStyle: "~세요/~랍니다, 우아한 톤",
        personality: "우아하고 지혜로운",
        description: "선녀",
        speciality: "동양철학",
        voiceTone: "우아한",
        unlocked: true,
        idleAnimation: "",
        effectTheme: {
          primary: "#f472b6",
          secondary: "#e879f9",
          accent: "#c084fc",
          particleStyle: "petal",
        },
        expressions: {
          default: "",
          smile: "",
          serious: "",
          surprised: "",
          wink: "",
          mystical: "",
        },
      };
    }
    return undefined;
  }),
}));

import { SajuService } from "./saju-service";
import { SajuResult } from "./saju-types";

/** 테스트용 최소 SajuResult 픽스처 */
function makeSajuResult(overrides?: Partial<SajuResult>): SajuResult {
  return {
    pillars: {
      year:  { stem: "갑", stemHanja: "甲", branch: "자", branchHanja: "子", element: "wood" },
      month: { stem: "병", stemHanja: "丙", branch: "인", branchHanja: "寅", element: "fire" },
      day:   { stem: "무", stemHanja: "戊", branch: "오", branchHanja: "午", element: "earth" },
      hour:  { stem: "경", stemHanja: "庚", branch: "신", branchHanja: "申", element: "metal" },
    },
    dayMaster: "무",
    dayMasterElement: "earth",
    isStrong: true,
    elements: { wood: 2, fire: 2, earth: 2, metal: 1, water: 1 },
    tenStars: [
      { position: "연간", star: "BiJian", starKo: "비겁", description: "형제운" },
    ],
    twelveStages: [
      { position: "일지", stage: "Myo", stageKo: "묘", description: "쇠퇴기" },
    ],
    interactions: { combinations: [], clashes: [], punishments: [] },
    yongsin: { element: "water", reason: "수(水) 기운이 용신" },
    majorFortunes: [
      { startAge: 5, endAge: 15, stem: "정", branch: "해", element: "fire", description: "" },
    ],
    yearlyFortune: { year: 2024, stem: "갑", branch: "진", element: "wood", description: "" },
    ...overrides,
  };
}

describe("SajuService", () => {
  let service: SajuService;

  beforeEach(() => {
    service = new SajuService();
  });

  // ─── startSession ──────────────────────────────────────────────────────────

  describe("startSession", () => {
    it("사주 토픽으로 세션을 생성하고 serviceType이 'saju'이다", () => {
      const session = service.startSession("saju-general");

      expect(session.serviceType).toBe("saju");
      expect(session.topic).toBe("saju-general");
      expect(session.status).toBe("in_progress");
      expect(session.userId).toBeNull();
      expect(session.spreadType).toBeNull();
      expect(session.selectedCards).toEqual([]);
      expect(session.completedAt).toBeNull();
    });

    it("다른 사주 토픽('saju-career')도 정상적으로 세션을 생성한다", () => {
      const session = service.startSession("saju-career");
      expect(session.topic).toBe("saju-career");
      expect(session.serviceType).toBe("saju");
    });
  });

  // ─── getSystemPrompt ───────────────────────────────────────────────────────

  describe("getSystemPrompt", () => {
    it("'seonhwa' 캐릭터 ID로 프롬프트를 생성하면 비어있지 않다", () => {
      const prompt = service.getSystemPrompt("seonhwa");
      expect(prompt.trim().length).toBeGreaterThan(0);
    });

    it("프롬프트에 JSON 응답 형식 지시가 포함된다", () => {
      const prompt = service.getSystemPrompt("seonhwa");
      expect(prompt).toContain("overallReading");
      expect(prompt).toContain("topicReading");
      expect(prompt).toContain("advice");
    });

    it("프롬프트에 캐릭터 이름이 포함된다", () => {
      const prompt = service.getSystemPrompt("seonhwa");
      expect(prompt).toContain("선화");
    });

    it("캐릭터 ID 없이 호출해도 기본 캐릭터 프롬프트를 반환한다", () => {
      const prompt = service.getSystemPrompt();
      expect(prompt.trim().length).toBeGreaterThan(0);
    });

    it("존재하지 않는 캐릭터 ID이면 기본 캐릭터(선화)로 fallback한다", () => {
      const prompt = service.getSystemPrompt("unknown-char");
      expect(prompt).toContain("선화");
    });
  });

  // ─── buildSajuPrompt ──────────────────────────────────────────────────────

  describe("buildSajuPrompt — timeRange별 한국어 시간 컨텍스트", () => {
    it("'this-week' 시 이번 주 기준 컨텍스트가 포함된다", () => {
      const prompt = service.buildSajuPrompt(
        "saju-general",
        "this-week",
        makeSajuResult()
      );
      expect(prompt).toContain("이번 주");
    });

    it("'this-month' 시 이번 달 기준 컨텍스트가 포함된다", () => {
      const prompt = service.buildSajuPrompt(
        "saju-general",
        "this-month",
        makeSajuResult()
      );
      expect(prompt).toContain("이번 달");
    });

    it("'this-year' 시 올해 기준 컨텍스트가 포함된다", () => {
      const prompt = service.buildSajuPrompt(
        "saju-general",
        "this-year",
        makeSajuResult()
      );
      expect(prompt).toContain("올해");
    });

    it("'next-year' 시 내년 기준 컨텍스트가 포함된다", () => {
      const prompt = service.buildSajuPrompt(
        "saju-general",
        "next-year",
        makeSajuResult()
      );
      expect(prompt).toContain("내년");
    });

    it("'five-year' 시 향후 5년 컨텍스트가 포함된다", () => {
      const prompt = service.buildSajuPrompt(
        "saju-general",
        "five-year",
        makeSajuResult()
      );
      expect(prompt).toContain("5년");
    });

    it("'full-fortune' 시 전체 대운 컨텍스트가 포함된다", () => {
      const prompt = service.buildSajuPrompt(
        "saju-general",
        "full-fortune",
        makeSajuResult()
      );
      expect(prompt).toContain("전체 대운");
    });
  });

  describe("buildSajuPrompt — monthlyFortunes 포함 시 월운 섹션", () => {
    it("monthlyFortunes 데이터가 있으면 월운 관련 내용이 포함된다", () => {
      const sajuResult = makeSajuResult({
        monthlyFortunes: [
          { month: 1, stem: "갑", branch: "자", element: "wood", description: "1월 운세" },
          { month: 2, stem: "을", branch: "축", element: "wood", description: "2월 운세" },
        ],
      });
      const prompt = service.buildSajuPrompt(
        "saju-general",
        "this-year",
        sajuResult
      );
      // 월운 섹션 헤더 포함 여부 확인
      expect(prompt).toContain("월운");
    });
  });

  describe("buildSajuPrompt — topicLabel 반영", () => {
    it("'saju-career' 토픽이면 프롬프트에 직장·재물운이 포함된다", () => {
      const prompt = service.buildSajuPrompt(
        "saju-career",
        "this-year",
        makeSajuResult()
      );
      expect(prompt).toContain("직장·재물운");
    });

    it("'saju-health' 토픽이면 프롬프트에 건강운이 포함된다", () => {
      const prompt = service.buildSajuPrompt(
        "saju-health",
        "this-year",
        makeSajuResult()
      );
      expect(prompt).toContain("건강운");
    });
  });

  describe("buildSajuPrompt — userInfo.name", () => {
    it("userInfo.name이 있으면 프롬프트에 상담자 이름이 포함된다", () => {
      const prompt = service.buildSajuPrompt(
        "saju-general",
        "this-year",
        makeSajuResult(),
        { name: "홍길동" }
      );
      expect(prompt).toContain("홍길동");
    });
  });

  describe("buildSajuPrompt — 추가 fortune 섹션", () => {
    it("'this-month' + monthlyFortunes 제공 시 이번 달 운세 섹션이 포함된다", () => {
      const thisMonth = new Date().getMonth() + 1;
      const monthlyFortunes = Array.from({ length: 12 }, (_, i) => ({
        month: i + 1,
        stem: "갑",
        branch: "자",
        element: "wood" as const,
        description: `${i + 1}월 운세`,
      }));
      const prompt = service.buildSajuPrompt(
        "saju-general",
        "this-month",
        makeSajuResult({ monthlyFortunes }),
      );
      expect(prompt).toContain(`${thisMonth}월`);
      expect(prompt).toContain("이번 달 월운");
    });

    it("yearlyFortunes 제공 시 세운 전망 섹션이 포함된다", () => {
      const prompt = service.buildSajuPrompt(
        "saju-general",
        "next-year",
        makeSajuResult({
          yearlyFortunes: [
            { year: 2025, stem: "을", branch: "사", element: "wood", description: "2025년 운세" },
            { year: 2026, stem: "병", branch: "오", element: "fire", description: "2026년 운세" },
          ],
        })
      );
      expect(prompt).toContain("세운 전망");
    });

    it("dailyFortunes 제공 시 이번 주 일운 섹션이 포함된다", () => {
      const prompt = service.buildSajuPrompt(
        "saju-general",
        "this-week",
        makeSajuResult({
          dailyFortunes: [
            { date: "2026-04-26", stem: "갑", branch: "자", element: "wood", description: "일요일 운세" },
          ],
        })
      );
      expect(prompt).toContain("이번 주 일운");
    });

    it("'three-year' timeRange 시 향후 3년 컨텍스트가 포함된다", () => {
      const prompt = service.buildSajuPrompt("saju-general", "three-year", makeSajuResult());
      expect(prompt).toContain("3년");
    });
  });

  describe("buildSajuPrompt — 알 수 없는 topic fallback", () => {
    it("등록되지 않은 topic이면 topic 문자열 자체가 프롬프트에 포함된다", () => {
      const prompt = service.buildSajuPrompt(
        "unknown-topic" as Parameters<typeof service.buildSajuPrompt>[0],
        "this-year",
        makeSajuResult()
      );
      expect(prompt).toContain("unknown-topic");
    });
  });

  describe("buildSajuPrompt — isStrong false(신약)", () => {
    it("isStrong false 시 프롬프트에 '신약'이 포함된다", () => {
      const prompt = service.buildSajuPrompt(
        "saju-general",
        "this-year",
        makeSajuResult({ isStrong: false })
      );
      expect(prompt).toContain("신약");
    });
  });

  // ─── parseResult ──────────────────────────────────────────────────────────

  describe("parseResult", () => {
    it("유효한 JSON 응답을 파싱하여 ReadingResult를 반환한다", () => {
      const validJson = JSON.stringify({
        overallReading: "올해 운세가 좋습니다",
        topicReading: "재물운이 상승합니다",
        advice: "적극적으로 행동하세요",
      });

      const result = service.parseResult(validJson);

      expect(result.overallReading).toContain("올해 운세가 좋습니다");
      expect(result.topicReading).toContain("재물운이 상승합니다");
      expect(result.advice).toContain("적극적으로 행동하세요");
    });

    it("JSON 파싱 실패 시 에러를 던지지 않고 fallback 텍스트를 반환한다", () => {
      const invalidJson = "이것은 유효하지 않은 JSON입니다...";

      expect(() => service.parseResult(invalidJson)).not.toThrow();
      const result = service.parseResult(invalidJson);
      expect(result.overallReading).toBeTruthy();
    });

    it("빈 JSON 필드가 있어도 에러 없이 처리한다", () => {
      const partialJson = JSON.stringify({
        overallReading: "종합 운세",
      });

      const result = service.parseResult(partialJson);
      expect(result.overallReading).toContain("종합 운세");
    });
  });

  // ─── topicLabels 매핑 ─────────────────────────────────────────────────────

  describe("topicLabels 매핑 — buildSajuPrompt 프롬프트 반영", () => {
    const cases: [string, string][] = [
      ["saju-general",          "종합운"],
      ["saju-love-single",      "연애운 (솔로)"],
      ["saju-love-couple",      "연애운 (커플)"],
      ["saju-career",           "직장·재물운"],
      ["saju-health",           "건강운"],
      ["saju-personality",      "성격·적성"],
      ["saju-compatibility",    "궁합"],
      ["saju-auspicious-date",  "택일"],
    ];

    it.each(cases)("토픽 '%s' → 프롬프트에 '%s' 포함", (topic, label) => {
      const prompt = service.buildSajuPrompt(
        topic as Parameters<typeof service.buildSajuPrompt>[0],
        "this-year",
        makeSajuResult()
      );
      expect(prompt).toContain(label);
    });
  });
});
