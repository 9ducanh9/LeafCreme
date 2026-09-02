import { spawn } from 'node:child_process'
import { resolve } from 'node:path'

process.env.VITE_API_BASE_URL ||= 'http://localhost:8000'
process.env.VITE_AUTH_PROVIDER ||= 'local'

const { createServer } = await import('vite')
const server = await createServer({
  server: { host: '127.0.0.1', port: 4173, strictPort: true },
  logLevel: 'warn',
})

await server.listen()

const cli = resolve('node_modules/@playwright/test/cli.js')
const child = spawn(process.execPath, [cli, 'test', ...process.argv.slice(2)], {
  cwd: process.cwd(),
  env: process.env,
  stdio: 'inherit',
})

const exitCode = await new Promise((resolveExit, reject) => {
  child.once('error', reject)
  child.once('exit', (code) => resolveExit(code ?? 1))
})

await server.close()
process.exitCode = exitCode
