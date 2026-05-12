export interface UserInfo {
  name: string;
  birthDate: string;   // "YYYY-MM-DD"
  gender: "male" | "female" | "other";
  birthTime: string | null;  // "HH:MM" | null (null = 시간 모름)
  mbti?: string;             // "INTJ" 등 선택 사항
}
