#!/usr/bin/env node
import { Command } from 'commander'
import { hello, Context } from '../packages/core/index.js'
import { router as toolsRouter, actions, actionSpecs } from '../packages/tools-supabase/index.js'
import { createInterface } from 'node:readline'
import { randomUUID } from 'crypto'
import pkg from '../package.json' assert { type: 'json' }

const program = new Command()
program
  .option('--access-token <token>', 'Supabase access token')
  .option('--project-ref <ref>', 'Project reference')
  .option('--read-only', 'Read only mode', false)
  .option('--no-telemetry', 'Disable telemetry')
  .option('--http', 'Start HTTP server instead of stdio', false)
  .option('--port <port>', 'HTTP port', '3000')

program.parse(process.argv)
const opts = program.opts()

if (opts.telemetry) {
  console.error(`telemetry ${randomUUID()} v${pkg.version}`)
}

const ctx: Context = {
  accessToken: opts.accessToken || process.env.SUPABASE_ACCESS_TOKEN,
  projectRef: opts.projectRef,
  readOnly: !!opts.readOnly,
}

if (!ctx.accessToken) {
  console.error('Access token required')
  process.exit(1)
}

const router = toolsRouter

if (opts.http) {
  console.log(JSON.stringify(hello(actionSpecs)))
  const express = await import('express')
  const rateLimit = (await import('express-rate-limit')).default
  const app = express.default()
  app.use(express.json())
  app.use(rateLimit({ windowMs: 1000, max: 10 }))
  app.post('/mcp', async (req, res) => {
    try {
      const result = await router.dispatch(req.body.method, req.body.params, ctx)
      res.json({ result })
    } catch (err: any) {
      res.json({ error: { code: err.code || -32603, message: err.message } })
    }
  })
  app.listen(Number(opts.port))
  console.log(`Listening on ${opts.port}`)
} else {
  const rl = createInterface({ input: process.stdin, output: process.stdout })
  console.log(JSON.stringify(hello(actionSpecs)))
  rl.on('line', async line => {
    try {
      const req = JSON.parse(line)
      const result = await router.dispatch(req.method, req.params, ctx)
      process.stdout.write(JSON.stringify({ id: req.id, result }) + '\n')
    } catch (err: any) {
      process.stdout.write(
        JSON.stringify({ error: { code: err.code || -32603, message: err.message } }) +
          '\n'
      )
    }
  })
}
