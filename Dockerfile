# ONDAs Analytics API — imagen de producción.
#
# Tres etapas:
#   deps    dependencias completas (incluidas las de desarrollo)
#   build   compila TypeScript a dist/ ; también es la imagen de utilidades,
#           porque scripts/ se ejecuta con ts-node, que es dependencia de dev
#   runtime imagen final, sólo dependencias de producción + dist/
#
# Se usa la variante bookworm-slim (glibc) y no alpine: sharp resuelve sus
# binarios nativos sin compilar sobre glibc.

# ---------- deps ----------
FROM node:20-bookworm-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# ---------- build / tools ----------
FROM node:20-bookworm-slim AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build
# Objetivo `build`: `docker compose run --rm seed` lo usa para npm run seed /
# npm run backfill, que necesitan ts-node.

# ---------- runtime ----------
FROM node:20-bookworm-slim AS runtime
ENV NODE_ENV=production
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY --from=build /app/dist ./dist
# Ficheros que el proceso lee en tiempo de ejecución con process.cwd():
#   public/    logos servidos como estáticos y embebidos en los PDF
#   metadata/  descriptores DCAT usados por la validación de activos
COPY public ./public
COPY metadata ./metadata
# analyses escribe las gráficas en output/plots/<requestId>.
RUN mkdir -p output/plots && chown -R node:node output

# El proceso no necesita root.
USER node

EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "require('node:http').get('http://127.0.0.1:'+(process.env.PORT||3000)+'/docs',r=>process.exit(r.statusCode<500?0:1)).on('error',()=>process.exit(1))"

CMD ["node", "dist/main"]
