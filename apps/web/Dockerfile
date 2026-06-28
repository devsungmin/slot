# syntax=docker/dockerfile:1

# ── build stage: 워크스페이스 설치 + shared/web 빌드 ──
FROM node:22-slim AS builder
WORKDIR /app

COPY package.json package-lock.json ./
COPY packages/shared/package.json packages/shared/
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
RUN npm ci

COPY tsconfig.base.json ./
COPY packages/shared packages/shared
COPY apps/web apps/web
RUN npm run build --workspace @slot/shared && npm run build --workspace @slot/web

# ── runtime stage: nginx 정적 서빙 + /api 프록시 ──
FROM nginx:alpine AS runtime
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/apps/web/dist /usr/share/nginx/html
EXPOSE 80
