"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { useThemeStore } from "@/hooks/useTheme";
import { ThemeAtmosphere } from "./MysticBackground";
import { ThemeAtmosphereLayer } from "./ThemeAtmosphereLayer";
import { CanvasParticleLayer } from "./CanvasParticleLayer";
import { getServiceBackgroundUrl } from "@/lib/storage/card-style";

type ServiceType = "tarot" | "saju" | "shinjeom";

interface ServiceBackgroundProps {
  readonly service: ServiceType;
}

export function ServiceBackground({ service }: ServiceBackgroundProps) {
  const { activeTheme } = useThemeStore();
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsMobile(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  const atmosphereIntensity = isMobile ? "low" : "high";

  return (
    <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none" aria-hidden data-testid={`service-background-${service}`}>
      <Image src={getServiceBackgroundUrl(service, activeTheme)} alt="" fill className="object-cover" sizes="100vw" unoptimized />
      <div className="absolute inset-0 bg-arcana-bg/50" />
      <CanvasParticleLayer density={isMobile ? "low" : "medium"} />
      <ThemeAtmosphere theme={activeTheme} intensity="service" className="mix-blend-screen" testId={`service-theme-atmosphere-${service}`} />
      <ThemeAtmosphereLayer intensity={atmosphereIntensity} className="mix-blend-screen" />
    </div>
  );
}
