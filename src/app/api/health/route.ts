import { NextResponse } from "next/server";

// 배포 헬스체크 전용 경량 엔드포인트. railway.toml healthcheckPath가 이걸 가리켜,
// 무거운 홈(/) SSR·이미지 최적화로 기동 판정이 지연·재기동되는 것을 피한다.
// 미들웨어 matcher에서 제외되어 Supabase 세션 호출 없이 즉시 200을 반환한다.
export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json({ status: "ok" });
}
