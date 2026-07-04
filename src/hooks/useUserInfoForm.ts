"use client";

import { useState, useEffect } from "react";
import { timeToSijin } from "@/lib/time-utils";
import { createClient } from "@/lib/supabase/client";
import { UserInfo } from "@/types/user-info";

const STORAGE_KEY = "arcana_user_info";
const CONSENT_KEY = "arcana_privacy_agreed";

type GenderInput = "male" | "female" | "other" | "";

type ProfileSetters = {
  setName: (v: string) => void;
  setBirthDate: (v: string) => void;
  setGender: (v: "male" | "female" | "other") => void;
  setBirthHourNum: (v: string) => void;
  setBirthMinuteNum: (v: string) => void;
  setTimeUnknown: (v: boolean) => void;
  setMbti: (v: string) => void;
  setSaveInfo: (v: boolean) => void;
  setHasSavedInfo: (v: boolean) => void;
};

/** sessionStorage에 저장된 정보 로드 (동의한 경우만, 탭 종료 시 자동 삭제) */
function loadLocalInfo(): UserInfo | null {
  try {
    const consent = sessionStorage.getItem(CONSENT_KEY);
    if (!consent) return null;
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as UserInfo;
  } catch {
    return null;
  }
}

/** sessionStorage에 정보 저장 (탭 종료 시 자동 삭제) */
export function saveLocalInfo(info: UserInfo): void {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(info));
    sessionStorage.setItem(CONSENT_KEY, new Date().toISOString());
  } catch { /* 시크릿 모드 등 sessionStorage 차단 시 무시 */ } // NOSONAR
}

/** sessionStorage에서 정보 삭제 (동의 철회) */
export function clearLocalInfo(): void {
  try {
    sessionStorage.removeItem(STORAGE_KEY);
    sessionStorage.removeItem(CONSENT_KEY);
  } catch { /* sessionStorage 차단 시 무시 */ } // NOSONAR
}

function applyBirthTime(
  timeStr: string | null | undefined,
  setHour: (v: string) => void,
  setMinute: (v: string) => void,
  setUnknown: (v: boolean) => void,
): void {
  if (!timeStr) { setUnknown(true); return; }
  const [h, m] = timeStr.split(":");
  setHour(h === undefined ? "" : String(Number.parseInt(h, 10)));
  setMinute(m === undefined ? "" : String(Number.parseInt(m, 10)));
}

async function applySupabaseProfile(userId: string, setters: ProfileSetters): Promise<void> {
  const supabase = createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("birth_name, birth_date, gender, birth_hour, mbti, privacy_agreed_at")
    .eq("id", userId)
    .single();

  if (!profile?.birth_date) return;
  if (profile.birth_name) setters.setName(profile.birth_name);
  setters.setBirthDate(profile.birth_date);
  if (profile.gender) setters.setGender(profile.gender as "male" | "female" | "other");
  applyBirthTime(profile.birth_hour, setters.setBirthHourNum, setters.setBirthMinuteNum, setters.setTimeUnknown);
  if (profile.mbti) setters.setMbti(profile.mbti);
  if (profile.privacy_agreed_at) setters.setSaveInfo(true);
  setters.setHasSavedInfo(true);
}

function applyLocalProfile(setters: ProfileSetters): void {
  const local = loadLocalInfo();
  if (!local) return;
  if (local.name) setters.setName(local.name);
  if (local.birthDate) setters.setBirthDate(local.birthDate);
  if (local.gender) setters.setGender(local.gender);
  if (local.birthTime !== undefined) {
    applyBirthTime(local.birthTime, setters.setBirthHourNum, setters.setBirthMinuteNum, setters.setTimeUnknown);
  }
  if (local.mbti) setters.setMbti(local.mbti);
  setters.setSaveInfo(true);
  setters.setHasSavedInfo(true);
}

async function persistProfileToSupabase(data: UserInfo, birthDate: string): Promise<boolean> {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return true;
    const { error } = await supabase.from("profiles").update({
      birth_name: data.name,
      birth_date: birthDate,
      gender: data.gender,
      birth_hour: data.birthTime,
      mbti: data.mbti ?? null,
      privacy_agreed_at: new Date().toISOString(),
    }).eq("id", user.id);
    if (error) {
      console.error("프로필 저장 실패:", error);
      return false;
    }
  } catch (e) {
    console.error("프로필 저장 오류:", e);
    return false;
  }
  return true;
}

export interface UseUserInfoFormReturn {
  // state
  name: string;
  setName: (v: string) => void;
  birthDate: string;
  setBirthDate: (v: string) => void;
  birthHourNum: string;
  setBirthHourNum: (v: string) => void;
  birthMinuteNum: string;
  setBirthMinuteNum: (v: string) => void;
  gender: GenderInput;
  setGender: (v: GenderInput) => void;
  timeUnknown: boolean;
  setTimeUnknown: (v: boolean) => void;
  mbti: string;
  setMbti: (v: string) => void;
  saveInfo: boolean;
  setSaveInfo: (v: boolean) => void;
  showPrivacyModal: boolean;
  setShowPrivacyModal: (v: boolean) => void;
  loading: boolean;
  isLoggedIn: boolean;
  hasSavedInfo: boolean;
  saveWarning: boolean;
  setSaveWarning: (v: boolean) => void;
  // derived
  birthTime: string | null;
  sijin: ReturnType<typeof timeToSijin> | null;
  isValid: boolean;
  // handlers
  handleSubmit: () => Promise<void>;
  handleSaveToggle: () => void;
}

export function useUserInfoForm(
  mode: "tarot" | "saju" | "shinjeom",
  onSubmit: (data: UserInfo) => void,
): UseUserInfoFormReturn {
  const [name, setName] = useState("");
  const [birthDate, setBirthDate] = useState(""); // "YYYY-MM-DD"
  const [gender, setGender] = useState<GenderInput>("");
  const [birthHourNum, setBirthHourNum] = useState("");
  const [birthMinuteNum, setBirthMinuteNum] = useState("");
  const [timeUnknown, setTimeUnknown] = useState(false);
  const [mbti, setMbti] = useState("");
  const [saveInfo, setSaveInfo] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [hasSavedInfo, setHasSavedInfo] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saveWarning, setSaveWarning] = useState(false);

  // 저장된 정보 자동 채우기 (로그인: Supabase / 비로그인: sessionStorage)
  useEffect(() => {
    const setters: ProfileSetters = {
      setName, setBirthDate,
      setGender: (v) => setGender(v),
      setBirthHourNum, setBirthMinuteNum, setTimeUnknown,
      setMbti,
      setSaveInfo, setHasSavedInfo,
    };
    const loadUserInfo = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setIsLoggedIn(true);
        await applySupabaseProfile(user.id, setters);
      } else {
        applyLocalProfile(setters);
      }
      setLoading(false);
    };
    loadUserInfo();
  }, []);

  let birthTime: string | null;
  if (timeUnknown) {
    birthTime = null;
  } else if (birthHourNum !== "" && birthMinuteNum !== "") {
    birthTime = `${birthHourNum.padStart(2, "0")}:${birthMinuteNum.padStart(2, "0")}`;
  } else {
    birthTime = null;
  }

  const sijin = birthTime ? timeToSijin(birthTime) : null;

  // mode별 유효성 검증
  const timeProvided = timeUnknown || birthTime !== null;
  let isValid: boolean;
  if (mode === "saju") {
    isValid = !!(birthDate && gender && timeProvided);
  } else if (mode === "shinjeom") {
    isValid = true;
  } else {
    isValid = !!(name.trim() && birthDate && gender);
  }

  const handleSubmit = async () => {
    if (!isValid) return;

    const data: UserInfo = {
      name: name.trim(),
      birthDate,
      gender: (gender || "other") as "male" | "female" | "other",
      birthTime,
      mbti: mbti || undefined,
    };

    if (saveInfo) {
      if (isLoggedIn) {
        const saved = await persistProfileToSupabase(data, birthDate);
        if (!saved) setSaveWarning(true);
      } else {
        saveLocalInfo(data);
      }
    }

    onSubmit(data);
  };

  /** 동의 철회 시 저장된 데이터도 삭제 */
  const handleSaveToggle = () => {
    if (saveInfo) {
      setSaveInfo(false);
      if (!isLoggedIn) clearLocalInfo();
    } else {
      setShowPrivacyModal(true);
    }
  };

  return {
    name, setName,
    birthDate, setBirthDate,
    birthHourNum, setBirthHourNum,
    birthMinuteNum, setBirthMinuteNum,
    gender, setGender,
    timeUnknown, setTimeUnknown,
    mbti, setMbti,
    saveInfo, setSaveInfo,
    showPrivacyModal, setShowPrivacyModal,
    loading,
    isLoggedIn,
    hasSavedInfo,
    saveWarning, setSaveWarning,
    birthTime,
    sijin,
    isValid,
    handleSubmit,
    handleSaveToggle,
  };
}
