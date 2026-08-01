import { describe, it, expect } from "vitest";
import { TAROT_SMOKE_BODY } from "../../scripts/smoke-prod.mjs";
import { TarotReadingSchema } from "@/lib/validation/api-schemas";

/**
 * 배포 후 스모크가 보내는 요청이 **실제 API 스키마와 맞는지** AI 호출 없이 검증한다.
 *
 * ## 왜 필요한가 — 옵트인 검사는 아무도 안 누르면 죽은 검사다
 *
 * `pnpm smoke:prod --reading`(리딩 1건 SSE)은 `post-deploy-smoke.yml`에서
 * **`workflow_dispatch` + 입력 체크박스**로만 실행된다. AI 비용 때문에 기본 off인데,
 * 그래서 **아무도 누르지 않으면 깨진 채로 남는다.**
 *
 * 실제로 요청 본문에 `birthTime`이 빠져 있어 `TarotReadingSchema` 검증에서 **항상 400**이었고,
 * 리딩 검증 경로가 통째로 죽어 있었다(~2026-08-01 발견). 스키마는 `birthTime`을 nullable로
 * 두지만 **키 자체는 필수**다.
 *
 * 이 테스트는 매 CI에서 무료로 돌아 그 드리프트를 잡는다. 스모크가 실제로 통과하는지는
 * 여전히 수동 실행이 판정하지만, **요청이 400으로 죽는 종류의 실패는 여기서 먼저 걸린다.**
 */
describe("배포 스모크 요청 본문 ↔ API 스키마 정합성", () => {
  it("타로 리딩 스모크 본문이 TarotReadingSchema를 통과한다", () => {
    const result = TarotReadingSchema.safeParse(TAROT_SMOKE_BODY);
    expect(
      result.success,
      result.success ? "" : `스모크 본문이 스키마와 어긋납니다: ${JSON.stringify(result.error.issues)}`,
    ).toBe(true);
  });

  it("birthTime 키를 빼면 실패한다 (이 테스트가 실제로 무는지 확인)", () => {
    const { userInfo, ...rest } = TAROT_SMOKE_BODY;
    const withoutBirthTime = {
      ...rest,
      userInfo: { name: userInfo.name, birthDate: userInfo.birthDate, gender: userInfo.gender },
    };
    expect(TarotReadingSchema.safeParse(withoutBirthTime).success).toBe(false);
  });
});
