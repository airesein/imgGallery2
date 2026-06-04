import { readFileSync } from "fs"
import { join, dirname } from "path"
import { fileURLToPath } from "url"

const __dirname = dirname(fileURLToPath(import.meta.url))
let _catalog = null

function getCatalog() {
  if (!_catalog) {
    _catalog = JSON.parse(readFileSync(join(__dirname, "catalog.json"), "utf-8"))
  }
  return _catalog
}

export async function GET(request) {
  try {
    const catalog = getCatalog()
    const rules = catalog.rules || {}
    const categories = catalog.categories || []

    const url = new URL(request.url)
    const categoryParam = url.searchParams.get("category")
    const typeParam = url.searchParams.get("type")
    const quality = url.searchParams.get("quality") || "display"

    if (!categoryParam) {
      return new Response(JSON.stringify({ error: "Missing category", availableCategories: categories.map(c => c.name) }), {
        status: 400,
        headers: { "content-type": "application/json; charset=utf-8", "access-control-allow-origin": "*" },
      })
    }

    const requestedCats = categoryParam.split(",").map(s => s.trim()).filter(Boolean)
    const pool = []
    const applyUrl = (tpl, id) => tpl.replace(/\{\{id\}\}/g, id)
    for (const cat of categories) {
      if (!requestedCats.includes(cat.name)) continue
      for (const group of cat.items) {
        const src = group.source
        const rule = rules[src]
        for (const id of group.ids) {
          pool.push({
            source: src, type: group.type || "image", id,
            rawUrl: rule?.raw ? applyUrl(rule.raw, id) : null,
            displayUrl: rule ? applyUrl(rule.display || rule.cover, id) : null,
            coverUrl: rule?.cover ? applyUrl(rule.cover, id) : null,
          })
        }
      }
    }

    if (!pool.length) {
      return new Response(JSON.stringify({ error: "No items found", availableCategories: categories.map(c => c.name) }), {
        status: 404,
        headers: { "content-type": "application/json; charset=utf-8", "access-control-allow-origin": "*" },
      })
    }

    const item = pool[Math.floor(Math.random() * pool.length)]
    const targetUrl = quality === "raw" ? item.rawUrl : item.displayUrl

    const cors = { "access-control-allow-origin": "*" }

    if (typeParam === "json") {
      return new Response(JSON.stringify({ success: true, url: targetUrl, raw_url: item.rawUrl, display_url: item.displayUrl, cover_url: item.coverUrl, source: item.source, type: item.type, quality }), {
        status: 200,
        headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-cache", ...cors },
      })
    }

    if (targetUrl) {
      return new Response(null, { status: 302, headers: { location: targetUrl, ...cors } })
    }

    return new Response(JSON.stringify({ error: "Unable to resolve" }), {
      status: 500,
      headers: { "content-type": "application/json; charset=utf-8", ...cors },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: "Internal error", detail: err.message }), {
      status: 500,
      headers: { "content-type": "application/json; charset=utf-8", "access-control-allow-origin": "*" },
    })
  }
}
