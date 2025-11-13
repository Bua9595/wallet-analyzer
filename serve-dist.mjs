import http from 'node:http'
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, 'dist')
const port = process.env.PORT ? Number(process.env.PORT) : 8080

const mime = new Map(Object.entries({
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
}))

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url || '/', 'http://localhost')
    let filePath = path.normalize(path.join(root, url.pathname))

    // Prevent path traversal
    if (!filePath.startsWith(root)) {
      res.writeHead(403)
      return res.end('Forbidden')
    }

    let stat
    try {
      stat = await fs.stat(filePath)
    } catch {
      // SPA fallback to index.html
      filePath = path.join(root, 'index.html')
      stat = await fs.stat(filePath)
    }

    if (stat.isDirectory()) {
      filePath = path.join(filePath, 'index.html')
    }

    const ext = path.extname(filePath)
    const type = mime.get(ext) || 'application/octet-stream'
    const data = await fs.readFile(filePath)
    res.writeHead(200, { 'Content-Type': type, 'Cache-Control': 'no-cache' })
    res.end(data)
  } catch (e) {
    res.writeHead(500)
    res.end(String(e))
  }
})

server.listen(port, () => {
  console.log(`Serving dist at http://localhost:${port}`)
})

