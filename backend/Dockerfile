# syntax=docker/dockerfile:1

# Base stage
FROM node:22-alpine AS base
WORKDIR /app
COPY package*.json ./

# Stage 1: Development (supports live code reload with tsx)
FROM base AS development
ENV NODE_ENV=development
RUN npm install
COPY . .
EXPOSE 3003
CMD ["npm", "run", "dev"]

# Stage 2: Builder (compiles TypeScript to JavaScript)
FROM base AS builder
RUN npm install
COPY . .
RUN npm run build

# Stage 3: Production (minimal production image)
FROM base AS production
WORKDIR /app
ENV NODE_ENV=production
COPY package*.json ./
RUN npm install --omit=dev
COPY --from=builder /app/dist ./dist
EXPOSE 3003
CMD ["npm", "start"]
