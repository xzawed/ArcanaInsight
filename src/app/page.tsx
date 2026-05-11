import dynamic from "next/dynamic";
import { HeroSection } from "@/components/home/HeroSection";
import { DailyFortune } from "@/components/home/DailyFortune";
import { SkinGallery } from "@/components/home/SkinGallery";
import { ServiceFlow } from "@/components/home/ServiceFlow";
import { FAQ } from "@/components/home/FAQ";
import { BottomCTA } from "@/components/home/BottomCTA";

const CharacterGallery = dynamic(
  () => import("@/components/home/CharacterGallery").then((m) => ({ default: m.CharacterGallery })),
  {
    loading: () => (
      <section className="py-16 md:py-24 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 md:gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="bg-arcana-card/40 border border-arcana-border rounded-2xl overflow-hidden animate-pulse">
                <div className="aspect-[3/4] bg-arcana-border/30" />
                <div className="p-3 space-y-2">
                  <div className="h-3 bg-arcana-border/30 rounded w-3/4" />
                  <div className="h-2 bg-arcana-border/20 rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    ),
  }
);

export default function HomePage() {
  return (
    <div className="min-h-screen">
      <HeroSection />
      <CharacterGallery />
      <DailyFortune />
      <SkinGallery />
      <ServiceFlow />
      <FAQ />
      <BottomCTA />
    </div>
  );
}
