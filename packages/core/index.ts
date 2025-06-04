import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { z } from 'zod'

export interface Context {
  accessToken: string
  projectRef?: string
  readOnly: boolean
}

export function createSbClient(opts: {
  accessToken: string
  projectRef?: string
  url?: string
}) {
  const url =
    opts.url ||
    (opts.projectRef ? `https://${opts.projectRef}.supabase.co` : undefined)
  if (!url)
    throw new Error('projectRef or url must be provided to createSbClient')
  return createClient(url, opts.accessToken, {
    global: { headers: { 'X-Client-Info': `supabase-mcp@${process.env.npm_package_version}` } },
  })
}

export const HelloAction = z.object({
  parameters: z.record(z.any()).optional(),
  dangerous: z.boolean().optional(),
})

export const HelloResponse = z.object({
  protocol: z.literal('0.3'),
  name: z.literal('supabase-mcp'),
  actions: z.record(HelloAction),
})

export function hello(actions: Record<string, z.infer<typeof HelloAction>>): z.infer<typeof HelloResponse> {
  return { protocol: '0.3', name: 'supabase-mcp', actions }
}

export type ToolHandler = (params: any, ctx: Context) => Promise<any>

export class Router {
  private handlers = new Map<string, ToolHandler>()

  register(name: string, handler: ToolHandler) {
    this.handlers.set(name, handler)
  }

  async dispatch(method: string, params: any, ctx: Context) {
    const fn = this.handlers.get(method)
    if (!fn) {
      const err = new Error('Method not found') as any
      err.code = -32601
      throw err
    }
    return fn(params, ctx)
  }
}
