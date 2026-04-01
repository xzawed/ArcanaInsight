import { SolarTime, SolarDay, ChildLimit, Gender, SixtyCycle, SixtyCycleYear, SixtyCycleDay, HeavenStem } from "tyme4ts";
import { OhaengType, STEM_ELEMENT, BRANCH_ELEMENT, STEM_KO, BRANCH_KO, TEN_STARS, TWELVE_STAGES, BIRTH_HOUR_MAP } from "@/data/saju/constants";
import { SajuInput, SajuResult, Pillar, MonthlyFortune, DailyFortune } from "./saju-types";

export interface SajuCalculateOptions {
  monthly?: boolean;       // 올해 12개월 월운
  yearlyMulti?: number;    // N년치 세운 (1이면 내년 1개)
  daily?: boolean;         // 이번 주 7일 일운
}

/** 사주팔자 전체 계산 */
export function calculateSaju(input: SajuInput, options?: SajuCalculateOptions): SajuResult {
  const [y, m, d] = input.birthDate.split("-").map(Number);
  const hourVal = BIRTH_HOUR_MAP[input.birthHour] ?? 0;
  const gender = input.gender === "female" ? Gender.WOMAN : Gender.MAN;

  const solarTime = SolarTime.fromYmdHms(y, m, d, hourVal, 0, 0);
  const childLimit = ChildLimit.fromSolarTime(solarTime, gender);
  const eightChar = childLimit.getEightChar();

  // 1. 사주팔자 추출
  const yearSC = eightChar.getYear();
  const monthSC = eightChar.getMonth();
  const daySC = eightChar.getDay();
  const hourSC = eightChar.getHour();

  const pillars = {
    year: buildPillar(yearSC),
    month: buildPillar(monthSC),
    day: buildPillar(daySC),
    hour: buildPillar(hourSC),
  };

  // 2. 일간 (Day Master)
  const dayHS = daySC.getHeavenStem();
  const dayMasterHanja = dayHS.toString();
  const dayMaster = STEM_KO[dayMasterHanja] || dayMasterHanja;
  const dayMasterElement = STEM_ELEMENT[dayMasterHanja] || "earth";

  // 3. 오행 분포
  const elements = countElements(yearSC, monthSC, daySC, hourSC);

  // 4. 십성
  const tenStars = calculateTenStars(dayHS, yearSC, monthSC, daySC, hourSC);

  // 5. 12운성
  const twelveStages = calculateTwelveStages(dayHS, yearSC, monthSC, daySC, hourSC);

  // 6. 합/충/형
  const interactions = calculateInteractions(yearSC, monthSC, daySC, hourSC);

  // 7. 신강/신약 + 용신
  const isStrong = judgeStrength(dayMasterElement, elements);
  const yongsin = determineYongsin(dayMasterElement, isStrong, elements);

  // 8. 대운
  const majorFortunes = calculateMajorFortunes(childLimit);

  // 9. 세운 (올해)
  const yearlyFortune = calculateYearlyFortune();

  const result: SajuResult = {
    pillars, dayMaster, dayMasterElement, isStrong, elements,
    tenStars, twelveStages, interactions, yongsin,
    majorFortunes, yearlyFortune,
  };

  const currentYear = new Date().getFullYear();
  if (options?.monthly) {
    result.monthlyFortunes = calculateMonthlyFortunes(currentYear);
  }
  if (options?.yearlyMulti && options.yearlyMulti > 0) {
    result.yearlyFortunes = calculateYearlyFortunes(currentYear + 1, options.yearlyMulti);
  }
  if (options?.daily) {
    result.dailyFortunes = calculateDailyFortunes(new Date(), 7);
  }

  return result;
}

/** SixtyCycle → Pillar 변환 */
function buildPillar(sc: SixtyCycle): Pillar {
  const stemHanja = sc.getHeavenStem().toString();
  const branchHanja = sc.getEarthBranch().toString();
  return {
    stem: STEM_KO[stemHanja] || stemHanja,
    stemHanja,
    branch: BRANCH_KO[branchHanja] || branchHanja,
    branchHanja,
    element: STEM_ELEMENT[stemHanja] || "earth",
  };
}

/** 오행 분포 계산 (천간 4 + 지지 4 = 8자) */
function countElements(...cycles: SixtyCycle[]): Record<OhaengType, number> {
  const counts: Record<OhaengType, number> = { wood: 0, fire: 0, earth: 0, metal: 0, water: 0 };
  for (const sc of cycles) {
    const stemEl = STEM_ELEMENT[sc.getHeavenStem().toString()];
    const branchEl = BRANCH_ELEMENT[sc.getEarthBranch().toString()];
    if (stemEl) counts[stemEl]++;
    if (branchEl) counts[branchEl]++;
  }
  return counts;
}

/** 십성 계산 (일간과 나머지 7자의 관계) */
function calculateTenStars(dayHS: HeavenStem, year: SixtyCycle, month: SixtyCycle, _day: SixtyCycle, hour: SixtyCycle) {
  const positions = [
    { label: "연간", hs: year.getHeavenStem() },
    { label: "월간", hs: month.getHeavenStem() },
    { label: "시간", hs: hour.getHeavenStem() },
  ];

  return positions.map(({ label, hs }) => {
    const starHanja = dayHS.getTenStar(hs)?.toString() || "";
    const starInfo = TEN_STARS[starHanja];
    return {
      position: label,
      star: starHanja,
      starKo: starInfo?.ko || starHanja,
      description: starInfo?.desc || "",
    };
  });
}

/** 12운성 계산 (일간과 4지지) */
function calculateTwelveStages(dayHS: HeavenStem, year: SixtyCycle, month: SixtyCycle, day: SixtyCycle, hour: SixtyCycle) {
  const positions = [
    { label: "연지", eb: year.getEarthBranch() },
    { label: "월지", eb: month.getEarthBranch() },
    { label: "일지", eb: day.getEarthBranch() },
    { label: "시지", eb: hour.getEarthBranch() },
  ];

  return positions.map(({ label, eb }) => {
    const stageHanja = dayHS.getTerrain(eb)?.toString() || "";
    const stageInfo = TWELVE_STAGES[stageHanja];
    return {
      position: label,
      stage: stageHanja,
      stageKo: stageInfo?.ko || stageHanja,
      description: stageInfo?.desc || "",
    };
  });
}

/** 합/충/형 관계 분석 */
function calculateInteractions(year: SixtyCycle, month: SixtyCycle, day: SixtyCycle, hour: SixtyCycle) {
  const branches = [
    { label: "연지", eb: year.getEarthBranch() },
    { label: "월지", eb: month.getEarthBranch() },
    { label: "일지", eb: day.getEarthBranch() },
    { label: "시지", eb: hour.getEarthBranch() },
  ];

  const combinations: string[] = [];
  const clashes: string[] = [];
  const punishments: string[] = [];

  for (let i = 0; i < branches.length; i++) {
    for (let j = i + 1; j < branches.length; j++) {
      const a = branches[i];
      const b = branches[j];
      const aStr = BRANCH_KO[a.eb.toString()] || a.eb.toString();
      const bStr = BRANCH_KO[b.eb.toString()] || b.eb.toString();

      // 합 (육합)
      const combine = a.eb.getCombine();
      if (combine && combine.toString() === b.eb.toString()) {
        combinations.push(`${a.label}(${aStr})-${b.label}(${bStr}) 합`);
      }

      // 충
      const opposite = a.eb.getOpposite();
      if (opposite && opposite.toString() === b.eb.toString()) {
        clashes.push(`${a.label}(${aStr})-${b.label}(${bStr}) 충`);
      }

      // 형 (해)
      const harm = a.eb.getHarm();
      if (harm && harm.toString() === b.eb.toString()) {
        punishments.push(`${a.label}(${aStr})-${b.label}(${bStr}) 형`);
      }
    }
  }

  return { combinations, clashes, punishments };
}

/** 신강/신약 판별 (일간 오행의 힘 판단) */
function judgeStrength(dayElement: OhaengType, elements: Record<OhaengType, number>): boolean {
  // 일간 오행 + 일간을 생하는 오행의 합이 4 이상이면 신강
  const supportMap: Record<OhaengType, OhaengType> = {
    wood: "water", fire: "wood", earth: "fire", metal: "earth", water: "metal",
  };
  const support = supportMap[dayElement];
  const strength = elements[dayElement] + elements[support];
  return strength >= 4;
}

/** 용신 결정 (향후 elements 기반 정밀 판별로 확장 예정) */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function determineYongsin(dayElement: OhaengType, isStrong: boolean, _elements: Record<OhaengType, number>): { element: OhaengType; reason: string } {
  // 신강이면 설기(일간을 약화시키는 오행), 신약이면 생조(일간을 강화하는 오행)
  const weakenMap: Record<OhaengType, OhaengType> = {
    wood: "metal", fire: "water", earth: "wood", metal: "fire", water: "earth",
  };
  const supportMap: Record<OhaengType, OhaengType> = {
    wood: "water", fire: "wood", earth: "fire", metal: "earth", water: "metal",
  };

  if (isStrong) {
    const el = weakenMap[dayElement];
    return { element: el, reason: `신강하므로 ${el}(일간을 제어하는 오행)이 용신` };
  } else {
    const el = supportMap[dayElement];
    return { element: el, reason: `신약하므로 ${el}(일간을 생하는 오행)이 용신` };
  }
}

/** 대운 계산 (8개) */
function calculateMajorFortunes(childLimit: ChildLimit) {
  const fortunes: SajuResult["majorFortunes"] = [];
  let df = childLimit.getStartDecadeFortune();

  for (let i = 0; i < 8; i++) {
    const sc = df.getSixtyCycle();
    const stemHanja = sc.getHeavenStem().toString();
    const branchHanja = sc.getEarthBranch().toString();
    fortunes.push({
      startAge: df.getStartAge(),
      endAge: df.getEndAge(),
      stem: STEM_KO[stemHanja] || stemHanja,
      branch: BRANCH_KO[branchHanja] || branchHanja,
      element: STEM_ELEMENT[stemHanja] || "earth",
      description: `${STEM_KO[stemHanja] || stemHanja}${BRANCH_KO[branchHanja] || branchHanja} 대운`,
    });
    df = df.next(1);
  }

  return fortunes;
}

/** 올해 세운 계산 */
function calculateYearlyFortune(): SajuResult["yearlyFortune"] {
  const currentYear = new Date().getFullYear();
  const scYear = SixtyCycleYear.fromYear(currentYear);
  const sc = scYear.getSixtyCycle();
  const stemHanja = sc.getHeavenStem().toString();
  const branchHanja = sc.getEarthBranch().toString();
  const stem = STEM_KO[stemHanja] || stemHanja;
  const branch = BRANCH_KO[branchHanja] || branchHanja;

  return {
    year: currentYear,
    stem,
    branch,
    element: STEM_ELEMENT[stemHanja] || "earth",
    description: `${currentYear}년 ${stem}${branch}년`,
  };
}

/** 올해 12개월 월운 계산 */
function calculateMonthlyFortunes(year: number): MonthlyFortune[] {
  const scYear = SixtyCycleYear.fromYear(year);
  const months = scYear.getMonths(); // SixtyCycleMonth[] (12개)
  return months.map((scMonth, idx) => {
    const sc = scMonth.getSixtyCycle();
    const stemHanja = sc.getHeavenStem().toString();
    const branchHanja = sc.getEarthBranch().toString();
    const stem = STEM_KO[stemHanja] || stemHanja;
    const branch = BRANCH_KO[branchHanja] || branchHanja;
    return {
      month: idx + 1,
      stem,
      branch,
      element: STEM_ELEMENT[stemHanja] || "earth",
      description: `${idx + 1}월 ${stem}${branch}월`,
    };
  });
}

/** startYear부터 count년간 세운 계산 */
function calculateYearlyFortunes(startYear: number, count: number): NonNullable<SajuResult["yearlyFortunes"]> {
  const fortunes: NonNullable<SajuResult["yearlyFortunes"]> = [];
  for (let i = 0; i < count; i++) {
    const y = startYear + i;
    const scYear = SixtyCycleYear.fromYear(y);
    const sc = scYear.getSixtyCycle();
    const stemHanja = sc.getHeavenStem().toString();
    const branchHanja = sc.getEarthBranch().toString();
    const stem = STEM_KO[stemHanja] || stemHanja;
    const branch = BRANCH_KO[branchHanja] || branchHanja;
    fortunes.push({
      year: y,
      stem,
      branch,
      element: STEM_ELEMENT[stemHanja] || "earth",
      description: `${y}년 ${stem}${branch}년`,
    });
  }
  return fortunes;
}

/** startDate 기준 days일간 일운 계산 */
function calculateDailyFortunes(startDate: Date, days: number): DailyFortune[] {
  const fortunes: DailyFortune[] = [];
  for (let i = 0; i < days; i++) {
    const d = new Date(startDate);
    d.setDate(d.getDate() + i);
    const y = d.getFullYear();
    const m = d.getMonth() + 1;
    const day = d.getDate();
    const solarDay = SolarDay.fromYmd(y, m, day);
    const scDay = SixtyCycleDay.fromSolarDay(solarDay);
    const sc = scDay.getSixtyCycle();
    const stemHanja = sc.getHeavenStem().toString();
    const branchHanja = sc.getEarthBranch().toString();
    const stem = STEM_KO[stemHanja] || stemHanja;
    const branch = BRANCH_KO[branchHanja] || branchHanja;
    const dateStr = `${y}-${String(m).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    fortunes.push({
      date: dateStr,
      stem,
      branch,
      element: STEM_ELEMENT[stemHanja] || "earth",
      description: `${m}/${day} ${stem}${branch}일`,
    });
  }
  return fortunes;
}
