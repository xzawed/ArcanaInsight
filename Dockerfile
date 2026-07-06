# 멀티스테이지 빌드 — Next.js standalone 출력으로 런타임 이미지를 최소화한다.
# 목적: Railway 배포 이미지 축소(전체 node_modules 580MB·빌드 툴 제외) → export/push/pull·배포 가속.
# 참고: output:"standalone"(next.config.ts)이 런타임 필요한 의존성만 추적해 .next/standalone에 담는다.

# ── 1) 의존성 설치 ─────────────────────────────────────────────
FROM node:20-slim AS deps
RUN corepack enable && corepack prepare pnpm@10.33.0 --activate
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# ── 2) 빌드 ────────────────────────────────────────────────────
FROM node:20-slim AS build
RUN corepack enable && corepack prepare pnpm@10.33.0 --activate
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# NEXT_PUBLIC_* 는 next build 시 클라이언트 번들에 "인라인"되므로 빌드 인자로 주입해야 한다.
# Railway는 서비스 변수를 Dockerfile 빌드 ARG로 제공한다(각 변수를 대시보드에 설정).
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY
ARG NEXT_PUBLIC_SITE_URL
ARG NEXT_PUBLIC_ASSET_BASE_URL
ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL \
    NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY \
    NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL \
    NEXT_PUBLIC_ASSET_BASE_URL=$NEXT_PUBLIC_ASSET_BASE_URL \
    NEXT_TELEMETRY_DISABLED=1
RUN pnpm build

# ── 3) 런타임 (슬림) ───────────────────────────────────────────
FROM node:20-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1
# 비루트 실행
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs
# standalone 서버 + 정적 자산 + public 만 복사 (전체 node_modules·빌드 툴 제외)
COPY --from=build --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=build --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=build --chown=nextjs:nodejs /app/public ./public
USER nextjs
EXPOSE 3000
# PORT는 Railway가 런타임에 주입(standalone server.js가 process.env.PORT 사용).
# ⚠️ HOSTNAME은 실행 시점에 0.0.0.0으로 강제한다 — Railway(컨테이너 런타임)가 HOSTNAME=<컨테이너ID>를
#    주입해 Dockerfile ENV를 덮어쓰면 Next standalone이 라우팅 불가 호스트에 바인딩 → 헬스체크 실패로 배포 실패.
#    `HOSTNAME=0.0.0.0 exec node`로 주입값을 무시하고, exec으로 node를 PID 1로 유지(SIGTERM 전달).
CMD ["sh", "-c", "HOSTNAME=0.0.0.0 exec node server.js"]
