import { describe, it, expect } from "vitest";
import { timeToSijin } from "./time-utils";

describe("timeToSijin", () => {
  it("null 입력 → null", () => expect(timeToSijin(null)).toBeNull());
  it("빈 문자열 → null", () => expect(timeToSijin("")).toBeNull());
  it("형식 불일치 → null", () => expect(timeToSijin("14:3")).toBeNull());
  it("형식 불일치 → null", () => expect(timeToSijin("abc")).toBeNull());

  it("00:00 → 자시(子時)", () => expect(timeToSijin("00:00")).toEqual({ key: "ja", label: "자시", hanja: "子時" }));
  it("00:59 → 자시(子時)", () => expect(timeToSijin("00:59")).toEqual({ key: "ja", label: "자시", hanja: "子時" }));
  it("23:00 → 자시(子時)", () => expect(timeToSijin("23:00")).toEqual({ key: "ja", label: "자시", hanja: "子時" }));
  it("23:59 → 자시(子時)", () => expect(timeToSijin("23:59")).toEqual({ key: "ja", label: "자시", hanja: "子時" }));

  it("01:00 → 축시(丑時)", () => expect(timeToSijin("01:00")).toEqual({ key: "chuk", label: "축시", hanja: "丑時" }));
  it("02:59 → 축시(丑時)", () => expect(timeToSijin("02:59")).toEqual({ key: "chuk", label: "축시", hanja: "丑時" }));
  it("03:00 → 인시(寅時)", () => expect(timeToSijin("03:00")).toEqual({ key: "in",   label: "인시", hanja: "寅時" }));
  it("05:00 → 묘시(卯時)", () => expect(timeToSijin("05:00")).toEqual({ key: "myo",  label: "묘시", hanja: "卯時" }));
  it("07:00 → 진시(辰時)", () => expect(timeToSijin("07:00")).toEqual({ key: "jin",  label: "진시", hanja: "辰時" }));
  it("09:00 → 사시(巳時)", () => expect(timeToSijin("09:00")).toEqual({ key: "sa",   label: "사시", hanja: "巳時" }));
  it("11:00 → 오시(午時)", () => expect(timeToSijin("11:00")).toEqual({ key: "o",    label: "오시", hanja: "午時" }));
  it("12:30 → 오시(午時)", () => expect(timeToSijin("12:30")).toEqual({ key: "o",    label: "오시", hanja: "午時" }));
  it("13:00 → 미시(未時)", () => expect(timeToSijin("13:00")).toEqual({ key: "mi",   label: "미시", hanja: "未時" }));
  it("14:30 → 미시(未時)", () => expect(timeToSijin("14:30")).toEqual({ key: "mi",   label: "미시", hanja: "未時" }));
  it("15:00 → 신시(申時)", () => expect(timeToSijin("15:00")).toEqual({ key: "sin",  label: "신시", hanja: "申時" }));
  it("17:00 → 유시(酉時)", () => expect(timeToSijin("17:00")).toEqual({ key: "yu",   label: "유시", hanja: "酉時" }));
  it("19:00 → 술시(戌時)", () => expect(timeToSijin("19:00")).toEqual({ key: "sul",  label: "술시", hanja: "戌時" }));
  it("21:00 → 해시(亥時)", () => expect(timeToSijin("21:00")).toEqual({ key: "hae",  label: "해시", hanja: "亥時" }));
  it("22:59 → 해시(亥時)", () => expect(timeToSijin("22:59")).toEqual({ key: "hae",  label: "해시", hanja: "亥時" }));
});
