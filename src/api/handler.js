import { readFile } from "node:fs/promises"
import { resolve } from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = fileURLToPath(new URL(".", import.meta.url))
const CATALOG_PATH = resolve(__dirname, "../../public/catalog.json")

let _catalog = null
let _flatIndex = null

async function loadCatalog() {
  if (_catalog) return _catalog
  const raw = await readFile(CATALOG_PATH, "utf-8")
  _catalog = JSON.parse(raw)
  return _catalog
}

function buildFlatIndex(catalog) {
  if (_flatIndex) return _flatIndex
  _flatIndex = new Map()
  for (const cat of catalog.categories) {
    const items = []
    for (const group of cat.items) {
      for (const id of group.ids) {
        items.push({ source: group.source, type: group.type || "image", id })
      }
    }
    _flatIndex.set(cat.name, items)
  }
  return _flatIndex
}

function applyUrl(template, id) {
  return template.replace(/\{\{id\}\}/g, id)
}

function getRawUrl(item, rules) {
  const rule = rules[item.source]
  if (!rule?.raw) return null
  return applyUrl(rule.raw, item.id)
}

function getDisplayUrl(item, rules) {
  const rule = rules[item.source]
  if (!rule) return null
  return applyUrl(rule.display || rule.cover, item.id)
}

function getCoverUrl(item, rules) {
  const rule = rules[item.source]
  if (!rule?.cover) return null
  return applyUrl(rule.cover, item.id)
}

function isValidUrl(str) {
  try { new URL(str); return true } catch { return false }
}

export async function handleApiRequest({ catalog: providedCatalog, searchParams }) {
  try {
    const catalog = providedCatalog || (await loadCatalog())
    const rules = catalog.rules || {}
    const categories = catalog.categories || []
    const flat = buildFlatIndex(catalog)

    const query = searchParams || {}
    const categoryParam = query.category
    const typeParam = query.type

    if (!categoryParam) {
      return {
        status: 400,
        headers: { "content-type": "application/json; charset=utf-8" },
        body: JSON.stringify({
          error: "Missing required parameter: category",
          hint: "Usage: /api?category=CategoryName&type=json",
          availableCategories: categories.map(c => c.name),
        }),
      }
    }

    const requestedCats = categoryParam.split(",").map(s => s.trim()).filter(Boolean)

    const pool = []
    for (const name of requestedCats) {
      const items = flat.get(name)
      if (items && items.length > 0) pool.push(...items)
    }

    if (pool.length === 0) {
      return {
        status: 404,
        headers: { "content-type": "application/json; charset=utf-8" },
        body: JSON.stringify({ error: `No items found for category: ${categoryParam}`, availableCategories: categories.map(c => c.name) }),
      }
    }

    const item = pool[Math.floor(Math.random() * pool.length)]
    const rawUrl = getRawUrl(item, rules)
    const displayUrl = getDisplayUrl(item, rules)
    const coverUrl = getCoverUrl(item, rules)

    if (typeParam === "json") {
      return {
        status: 200,
        headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-cache" },
        body: JSON.stringify({ success: true, url: rawUrl, display_url: displayUrl, cover_url: coverUrl, source: item.source, type: item.type }),
      }
    }

    if (rawUrl && isValidUrl(rawUrl)) {
      return { status: 302, headers: { location: rawUrl, "cache-control": "no-cache" } }
    }

    return { status: 500, headers: { "content-type": "application/json; charset=utf-8" }, body: JSON.stringify({ error: "Unable to resolve image URL" }) }
  } catch (err) {
    return { status: 500, headers: { "content-type": "application/json; charset=utf-8" }, body: JSON.stringify({ error: "Internal server error", detail: err.message }) }
  }
}
