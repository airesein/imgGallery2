import { readFile } from "node:fs/promises"
import { resolve, dirname } from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = dirname(fileURLToPath(import.meta.url))
const CATALOG_PATH = resolve(__dirname, "../public/catalog.json")

let _index = null
let _rules = null
let _categories = null

async function buildIndex() {
  if (_index) return
  const catalog = JSON.parse(await readFile(CATALOG_PATH, "utf-8"))
  _rules = catalog.rules || {}
  _categories = catalog.categories || []
  _index = new Map()
  for (const cat of _categories) {
    const items = []
    for (const group of cat.items) {
      const src = group.source
      const type = group.type || "image"
      const rule = _rules[src]
      const applyUrl = (tpl, id) => tpl.replace(/\{\{id\}\}/g, id)
      for (const id of group.ids) {
        items.push({
          source: src,
          type,
          id,
          rawUrl: rule?.raw ? applyUrl(rule.raw, id) : null,
          displayUrl: rule ? applyUrl(rule.display || rule.cover, id) : null,
          coverUrl: rule?.cover ? applyUrl(rule.cover, id) : null,
        })
      }
    }
    _index.set(cat.name, items)
  }
}

function randomItem(pool) {
  return pool[Math.floor(Math.random() * pool.length)]
}

export function apiPlugin() {
  return {
    name: "vite-plugin-api",
    async configureServer(server) {
      await buildIndex()

      server.middlewares.use("/api", (req, res) => {
        try {
          const url = new URL(req.url, "http://localhost")
          const categoryParam = url.searchParams.get("category")
          const typeParam = url.searchParams.get("type")
          const quality = url.searchParams.get("quality") || "display"

          if (!categoryParam) {
            res.writeHead(400, { "content-type": "application/json; charset=utf-8" })
            res.end(JSON.stringify({
              error: "Missing required parameter: category",
              hint: "Usage: /api?category=Name&type=json&quality=display|raw",
              availableCategories: _categories.map(c => c.name),
            }))
            return
          }

          const requestedCats = categoryParam.split(",").map(s => s.trim()).filter(Boolean)

          // Collect matching items - fast path
          let pool = []
          for (const name of requestedCats) {
            const items = _index.get(name)
            if (items) pool = pool.concat(items)
          }

          if (pool.length === 0) {
            res.writeHead(404, { "content-type": "application/json; charset=utf-8" })
            res.end(JSON.stringify({
              error: `No items found for category: ${categoryParam}`,
              availableCategories: _categories.map(c => c.name),
            }))
            return
          }

          const item = randomItem(pool)
          const targetUrl = quality === "raw" ? item.rawUrl : item.displayUrl

          if (typeParam === "json") {
            res.writeHead(200, { "content-type": "application/json; charset=utf-8", "cache-control": "no-cache" })
            res.end(JSON.stringify({
              success: true,
              url: targetUrl,
              raw_url: item.rawUrl,
              display_url: item.displayUrl,
              cover_url: item.coverUrl,
              source: item.source,
              type: item.type,
              quality,
            }))
            return
          }

          if (targetUrl) {
            res.writeHead(302, { location: targetUrl, "cache-control": "no-cache" })
            res.end()
            return
          }

          res.writeHead(500, { "content-type": "application/json; charset=utf-8" })
          res.end(JSON.stringify({ error: "Unable to resolve image URL" }))
        } catch (err) {
          res.writeHead(500, { "content-type": "application/json; charset=utf-8" })
          res.end(JSON.stringify({ error: "Internal server error", detail: err.message }))
        }
      })
    },
  }
}
