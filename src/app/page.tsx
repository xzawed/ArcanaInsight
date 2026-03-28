import Link from "next/link";

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col">
      <section className="flex-1 flex flex-col items-center justify-center px-4 py-16">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <h1 className="text-4xl md:text-6xl font-display font-black mb-4">
            <span className="bg-gradient-to-r from-arcana-purple via-arcana-indigo to-arcana-gold bg-clip-text text-transparent">
              ArcanaInsight
            </span>
          </h1>
          <p className="text-arcana-muted text-lg md:text-xl mb-8">
            애니메이션 캐릭터와 함께하는 타로 리딩 &amp; 운세 상담
          </p>
          <Link href="/tarot"
            className="inline-block px-8 py-3 rounded-full bg-gradient-to-r from-arcana-purple to-arcana-indigo text-white font-display font-bold hover:opacity-90 transition-opacity">
            타로 상담 시작하기
          </Link>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto w-full">
          {[
            { icon: "🔮", title: "AI 타로 리딩", desc: "78장 정통 타로 덱과 AI 기반 깊이 있는 해석" },
            { icon: "💬", title: "캐릭터 상담", desc: "개성 있는 캐릭터와 대화하며 진행하는 몰입감" },
            { icon: "✨", title: "다양한 운세", desc: "타로, 사주, 신점 등 종합 운세 플랫폼 (확장 예정)" },
          ].map((feature) => (
            <div key={feature.title} className="bg-arcana-card border border-arcana-border rounded-2xl p-6 text-center">
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
