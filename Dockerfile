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
# 기본값 1 — 사전 생성 변형(#521·#533)은 저장소에 커밋돼 있고 R2에도 전량 올라가 있으므로
# 프로덕션은 항상 켜져야 한다. 기본값을 두는 이유: Railway가 이 변수를 build-arg로 전달하지
# 않는 경우에도 변형이 꺼져 런타임 이미지 최적화로 되돌아가는 것을 막는다(#521 회귀).
ARG NEXT_PUBLIC_CHARACTER_VARIANTS=1
ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL \
    NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY \
    NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL \
    NEXT_PUBLIC_ASSET_BASE_URL=$NEXT_PUBLIC_ASSET_BASE_URL \
    NEXT_PUBLIC_CHARACTER_VARIANTS=$NEXT_PUBLIC_CHARACTER_VARIANTS \
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
# HOSTNAME은 Railway가 컨테이너ID로 주입하며, 이는 /etc/hosts에서 컨테이너 실제 IP로 해석되므로
# standalone이 그 HOSTNAME에 바인딩해도 헬스체크가 도달한다(SSH 실측 확인). 따라서 HOSTNAME 조작 불필요 —
# 순수 `node server.js`로 기동한다. (Railway는 startCommand를 shell 없이 argv 분해하므로 env 프리픽스/따옴표 금지.)
CMD ["node", "server.js"]
