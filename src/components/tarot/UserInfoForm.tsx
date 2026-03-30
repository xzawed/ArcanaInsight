"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { birthHours } from "@/data/birth-hours";
import { PrivacyConsentModal } from "./PrivacyConsentModal";
import { createClient } from "@/lib/supabase/client";

export interface UserInfoData {
  name: string;
  birthDate: string;
  gender: "male" | "female" | "other" | "";
  birthHour: string;
}

interface UserInfoFormProps {
  onSubmit: (data: UserInfoData) => void;
  onBack: () => void;
  characterName?: string;
}

const YEARS = Array.from({ length: 61 }, (_, i) => 2010 - i);
const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1);

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

export function UserInfoForm({ onSubmit, onBack, characterName }: UserInfoFormProps) {
  const [name, setName] = useState("");
  const [birthYear, setBirthYear] = useState("");
  const [birthMonth, setBirthMonth] = useState("");
  const [birthDay, setBirthDay] = useState("");
  const [gender, setGender] = useState<"male" | "female" | "other" | "">("");
  const [birthHour, setBirthHour] = useState("");
  const [saveInfo, setSaveInfo] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [hasSavedInfo, setHasSavedInfo] = useState(false);
  const [loading, setLoading] = useState(true);

  // 로그인 상태 + 저장된 정보 확인
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

        if (profile?.birth_name) {
          setName(profile.birth_name);
          setHasSavedInfo(true);
          if (profile.birth_date) {
            const d = new Date(profile.birth_date);
            setBirthYear(String(d.getFullYear()));
            setBirthMonth(String(d.getMonth() + 1));
            setBirthDay(String(d.getDate()));
          }
          if (profile.gender) setGender(profile.gender as "male" | "female" | "other");
          if (profile.birth_hour) setBirthHour(profile.birth_hour);
          if (profile.privacy_agreed_at) setSaveInfo(true);
        }
      }
      setLoading(false);
    };
    loadUserInfo();
  }, []);

  const days = birthYear && birthMonth
    ? Array.from({ length: getDaysInMonth(Number(birthYear), Number(birthMonth)) }, (_, i) => i + 1)
    : Array.from({ length: 31 }, (_, i) => i + 1);

  const isValid = name.trim() && birthYear && birthMonth && birthDay && gender;

  const handleSubmit = async () => {
    if (!isValid) return;

    const birthDate = `${birthYear}-${birthMonth.padStart(2, "0")}-${birthDay.padStart(2, "0")}`;
    const data: UserInfoData = {
      name: name.trim(),
      birthDate,
      gender: gender as "male" | "female" | "other",
      birthHour: birthHour || "unknown",
    };

    // 로그인 + 저장 동의 시 DB 업데이트
    if (isLoggedIn && saveInfo) {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { error: updateError } = await supabase.from("profiles").update({
            birth_name: data.name,
            birth_date: birthDate,
            gender: data.gender,
            birth_hour: data.birthHour,
            privacy_agreed_at: new Date().toISOString(),
          }).eq("id", user.id);
          if (updateError) console.error("프로필 저장 실패:", updateError);
        }
      } catch (e) {
        console.error("프로필 저장 오류:", e);
      }
    }

    onSubmit(data);
  };

  const handleSaveToggle = () => {
    if (!saveInfo) {
      setShowPrivacyModal(true);
    } else {
      setSaveInfo(false);
    }
  };

  const handlePrivacyAgree = () => {
    setSaveInfo(true);
    setShowPrivacyModal(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-2 border-arcana-purple/30 border-t-arcana-purple rounded-full animate-spin" />
      </div>
    );
  }

  const selectClasses =
    "w-full bg-arcana-card/70 border border-arcana-border rounded-xl px-3 py-2.5 text-arcana-text text-sm focus:border-arcana-purple focus:outline-none appearance-none";

  return (
    <div className="space-y-5">
      <button
        type="button"
        onClick={onBack}
        className="text-arcana-muted text-sm hover:text-arcana-purple transition-colors"
      >
        ← 주제 다시 선택
      </button>

      <div>
        <h3 className="font-serif font-bold text-lg mb-1">상담 정보 입력</h3>
        <p className="text-arcana-muted text-xs">
          {characterName
            ? `${characterName}가 더 정확한 리딩을 위해 필요한 정보예요`
            : "더 정확한 리딩을 위해 정보를 입력해주세요"}
        </p>
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
        <label className="text-arcana-muted text-xs font-serif mb-1.5 block">이름 *</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="이름을 입력하세요"
          className="w-full bg-arcana-card/70 border border-arcana-border rounded-xl px-4 py-2.5 text-arcana-text text-sm placeholder:text-arcana-muted/50 focus:border-arcana-purple focus:outline-none"
        />
      </div>

      {/* 생년월일 */}
      <div>
        <label className="text-arcana-muted text-xs font-serif mb-1.5 block">생년월일 *</label>
        <div className="grid grid-cols-3 gap-2">
          <select
            value={birthYear}
            onChange={(e) => setBirthYear(e.target.value)}
            className={selectClasses}
          >
            <option value="">년</option>
            {YEARS.map((y) => (
              <option key={y} value={String(y)}>
                {y}년
              </option>
            ))}
          </select>
          <select
            value={birthMonth}
            onChange={(e) => setBirthMonth(e.target.value)}
            className={selectClasses}
          >
            <option value="">월</option>
            {MONTHS.map((m) => (
              <option key={m} value={String(m)}>
                {m}월
              </option>
            ))}
          </select>
          <select
            value={birthDay}
            onChange={(e) => setBirthDay(e.target.value)}
            className={selectClasses}
          >
            <option value="">일</option>
            {days.map((d) => (
              <option key={d} value={String(d)}>
                {d}일
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* 성별 */}
      <div>
        <label className="text-arcana-muted text-xs font-serif mb-1.5 block">성별 *</label>
        <div className="grid grid-cols-3 gap-2">
          {(
            [
              ["male", "남성"],
              ["female", "여성"],
              ["other", "기타"],
            ] as const
          ).map(([val, label]) => (
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
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* 태어난 시 */}
      <div>
        <label className="text-arcana-muted text-xs font-serif mb-1.5 block">태어난 시 (선택)</label>
        <select
          value={birthHour}
          onChange={(e) => setBirthHour(e.target.value)}
          className={selectClasses}
        >
          <option value="">선택하세요</option>
          {birthHours.map((h) => (
            <option key={h.value} value={h.value}>
              {h.label}{h.time ? ` (${h.time})` : ""}
            </option>
          ))}
        </select>
      </div>

      {/* 정보 저장 (로그인 시만) */}
      {isLoggedIn && (
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={saveInfo}
            onChange={handleSaveToggle}
            className="w-4 h-4 rounded border-arcana-border text-arcana-purple focus:ring-arcana-purple"
          />
          <span className="text-arcana-muted text-xs">
            개인정보를 저장하여 다음 방문 시 자동 입력
          </span>
        </label>
      )}

      {/* 상담 시작 */}
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
        상담 시작하기
      </motion.button>

      <PrivacyConsentModal
        isOpen={showPrivacyModal}
        onAgree={handlePrivacyAgree}
        onCancel={() => setShowPrivacyModal(false)}
      />
    </div>
  );
}
