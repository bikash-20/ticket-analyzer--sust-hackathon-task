# ----- Stage 1: build the React/Vite production assets -----
FROM node:20-alpine AS build

WORKDIR /app

COPY package.json ./
# If you commit package-lock.json, prefer: COPY package-lock.json ./
#   && npm ci
RUN npm install --no-audit --no-fund

COPY . .

# VITE_API_BASE_URL is baked into the bundle at build time.
# The Nginx config reverse-proxies /api -> http://backend:8000,
# so we leave the base path as "/api" by default.
ARG VITE_API_BASE_URL=/api
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL

RUN npm run build


# ----- Stage 2: serve the build with Nginx on port 3000 -----
FROM nginx:1.27-alpine

# Replace the default Nginx config with one that:
#  - serves the React build on port 3000
#  - reverse-proxies /api/* to the backend service on the internal Docker network
RUN rm /etc/nginx/conf.d/default.conf
COPY nginx.conf /etc/nginx/conf.d/default.conf

COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 3000

CMD ["nginx", "-g", "daemon off;"]
