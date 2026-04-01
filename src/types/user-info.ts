export interface UserInfo {
  name: string;
  birthDate: string;   // "YYYY-MM-DD"
  gender: "male" | "female" | "other";
  birthHour: string;   // "ja" | "chuk" | ... | "unknown"
}
