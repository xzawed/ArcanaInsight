import { describe, it, expect } from "vitest";
import { calculateSaju } from "./saju-calculator";
import type { SajuInput } from "./saju-types";
import { STEM_KO, BRANCH_KO, STEM_ELEMENT } from "@/data/saju/constants";

const VALID_STEMS = Object.keys(STEM_KO);
const VALID_BRANCHES = Object.keys(BRANCH_KO);
const VALID_ELEMENTS = ["wood", "fire", "earth", "metal", "water"] as const;

const MALE_1990: SajuInput = { birthDate: "1990-05-15", birthTime: "00:00", gender: "male" };
const FEMALE_2000: SajuInput = { birthDate: "2000-01-01", birthTime: "11:00", gender: "female" };
const MALE_1985: SajuInput = { birthDate: "1985-07-07", birthTime: "03:00", gender: "male" };
const FEMALE_1975: SajuInput = { birthDate: "1975-03-20", birthTime: "21:00", gender: "female" };

describe("calculateSaju", () => {
  describe("기본 구조 검증", () => {
    it("필수 필드가 모두 반환된다", () => {
      const result = calculateSaju(MALE_1990);
      expect(result).toHaveProperty("pillars");
      expect(result).toHaveProperty("dayMaster");
      expect(result).toHaveProperty("dayMasterElement");
      expect(result).toHaveProperty("isStrong");
      expect(result).toHaveProperty("elements");
      expect(result).toHaveProperty("tenStars");
      expect(result).toHaveProperty("twelveStages");
      expect(result).toHaveProperty("interactions");
      expect(result).toHaveProperty("yongsin");
      expect(result).toHaveProperty("majorFortunes");
      expect(result).toHaveProperty("yearlyFortune");
    });

    it("pillars에 year/month/day/hour가 모두 있다", () => {
      const { pillars } = calculateSaju(MALE_1990);
      expect(pillars).toHaveProperty("year");
      expect(pillars).toHaveProperty("month");
      expect(pillars).toHaveProperty("day");
      expect(pillars).toHaveProperty("hour");
    });

    it("각 pillar에 stem/stemHanja/branch/branchHanja/element가 있다", () => {
      const { pillars } = calculateSaju(MALE_1990);
      for (const key of ["year", "month", "day", "hour"] as const) {
        const pillar = pillars[key];
        expect(pillar.stem).toBeTruthy();
        expect(VALID_STEMS).toContain(pillar.stemHanja);
        expect(pillar.branch).toBeTruthy();
        expect(VALID_BRANCHES).toContain(pillar.branchHanja);
        expect(VALID_ELEMENTS).toContain(pillar.element);
      }
    });
  });

  describe("일간(Day Master)", () => {
    it("dayMaster는 한글 천간 이름이다", () => {
      const { dayMaster } = calculateSaju(MALE_1990);
      const validKoStems = Object.values(STEM_KO);
      expect(validKoStems).toContain(dayMaster);
    });

    it("dayMasterElement는 유효한 오행이다", () => {
      const { dayMasterElement } = calculateSaju(MALE_1990);
      expect(VALID_ELEMENTS).toContain(dayMasterElement);
    });

    it("isStrong은 boolean이다", () => {
      const { isStrong } = calculateSaju(MALE_1990);
      expect(typeof isStrong).toBe("boolean");
    });

    it("남녀 동일 생년월일이어도 결과가 다를 수 있다", () => {
      const maleResult = calculateSaju({ ...MALE_1990, gender: "male" });
      const femaleResult = calculateSaju({ ...MALE_1990, gender: "female" });
      // dayMaster는 같지만 majorFortunes의 startAge가 다름
      expect(maleResult.dayMaster).toBe(femaleResult.dayMaster);
      expect(maleResult.majorFortunes[0].startAge).not.toBe(femaleResult.majorFortunes[0].startAge);
    });
  });

  describe("오행 분포(elements)", () => {
    it("오행 5가지 키가 모두 존재한다", () => {
      const { elements } = calculateSaju(MALE_1990);
      for (const el of VALID_ELEMENTS) {
        expect(elements).toHaveProperty(el);
        expect(typeof elements[el]).toBe("number");
      }
    });

    it("천간 4 + 지지 4 = 총 8개가 분배된다", () => {
      const { elements } = calculateSaju(MALE_1990);
      const total = Object.values(elements).reduce((a, b) => a + b, 0);
      expect(total).toBe(8);
    });

    it("각 오행 카운트는 0 이상이다", () => {
      const { elements } = calculateSaju(FEMALE_2000);
      for (const count of Object.values(elements)) {
        expect(count).toBeGreaterThanOrEqual(0);
      }
    });
  });

  describe("십성(Ten Stars)", () => {
    it("tenStars는 3개 항목이다 (연간/월간/시간)", () => {
      const { tenStars } = calculateSaju(MALE_1990);
      expect(tenStars).toHaveLength(3);
    });

    it("각 tenStar에 position/star/starKo/description이 있다", () => {
      const { tenStars } = calculateSaju(MALE_1990);
      for (const ts of tenStars) {
        expect(ts.position).toBeTruthy();
        expect(typeof ts.star).toBe("string");
        expect(typeof ts.starKo).toBe("string");
        expect(typeof ts.description).toBe("string");
      }
    });

    it("tenStars position은 연간/월간/시간 순서다", () => {
      const { tenStars } = calculateSaju(MALE_1990);
      expect(tenStars[0].position).toBe("연간");
      expect(tenStars[1].position).toBe("월간");
      expect(tenStars[2].position).toBe("시간");
    });
  });

  describe("12운성(Twelve Stages)", () => {
    it("twelveStages는 4개 항목이다 (연지/월지/일지/시지)", () => {
      const { twelveStages } = calculateSaju(MALE_1990);
      expect(twelveStages).toHaveLength(4);
    });

    it("각 twelveStage에 position/stage/stageKo/description이 있다", () => {
      const { twelveStages } = calculateSaju(FEMALE_2000);
      for (const ts of twelveStages) {
        expect(ts.position).toBeTruthy();
        expect(typeof ts.stage).toBe("string");
        expect(typeof ts.stageKo).toBe("string");
        expect(typeof ts.description).toBe("string");
      }
    });

    it("twelveStages position은 연지/월지/일지/시지 순서다", () => {
      const { twelveStages } = calculateSaju(MALE_1990);
      expect(twelveStages[0].position).toBe("연지");
      expect(twelveStages[1].position).toBe("월지");
      expect(twelveStages[2].position).toBe("일지");
      expect(twelveStages[3].position).toBe("시지");
    });
  });

  describe("합/충/형(interactions)", () => {
    it("interactions에 combinations/clashes/punishments 배열이 있다", () => {
      const { interactions } = calculateSaju(MALE_1990);
      expect(Array.isArray(interactions.combinations)).toBe(true);
      expect(Array.isArray(interactions.clashes)).toBe(true);
      expect(Array.isArray(interactions.punishments)).toBe(true);
    });

    it("합/충/형 문자열에는 출발-도착 포지션이 포함된다", () => {
      // 여러 생년월일로 하나라도 합/충/형이 생기는 케이스를 찾아 검증
      const cases = [MALE_1990, FEMALE_2000, MALE_1985, FEMALE_1975];
      const allInteractions: string[] = [];
      for (const input of cases) {
        const { interactions } = calculateSaju(input);
        allInteractions.push(...interactions.combinations, ...interactions.clashes, ...interactions.punishments);
      }
      // 합/충/형 문자열이 있다면 포맷을 검증
      for (const s of allInteractions) {
        expect(s).toMatch(/^(연지|월지|일지|시지)/);
        expect(s).toMatch(/[합충형]$/);
      }
    });
  });

  describe("용신(Yongsin)", () => {
    it("yongsin에 element와 reason이 있다", () => {
      const { yongsin } = calculateSaju(MALE_1990);
      expect(VALID_ELEMENTS).toContain(yongsin.element);
      expect(yongsin.reason).toBeTruthy();
    });

    it("신강이면 용신 이유에 '신강'이 포함된다", () => {
      const cases = [MALE_1990, FEMALE_2000, MALE_1985, FEMALE_1975];
      for (const input of cases) {
        const { isStrong, yongsin } = calculateSaju(input);
        if (isStrong) {
          expect(yongsin.reason).toContain("신강");
        } else {
          expect(yongsin.reason).toContain("신약");
        }
      }
    });

    it("신약(isStrong=false) 케이스 → determineYongsin else 분기 커버", () => {
      // 기존 4개 픽스처는 모두 신강 → 신약 케이스를 다양한 날짜에서 탐색
      const candidates: SajuInput[] = [
        { birthDate: "1986-05-20", birthTime: "11:00", gender: "male" },
        { birthDate: "1976-07-15", birthTime: "11:00", gender: "female" },
        { birthDate: "2004-08-10", birthTime: "11:00", gender: "male" },
        { birthDate: "1962-03-28", birthTime: "11:00", gender: "female" },
        { birthDate: "1999-08-25", birthTime: "11:00", gender: "male" },
        { birthDate: "2016-06-18", birthTime: "11:00", gender: "female" },
        { birthDate: "1971-09-09", birthTime: "11:00", gender: "male" },
        { birthDate: "1955-07-22", birthTime: "11:00", gender: "female" },
        { birthDate: "2008-04-05", birthTime: "11:00", gender: "male" },
        { birthDate: "1943-11-11", birthTime: "11:00", gender: "female" },
      ];
      const sinYak = candidates.find(input => calculateSaju(input).isStrong === false);
      expect(sinYak, "신약 케이스를 찾을 수 없음 — 후보 날짜 추가 필요").toBeDefined();
      if (sinYak) {
        const result = calculateSaju(sinYak);
        expect(result.isStrong).toBe(false);
        expect(result.yongsin.reason).toContain("신약");
      }
    });
  });

  describe("대운(Major Fortunes)", () => {
    it("대운은 8개다", () => {
      const { majorFortunes } = calculateSaju(MALE_1990);
      expect(majorFortunes).toHaveLength(8);
    });

    it("각 대운에 startAge/endAge/stem/branch/element/description이 있다", () => {
      const { majorFortunes } = calculateSaju(MALE_1990);
      for (const mf of majorFortunes) {
        expect(typeof mf.startAge).toBe("number");
        expect(typeof mf.endAge).toBe("number");
        expect(mf.stem).toBeTruthy();
        expect(mf.branch).toBeTruthy();
        expect(VALID_ELEMENTS).toContain(mf.element);
        expect(mf.description).toBeTruthy();
      }
    });

    it("대운 시작 나이는 양수다", () => {
      const { majorFortunes } = calculateSaju(MALE_1990);
      for (const mf of majorFortunes) {
        expect(mf.startAge).toBeGreaterThanOrEqual(0);
      }
    });
  });

  describe("세운(Yearly Fortune)", () => {
    it("yearlyFortune에 year/stem/branch/element/description이 있다", () => {
      const { yearlyFortune } = calculateSaju(MALE_1990);
      expect(typeof yearlyFortune.year).toBe("number");
      expect(yearlyFortune.stem).toBeTruthy();
      expect(yearlyFortune.branch).toBeTruthy();
      expect(VALID_ELEMENTS).toContain(yearlyFortune.element);
      expect(yearlyFortune.description).toContain(String(yearlyFortune.year));
    });

    it("yearlyFortune.year는 현재 연도다", () => {
      const { yearlyFortune } = calculateSaju(MALE_1990);
      expect(yearlyFortune.year).toBe(new Date().getFullYear());
    });
  });

  describe("옵션: 월운(monthly)", () => {
    it("monthly: true이면 monthlyFortunes가 12개다", () => {
      const result = calculateSaju(MALE_1990, { monthly: true });
      expect(result.monthlyFortunes).toHaveLength(12);
    });

    it("각 월운에 month/stem/branch/element/description이 있다", () => {
      const result = calculateSaju(FEMALE_2000, { monthly: true });
      result.monthlyFortunes!.forEach((mf, idx) => {
        expect(mf.month).toBe(idx + 1);
        expect(mf.stem).toBeTruthy();
        expect(mf.branch).toBeTruthy();
        expect(VALID_ELEMENTS).toContain(mf.element);
        expect(mf.description).toContain(String(mf.month));
      });
    });

    it("monthly 옵션 없으면 monthlyFortunes가 undefined다", () => {
      const result = calculateSaju(MALE_1990);
      expect(result.monthlyFortunes).toBeUndefined();
    });
  });

  describe("옵션: 다년 세운(yearlyMulti)", () => {
    it("yearlyMulti: 3이면 yearlyFortunes가 3개다", () => {
      const result = calculateSaju(MALE_1990, { yearlyMulti: 3 });
      expect(result.yearlyFortunes).toHaveLength(3);
    });

    it("yearlyFortunes는 내년부터 시작한다", () => {
      const result = calculateSaju(MALE_1990, { yearlyMulti: 1 });
      const nextYear = new Date().getFullYear() + 1;
      expect(result.yearlyFortunes![0].year).toBe(nextYear);
    });

    it("yearlyMulti: 0이면 yearlyFortunes가 undefined다", () => {
      const result = calculateSaju(MALE_1990, { yearlyMulti: 0 });
      expect(result.yearlyFortunes).toBeUndefined();
    });

    it("yearlyMulti 없으면 yearlyFortunes가 undefined다", () => {
      const result = calculateSaju(MALE_1990);
      expect(result.yearlyFortunes).toBeUndefined();
    });

    it("yearlyMulti가 음수이면 yearlyFortunes가 undefined다 (0 이하 조건)", () => {
      const result = calculateSaju(MALE_1990, { yearlyMulti: -1 });
      expect(result.yearlyFortunes).toBeUndefined();
    });
  });

  describe("옵션: 일운(daily)", () => {
    it("daily: true이면 dailyFortunes가 7개다", () => {
      const result = calculateSaju(MALE_1990, { daily: true });
      expect(result.dailyFortunes).toHaveLength(7);
    });

    it("각 일운에 date/stem/branch/element/description이 있다", () => {
      const result = calculateSaju(FEMALE_2000, { daily: true });
      for (const df of result.dailyFortunes!) {
        expect(df.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        expect(df.stem).toBeTruthy();
        expect(df.branch).toBeTruthy();
        expect(VALID_ELEMENTS).toContain(df.element);
        expect(df.description).toBeTruthy();
      }
    });

    it("daily 옵션 없으면 dailyFortunes가 undefined다", () => {
      const result = calculateSaju(MALE_1990);
      expect(result.dailyFortunes).toBeUndefined();
    });
  });

  describe("다양한 입력값 처리", () => {
    it("birthTime null 이면 자시(0시) 기준으로 계산하며 오류 없음", () => {
      expect(() => calculateSaju({ ...MALE_1990, birthTime: null })).not.toThrow();
      const result = calculateSaju({ ...MALE_1990, birthTime: null });
      expect(result.pillars.hour).toBeDefined();
    });

    it("여성 입력을 처리한다", () => {
      const result = calculateSaju(FEMALE_1975);
      expect(result.pillars).toBeDefined();
      expect(result.dayMaster).toBeTruthy();
    });

    it("모든 옵션을 동시에 사용할 수 있다", () => {
      const result = calculateSaju(MALE_1990, { monthly: true, yearlyMulti: 2, daily: true });
      expect(result.monthlyFortunes).toHaveLength(12);
      expect(result.yearlyFortunes).toHaveLength(2);
      expect(result.dailyFortunes).toHaveLength(7);
    });

    it("동일 입력은 동일 결과를 반환한다 (순수 함수)", () => {
      const r1 = calculateSaju(MALE_1990);
      const r2 = calculateSaju(MALE_1990);
      expect(r1.dayMaster).toBe(r2.dayMaster);
      expect(r1.pillars.year.stemHanja).toBe(r2.pillars.year.stemHanja);
      expect(r1.isStrong).toBe(r2.isStrong);
    });
  });

  describe("stem/branch 오행 일관성", () => {
    it("pillar element는 STEM_ELEMENT 매핑과 일치한다", () => {
      const { pillars } = calculateSaju(MALE_1990);
      for (const key of ["year", "month", "day", "hour"] as const) {
        const pillar = pillars[key];
        const expectedElement = STEM_ELEMENT[pillar.stemHanja];
        expect(pillar.element).toBe(expectedElement);
      }
    });

    it("pillar stemHanja → stem은 STEM_KO 매핑과 일치한다", () => {
      const { pillars } = calculateSaju(FEMALE_2000);
      for (const key of ["year", "month", "day", "hour"] as const) {
        const pillar = pillars[key];
        expect(pillar.stem).toBe(STEM_KO[pillar.stemHanja]);
      }
    });

    it("pillar branchHanja → branch는 BRANCH_KO 매핑과 일치한다", () => {
      const { pillars } = calculateSaju(MALE_1985);
      for (const key of ["year", "month", "day", "hour"] as const) {
        const pillar = pillars[key];
        expect(pillar.branch).toBe(BRANCH_KO[pillar.branchHanja]);
      }
    });
  });
});
