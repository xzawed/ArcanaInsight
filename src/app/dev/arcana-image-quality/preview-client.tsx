"use client";

import Image from "next/image";
import { useState } from "react";

const SAMPLES = [
  { file: "idle", label: "Idle" },
  { file: "smile", label: "Smile" },
  { file: "serious", label: "Serious" },
  { file: "surprised", label: "Surprised" },
  { file: "wink", label: "Wink" },
  { file: "mystical", label: "Mystical" },
] as const;

type SampleFile = (typeof SAMPLES)[number]["file"];

const originalPath = (file: SampleFile) => `/images/characters/arcana/nukki/${file}.png`;
const enhancedPath = (file: SampleFile) => `/images/characters/arcana/nukki-enhanced/${file}.png`;

export function ArcanaImageQualityPreview() {
  const [sample, setSample] = useState<SampleFile>("idle");
  const selected = SAMPLES.find((item) => item.file === sample) ?? SAMPLES[0];

  return (
    <main className="min-h-[100dvh] overflow-hidden bg-[#0f1016] text-arcana-text">
      <div className="fixed inset-0 bg-[radial-gradient(circle_at_24%_18%,rgba(191,157,255,0.24),transparent_34%),radial-gradient(circle_at_78%_24%,rgba(255,199,132,0.16),transparent_32%),linear-gradient(180deg,#151222_0%,#0b1018_100%)]" />
      <div className="relative mx-auto flex min-h-[100dvh] max-w-7xl flex-col px-5 py-6 md:px-8">
        <header className="flex flex-col gap-4 border-b border-white/10 pb-5 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase text-arcana-purple">Arcana image quality sample</p>
            <h1 className="mt-2 font-serif text-3xl font-bold text-white md:text-5xl">아르카나 선명도 비교</h1>
          </div>
          <p className="max-w-2xl text-sm leading-6 text-arcana-muted">
            원본 캐릭터의 구도와 표정은 유지하고, 별도 샘플 이미지만 2배 해상도로 확대한 뒤 윤곽과 색 면의
            흐릿함을 가볍게 정리했습니다.
          </p>
        </header>

        <div className="mt-5 grid grid-cols-3 gap-2 sm:grid-cols-6">
          {SAMPLES.map((item) => (
            <button
              key={item.file}
              type="button"
              onClick={() => setSample(item.file)}
              className={`h-11 rounded-lg border px-3 text-sm font-semibold transition-colors ${
                sample === item.file
                  ? "border-arcana-purple bg-arcana-purple text-white"
                  : "border-white/15 bg-white/5 text-arcana-text hover:border-arcana-purple"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        <section className="mt-5 grid flex-1 grid-cols-1 gap-4 lg:grid-cols-2">
          <ImagePanel title="Original" subtitle="1408 x 768 PNG" src={originalPath(selected.file)} />
          <ImagePanel title="Enhanced sample" subtitle="2816 x 1536 PNG" src={enhancedPath(selected.file)} highlighted />
        </section>
      </div>
    </main>
  );
}

function ImagePanel({
  title,
  subtitle,
  src,
  highlighted = false,
}: {
  title: string;
  subtitle: string;
  src: string;
  highlighted?: boolean;
}) {
  return (
    <div
      className={`flex min-h-[520px] flex-col overflow-hidden rounded-lg border ${
        highlighted ? "border-arcana-purple/70 bg-arcana-purple/10" : "border-white/10 bg-white/5"
      }`}
    >
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
        <div>
          <h2 className="font-serif text-xl font-bold text-white">{title}</h2>
          <p className="text-xs font-semibold uppercase text-arcana-muted">{subtitle}</p>
        </div>
      </div>
      <div className="border-b border-white/10 p-4">
        <p className="mb-2 text-xs font-semibold uppercase text-arcana-muted">Edge detail crop</p>
        <div
          aria-hidden
          className="h-40 rounded-md border border-white/10 bg-[#0d0e16]"
          style={{
            backgroundImage: `url(${src})`,
            backgroundPosition: "50% 22%",
            backgroundRepeat: "no-repeat",
            backgroundSize: "245% auto",
          }}
        />
      </div>
      <div className="relative flex flex-1 items-end justify-center overflow-hidden bg-[linear-gradient(180deg,rgba(255,255,255,0.08),rgba(255,255,255,0.02))]">
        <div className="absolute inset-x-0 bottom-0 h-1/3 bg-[radial-gradient(ellipse_at_center,rgba(191,157,255,0.24),transparent_64%)]" />
        <Image
          src={src}
          alt={`${title} Arcana character sample`}
          width={2816}
          height={1536}
          priority
          className="relative h-auto max-h-[70dvh] w-full object-contain object-bottom"
        />
      </div>
    </div>
  );
}
