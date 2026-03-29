import { HeroSection } from "@/components/home/HeroSection";
import { CharacterGallery } from "@/components/home/CharacterGallery";
import { DailyCard } from "@/components/home/DailyCard";
import { ServiceFlow } from "@/components/home/ServiceFlow";
import { FAQ } from "@/components/home/FAQ";
import { BottomCTA } from "@/components/home/BottomCTA";

export default function HomePage() {
  return (
    <div className="min-h-screen">
      <HeroSection />
      <CharacterGallery />
      <DailyCard />
      <ServiceFlow />
      <FAQ />
      <BottomCTA />
    </div>
  );
}
