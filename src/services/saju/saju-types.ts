import { OhaengType } from "@/data/saju/constants";

export interface SajuInput {
  birthDate: string;   // "1990-05-15" (양력)
  birthHour: string;   // "ja" (12시진 코드)
  gender: "male" | "female" | "other";
  name?: string;
}

export interface Pillar {
  stem: string;        // 천간 한글 (예: "갑")
  stemHanja: string;   // 천간 한자 (예: "甲")
  branch: string;      // 지지 한글 (예: "자")
  branchHanja: string; // 지지 한자 (예: "子")
  element: OhaengType; // 천간의 오행
}

export interface SajuResult {
  pillars: {
    year: Pillar;
    month: Pillar;
    day: Pillar;
    hour: Pillar;
  };
  dayMaster: string;
  dayMasterElement: OhaengType;
  isStrong: boolean;
  elements: Record<OhaengType, number>;
  tenStars: { position: string; star: string; starKo: string; description: string }[];
  twelveStages: { position: string; stage: string; stageKo: string; description: string }[];
  interactions: {
    combinations: string[];
    clashes: string[];
    punishments: string[];
  };
  yongsin: { element: OhaengType; reason: string };
  majorFortunes: {
    startAge: number;
    endAge: number;
    stem: string;
    branch: string;
    element: OhaengType;
    description: string;
  }[];
  yearlyFortune: {
    year: number;
    stem: string;
    branch: string;
    element: OhaengType;
    description: string;
  };
}
