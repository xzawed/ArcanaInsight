import type { ReactNode } from "react";
import Image from "next/image";
import { MysticBackground } from "@/components/effects/MysticBackground";

type ResultService = "tarot" | "saju" | "shinjeom";

interface Props {
  service: ResultService;
  children: ReactNode;
}

export function ResultPageShell({ service, children }: Props) {
  return (
    <div className="relative min-h-screen overflow-hidden">
      <MysticBackground service={service} />
      <div className="fixed inset-0 -z-10">
        <Image src="/images/backgrounds/result-bg.jpg" alt="" fill className="object-cover" sizes="100vw" />
        <div className="absolute inset-0 bg-arcana-bg/60" />
      </div>
      <div className="max-w-5xl mx-auto px-4 py-8 relative">
        {children}
      </div>
    </div>
  );
}
