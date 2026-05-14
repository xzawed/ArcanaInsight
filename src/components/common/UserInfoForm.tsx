"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { timeToSijin } from "@/lib/time-utils";
import { MBTI_TYPES } from "@/data/mbti";
import { PrivacyConsentModal } from "./PrivacyConsentModal";
import { createClient } from "@/lib/supabase/client";
import { UserInfo } from "@/types/user-info";
import { useT } from "@/i18n/useT";

const STORAGE_KEY = "arcana_user_info";
const CONSENT_KEY = "arcana_privacy_agreed";

interface UserInfoFormProps {
  readonly mode: "tarot" | "saju" | "shinjeom";
  readonly onSubmit: (data: UserInfo) => void;
  readonly onBack: () => void;
  readonly characterName?: string;
}

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
function saveLocalInfo(info: UserInfo): void {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(info));
    sessionStorage.setItem(CONSENT_KEY, new Date().toISOString());
  } catch { /* 시크릿 모드 등 sessionStorage 차단 시 무시 */ } // NOSONAR
}

/** sessionStorage에서 정보 삭제 (동의 철회) */
function clearLocalInfo(): void {
  try {
    sessionStorage.removeItem(STORAGE_KEY);
    sessionStorage.removeItem(CONSENT_KEY);
  } catch { /* sessionStorage 차단 시 무시 */ } // NOSONAR
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
  if (profile.birth_hour) {
    const [h, m] = profile.birth_hour.split(":");
    if (h !== undefined && m !== undefined) {
      setters.setBirthHourNum(String(parseInt(h, 10)));
      setters.setBirthMinuteNum(String(parseInt(m, 10)));
    }
  } else {
    setters.setTimeUnknown(true);
  }
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
  if (local.birthTime) {
    const [h, m] = local.birthTime.split(":");
    if (h !== undefined && m !== undefined) {
      setters.setBirthHourNum(String(parseInt(h, 10)));
      setters.setBirthMinuteNum(String(parseInt(m, 10)));
    }
  } else if (local.birthTime === null) {
    setters.setTimeUnknown(true);
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

export function UserInfoForm({ mode, onSubmit, onBack, characterName }: UserInfoFormProps) {
  const { t } = useT();
  const [name, setName] = useState("");
  const [birthDate, setBirthDate] = useState(""); // "YYYY-MM-DD"
  const [gender, setGender] = useState<"male" | "female" | "other" | "">("");
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

  const birthTime: string | null = timeUnknown
    ? null
    : (birthHourNum !== "" && birthMinuteNum !== ""
      ? `${birthHourNum.padStart(2, "0")}:${birthMinuteNum.padStart(2, "0")}`
      : null);

  const sijin = birthTime ? timeToSijin(birthTime) : null;

  // mode별 유효성 검증
  const timeProvided = timeUnknown || birthTime !== null;
  const isValid = mode === "saju"
    ? !!(birthDate && gender && timeProvided)
    : mode === "shinjeom"
    ? true
    : !!(name.trim() && birthDate && gender);

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
    if (!saveInfo) {
      setShowPrivacyModal(true);
    } else {
      setSaveInfo(false);
      if (!isLoggedIn) clearLocalInfo();
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-2 border-arcana-purple/30 border-t-arcana-purple rounded-full animate-spin" />
      </div>
    );
  }

  const inputClasses =
    "w-full bg-arcana-card/70 border border-arcana-border rounded-xl px-3 py-2.5 text-arcana-text text-sm focus:border-arcana-purple focus:outline-none";

  const backLabel = mode === "saju" ? t("common.back-arrow") : t("tarot.page.spread-select.back");
  const title = mode === "saju" ? t("user-info.title.saju") : mode === "shinjeom" ? t("user-info.title.shinjeom") : t("user-info.title.tarot");
  const computeSubtitle = (): string => {
    if (mode === "saju") return t("user-info.subtitle.saju");
    if (mode === "shinjeom") return t("user-info.subtitle.shinjeom");
    if (characterName) return t("user-info.subtitle.tarot.with-name").replace("{name}", characterName);
    return t("user-info.subtitle.tarot.default");
  };
  const subtitle = computeSubtitle();
  const submitLabel = mode === "saju" ? t("user-info.submit.saju") : mode === "shinjeom" ? t("user-info.submit.shinjeom") : t("user-info.submit.tarot");

  return (
    <div className="space-y-5">
      <button
        type="button"
        onClick={onBack}
        className="text-arcana-muted text-sm hover:text-arcana-purple transition-colors"
      >
        {backLabel}
      </button>

      <div>
        <h3 className="font-serif font-bold text-lg mb-1">{title}</h3>
        <p className="text-arcana-muted text-xs">{subtitle}</p>
      </div>

      {hasSavedInfo && (
        <div className="bg-arcana-purple/10 border border-arcana-purple/30 rounded-xl px-4 py-2">
          <p className="text-arcana-purple text-xs">
            {t("user-info.saved-info-banner")}
          </p>
        </div>
      )}

      {/* 이름 */}
      <div>
        <label htmlFor="userinfo-name" className="text-arcana-muted text-xs font-serif mb-1.5 block">
          이름 {mode === "tarot" ? "*" : "(선택)"}
        </label>
        <input
          id="userinfo-name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t("user-info.name-placeholder")}
          className={inputClasses}
        />
      </div>

      {/* 생년월일 — 단일 date input */}
      <div>
        <label htmlFor="userinfo-birthdate" className="text-arcana-muted text-xs font-serif mb-1.5 block">생년월일 {mode === "shinjeom" ? "(선택)" : "*"}</label>
        <input
          id="userinfo-birthdate"
          type="date"
          value={birthDate}
          onChange={(e) => setBirthDate(e.target.value)}
          min="1950-01-01"
          max="2010-12-31"
          className={inputClasses}
        />
      </div>

      {/* 성별 */}
      <div>
        <label className="text-arcana-muted text-xs font-serif mb-1.5 block">성별 {mode === "shinjeom" ? "(선택)" : "*"}</label>
        <div className="grid grid-cols-3 gap-2">
          {(["male", "female", "other"] as const).map((val) => (
            <button
              key={val}
              type="button"
              onClick={() => setGender(val)}
              className={`py-2.5 rounded-full text-sm font-serif font-bold transition-all ${
                gender === val
                  ? "bg-gradient-to-r from-arcana-purple to-arcana-indigo text-white shadow-lg shadow-arcana-purple/20"
                  : "bg-arcana-card/70 border border-arcana-border text-arcana-muted hover:border-arcana-purple"
              }`}
            >
              {t(`user-info.gender.${val}`)}
            </button>
          ))}
        </div>
      </div>

      {/* 태어난 시각 */}
      <div>
        <label className="text-arcana-muted text-xs font-serif mb-1.5 block">
          태어난 시각 {mode === "saju" ? "*" : "(선택)"}
        </label>
        <div className="flex items-center gap-2 mb-2">
          <input
            type="number"
            min={0}
            max={23}
            value={birthHourNum}
            onChange={(e) => {
              const v = e.target.value;
              if (v === "") { setBirthHourNum(""); return; }
              const n = parseInt(v, 10);
              if (!isNaN(n) && n >= 0 && n <= 23) setBirthHourNum(String(n));
            }}
            disabled={timeUnknown}
            placeholder="시"
            className={`${inputClasses} w-20 text-center disabled:opacity-40`}
          />
          <span className="text-arcana-muted text-lg">:</span>
          <input
            type="number"
            min={0}
            max={59}
            value={birthMinuteNum}
            onChange={(e) => {
              const v = e.target.value;
              if (v === "") { setBirthMinuteNum(""); return; }
              const n = parseInt(v, 10);
              if (!isNaN(n) && n >= 0 && n <= 59) setBirthMinuteNum(String(n));
            }}
            disabled={timeUnknown}
            placeholder="분"
            className={`${inputClasses} w-20 text-center disabled:opacity-40`}
          />
          {sijin && !timeUnknown && (
            <span className="text-arcana-purple/80 text-xs font-serif ml-1">
              → {sijin.label}({sijin.hanja})
            </span>
          )}
        </div>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={timeUnknown}
            onChange={(e) => {
              setTimeUnknown(e.target.checked);
              if (e.target.checked) {
                setBirthHourNum("");
                setBirthMinuteNum("");
              }
            }}
            className="w-4 h-4 rounded border-arcana-border accent-arcana-purple"
          />
          <span className="text-arcana-muted text-xs">시간을 모릅니다</span>
        </label>
      </div>

      {/* MBTI (선택) */}
      <div>
        <label htmlFor="userinfo-mbti" className="text-arcana-muted text-xs font-serif mb-1.5 block">
          MBTI (선택)
        </label>
        <div className="relative">
          <select
            id="userinfo-mbti"
            value={mbti}
            onChange={(e) => setMbti(e.target.value)}
            className={`${inputClasses} appearance-none pr-8`}
          >
            <option value="">선택 안 함</option>
            {MBTI_TYPES.map((type) => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-arcana-muted pointer-events-none text-xs">▼</span>
        </div>
      </div>

      {/* 정보 저장 동의 (로그인/비로그인 모두 표시) */}
      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={saveInfo}
          onChange={handleSaveToggle}
          className="w-4 h-4 rounded border-arcana-border text-arcana-purple focus:ring-arcana-purple"
        />
        <span className="text-arcana-muted text-xs">
          {isLoggedIn
            ? t("user-info.save-info.with-account")
            : t("user-info.save-info.local")}
        </span>
      </label>

      <motion.button
        type="button"
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={handleSubmit}
        disabled={!isValid}
        className={`w-full py-3 rounded-full font-serif font-bold text-sm transition-all ${
          isValid
            ? "bg-gradient-to-r from-arcana-purple to-arcana-indigo text-white hover:opacity-90 shadow-lg shadow-arcana-purple/20"
            : "bg-arcana-card/50 text-arcana-muted/50 cursor-not-allowed"
        }`}
      >
        {submitLabel}
      </motion.button>

      {saveWarning && (
        <p className="text-xs text-yellow-400/70 text-center">프로필 저장에 실패했습니다. 리딩에는 영향이 없습니다.</p>
      )}

      <PrivacyConsentModal
        isOpen={showPrivacyModal}
        onAgree={() => { setSaveInfo(true); setShowPrivacyModal(false); }}
        onCancel={() => setShowPrivacyModal(false)}
      />
    </div>
  );
}
