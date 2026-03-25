FROM oven/bun:1.3.0-alpine AS builder

WORKDIR /app

COPY package.json bun.lock ./
RUN bun install --ignore-scripts

COPY . .
RUN bunx fumadocs-mdx
ENV DISABLE_PRERENDER=true
RUN bun run build

FROM oven/bun:1.3.0-alpine AS runner
WORKDIR /app

COPY --from=builder /app/.output ./.output

ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000

CMD ["bun", "run", ".output/server/index.mjs"]
