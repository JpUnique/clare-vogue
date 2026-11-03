FROM node:22-bookworm-slim AS build

WORKDIR /app

COPY package.json package-lock.json ./
COPY apps/backend/package.json apps/backend/package.json
COPY apps/frontend/package.json apps/frontend/package.json
COPY packages/api-contracts/package.json packages/api-contracts/package.json
RUN npm ci

COPY . .
RUN npm run build --workspace @clare-vogue/frontend

FROM node:22-bookworm-slim AS runtime

ENV NODE_ENV=production
ENV PORT=3001
ENV HOSTNAME=0.0.0.0
WORKDIR /app

COPY --from=build --chown=node:node /app/apps/frontend/.next/standalone ./
COPY --from=build --chown=node:node /app/apps/frontend/.next/static ./apps/frontend/.next/static
COPY --from=build --chown=node:node /app/apps/frontend/public ./apps/frontend/public

USER node

EXPOSE 3001

CMD ["node", "apps/frontend/server.js"]
