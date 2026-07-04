"use client";

import { motion } from "framer-motion";
import { MBTI_TYPES } from "@/data/mbti";
import { PrivacyConsentModal } from "./PrivacyConsentModal";
import { BirthTimeInput } from "./BirthTimeInput";
import { UserInfo } from "@/types/user-info";
import { useT } from "@/i18n/useT";
import { useUserInfoForm } from "@/hooks/useUserInfoForm";

interface UserInfoFormProps {
  readonly mode: "tarot" | "saju" | "shinjeom";
  readonly onSubmit: (data: UserInfo) => void;
  readonly onBack: () => void;
  readonly characterName?: string;
}

export function UserInfoForm({ mode, onSubmit, onBack, characterName }: UserInfoFormProps) {
  const { t } = useT();
  const {
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
    saveWarning,
    sijin,
    isValid,
    handleSubmit,
    handleSaveToggle,
  } = useUserInfoForm(mode, onSubmit);

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
  const computeTitle = (): string => {
    if (mode === "saju") return t("user-info.title.saju");
    if (mode === "shinjeom") return t("user-info.title.shinjeom");
    return t("user-info.title.tarot");
  };
  const title = computeTitle();
  const computeSubtitle = (): string => {
    if (mode === "saju") return t("user-info.subtitle.saju");
    if (mode === "shinjeom") return t("user-info.subtitle.shinjeom");
    if (characterName) return t("user-info.subtitle.tarot.with-name").replace("{name}", characterName);
    return t("user-info.subtitle.tarot.default");
  };
  const subtitle = computeSubtitle();
  const computeSubmitLabel = (): string => {
    if (mode === "saju") return t("user-info.submit.saju");
    if (mode === "shinjeom") return t("user-info.submit.shinjeom");
    return t("user-info.submit.tarot");
  };
  const submitLabel = computeSubmitLabel();

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
          {t("user-info.label.name")} {mode === "tarot" ? "*" : t("user-info.label.optional")}
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
        <label htmlFor="userinfo-birthdate" className="text-arcana-muted text-xs font-serif mb-1.5 block">{t("user-info.label.birthdate")} {mode === "shinjeom" ? t("user-info.label.optional") : "*"}</label>
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
        <label className="text-arcana-muted text-xs font-serif mb-1.5 block">{t("user-info.label.gender")} {mode === "shinjeom" ? t("user-info.label.optional") : "*"}</label>
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
          {t("user-info.label.birth-time")} {mode === "saju" ? "*" : t("user-info.label.optional")}
        </label>
        <BirthTimeInput
          hour={birthHourNum}
          minute={birthMinuteNum}
          unknown={timeUnknown}
          sijin={sijin}
          onHourChange={setBirthHourNum}
          onMinuteChange={setBirthMinuteNum}
          onUnknownChange={setTimeUnknown}
          inputClasses={inputClasses}
        />
      </div>

      {/* MBTI (선택) */}
      <div>
        <label htmlFor="userinfo-mbti" className="text-arcana-muted text-xs font-serif mb-1.5 block">
          {t("user-info.label.mbti")} {t("user-info.label.optional")}
        </label>
        <div className="relative">
          <select
            id="userinfo-mbti"
            value={mbti}
            onChange={(e) => setMbti(e.target.value)}
            className={`${inputClasses} appearance-none pr-8`}
          >
            <option value="">{t("user-info.mbti.none")}</option>
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
        <p className="text-xs text-yellow-400/70 text-center">{t("user-info.save-warning")}</p>
      )}

      <PrivacyConsentModal
        isOpen={showPrivacyModal}
        onAgree={() => { setSaveInfo(true); setShowPrivacyModal(false); }}
        onCancel={() => setShowPrivacyModal(false)}
      />
    </div>
  );
}
