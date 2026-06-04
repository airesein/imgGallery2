export default async function handler(req, res) {
  const json = (data, status = 200) => {
    res.setHeader("access-control-allow-origin", "*")
    res.setHeader("content-type", "application/json; charset=utf-8")
    if (status !== 200) res.statusCode = status
    res.end(JSON.stringify(data))
  }

  try {
    const url = new URL(req.url, `http://${req.headers.host || "localhost"}`)
    const categoryParam = url.searchParams.get("category")
    const typeParam = url.searchParams.get("type")
    const quality = url.searchParams.get("quality") || "display"

    const catalogRes = await fetch(`https://${req.headers.host}/catalog.json`)
    if (!catalogRes.ok) return json({ error: "Catalog not available" }, 500)
    const catalog = await catalogRes.json()
    const rules = catalog.rules || {}
    const categories = catalog.categories || []

    if (!categoryParam) return json({ error: "Missing category", availableCategories: categories.map(c => c.name) }, 400)

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

    if (!pool.length) return json({ error: "No items found", availableCategories: categories.map(c => c.name) }, 404)

    const item = pool[Math.floor(Math.random() * pool.length)]
    const targetUrl = quality === "raw" ? item.rawUrl : item.displayUrl

    if (typeParam === "json") return json({ success: true, url: targetUrl, raw_url: item.rawUrl, display_url: item.displayUrl, cover_url: item.coverUrl, source: item.source, type: item.type, quality })
    if (targetUrl) { res.writeHead(302, { location: targetUrl }); return res.end() }
    return json({ error: "Unable to resolve" }, 500)
  } catch (err) {
    return json({ error: "Internal error", detail: err.message }, 500)
  }
}
