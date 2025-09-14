# ---- Build stage ----
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
# Compile TypeScript (supports either script or tsc -b)
RUN npm run build || npx tsc -b

# ---- Runtime stage ----
FROM node:20-alpine
WORKDIR /app
# need socat in the final image (not at runtime)
RUN apk add --no-cache socat
COPY package*.json ./
RUN npm ci --omit=dev
COPY --from=build /app/dist ./dist
ENV NODE_ENV=production
EXPOSE 4000
# Start IPv4 + IPv6 localhost forwarders, then Node
CMD sh -c " \
  socat TCP-LISTEN:6379,bind=127.0.0.1,fork,reuseaddr TCP:redis:6379 & \
  socat TCP6-LISTEN:6379,bind=::1,fork,reuseaddr TCP:redis:6379 & \
  exec node dist/index.js"
