import { HeroSection } from "@/components/home/HeroSection";
import { StatsCounter } from "@/components/home/StatsCounter";
import { CharacterGallery } from "@/components/home/CharacterGallery";
import { DailyCard } from "@/components/home/DailyCard";
import { SkinGallery } from "@/components/home/SkinGallery";
import { ServiceFlow } from "@/components/home/ServiceFlow";
import { ReviewCarousel } from "@/components/home/ReviewCarousel";
import { FAQ } from "@/components/home/FAQ";
import { BottomCTA } from "@/components/home/BottomCTA";

export default function HomePage() {
  return (
    <div className="min-h-screen">
      <HeroSection />
      <StatsCounter />
      <CharacterGallery />
      <DailyCard />
      <SkinGallery />
      <ServiceFlow />
      <ReviewCarousel />
      <FAQ />
      <BottomCTA />
    </div>
  );
}
