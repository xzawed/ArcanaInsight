export interface Sijin {
  key: string;
  label: string;
  hanja: string;
}

interface SijinBoundary extends Sijin {
  startHour: number;
  endHour: number;
}

// 자시(子時) = 23:00~00:59 (midnight crossing), 나머지는 단순 2시간 블록
const SIJIN_TABLE: SijinBoundary[] = [
  { key: "chuk", label: "축시", hanja: "丑時", startHour: 1,  endHour: 3  },
  { key: "in",   label: "인시", hanja: "寅時", startHour: 3,  endHour: 5  },
  { key: "myo",  label: "묘시", hanja: "卯時", startHour: 5,  endHour: 7  },
  { key: "jin",  label: "진시", hanja: "辰時", startHour: 7,  endHour: 9  },
  { key: "sa",   label: "사시", hanja: "巳時", startHour: 9,  endHour: 11 },
  { key: "o",    label: "오시", hanja: "午時", startHour: 11, endHour: 13 },
  { key: "mi",   label: "미시", hanja: "未時", startHour: 13, endHour: 15 },
  { key: "sin",  label: "신시", hanja: "申時", startHour: 15, endHour: 17 },
  { key: "yu",   label: "유시", hanja: "酉時", startHour: 17, endHour: 19 },
  { key: "sul",  label: "술시", hanja: "戌時", startHour: 19, endHour: 21 },
  { key: "hae",  label: "해시", hanja: "亥時", startHour: 21, endHour: 23 },
];

const JASI: Sijin = { key: "ja", label: "자시", hanja: "子時" };

export function timeToSijin(time: string | null | undefined): Sijin | null {
  if (!time || !/^\d{2}:\d{2}$/.test(time)) return null;
  const hour = Number.parseInt(time.split(":")[0], 10);
  if (Number.isNaN(hour) || hour < 0 || hour > 23) return null;
  if (hour === 23 || hour === 0) return JASI;
  const found = SIJIN_TABLE.find(s => hour >= s.startHour && hour < s.endHour);
  return found ? { key: found.key, label: found.label, hanja: found.hanja } : null;
}
