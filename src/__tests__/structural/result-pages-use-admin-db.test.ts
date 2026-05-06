import { describe, it, expect } from "vitest"
import { readFileSync } from "node:fs"
import { resolve } from "node:path"

// PR #219 (commit 1c52973) 의 마이그레이션 014 가 share_token 공개 RLS 정책을
// DROP하면서 service_role 어댑터 (getAdminDb) 도입을 의도했으나, 동일 PR 에서
// API 라우트 3개만 적용되고 SSR 페이지 컴포넌트 3개 수정이 누락되어 공유 링크
// 접근 시 100% 404 가 발생한 회귀 (D1 P0) 의 재발 방지용 정적 import 검사.
//
// 동일 함정이 다시 발생하지 않도록 result page 가 getDb (anon) 를 직접
// import 하지 않고 getAdminDb 만 사용하는지 빌드 전에 검출한다.

const REPO_ROOT = resolve(__dirname, "../../..")

const RESULT_PAGES = [
  "src/app/tarot/result/[id]/page.tsx",
  "src/app/saju/result/[id]/page.tsx",
  "src/app/shinjeom/result/[id]/page.tsx",
] as const

describe("결과 페이지 — share_token 조회는 service_role 로만", () => {
  for (const relativePath of RESULT_PAGES) {
    describe(relativePath, () => {
      const source = readFileSync(resolve(REPO_ROOT, relativePath), "utf8")

      it("getAdminDb 를 import 한다", () => {
        expect(source).toMatch(/import\s*\{[^}]*\bgetAdminDb\b[^}]*\}\s*from\s*["']@\/lib\/db["']/)
      })

      it("anon 클라이언트인 getDb 를 import 하지 않는다", () => {
        // getAdminDb 토큰을 제거한 뒤 단독 getDb 식별자가 남아있는지 확인
        const withoutAdmin = source.replace(/\bgetAdminDb\b/g, "")
        expect(withoutAdmin).not.toMatch(/\bgetDb\b/)
      })

      it("findOne 호출 직전에 getAdminDb() 를 사용한다", () => {
        expect(source).toMatch(/=\s*getAdminDb\(\)\s*;?\s*\n[\s\S]*?\.findOne\b/)
      })
    })
  }
})
