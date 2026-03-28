import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function MyPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single();
  const { data: sessions } = await supabase.from("sessions").select("*, readings(*)")
    .eq("user_id", user.id).eq("status", "completed").order("created_at", { ascending: false }).limit(20);

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="bg-arcana-card border border-arcana-border rounded-2xl p-6 mb-8">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-arcana-purple/20 flex items-center justify-center text-2xl">🌙</div>
          <div>
            <h2 className="font-display font-bold text-lg">{profile?.nickname || "사용자"}</h2>
            <p className="text-arcana-muted text-sm">{profile?.email}</p>
          </div>
        </div>
      </div>
      <h3 className="font-display font-bold text-lg mb-4">리딩 히스토리</h3>
      {!sessions || sessions.length === 0 ? (
        <div className="text-center text-arcana-muted py-12">
          <p className="text-3xl mb-3">🔮</p>
          <p>아직 리딩 기록이 없습니다</p>
          <a href="/tarot" className="inline-block mt-4 text-arcana-purple hover:underline text-sm">첫 타로 상담 시작하기</a>
        </div>
      ) : (
        <div className="space-y-3">
          {sessions.map((session: any) => {
            const reading = session.readings?.[0];
            return (
              <a key={session.id} href={reading?.share_token ? `/tarot/result/${reading.share_token}` : "#"}
                className="block bg-arcana-card border border-arcana-border rounded-xl p-4 hover:border-arcana-purple transition-colors">
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
  );
}
