FROM node:24-bookworm-slim AS deps

WORKDIR /app

RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 make g++ \
  && rm -rf /var/lib/apt/lists/* \
  && corepack enable \
  && corepack prepare pnpm@10.33.2 --activate

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY Backend/package.json Backend/package.json
COPY Frontend/package.json Frontend/package.json

RUN pnpm install --frozen-lockfile --filter @book-manager/backend...

FROM deps AS build

COPY Backend Backend

RUN pnpm --filter @book-manager/backend build

FROM node:24-bookworm-slim AS runtime

WORKDIR /app/Backend

ENV NODE_ENV=production \
  BACKEND_PORT=3001 \
  DATABASE_PATH=/data/book-manager.sqlite

COPY --from=deps /app/node_modules /app/node_modules
COPY --from=deps /app/Backend/node_modules /app/Backend/node_modules
COPY --from=build /app/Backend/dist ./dist
COPY --from=build /app/Backend/drizzle ./drizzle
COPY --from=build /app/Backend/package.json ./package.json

EXPOSE 3001

CMD ["node", "dist/server.js"]
