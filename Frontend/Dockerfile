FROM node:24-bookworm-slim AS build

WORKDIR /app

RUN corepack enable \
  && corepack prepare pnpm@10.33.2 --activate

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY Backend/package.json Backend/package.json
COPY Frontend/package.json Frontend/package.json

RUN pnpm install --frozen-lockfile --filter @book-manager/frontend...

COPY Frontend Frontend

ARG VITE_API_BASE_URL=
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}

RUN pnpm --filter @book-manager/frontend build

FROM nginx:1.29-alpine AS runtime

COPY Frontend/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/Frontend/dist /usr/share/nginx/html

EXPOSE 3000
