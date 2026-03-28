import Link from "next/link";
import Image from "next/image";

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden">
      {/* 배경 이미지 */}
      <div className="fixed inset-0 -z-10">
        <Image
          src="/images/backgrounds/hero-bg.jpg"
          alt=""
          fill
          className="object-cover"
          priority
        />
        <div className="absolute inset-0 bg-arcana-bg/60" />
      </div>

      <section className="flex-1 flex flex-col items-center justify-center px-4 py-16">
        {/* 장식 이미지 - 수정구슬 */}
        <div className="relative w-32 h-32 mb-6 animate-float">
          <Image
            src="/images/backgrounds/deco-crystal-ball.jpg"
            alt="수정구슬"
            fill
            className="object-contain rounded-full"
          />
        </div>

        <div className="text-center max-w-2xl mx-auto mb-12">
          <h1 className="text-4xl md:text-6xl font-display font-black mb-4">
            <span className="bg-gradient-to-r from-arcana-purple via-arcana-indigo to-arcana-gold bg-clip-text text-transparent drop-shadow-lg">
              ArcanaInsight
            </span>
          </h1>
          <p className="text-arcana-text text-lg md:text-xl mb-8 drop-shadow-md">
            애니메이션 캐릭터와 함께하는 타로 리딩 &amp; 운세 상담
          </p>
          <Link href="/tarot"
            className="inline-block px-8 py-3 rounded-full bg-gradient-to-r from-arcana-purple to-arcana-indigo text-white font-display font-bold hover:opacity-90 transition-opacity shadow-lg shadow-arcana-purple/30">
            타로 상담 시작하기
          </Link>
        </div>

        {/* 캐릭터 미리보기 */}
        <div className="flex justify-center gap-4 mb-12">
          {[
            { id: "arcana", name: "아르카나" },
            { id: "miko", name: "미코" },
            { id: "seonhwa", name: "선화" },
            { id: "hoshi", name: "호시" },
          ].map((char) => (
            <div key={char.id} className="text-center group">
              <div className="relative w-20 h-20 md:w-24 md:h-24 rounded-full overflow-hidden border-2 border-arcana-purple/50 group-hover:border-arcana-gold transition-colors shadow-lg shadow-arcana-purple/20">
                <Image
                  src={`/images/characters/${char.id}/default.jpg`}
                  alt={char.name}
                  fill
                  className="object-cover"
                />
              </div>
              <p className="text-arcana-muted text-xs mt-2 group-hover:text-arcana-gold transition-colors">{char.name}</p>
            </div>
          ))}
        </div>

        {/* 기능 카드 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto w-full">
          {[
            { icon: "🔮", title: "AI 타로 리딩", desc: "78장 정통 타로 덱과 AI 기반 깊이 있는 해석" },
            { icon: "💬", title: "캐릭터 상담", desc: "개성 있는 캐릭터와 대화하며 진행하는 몰입감" },
            { icon: "✨", title: "다양한 운세", desc: "타로, 사주, 신점 등 종합 운세 플랫폼 (확장 예정)" },
          ].map((feature) => (
            <div key={feature.title} className="bg-arcana-card/80 backdrop-blur-sm border border-arcana-border rounded-2xl p-6 text-center hover:border-arcana-purple/50 transition-colors">
              <div className="text-3xl mb-3">{feature.icon}</div>
              <h3 className="font-display font-bold mb-2">{feature.title}</h3>
              <p className="text-arcana-muted text-sm">{feature.desc}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
