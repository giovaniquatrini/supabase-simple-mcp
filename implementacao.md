# Registro de Implementação

Este documento acompanha o progresso do projeto **supabase-mcp** em relação ao guia técnico.

## Funcionalidades Implementadas

- **Handshake** via `mcp/hello` definido em `packages/core`.
- **Router** assíncrono para despachar métodos MCP.
- **CLI** em `bin/supabase-mcp.ts` com flags:
  - `--access-token`
  - `--project-ref`
  - `--read-only`
  - `--no-telemetry`
  - `--http` e `--port`
- **Telemetria básica** (impressão de UUID e versão).
- **Tools já disponíveis** em `packages/tools-supabase`:
  - `list_organizations`
  - `list_projects`
  - `execute_sql` (suporte a modo read-only)
  - `list_tables`
  - `list_extensions`
  - `get_project_url`
  - `get_anon_key`
- **Dockerfile** e fluxo simples de CI (build e testes).
- **Documentação inicial** em `README.md` e `docs/quickstart.md`.

## Funcionalidades Pendentes

De acordo com o guia, ainda faltam as seguintes implementações:

- Tools restantes:
  - `get_organization`
  - `get_project`
  - `create_project`
  - `pause_project`
  - `restore_project`
  - `list_edge_functions`
  - `deploy_edge_function`
  - `list_migrations`
  - `apply_migration`
  - `get_logs`
- Suporte completo a streaming/SSE para tarefas longas.
- Mecanismo avançado de telemetria (opt-out) e mascaramento de tokens.
- Testes unitários e de integração abrangentes (atualmente apenas teste do handshake).
- Configuração de Docker multi‑arch e publicação automatizada.
- Pipeline CI/CD mais completo (matrix de SO e testes E2E).

Este arquivo deve ser atualizado a cada novo avanço para acompanhar o cumprimento do guia técnico.
