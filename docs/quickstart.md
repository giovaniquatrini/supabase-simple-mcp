# Supabase MCP Quickstart

Install dependencies:
```bash
npm install
```

Run in development:
```bash
npm run dev -- --access-token YOUR_PAT --project-ref your-project
```

Docker image:
```bash
docker build -t supabase-mcp .
docker run -p 3000:3000 supabase-mcp --http --port 3000 --access-token YOUR_PAT
```

Build:
```bash
npm run build
```
