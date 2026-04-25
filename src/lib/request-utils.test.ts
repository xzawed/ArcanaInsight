import { describe, it, expect } from "vitest"
import { getClientIp, pickFields, jsonError, SSE_HEADERS } from "./request-utils"

function makeHeaders(entries: Record<string, string>): Headers {
  return new Headers(entries)
}

describe("getClientIp", () => {
  it("x-forwarded-for 단일 IP → 해당 IP 반환", () => {
    expect(getClientIp(makeHeaders({ "x-forwarded-for": "1.2.3.4" }))).toBe("1.2.3.4")
  })

  it("x-forwarded-for 다중 IP → 첫 번째 IP만 반환", () => {
    expect(getClientIp(makeHeaders({ "x-forwarded-for": "1.2.3.4, 10.0.0.1, 172.16.0.1" }))).toBe("1.2.3.4")
  })

  it("x-forwarded-for 공백 포함 → trim 처리", () => {
    expect(getClientIp(makeHeaders({ "x-forwarded-for": "  5.6.7.8 , 10.0.0.1" }))).toBe("5.6.7.8")
  })

  it("x-forwarded-for 없고 x-real-ip 있음 → x-real-ip 반환", () => {
    expect(getClientIp(makeHeaders({ "x-real-ip": "9.8.7.6" }))).toBe("9.8.7.6")
  })

  it("x-real-ip 공백 포함 → trim 처리", () => {
    expect(getClientIp(makeHeaders({ "x-real-ip": "  9.8.7.6  " }))).toBe("9.8.7.6")
  })

  it("헤더 없음 → 'anon' 반환", () => {
    expect(getClientIp(makeHeaders({}))).toBe("anon")
  })

  it("x-forwarded-for 우선 (x-real-ip보다 먼저)", () => {
    expect(
      getClientIp(makeHeaders({ "x-forwarded-for": "1.1.1.1", "x-real-ip": "2.2.2.2" }))
    ).toBe("1.1.1.1")
  })
})

describe("pickFields", () => {
  it("지정된 키만 포함한 객체 반환", () => {
    const obj = { id: "1", secret: "hidden", name: "test" }
    expect(pickFields(obj, ["id", "name"])).toEqual({ id: "1", name: "test" })
  })

  it("객체에 없는 키는 결과에서 제외", () => {
    const obj = { id: "1", name: "test" }
    expect(pickFields(obj, ["id", "name", "missing"])).toEqual({ id: "1", name: "test" })
  })

  it("빈 keys 배열 → 빈 객체 반환", () => {
    expect(pickFields({ a: 1, b: 2 }, [])).toEqual({})
  })

  it("null 값도 포함", () => {
    const obj: Record<string, unknown> = { id: "1", value: null }
    expect(pickFields(obj, ["id", "value"])).toEqual({ id: "1", value: null })
  })

  it("session_id 제외 패턴 — result 라우트 실제 사용 케이스", () => {
    const reading = { id: "r-1", overall_reading: "text", session_id: "private" }
    const safe = pickFields(reading, ["id", "overall_reading"])
    expect(safe).toEqual({ id: "r-1", overall_reading: "text" })
    expect(safe.session_id).toBeUndefined()
  })
})

describe("jsonError", () => {
  it("기본 status 400으로 JSON 에러 응답 생성", async () => {
    const res = jsonError("Invalid request")
    expect(res.status).toBe(400)
    expect(res.headers.get("Content-Type")).toBe("application/json")
    expect(await res.json()).toEqual({ error: "Invalid request" })
  })

  it("커스텀 status 코드 지원", async () => {
    const res = jsonError("Not found", 404)
    expect(res.status).toBe(404)
    expect(await res.json()).toEqual({ error: "Not found" })
  })

  it("500 에러", async () => {
    const res = jsonError("Internal server error", 500)
    expect(res.status).toBe(500)
    expect(await res.json()).toEqual({ error: "Internal server error" })
  })
})

describe("SSE_HEADERS", () => {
  it("SSE 스트리밍에 필요한 헤더 3개 포함", () => {
    expect(SSE_HEADERS["Content-Type"]).toBe("text/event-stream")
    expect(SSE_HEADERS["Cache-Control"]).toBe("no-cache")
    expect(SSE_HEADERS["Connection"]).toBe("keep-alive")
  })
})
