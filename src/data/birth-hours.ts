export interface BirthHour {
  value: string;
  label: string;
  time: string;
}

export const birthHours: BirthHour[] = [
  { value: "ja", label: "자시", time: "23:00~01:00" },
  { value: "chuk", label: "축시", time: "01:00~03:00" },
  { value: "in", label: "인시", time: "03:00~05:00" },
  { value: "myo", label: "묘시", time: "05:00~07:00" },
  { value: "jin", label: "진시", time: "07:00~09:00" },
  { value: "sa", label: "사시", time: "09:00~11:00" },
  { value: "o", label: "오시", time: "11:00~13:00" },
  { value: "mi", label: "미시", time: "13:00~15:00" },
  { value: "sin", label: "신시", time: "15:00~17:00" },
  { value: "yu", label: "유시", time: "17:00~19:00" },
  { value: "sul", label: "술시", time: "19:00~21:00" },
  { value: "hae", label: "해시", time: "21:00~23:00" },
  { value: "unknown", label: "모름", time: "" },
];
