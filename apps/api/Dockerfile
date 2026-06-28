# syntax=docker/dockerfile:1

# ── build stage: 워크스페이스 설치 + shared/api 빌드 ──
FROM node:22-slim AS builder
WORKDIR /app

# 의존성 설치 (워크스페이스 package.json 만 먼저 복사 → 레이어 캐시)
COPY package.json package-lock.json ./
COPY packages/shared/package.json packages/shared/
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
RUN npm ci

# 소스 복사 후 빌드
COPY tsconfig.base.json ./
COPY packages/shared packages/shared
COPY apps/api apps/api
RUN npm run build --workspace @slot/shared && npm run build --workspace @slot/api

# ── runtime stage ──
FROM node:22-slim AS runtime
ENV NODE_ENV=production
WORKDIR /app

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/packages/shared/package.json ./packages/shared/package.json
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder /app/apps/api/package.json ./apps/api/package.json
COPY --from=builder /app/apps/api/dist ./apps/api/dist

# 예약 JSON 저장소는 볼륨에 보관
ENV DATA_DIR=/data
VOLUME /data
EXPOSE 3001
CMD ["node", "apps/api/dist/main.js"]
