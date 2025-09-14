# ---- Build stage ----
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
# Compile TypeScript
RUN npm run build

# ---- Runtime stage ----
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY --from=build /app/dist ./dist
ENV NODE_ENV=production
EXPOSE 8081
CMD ["node", "dist/index.js"]
