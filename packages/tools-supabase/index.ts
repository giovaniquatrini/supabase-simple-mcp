import { z } from 'zod'
import { Router, Context, createSbClient, HelloAction } from '../core/index.js'
import pg from 'pg'

export const router = new Router()

// list_organizations
export const listOrganizationsParams = z.object({})
router.register('list_organizations', async (_p: unknown, ctx: Context) => {
  const resp = await fetch('https://api.supabase.com/v1/organizations', {
    headers: {
      Authorization: `Bearer ${ctx.accessToken}`,
      'X-Client-Info': `supabase-mcp@${process.env.npm_package_version}`,
    },
  })
  if (!resp.ok) throw new Error(`HTTP ${resp.status}`)
  return resp.json()
})

const listOrganizationsSchema: HelloAction = {
  parameters: { type: 'object', properties: {} },
}
// list_projects
export const listProjectsParams = z.object({})
router.register('list_projects', async (_params: unknown, ctx: Context) => {
  const resp = await fetch('https://api.supabase.com/v1/projects', {
    headers: {
      Authorization: `Bearer ${ctx.accessToken}`,
      'X-Client-Info': `supabase-mcp@${process.env.npm_package_version}`,
    },
  })
  if (!resp.ok) throw new Error(`HTTP ${resp.status}`)
  return resp.json()
})

const listProjectsSchema: HelloAction = {
  parameters: { type: 'object', properties: {} },
}
// execute_sql
export const executeSqlParams = z.object({
  sql: z.string(),
})
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

// list_tables
export const listTablesParams = z.object({})
router.register('list_tables', async (_params: unknown, ctx: Context) => {
  if (!ctx.projectRef) throw new Error('projectRef required')
  const pool = new pg.Pool({
    host: `${ctx.projectRef}.supabase.co`,
    user: 'supabase_read_only',
    ssl: { rejectUnauthorized: false },
  })
  const client = await pool.connect()
  try {
    const result = await client.query(
      "SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY table_name"
    )
    return result.rows.map(r => r.table_name)
  } finally {
    client.release()
    await pool.end()
  }
})

const listTablesSchema: HelloAction = {
  parameters: { type: 'object', properties: {} },
}

// list_extensions
export const listExtensionsParams = z.object({})
router.register('list_extensions', async (_params: unknown, ctx: Context) => {
  if (!ctx.projectRef) throw new Error('projectRef required')
  const pool = new pg.Pool({
    host: `${ctx.projectRef}.supabase.co`,
    user: 'supabase_read_only',
    ssl: { rejectUnauthorized: false },
  })
  const client = await pool.connect()
  try {
    const result = await client.query(
      'SELECT name, installed_version FROM pg_available_extensions WHERE installed_version IS NOT NULL'
    )
    return result.rows
  } finally {
    client.release()
    await pool.end()
  }
})

const listExtensionsSchema: HelloAction = {
  parameters: { type: 'object', properties: {} },
}

// get_project_url
export const getProjectUrlParams = z.object({})
router.register('get_project_url', async (_p: unknown, ctx: Context) => {
  if (!ctx.projectRef) throw new Error('projectRef required')
  const resp = await fetch(`https://api.supabase.com/v1/projects/${ctx.projectRef}`, {
    headers: {
      Authorization: `Bearer ${ctx.accessToken}`,
      'X-Client-Info': `supabase-mcp@${process.env.npm_package_version}`,
    },
  })
  if (!resp.ok) throw new Error(`HTTP ${resp.status}`)
  const data = await resp.json()
  return data.api.restUrl
})

const getProjectUrlSchema: HelloAction = {
  parameters: { type: 'object', properties: {} },
}

// get_anon_key
export const getAnonKeyParams = z.object({})
router.register('get_anon_key', async (_p: unknown, ctx: Context) => {
  if (!ctx.projectRef) throw new Error('projectRef required')
  const resp = await fetch(`https://api.supabase.com/v1/projects/${ctx.projectRef}`, {
    headers: {
      Authorization: `Bearer ${ctx.accessToken}`,
      'X-Client-Info': `supabase-mcp@${process.env.npm_package_version}`,
    },
  })
  if (!resp.ok) throw new Error(`HTTP ${resp.status}`)
  const data = await resp.json()
  return data.api.anon
})

const getAnonKeySchema: HelloAction = {
  parameters: { type: 'object', properties: {} },
}

export type ToolNames =
  | 'list_projects'
  | 'execute_sql'
  | 'list_tables'
  | 'list_extensions'
  | 'list_organizations'
  | 'get_project_url'
  | 'get_anon_key'

export const actions: ToolNames[] = [
  'list_projects',
  'execute_sql',
  'list_tables',
  'list_extensions',
  'list_organizations',
  'get_project_url',
  'get_anon_key',
]

export const actionSpecs: Record<ToolNames, HelloAction> = {
  list_projects: listProjectsSchema,
  execute_sql: executeSqlSchema,
  list_tables: listTablesSchema,
  list_extensions: listExtensionsSchema,
  list_organizations: listOrganizationsSchema,
  get_project_url: getProjectUrlSchema,
  get_anon_key: getAnonKeySchema,
}


