"use client";

import { useRouter } from "next/navigation";
import Image from "next/image";
import { motion } from "framer-motion";
import { Topic } from "@/types/session";
import { useSessionStore } from "@/hooks/useSession";
import { CharacterDisplay } from "@/components/character/CharacterDisplay";
import { getCharacterByService } from "@/data/characters";
import { getSpreadForTopic } from "@/data/spreads";

const topics: { id: Topic; label: string; icon: string; desc: string }[] = [
  { id: "love", label: "연애/관계", icon: "💕", desc: "사랑과 인간관계에 대한 상담" },
  { id: "career", label: "직장/진로", icon: "💼", desc: "커리어와 진로에 대한 조언" },
  { id: "finance", label: "재정/금전", icon: "💰", desc: "돈과 재정 상황에 대한 통찰" },
  { id: "health", label: "건강", icon: "🌿", desc: "건강과 웰빙에 대한 가이드" },
  { id: "general", label: "일반 상담", icon: "✨", desc: "자유로운 주제의 종합 상담" },
];

export default function TarotPage() {
  const router = useRouter();
  const { setTopic, setSpreadType, setPhase } = useSessionStore();
  const character = getCharacterByService("tarot")!;

  const handleTopicSelect = (topic: Topic) => {
    const spread = getSpreadForTopic(topic);
    setTopic(topic);
    setSpreadType(spread.type, spread.positions.length);
    setPhase("card-shuffle");
    router.push("/tarot/session");
  };

  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* 배경 이미지 */}
      <div className="fixed inset-0 -z-10">
        <Image
          src="/images/backgrounds/tarot-topic-bg.jpg"
          alt=""
          fill
          className="object-cover"
        />
        <div className="absolute inset-0 bg-arcana-bg/50" />
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8 relative">
        <div className="flex justify-center mb-8">
          <CharacterDisplay character={character} mood="smile" className="h-64" />
        </div>
        <div className="text-center mb-8">
          <h2 className="text-2xl font-display font-bold mb-2 drop-shadow-md">어떤 이야기를 들려주실 건가요?</h2>
          <p className="text-arcana-muted drop-shadow-sm">상담 주제를 선택해주세요</p>
        </div>

        {/* 마법진 장식 */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] opacity-10 pointer-events-none">
          <Image
            src="/images/backgrounds/deco-magic-circle.jpg"
            alt=""
            fill
            className="object-contain animate-[spin_60s_linear_infinite]"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 relative">
          {topics.map((topic, index) => (
            <motion.button key={topic.id}
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              onClick={() => handleTopicSelect(topic.id)}
              className="group bg-arcana-card/80 backdrop-blur-sm border border-arcana-border rounded-2xl p-5 text-left hover:border-arcana-purple transition-all hover:shadow-lg hover:shadow-arcana-purple/10">
              <span className="text-2xl block mb-2">{topic.icon}</span>
              <h3 className="font-display font-bold group-hover:text-arcana-purple transition-colors">{topic.label}</h3>
              <p className="text-arcana-muted text-sm mt-1">{topic.desc}</p>
            </motion.button>
          ))}
        </div>
      </div>
    </div>
  );
}
