# ---------- Stage 1: build ----------
FROM node:22-alpine AS build

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

ARG VITE_APP_PORT
ARG VITE_BFF_URL
ARG VITE_APP_BASE

ENV VITE_APP_PORT=$VITE_APP_PORT
ENV VITE_BFF_URL=$VITE_BFF_URL
ENV VITE_APP_BASE=$VITE_APP_BASE

RUN npm run build

# ---------- Stage 2: serve ----------
FROM nginx:1.27-alpine

COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]