FROM node:20-alpine AS frontend

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM node:20-alpine AS tauri-builder

WORKDIR /app

RUN apk add --no-cache cargo rust rust-dev gcc musl-dev

COPY package.json package-lock.json ./
COPY src ./src
COPY src-tauri ./src-tauri
COPY index.html ./
COPY tailwind.config.js ./
COPY tsconfig.json ./
COPY tsconfig.node.json ./
COPY postcss.config.js ./
COPY vite.config.ts ./

RUN npm ci
RUN npm run tauri build

FROM alpine:3.19 AS runtime

COPY --from=tauri-builder /app/desktop/src-tauri/target/release/bundle/*/* /app/

EXPOSE 1420

CMD ["/app/tauri", "dev"]
