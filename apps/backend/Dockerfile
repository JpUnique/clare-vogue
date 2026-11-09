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
ENV HOSTNAME=0.0.0.0
WORKDIR /app

COPY --from=build /app/apps/backend/dist ./dist
COPY --from=build /app/apps/backend/package.json ./package.json
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/package-lock.json ./package-lock.json

# Install only production dependencies
RUN npm ci --only=production --workspace @clare-vogue/backend

USER node

EXPOSE 3000

CMD ["node", "dist/main.js"]
