let _catalog = null
let _rules = null
let _categories = null
let _index = null

async function loadCatalog(reqUrl) {
  if (_index) return
  const url = new URL(reqUrl)
  const catalogUrl = `${url.protocol}//${url.host}/catalog.json`
  const res = await fetch(catalogUrl)
  if (!res.ok) throw new Error("Failed to load catalog")
  const catalog = await res.json()
  _rules = catalog.rules || {}
  _categories = catalog.categories || []
  _index = new Map()
  const applyUrl = (tpl, id) => tpl.replace(/\{\{id\}\}/g, id)
  for (const cat of _categories) {
    const items = []
    for (const group of cat.items) {
      const src = group.source
      const type = group.type || "image"
      const rule = _rules[src]
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

function pickRandom(pool) {
  return pool[Math.floor(Math.random() * pool.length)]
}

export default async function handler(req) {
  try {
    const url = new URL(req.url, `http://${req.headers.host || "localhost"}`)
    const categoryParam = url.searchParams.get("category")
    const typeParam = url.searchParams.get("type")
    const quality = url.searchParams.get("quality") || "display"

    await loadCatalog(req.url)

    if (!categoryParam) {
      return new Response(JSON.stringify({
        error: "Missing required parameter: category",
        hint: "Usage: /api?category=Name&type=json&quality=display|raw",
        availableCategories: _categories.map(c => c.name),
      }), { status: 400, headers: { "content-type": "application/json; charset=utf-8" } })
    }

    const requestedCats = categoryParam.split(",").map(s => s.trim()).filter(Boolean)
    let pool = []
    for (const name of requestedCats) {
      const items = _index.get(name)
      if (items) pool = pool.concat(items)
    }

    if (pool.length === 0) {
      return new Response(JSON.stringify({
        error: `No items found for category: ${categoryParam}`,
        availableCategories: _categories.map(c => c.name),
      }), { status: 404, headers: { "content-type": "application/json; charset=utf-8" } })
    }

    const item = pickRandom(pool)
    const targetUrl = quality === "raw" ? item.rawUrl : item.displayUrl

    if (typeParam === "json") {
      return new Response(JSON.stringify({
        success: true,
        url: targetUrl,
        raw_url: item.rawUrl,
        display_url: item.displayUrl,
        cover_url: item.coverUrl,
        source: item.source,
        type: item.type,
        quality,
      }), { status: 200, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-cache" } })
    }

    if (targetUrl) {
      return Response.redirect(targetUrl, 302)
    }

    return new Response(JSON.stringify({ error: "Unable to resolve image URL" }), { status: 500, headers: { "content-type": "application/json; charset=utf-8" } })
  } catch (err) {
    return new Response(JSON.stringify({ error: "Internal server error", detail: err.message }), { status: 500, headers: { "content-type": "application/json; charset=utf-8" } })
  }
}
