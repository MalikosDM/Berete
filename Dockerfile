# The image of the whole site: the built pages (dist/), the API with the admin, the 3D viewer and the client space
# (dist-server/). The photos and videos (public/media) are not in it: docker-compose.yml lends them to it as dist/media.
# Built by docker compose (docker-compose.yml) on the VPS. At start it brings the base up to
# date (prisma migrate deploy), then serves on port 3001 (Caddy in front: deploy/Caddyfile).

FROM node:24-bookworm-slim AS base
# Prisma needs OpenSSL to talk to the base.
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/*
WORKDIR /app

# Every package, for the build.
FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

# The packages the server needs to run (without the tools of the build).
FROM base AS runtime-deps
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --no-audit --no-fund

FROM deps AS build
# The public address of the site, written in the pages (links between languages, previews of links, sitemap).
ARG SITE_URL=""
ENV SITE_URL=${SITE_URL}
# Only read by "prisma generate" (no base is opened during the build).
ENV DATABASE_URL="postgresql://build@localhost:5432/build"
COPY . .
RUN npm run build && npm run build:server

FROM base
ENV NODE_ENV=production
COPY --from=runtime-deps /app/node_modules ./node_modules
COPY --from=build /app/package.json ./
COPY --from=build /app/dist ./dist
COPY --from=build /app/dist-server ./dist-server
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/prisma.config.ts ./
# The optimised test model, written in the base at the first start.
COPY --from=build /app/storage/demo ./storage/demo
# The 3D files sent from the admin (a folder of the VPS, see docker-compose.yml).
ENV MODELS_DIR=/data/storage
RUN mkdir -p /data/storage && chown -R node:node /data
USER node
EXPOSE 3001
HEALTHCHECK --interval=15s --timeout=5s --start-period=60s --retries=4 \
  CMD node -e "fetch('http://127.0.0.1:3001/api/health').then((r) => process.exit(r.ok ? 0 : 1), () => process.exit(1))"
CMD ["sh", "-c", "node_modules/.bin/prisma migrate deploy && exec node dist-server/server/index.js"]
