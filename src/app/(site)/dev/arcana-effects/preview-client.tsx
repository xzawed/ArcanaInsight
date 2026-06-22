"use client";

import { useState } from "react";
import { CharacterDisplay } from "@/components/character/CharacterDisplay";
import { getCharacterById } from "@/data/characters";
import type { Mood } from "@/types/character";

const MOOD_PREVIEWS: Array<{
  mood: Mood;
  label: string;
  effect: string;
}> = [
  { mood: "default", label: "Default", effect: "Idle float, soft radial glow, periodic blink overlay." },
  { mood: "smile", label: "Smile", effect: "Expression swap with a light scale pulse on the full character." },
  { mood: "serious", label: "Serious", effect: "Expression swap with a small upward settle motion." },
  { mood: "surprised", label: "Surprised", effect: "Expression swap with a quick pop and settle bounce." },
  { mood: "wink", label: "Wink", effect: "Expression swap with a short playful scale pulse." },
  { mood: "mystical", label: "Mystical", effect: "Mystical expression, faster aura glow, idle float, and blink overlay." },
];

export function ArcanaEffectsPreview() {
  const [mood, setMood] = useState<Mood>("default");
  const character = getCharacterById("arcana");

  if (!character) return null;

  const selectedPreview = MOOD_PREVIEWS.find((preview) => preview.mood === mood) ?? MOOD_PREVIEWS[0];

  return (
    <main className="min-h-[100dvh] overflow-hidden bg-[#100d18] text-arcana-text">
      <div
        className="fixed inset-0 bg-cover bg-center opacity-35"
        style={{ backgroundImage: "url('/images/backgrounds/tarot-topic-bg.jpg')" }}
      />
      <div className="fixed inset-0 bg-[#100d18]/75" />
      <div className="relative mx-auto grid min-h-[100dvh] max-w-6xl grid-cols-1 gap-8 px-5 py-6 md:grid-cols-[minmax(320px,48%)_1fr] md:px-8">
        <section className="relative min-h-[56dvh] overflow-hidden md:min-h-[calc(100dvh-3rem)]">
          <div className="absolute inset-x-4 bottom-0 top-4">
            <CharacterDisplay character={character} mood={mood} className="h-full w-full" />
          </div>
        </section>

        <section className="flex flex-col justify-center pb-8 md:pb-0">
          <p className="text-sm font-medium uppercase text-arcana-purple">Arcana effect preview</p>
          <h1 className="mt-3 font-serif text-3xl font-bold text-white md:text-5xl">아르카나 캐릭터 이펙트 목업</h1>
          <p className="mt-4 max-w-xl text-sm leading-6 text-arcana-muted md:text-base">
            This local-only page uses the production CharacterDisplay stack so the sample shows the same aura, glow, blink,
            sprite transition, and mood motion that users see in the app.
          </p>

          <div className="mt-7 grid grid-cols-2 gap-2 sm:grid-cols-3">
            {MOOD_PREVIEWS.map((preview) => (
              <button
                key={preview.mood}
                type="button"
                onClick={() => setMood(preview.mood)}
                className={`h-11 rounded-lg border px-3 text-sm font-semibold transition-colors ${
                  mood === preview.mood
                    ? "border-arcana-purple bg-arcana-purple text-white"
                    : "border-arcana-border bg-arcana-card/70 text-arcana-text hover:border-arcana-purple"
                }`}
              >
                {preview.label}
              </button>
            ))}
          </div>

          <div className="mt-7 border-l-2 border-arcana-purple pl-5">
            <p className="text-xs font-semibold uppercase text-arcana-muted">Current sample</p>
            <h2 className="mt-2 font-serif text-2xl font-bold text-white">{selectedPreview.label}</h2>
            <p className="mt-2 max-w-lg text-sm leading-6 text-arcana-muted">{selectedPreview.effect}</p>
          </div>
        </section>
      </div>
    </main>
  );
}
