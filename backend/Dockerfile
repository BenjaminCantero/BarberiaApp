# ---- Build stage ----
FROM node:22-alpine AS build
WORKDIR /app
RUN apk add --no-cache openssl

# El schema va antes de `npm ci`: el postinstall ejecuta `prisma generate`.
COPY package*.json ./
COPY prisma ./prisma
RUN npm ci

COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# Deja solo dependencias de producción (incluye el CLI de prisma para migrar).
RUN npm prune --omit=dev

# ---- Runtime stage ----
FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
RUN apk add --no-cache openssl

COPY package*.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/dist ./dist

# Carpeta para archivos subidos cuando no hay Vercel Blob
RUN mkdir -p uploads

EXPOSE 3000

# Aplica migraciones pendientes y arranca el servidor
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/index.js"]
