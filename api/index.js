export default async function handler(req) {
  try {
    const url = new URL(req.url, `http://${req.headers.host || "localhost"}`)
    const categoryParam = url.searchParams.get("category")
    const typeParam = url.searchParams.get("type")
    const quality = url.searchParams.get("quality") || "display"

    // Fetch catalog from the same origin
    const catalogUrl = `https://${req.headers.host}/catalog.json`
    const catalogRes = await fetch(catalogUrl)
    if (!catalogRes.ok) return new Response(JSON.stringify({ error: "Catalog not available" }), { status: 500, headers: { "content-type": "application/json; charset=utf-8" } })
    const catalog = await catalogRes.json()
    const rules = catalog.rules || {}
    const categories = catalog.categories || []

    if (!categoryParam) {
      return new Response(JSON.stringify({
        error: "Missing required parameter: category",
        hint: "Usage: /api?category=Name&type=json&quality=display|raw",
        availableCategories: categories.map(c => c.name),
      }), { status: 400, headers: { "content-type": "application/json; charset=utf-8" } })
    }

    // Build pool on each request (fast enough, avoids memory bloat)
    const requestedCats = categoryParam.split(",").map(s => s.trim()).filter(Boolean)
    const pool = []
    const applyUrl = (tpl, id) => tpl.replace(/\{\{id\}\}/g, id)
    for (const cat of categories) {
      if (!requestedCats.includes(cat.name)) continue
      for (const group of cat.items) {
        const src = group.source
        const type = group.type || "image"
        const rule = rules[src]
        for (const id of group.ids) {
          pool.push({
            source: src, type, id,
            rawUrl: rule?.raw ? applyUrl(rule.raw, id) : null,
            displayUrl: rule ? applyUrl(rule.display || rule.cover, id) : null,
            coverUrl: rule?.cover ? applyUrl(rule.cover, id) : null,
          })
        }
      }
    }

    if (pool.length === 0) {
      return new Response(JSON.stringify({
        error: `No items found for category: ${categoryParam}`,
        availableCategories: categories.map(c => c.name),
      }), { status: 404, headers: { "content-type": "application/json; charset=utf-8" } })
    }

    const item = pool[Math.floor(Math.random() * pool.length)]
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

    if (targetUrl) return Response.redirect(targetUrl, 302)
    return new Response(JSON.stringify({ error: "Unable to resolve image URL" }), { status: 500, headers: { "content-type": "application/json; charset=utf-8" } })
  } catch (err) {
    return new Response(JSON.stringify({ error: "Internal server error", detail: err.message }), { status: 500, headers: { "content-type": "application/json; charset=utf-8" } })
  }
}
