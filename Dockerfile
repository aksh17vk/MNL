# syntax=docker/dockerfile:1

FROM node:24-alpine AS base
RUN corepack enable
WORKDIR /app

# --- dependencies -----------------------------------------------------------
FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
# --ignore-scripts skips the postinstall prisma sync, which needs the schema.
RUN pnpm install --frozen-lockfile --ignore-scripts

# --- build (also the image that runs migrations: it has the Prisma CLI) ------
FROM deps AS build
COPY . .
# prisma.config.ts insists on DATABASE_URL, but `generate` never connects — a
# placeholder satisfies the config loader. The real URL comes from the runtime env.
RUN DATABASE_URL="postgresql://build:build@localhost:5432/build" pnpm exec prisma generate \
    && pnpm exec tsc

# --- runtime ----------------------------------------------------------------
FROM base AS runtime
ENV NODE_ENV=production

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile --prod --ignore-scripts

COPY --from=build /app/dist ./dist

USER node
EXPOSE 5000

CMD ["node", "dist/server.js"]
