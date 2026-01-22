FROM node:20-alpine AS build
WORKDIR /app

COPY package.json package-lock.json tsconfig.base.json ./
COPY packages/agents/package.json packages/agents/package.json
COPY packages/agents/src packages/agents/src
COPY packages/agents/tsconfig.json packages/agents/tsconfig.json
COPY packages/api/package.json packages/api/package.json
COPY packages/api/src packages/api/src
COPY packages/api/tsconfig.json packages/api/tsconfig.json

RUN npm ci
RUN npm run -w @maciek/agents build
RUN npm run -w @maciek/api build
RUN npm prune --omit=dev

FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production

COPY --from=build /app/node_modules node_modules
COPY --from=build /app/packages/agents/dist packages/agents/dist
COPY --from=build /app/packages/agents/package.json packages/agents/package.json
COPY --from=build /app/packages/api/dist packages/api/dist
COPY --from=build /app/packages/api/package.json packages/api/package.json

EXPOSE 8080
CMD ["node", "packages/api/dist/index.js"]
