FROM node:22-bookworm-slim AS build

WORKDIR /app

COPY package.json package-lock.json ./
COPY apps/backend/package.json apps/backend/package.json
COPY apps/frontend/package.json apps/frontend/package.json
COPY packages/api-contracts/package.json packages/api-contracts/package.json
RUN npm ci

COPY . .
RUN npm run build --workspace @clare-vogue/backend

FROM node:22-bookworm-slim AS runtime

ENV NODE_ENV=production
ENV PORT=3000
WORKDIR /app

COPY --from=build --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/package.json /app/package-lock.json ./
COPY --from=build --chown=node:node /app/apps/backend/package.json ./apps/backend/package.json
COPY --from=build --chown=node:node /app/apps/backend/dist ./apps/backend/dist
COPY --from=build --chown=node:node /app/apps/backend/drizzle ./apps/backend/drizzle
COPY --from=build --chown=node:node /app/apps/backend/drizzle.config.ts ./apps/backend/drizzle.config.ts
COPY --from=build --chown=node:node /app/apps/backend/src/database/schema.ts ./apps/backend/src/database/schema.ts

USER node

EXPOSE 3000

CMD ["node", "apps/backend/dist/main.js"]
