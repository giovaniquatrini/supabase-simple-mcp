# Supabase MCP Quickstart

Install dependencies:
```bash
npm install
```

Run in development:
```bash
npm run dev -- --access-token YOUR_PAT --project-ref your-project
```

Available tools after startup:

- `list_projects`
- `execute_sql`
- `list_tables`
- `list_extensions`
- `list_organizations`
- `get_project_url`
- `get_anon_key`

Docker image:
```bash
docker build -t supabase-mcp .
docker run -p 3000:3000 supabase-mcp --http --port 3000 --access-token YOUR_PAT
```

Build:
```bash
npm run build
```
