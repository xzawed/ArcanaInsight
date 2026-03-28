import { redirect } from "next/navigation";
import Image from "next/image";
import { createClient } from "@/lib/supabase/server";

export default async function MyPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single();
  const { data: sessions } = await supabase.from("sessions").select("*, readings(*)")
    .eq("user_id", user.id).eq("status", "completed").order("created_at", { ascending: false }).limit(20);

  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* 배경 이미지 */}
      <div className="fixed inset-0 -z-10">
        <Image
          src="/images/backgrounds/mypage-bg.jpg"
          alt=""
          fill
          className="object-cover"
        />
        <div className="absolute inset-0 bg-arcana-bg/60" />
      </div>

      <div className="max-w-2xl mx-auto px-4 py-8 relative">
        <div className="bg-arcana-card/80 backdrop-blur-sm border border-arcana-border rounded-2xl p-6 mb-8">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-arcana-purple/20 flex items-center justify-center text-2xl">🌙</div>
            <div>
              <h2 className="font-display font-bold text-lg">{profile?.nickname || "사용자"}</h2>
              <p className="text-arcana-muted text-sm">{profile?.email}</p>
            </div>
          </div>
        </div>
        <h3 className="font-display font-bold text-lg mb-4 drop-shadow-md">리딩 히스토리</h3>
        {!sessions || sessions.length === 0 ? (
          <div className="text-center text-arcana-muted py-12 bg-arcana-card/50 backdrop-blur-sm rounded-2xl border border-arcana-border">
            <div className="relative w-24 h-24 mx-auto mb-4">
              <Image
                src="/images/backgrounds/deco-crystal-ball.jpg"
                alt=""
                fill
                className="object-contain rounded-full opacity-60"
              />
            </div>
            <p>아직 리딩 기록이 없습니다</p>
            <a href="/tarot" className="inline-block mt-4 text-arcana-purple hover:underline text-sm">첫 타로 상담 시작하기</a>
          </div>
        ) : (
          <div className="space-y-3">
            {sessions.map((session: any) => {
              const reading = session.readings?.[0];
              return (
                <a key={session.id} href={reading?.share_token ? `/tarot/result/${reading.share_token}` : "#"}
                  className="block bg-arcana-card/80 backdrop-blur-sm border border-arcana-border rounded-xl p-4 hover:border-arcana-purple transition-colors hover:shadow-lg hover:shadow-arcana-purple/10">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-arcana-purple text-xs font-display font-bold uppercase">{session.service_type}</span>
                      <span className="text-arcana-muted text-xs ml-2">{session.topic}</span>
                    </div>
                    <span className="text-arcana-muted text-xs">{new Date(session.created_at).toLocaleDateString("ko-KR")}</span>
                  </div>
                  {reading && <p className="text-arcana-text text-sm mt-2 line-clamp-2">{reading.overall_reading}</p>}
                </a>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
