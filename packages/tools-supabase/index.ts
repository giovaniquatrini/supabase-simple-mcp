import { z } from 'zod'
import { Router, Context, createSbClient, HelloAction } from '../core/index.js'
import pg from 'pg'

export const router = new Router()

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

export type ToolNames = 'list_projects' | 'execute_sql'
export const actions: ToolNames[] = ['list_projects', 'execute_sql']
export const actionSpecs: Record<ToolNames, HelloAction> = {
  list_projects: listProjectsSchema,
  execute_sql: executeSqlSchema,
}

