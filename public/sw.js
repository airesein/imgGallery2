const CACHE_NAME = 'img-cache-v1'
const MAX_ITEMS = 2000
const TRIM_TARGET = 1500

const IMAGE_HOSTS = [
  'imglf5.lf127.net',
  'imglf6.lf127.net',
  'c-ssl.dtstatic.com',
  'c-ssl.duitang.com',
  'p.ananas.chaoxing.com',
  'previewengine.zoho.com.cn',
  'files.zohopublic.com.cn',
]

const priorityMap = new Map()
const metaMap = new Map()
let isEnabled = true

function isImageRequest(url) {
  try { return IMAGE_HOSTS.includes(new URL(url).hostname) }
  catch { return false }
}

function cleanUrl(url) {
  try {
    const u = new URL(url)
    u.searchParams.delete('_retry')
    return u.toString()
  } catch { return url }
}

self.addEventListener('install', (e) => { self.skipWaiting() })

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    await clients.claim()
    await buildMetaFromCache()
  })())
})

async function buildMetaFromCache() {
  const cache = await caches.open(CACHE_NAME)
  const requests = await cache.keys()
  const seen = new Set()
  for (const req of requests) {
    const url = cleanUrl(req.url)
    if (seen.has(url)) continue
    seen.add(url)
    const existing = metaMap.get(url)
    const level = existing?.level || 99
    metaMap.set(url, { url, timestamp: existing?.timestamp || Date.now(), level })
  }
  for (const [url] of metaMap) {
    if (!seen.has(url)) metaMap.delete(url)
  }
}

self.addEventListener('fetch', (e) => {
  if (!isEnabled) return
  if (!isImageRequest(e.request.url)) return
  e.respondWith(cacheFirst(e.request))
})

async function cacheFirst(request) {
  const cached = await caches.match(request)
  if (cached) {
    const url = cleanUrl(request.url)
    const existing = metaMap.get(url)
    const level = priorityMap.get(url)?.level || existing?.level || 99
    metaMap.set(url, { url, timestamp: Date.now(), level })
    return cached
  }
  const response = await fetch(request)
  if (!response.ok && response.type !== 'opaque') return response
  const cache = await caches.open(CACHE_NAME)
  const url = cleanUrl(request.url)
  const cleanRequest = new Request(url, request)
  try {
    await cache.put(cleanRequest, response.clone())
    const level = priorityMap.get(url)?.level || 99
    metaMap.set(url, { url, timestamp: Date.now(), level })
    if (metaMap.size > MAX_ITEMS) trimCache()
  } catch (e) { console.error('SW cache put failed:', e) }
  return response
}

async function trimCache() {
  const entries = [...metaMap.entries()]
    .map(([url, m]) => ({ url, ...m }))
    .sort((a, b) => {
      if (a.level !== b.level) return b.level - a.level
      return a.timestamp - b.timestamp
    })
  const cache = await caches.open(CACHE_NAME)
  for (const entry of entries) {
    if (metaMap.size <= TRIM_TARGET) break
    const cleanRequest = new Request(entry.url)
    const deleted = await cache.delete(cleanRequest)
    if (deleted) metaMap.delete(entry.url)
  }
  // 兜底同步：如果 metaMap 仍然远大于 TRIM_TARGET，以 cache.keys() 为准重建
  if (metaMap.size > TRIM_TARGET * 1.5) {
    const remaining = await cache.keys()
    const validUrls = new Set()
    for (const req of remaining) {
      validUrls.add(cleanUrl(req.url))
    }
    for (const [url] of metaMap) {
      if (!validUrls.has(url)) metaMap.delete(url)
    }
  }
}

function getPriorityLevel(p) {
  if (p >= 1 && p <= 5) return p
  return 99
}

function getStats() {
  const byLevel = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, other: 0 }
  for (const [, m] of metaMap) {
    const lv = m.level
    if (byLevel[lv] !== undefined) byLevel[lv]++
    else byLevel.other++
  }
  return { itemCount: metaMap.size, byLevel }
}

self.addEventListener('message', (e) => {
  const msg = e.data
  if (!msg || !msg.type) return
  switch (msg.type) {
    case 'init': {
      isEnabled = msg.enabled !== false
      ;(async () => {
        await buildMetaFromCache()
        e.source.postMessage({ type: 'init-ack' })
      })()
      break
    }
    case 'set-enabled': {
      isEnabled = msg.enabled !== false
      break
    }
    case 'set-priority': {
      const level = getPriorityLevel(msg.level)
      const now = Date.now()
      if (msg.urls && Array.isArray(msg.urls)) {
        for (const rawUrl of msg.urls) {
          const url = cleanUrl(rawUrl)
          const cur = priorityMap.get(url)
          if (!cur || level < cur.level) {
            priorityMap.set(url, { level, timestamp: now })
            const m = metaMap.get(url)
            if (m) { m.level = level; m.timestamp = now }
          }
        }
      }
      break
    }
    case 'remove-priority': {
      if (msg.urls && Array.isArray(msg.urls)) {
        for (const rawUrl of msg.urls) {
          const url = cleanUrl(rawUrl)
          priorityMap.delete(url)
          const m = metaMap.get(url)
          if (m && m.level <= 5) { m.level = 99; m.timestamp = Date.now() }
        }
      }
      break
    }
    case 'get-stats': {
      const s = getStats()
      e.source.postMessage({ type: 'cache-stats', data: s })
      break
    }
    case 'clear-cache': {
      ;(async () => {
        const keys = await caches.keys()
        for (const key of keys) {
          if (key.startsWith('img-cache-')) await caches.delete(key)
        }
        metaMap.clear()
        priorityMap.clear()
        e.source.postMessage({ type: 'cache-stats', data: { itemCount: 0, byLevel: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, other: 0 } } })
      })()
      break
    }
  }
})
