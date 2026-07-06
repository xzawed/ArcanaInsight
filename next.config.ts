import type { NextConfig } from "next";

const isDevelopment = process.env.NODE_ENV === "development";

// NEXT_PUBLIC_ASSET_BASE_URL(R2 이전 시) 설정 시 그 호스트를 이미지 remotePatterns에 추가한다.
// 미설정 시 Supabase 호스트만 허용(기존 동작). 카드 이미지는 unoptimized라 필수는 아니나
// 최적화 경로(StyleSelector 등)를 안전하게 허용한다.
const assetHost = (() => {
  const base = process.env.NEXT_PUBLIC_ASSET_BASE_URL;
  if (!base) return null;
  try {
    return new URL(base).hostname;
  } catch {
    return null;
  }
})();

const securityHeaders = [
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      `script-src 'self' 'unsafe-inline'${isDevelopment ? " 'unsafe-eval'" : ""}`,
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "img-src 'self' data: blob: https:",
      "font-src 'self' data: https://fonts.gstatic.com",
      "connect-src 'self' https://api.x.ai https://api.anthropic.com https://*.supabase.co wss://*.supabase.co",
      "frame-ancestors 'none'",
    ].join("; "),
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

const nextConfig: NextConfig = {
  // 런타임에 필요한 의존성만 추적해 최소 서버 번들 생성 → Railway 배포 이미지 대폭 축소·배포 가속.
  // 배포: railway.toml이 빌드 후 public·.next/static을 .next/standalone에 복사하고 server.js로 기동.
  output: "standalone",
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
      ...(assetHost
        ? [{ protocol: "https" as const, hostname: assetHost }]
        : []),
    ],
    // Large transparent character PNGs can stall first-time AVIF optimization
    // in Chromium mobile runs. WebP keeps alpha support with steadier latency.
    formats: ["image/webp"],
  },
};

export default nextConfig;
