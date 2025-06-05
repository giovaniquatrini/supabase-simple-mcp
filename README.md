# Supabase Simple MCP

This project provides a minimal implementation of a Model Context Protocol (MCP) server that talks to Supabase. It follows the specifications described in `docs/quickstart.md`.

Supported tools now include:

- `list_projects`
- `execute_sql`
- `list_tables`
- `list_extensions`
- `list_organizations`
- `get_project_url`
- `get_anon_key`

## Usage

Run with npx:

```
npx supabase-mcp --access-token YOUR_PAT --project-ref your-project
```

### Development

```
npm install
npm run dev -- --access-token YOUR_PAT --project-ref your-project
```
