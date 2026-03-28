export type Mood = "default" | "smile" | "serious" | "surprised" | "wink" | "mystical";
export type ServiceType = "tarot" | "saju" | "shinjeom" | "fortune";

export interface CharacterConfig {
  id: string;
  name: string;
  nameJp: string;
  serviceType: ServiceType;
  greeting: string;
  expressions: Record<Mood, string>;
  idleAnimation: string;
  personality: string;
  speechStyle: string;
  voiceTone: string;
  unlocked: boolean;
}
