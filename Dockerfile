FROM node:20-slim
WORKDIR /app
COPY . .
RUN corepack enable && pnpm i --prod
CMD ["pnpm","supabase-mcp","--http","--port","3000"]
