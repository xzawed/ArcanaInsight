import { NextRequest } from "next/server";

export function makePostRequest(body: unknown, url = "http://localhost/api/test"): NextRequest {
  return new NextRequest(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}
