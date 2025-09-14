# ---- build the SPA ----
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# ---- nginx to serve + reverse proxy ----
FROM nginx:alpine
# our custom nginx.conf lives in client/nginx/nginx.conf
COPY nginx/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
