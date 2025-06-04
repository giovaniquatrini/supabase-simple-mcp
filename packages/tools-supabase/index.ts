import { z } from 'zod'
import { Router, Context, createSbClient, HelloAction } from '../core/index.js'
import pg from 'pg'
import { createReadStream } from 'node:fs'
import { pipeline } from 'node:stream/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { writeFile, unlink } from 'node:fs/promises'
import { createGzip } from 'node:zlib'
import pLimit from 'p-limit'

export const router = new Router()

const limit = pLimit(10)

function apiHeaders(ctx: Context) {
  return {
    Authorization: `Bearer ${ctx.accessToken}`,
    'Content-Type': 'application/json',
    'X-Client-Info': `supabase-mcp@${process.env.npm_package_version}`,
  }
}

async function apiRequest(ctx: Context, method: string, path: string, body?: any) {
  return limit(async () => {
    const resp = await fetch(`https://api.supabase.com${path}`, {
      method,
      headers: apiHeaders(ctx),
      body: body ? JSON.stringify(body) : undefined,
    })
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`)
    return resp.status === 204 ? null : resp.json()
  })
}

// list_organizations
const listOrganizationsParams = z.object({})
router.register('list_organizations', async (_: unknown, ctx: Context) => {
  return apiRequest(ctx, 'GET', '/v1/organizations')
})
const listOrganizationsSchema: HelloAction = {
  parameters: { type: 'object', properties: {} },
}

// get_organization
const getOrganizationParams = z.object({ id: z.string() })
router.register('get_organization', async (params: unknown, ctx: Context) => {
  const { id } = getOrganizationParams.parse(params)
  return apiRequest(ctx, 'GET', `/v1/organizations/${id}`)
})
const getOrganizationSchema: HelloAction = {
  parameters: {
    type: 'object',
    properties: { id: { type: 'string' } },
    required: ['id'],
  },
}

// list_projects
const listProjectsParams = z.object({})
router.register('list_projects', async (_params: unknown, ctx: Context) => {
  return apiRequest(ctx, 'GET', '/v1/projects')
})
const listProjectsSchema: HelloAction = {
  parameters: { type: 'object', properties: {} },
}

// get_project
const getProjectParams = z.object({ ref: z.string().optional() })
router.register('get_project', async (params: unknown, ctx: Context) => {
  const { ref } = getProjectParams.parse(params)
  const projectRef = ref || ctx.projectRef
  if (!projectRef) throw new Error('projectRef required')
  return apiRequest(ctx, 'GET', `/v1/projects/${projectRef}`)
})
const getProjectSchema: HelloAction = {
  parameters: { type: 'object', properties: { ref: { type: 'string' } } },
}

// create_project
const createProjectParams = z.object({
  name: z.string(),
  organization_id: z.string(),
})
router.register('create_project', async (params: unknown, ctx: Context) => {
  const payload = createProjectParams.parse(params)
  return apiRequest(ctx, 'POST', '/v1/projects', payload)
})
const createProjectSchema: HelloAction = {
  parameters: {
    type: 'object',
    properties: { name: { type: 'string' }, organization_id: { type: 'string' } },
    required: ['name', 'organization_id'],
  },
  dangerous: true,
}

// pause_project
const pauseProjectParams = z.object({ ref: z.string().optional() })
router.register('pause_project', async (params: unknown, ctx: Context) => {
  const { ref } = pauseProjectParams.parse(params)
  const projectRef = ref || ctx.projectRef
  if (!projectRef) throw new Error('projectRef required')
  return apiRequest(ctx, 'POST', `/v1/projects/${projectRef}/pause`)
})
const pauseProjectSchema: HelloAction = {
  parameters: { type: 'object', properties: { ref: { type: 'string' } } },
  dangerous: true,
}

// restore_project
const restoreProjectParams = z.object({ ref: z.string().optional() })
router.register('restore_project', async (params: unknown, ctx: Context) => {
  const { ref } = restoreProjectParams.parse(params)
  const projectRef = ref || ctx.projectRef
  if (!projectRef) throw new Error('projectRef required')
  return apiRequest(ctx, 'POST', `/v1/projects/${projectRef}/restore`)
})
const restoreProjectSchema: HelloAction = {
  parameters: { type: 'object', properties: { ref: { type: 'string' } } },
  dangerous: true,
}

// get_project_url
const getProjectUrlParams = z.object({ ref: z.string().optional() })
router.register('get_project_url', async (params: unknown, ctx: Context) => {
  const { ref } = getProjectUrlParams.parse(params)
  const projectRef = ref || ctx.projectRef
  if (!projectRef) throw new Error('projectRef required')
  const proj = await apiRequest(ctx, 'GET', `/v1/projects/${projectRef}`)
  return proj.api.restUrl
})
const getProjectUrlSchema: HelloAction = {
  parameters: { type: 'object', properties: { ref: { type: 'string' } } },
}

// get_anon_key
const getAnonKeyParams = z.object({ ref: z.string().optional() })
router.register('get_anon_key', async (params: unknown, ctx: Context) => {
  const { ref } = getAnonKeyParams.parse(params)
  const projectRef = ref || ctx.projectRef
  if (!projectRef) throw new Error('projectRef required')
  const proj = await apiRequest(ctx, 'GET', `/v1/projects/${projectRef}`)
  return proj.api.anon
})
const getAnonKeySchema: HelloAction = {
  parameters: { type: 'object', properties: { ref: { type: 'string' } } },
}

// list_edge_functions
const listEdgeFunctionsParams = z.object({})
router.register('list_edge_functions', async (_: unknown, ctx: Context) => {
  if (!ctx.projectRef) throw new Error('projectRef required')
  return apiRequest(ctx, 'GET', `/functions/v1/projects/${ctx.projectRef}/functions`)
})
const listEdgeFunctionsSchema: HelloAction = {
  parameters: { type: 'object', properties: {} },
}

// deploy_edge_function
const deployEdgeFunctionParams = z.object({
  name: z.string(),
  code: z.string(),
  entrypoint: z.string().optional(),
})
router.register('deploy_edge_function', async (params: unknown, ctx: Context) => {
  const { name, code, entrypoint } = deployEdgeFunctionParams.parse(params)
  if (!ctx.projectRef) throw new Error('projectRef required')
  const filePath = join(tmpdir(), `${name}.ts`)
  await writeFile(filePath, Buffer.from(code, 'base64'))
  const archivePath = join(tmpdir(), `${name}.gz`)
  await pipeline(createReadStream(filePath), createGzip(), writeFile(archivePath, ''))
  const body = createReadStream(archivePath)
  const resp = await fetch(`https://api.supabase.com/functions/v1/projects/${ctx.projectRef}/functions/${name}`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${ctx.accessToken}`,
      'X-Client-Info': `supabase-mcp@${process.env.npm_package_version}`,
    },
    body,
  })
  await unlink(filePath)
  await unlink(archivePath)
  if (!resp.ok) throw new Error(`HTTP ${resp.status}`)
  return resp.json()
})
const deployEdgeFunctionSchema: HelloAction = {
  parameters: {
    type: 'object',
    properties: {
      name: { type: 'string' },
      code: { type: 'string' },
      entrypoint: { type: 'string' },
    },
    required: ['name', 'code'],
  },
  dangerous: true,
}

// list_tables
const listTablesParams = z.object({})
router.register('list_tables', async (_: unknown, ctx: Context) => {
  if (!ctx.projectRef) throw new Error('projectRef required')
  return apiRequest(ctx, 'GET', `/v1/projects/${ctx.projectRef}/tables`)
})
const listTablesSchema: HelloAction = {
  parameters: { type: 'object', properties: {} },
}

// list_extensions
const listExtensionsParams = z.object({})
router.register('list_extensions', async (_: unknown, ctx: Context) => {
  if (!ctx.projectRef) throw new Error('projectRef required')
  return apiRequest(ctx, 'GET', `/v1/projects/${ctx.projectRef}/extensions`)
})
const listExtensionsSchema: HelloAction = {
  parameters: { type: 'object', properties: {} },
}

// list_migrations
const listMigrationsParams = z.object({})
router.register('list_migrations', async (_: unknown, ctx: Context) => {
  if (!ctx.projectRef) throw new Error('projectRef required')
  return apiRequest(ctx, 'GET', `/v1/projects/${ctx.projectRef}/migrations`)
})
const listMigrationsSchema: HelloAction = {
  parameters: { type: 'object', properties: {} },
}

// apply_migration
const applyMigrationParams = z.object({ sql: z.string() })
router.register('apply_migration', async (params: unknown, ctx: Context) => {
  const { sql } = applyMigrationParams.parse(params)
  if (!ctx.projectRef) throw new Error('projectRef required')
  return apiRequest(ctx, 'POST', `/v1/projects/${ctx.projectRef}/migrations`, { sql })
})
const applyMigrationSchema: HelloAction = {
  parameters: {
    type: 'object',
    properties: { sql: { type: 'string' } },
    required: ['sql'],
  },
  dangerous: true,
}

// execute_sql (existing)
const executeSqlParams = z.object({ sql: z.string() })
router.register('execute_sql', async (params: unknown, ctx: Context) => {
  const { sql } = executeSqlParams.parse(params)
  if (!ctx.projectRef) throw new Error('projectRef required')
  if (ctx.readOnly) {
    const pool = new pg.Pool({
      host: `${ctx.projectRef}.supabase.co`,
      user: 'supabase_read_only',
      ssl: { rejectUnauthorized: false },
    })
    const client = await pool.connect()
    try {
      await client.query('BEGIN')
      const result = await client.query(sql)
      await client.query('ROLLBACK')
      return result.rows
    } finally {
      client.release()
      await pool.end()
    }
  } else {
    const client = createSbClient({
      accessToken: ctx.accessToken,
      projectRef: ctx.projectRef,
    })
    const result = await client.rpc('execute_sql', { sql })
    return result
  }
})
const executeSqlSchema: HelloAction = {
  parameters: {
    type: 'object',
    properties: { sql: { type: 'string' } },
    required: ['sql'],
  },
  dangerous: true,
}

// get_logs
const getLogsParams = z.object({ source: z.string().optional() })
router.register('get_logs', async (params: unknown, ctx: Context) => {
  if (!ctx.projectRef) throw new Error('projectRef required')
  const { source } = getLogsParams.parse(params)
  const qs = source ? `?source=${encodeURIComponent(source)}` : ''
  return apiRequest(ctx, 'GET', `/v1/projects/${ctx.projectRef}/logs${qs}`)
})
const getLogsSchema: HelloAction = {
  parameters: { type: 'object', properties: { source: { type: 'string' } } },
}

export type ToolNames =
  | 'list_organizations'
  | 'get_organization'
  | 'list_projects'
  | 'get_project'
  | 'create_project'
  | 'pause_project'
  | 'restore_project'
  | 'get_project_url'
  | 'get_anon_key'
  | 'list_edge_functions'
  | 'deploy_edge_function'
  | 'list_tables'
  | 'list_extensions'
  | 'list_migrations'
  | 'apply_migration'
  | 'execute_sql'
  | 'get_logs'

export const actions: ToolNames[] = [
  'list_organizations',
  'get_organization',
  'list_projects',
  'get_project',
  'create_project',
  'pause_project',
  'restore_project',
  'get_project_url',
  'get_anon_key',
  'list_edge_functions',
  'deploy_edge_function',
  'list_tables',
  'list_extensions',
  'list_migrations',
  'apply_migration',
  'execute_sql',
  'get_logs',
]

export const actionSpecs: Record<ToolNames, HelloAction> = {
  list_organizations: listOrganizationsSchema,
  get_organization: getOrganizationSchema,
  list_projects: listProjectsSchema,
  get_project: getProjectSchema,
  create_project: createProjectSchema,
  pause_project: pauseProjectSchema,
  restore_project: restoreProjectSchema,
  get_project_url: getProjectUrlSchema,
  get_anon_key: getAnonKeySchema,
  list_edge_functions: listEdgeFunctionsSchema,
  deploy_edge_function: deployEdgeFunctionSchema,
  list_tables: listTablesSchema,
  list_extensions: listExtensionsSchema,
  list_migrations: listMigrationsSchema,
  apply_migration: applyMigrationSchema,
  execute_sql: executeSqlSchema,
  get_logs: getLogsSchema,
}
