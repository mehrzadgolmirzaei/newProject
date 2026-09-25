# ─── Viora Atlas — ایمیج production ───────────────────────────────────────
# شامل libvips-tools + OpenSlide برای تبدیل اسلایدهای دیجیتال کامل (SVS/NDPI/MRXS)

FROM node:22-bookworm-slim AS deps
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json* ./
COPY prisma ./prisma
RUN if [ -f package-lock.json ]; then npm ci; else npm install; fi

FROM deps AS build
WORKDIR /app
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
# متغیرهای ساختگی فقط برای عبور از اعتبارسنجی هنگام build؛ مقدار واقعی در زمان اجرا داده می‌شود
RUN DATABASE_URL="postgresql://build:build@localhost:5432/build" npm run build
# Prisma CLI با همه‌ی وابستگی‌هایش (برای migrate deploy در زمان اجرا)، هم‌نسخه با پروژه
RUN npm install --prefix /opt/prisma-cli --no-save --no-audit --no-fund "prisma@$(node -p "require('./node_modules/prisma/package.json').version")"

FROM node:22-bookworm-slim AS run
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates libvips-tools \
    && rm -rf /var/lib/apt/lists/* \
    && groupadd -r app && useradd -r -g app app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000 HOSTNAME=0.0.0.0 VIPS_BIN=/usr/bin/vips STORAGE_DIR=/data/storage
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
COPY --from=build /app/public ./public
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=build /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=build /opt/prisma-cli /opt/prisma-cli
COPY --from=build /app/scripts/docker-start.sh ./start.sh
COPY --from=build /app/scripts/create-admin.mjs ./scripts/create-admin.mjs
RUN mkdir -p /data/storage && chown -R app:app /data /app && chmod +x ./start.sh
USER app
EXPOSE 3000
VOLUME ["/data"]
CMD ["./start.sh"]
