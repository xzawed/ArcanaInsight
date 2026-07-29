"use client";

import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import { motion } from "framer-motion";
import { getCharacterById } from "@/data/characters";
import { getCharacterDescription, getCharacterSpeciality } from "@/data/characters/locale-helpers";
import { useLocaleStore } from "@/hooks/useLocaleStore";
import { useT } from "@/i18n/useT";
import { ParticleOverlay } from "@/components/effects/ParticleOverlay";
import { getCharacterCutoutImageStyle } from "@/components/character/SpriteAnimator";
import { getCharacterImageUrl } from "@/lib/storage/character-image";
import { ThemeAtmosphere } from "@/components/effects/MysticBackground";
import { useThemeStore } from "@/hooks/useTheme";

const SERVICE_IDS = [
  { id: "tarot",    icon: "🃏" },
  { id: "saju",     icon: "☯" },
  { id: "shinjeom", icon: "🔮" },
  { id: "fortune",  icon: "⭐", disabled: true },
] as const;

export default function CharacterPage() {
  const params = useParams();
  const router = useRouter();
  const locale = useLocaleStore((s) => s.locale);
  const { t } = useT();
  const { activeTheme } = useThemeStore();
  const id = typeof params.id === "string" ? params.id : "";
  const character = getCharacterById(id);

  if (!character) {
    return (
      // 정상 경로 스테이지와 같은 chrome 차감. min-h-screen(100vh)은 유령 스크롤을 만든다
      // (docs/conventions/cross-platform.md §1).
      <div className="min-h-[calc(100dvh-7rem)] md:min-h-[calc(100dvh-3.5rem)] flex items-center justify-center">
        <p className="text-arcana-muted">{t("character.page.not-found")}</p>
      </div>
    );
  }

  const services = SERVICE_IDS.map((s) => ({
    id: s.id,
    icon: s.icon,
    label: t(`character.service.${s.id}.label`),
    desc: t(`character.service.${s.id}.desc`),
    disabled: "disabled" in s ? s.disabled : false,
  }));
  const cutoutImageStyle = getCharacterCutoutImageStyle(character.effectTheme.primary);

  return (
    <div className="relative overflow-hidden">
      <div className="fixed inset-0 -z-10">
        <Image src="/images/backgrounds/tarot-topic-bg.jpg" alt="" fill className="object-cover"  sizes="100vw" />
        <div className="absolute inset-0 bg-arcana-bg/60" />
        <ThemeAtmosphere theme={activeTheme} intensity="service" className="mix-blend-screen" testId="character-theme-atmosphere" />
      </div>
      <ParticleOverlay density="low" className="z-10" />

      <div className="relative z-20 h-[calc(100dvh-7rem)] md:h-[calc(100dvh-3.5rem)] flex flex-col md:flex-row overflow-hidden">
        {/* 좌측: 캐릭터 이미지 */}
        <div
          className="h-[25%] md:h-auto md:w-[50%] md:flex-shrink-0 relative overflow-hidden"
          style={{
            WebkitMaskImage: [
              "linear-gradient(to bottom, transparent 0%, black 14%, black 100%)",
              "linear-gradient(to top,    transparent 0%, black 18%, black 100%)",
              "linear-gradient(to right,  transparent 0%, black 10%, black 100%)",
              "linear-gradient(to left,   transparent 0%, black 10%, black 100%)",
            ].join(", "),
            WebkitMaskComposite: "destination-in, destination-in, destination-in" as string,
            maskImage: [
              "linear-gradient(to bottom, transparent 0%, black 14%, black 100%)",
              "linear-gradient(to top,    transparent 0%, black 18%, black 100%)",
              "linear-gradient(to right,  transparent 0%, black 10%, black 100%)",
              "linear-gradient(to left,   transparent 0%, black 10%, black 100%)",
            ].join(", "),
            maskComposite: "intersect, intersect, intersect",
          }}
        >
          <Image
            src={getCharacterImageUrl(character.id, "idle")}
            alt={character.name}
            fill
            sizes="(max-width: 768px) 100vw, 50vw"
            className="object-cover object-top"
            style={cutoutImageStyle}
          />
        </div>

        {/* 우측: 캐릭터 정보 + 서비스 선택 */}
        <div className="flex-1 md:w-[50%] flex flex-col justify-start md:justify-center px-6 md:px-10 py-4 md:py-6 overflow-y-auto">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <button
              onClick={() => router.back()}
              className="text-arcana-muted text-sm hover:text-arcana-purple transition-colors mb-4"
            >
              {t("common.back-arrow")}
            </button>

            <div className="mb-6">
              <h1 className="font-serif font-bold text-2xl md:text-3xl mb-1">{character.name}</h1>
              <p className="text-arcana-muted text-sm">{character.nameJp}</p>
              <div className="mt-2 inline-block px-3 py-1 bg-arcana-purple/10 border border-arcana-purple/30 rounded-full">
                <span className="text-arcana-purple text-xs font-serif">{getCharacterSpeciality(character, locale)}</span>
              </div>
              <p className="text-arcana-text text-sm leading-relaxed mt-3">{getCharacterDescription(character, locale)}</p>
            </div>

            <h2 className="font-serif font-bold text-sm text-arcana-muted mb-3">{t("character.page.service-select")}</h2>
            <div className="grid grid-cols-2 gap-3">
              {services.map((service, index) => (
                <motion.button
                  key={service.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: service.disabled ? 0.4 : 1, y: 0 }}
                  transition={{ delay: index * 0.08 }}
                  onClick={() => {
                    if (!service.disabled) {
                      router.push(`/${service.id}?character=${character.id}`);
                    }
                  }}
                  disabled={service.disabled}
                  className={`group bg-arcana-card/70 backdrop-blur-sm border rounded-xl p-4 text-left transition-all ${
                    service.disabled
                      ? "border-arcana-border/50 cursor-not-allowed"
                      : "border-arcana-border hover:border-arcana-purple hover:shadow-lg hover:shadow-arcana-purple/10"
                  }`}
                >
                  <span className="text-2xl block mb-2">{service.icon}</span>
                  <h3 className={`font-serif font-bold text-sm transition-colors ${service.disabled ? "" : "group-hover:text-arcana-purple"}`}>
                    {service.label}
                  </h3>
                  <p className="text-arcana-muted text-xs mt-0.5">{service.desc}</p>
                  {service.disabled && (
                    <span className="text-arcana-muted text-[10px] mt-1 block">준비 중</span>
                  )}
                </motion.button>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
