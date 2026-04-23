"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { birthHours } from "@/data/birth-hours";
import { PrivacyConsentModal } from "./PrivacyConsentModal";
import { createClient } from "@/lib/supabase/client";
import { UserInfo } from "@/types/user-info";

const STORAGE_KEY = "arcana_user_info";
const CONSENT_KEY = "arcana_privacy_agreed";

interface UserInfoFormProps {
  readonly mode: "tarot" | "saju";
  readonly onSubmit: (data: UserInfo) => void;
  readonly onBack: () => void;
  readonly characterName?: string;
}

/** localStorage에 저장된 정보 로드 (동의한 경우만) */
function loadLocalInfo(): UserInfo | null {
  try {
    const consent = localStorage.getItem(CONSENT_KEY);
    if (!consent) return null;
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as UserInfo;
  } catch {
    return null;
  }
}

/** localStorage에 정보 저장 */
function saveLocalInfo(info: UserInfo): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(info));
    localStorage.setItem(CONSENT_KEY, new Date().toISOString());
  } catch { /* 시크릿 모드 등 localStorage 차단 시 무시 */ } // NOSONAR
}

/** localStorage에서 정보 삭제 (동의 철회) */
function clearLocalInfo(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(CONSENT_KEY);
  } catch { /* localStorage 차단 시 무시 */ } // NOSONAR
}

export function UserInfoForm({ mode, onSubmit, onBack, characterName }: UserInfoFormProps) {
  const [name, setName] = useState("");
  const [birthDate, setBirthDate] = useState(""); // "YYYY-MM-DD"
  const [gender, setGender] = useState<"male" | "female" | "other" | "">("");
  const [birthHour, setBirthHour] = useState("");
  const [saveInfo, setSaveInfo] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [hasSavedInfo, setHasSavedInfo] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saveWarning, setSaveWarning] = useState(false);

  // 저장된 정보 자동 채우기 (로그인: Supabase / 비로그인: localStorage)
  useEffect(() => {
    const loadUserInfo = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        setIsLoggedIn(true);
        const { data: profile } = await supabase
          .from("profiles")
          .select("birth_name, birth_date, gender, birth_hour, privacy_agreed_at")
          .eq("id", user.id)
          .single();

        if (profile?.birth_date) {
          if (profile.birth_name) setName(profile.birth_name);
          setBirthDate(profile.birth_date);
          if (profile.gender) setGender(profile.gender as "male" | "female" | "other");
          if (profile.birth_hour) setBirthHour(profile.birth_hour);
          if (profile.privacy_agreed_at) setSaveInfo(true);
          setHasSavedInfo(true);
        }
      } else {
        // 비로그인: localStorage에서 로드
        const local = loadLocalInfo();
        if (local) {
          if (local.name) setName(local.name);
          if (local.birthDate) setBirthDate(local.birthDate);
          if (local.gender) setGender(local.gender);
          if (local.birthHour) setBirthHour(local.birthHour);
          setSaveInfo(true);
          setHasSavedInfo(true);
        }
      }
      setLoading(false);
    };
    loadUserInfo();
  }, []);

  // mode별 유효성 검증
  const isValid = mode === "saju"
    ? !!(birthDate && birthHour && gender)
    : !!(name.trim() && birthDate && gender);

  const handleSubmit = async () => {
    if (!isValid) return;

    const data: UserInfo = {
      name: name.trim(),
      birthDate,
      gender: gender as "male" | "female" | "other",
      birthHour: birthHour || "unknown",
    };

    if (saveInfo) {
      if (isLoggedIn) {
        // 로그인 사용자: Supabase profiles 업데이트
        try {
          const supabase = createClient();
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            const { error } = await supabase.from("profiles").update({
              birth_name: data.name,
              birth_date: birthDate,
              gender: data.gender,
              birth_hour: data.birthHour,
              privacy_agreed_at: new Date().toISOString(),
            }).eq("id", user.id);
            if (error) {
              console.error("프로필 저장 실패:", error);
              setSaveWarning(true);
            }
          }
        } catch (e) {
          console.error("프로필 저장 오류:", e);
        }
      } else {
        // 비로그인 사용자: localStorage 저장
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

  // saju 모드에서는 "모름" 항목 제외 (사주 계산에 출생시간 필수)
  const hourOptions = mode === "saju"
    ? birthHours.filter((h) => h.value !== "unknown")
    : birthHours;

  const backLabel = mode === "saju" ? "← 뒤로" : "← 주제 다시 선택";
  const title = mode === "saju" ? "생년월일 정보 입력" : "상담 정보 입력";
  const subtitle = mode === "saju"
    ? "정확한 사주 분석을 위해 필수 정보입니다"
    : characterName
      ? `${characterName}가 더 정확한 리딩을 위해 필요한 정보예요`
      : "더 정확한 리딩을 위해 정보를 입력해주세요";
  const submitLabel = mode === "saju" ? "사주 분석 시작" : "상담 시작하기";

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
            저장된 정보가 자동으로 채워졌습니다. 수정하시면 자동 저장됩니다.
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
          placeholder="이름을 입력하세요"
          className={inputClasses}
        />
      </div>

      {/* 생년월일 — 단일 date input */}
      <div>
        <label htmlFor="userinfo-birthdate" className="text-arcana-muted text-xs font-serif mb-1.5 block">생년월일 *</label>
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
        <label className="text-arcana-muted text-xs font-serif mb-1.5 block">성별 *</label>
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
              {{ male: "남성", female: "여성", other: "기타" }[val]}
            </button>
          ))}
        </div>
      </div>

      {/* 태어난 시 */}
      <div>
        <label htmlFor="userinfo-birthhour" className="text-arcana-muted text-xs font-serif mb-1.5 block">
          태어난 시 {mode === "saju" ? "*" : "(선택)"}
        </label>
        <div className="relative">
        <select
          id="userinfo-birthhour"
          value={birthHour}
          onChange={(e) => setBirthHour(e.target.value)}
          className={`${inputClasses} appearance-none pr-8`}
        >
          <option value="">선택하세요</option>
          {hourOptions.map((h) => (
            <option key={h.value} value={h.value}>
              {h.label}{h.time ? ` (${h.time})` : ""}
            </option>
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
            ? "개인정보를 저장하여 다음 방문 시 자동 입력"
            : "이 브라우저에 정보를 저장하여 다음 이용 시 자동 입력"}
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
