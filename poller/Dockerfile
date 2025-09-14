# ---- Build stage ----
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
# Compile TypeScript -> dist/
RUN npm run build || npx tsc -b

# ---- Runtime stage ----
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY --from=build /app/dist ./dist
ENV NODE_ENV=production
CMD ["node", "dist/index.js"]
