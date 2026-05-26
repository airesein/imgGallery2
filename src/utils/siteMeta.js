const DEFAULT_SITE_NAME = 'Ziworld'
const DEFAULT_THEME_COLOR = '#fcfbfa'

function cleanText(value, fallback = '') {
  if (typeof value !== 'string') return fallback
  const trimmed = value.trim()
  return trimmed || fallback
}

function joinKeywords(...parts) {
  return [...new Set(parts
    .flatMap(part => String(part || '').split(','))
    .map(part => part.trim())
    .filter(Boolean))]
    .join(', ')
}

export function getSiteName(siteConfig = {}) {
  return cleanText(siteConfig.name, DEFAULT_SITE_NAME)
}

export function getSiteTitle(siteConfig = {}) {
  return cleanText(siteConfig.meta?.title, getSiteName(siteConfig))
}

export function getSiteDescription(siteConfig = {}) {
  return cleanText(siteConfig.meta?.description, cleanText(siteConfig.description, '我的图库'))
}

export function getSiteKeywords(siteConfig = {}) {
  return cleanText(siteConfig.keywords, 'gallery, images')
}

export function getSiteThemeColor(siteConfig = {}) {
  return cleanText(siteConfig.meta?.themeColor, DEFAULT_THEME_COLOR)
}

export function getSiteFavicon(siteConfig = {}) {
  return cleanText(siteConfig.favicon, '/favicon.ico')
}

export function resolveSiteUrl(siteConfig = {}, pathname = '/') {
  const base = cleanText(siteConfig.url)
  if (!base) return ''
  try {
    return new URL(pathname, base.endsWith('/') ? base : `${base}/`).href
  } catch {
    return ''
  }
}

export function buildHomeMeta(siteConfig = {}) {
  const title = getSiteTitle(siteConfig)
  const description = getSiteDescription(siteConfig)
  const ogImage = cleanText(siteConfig.meta?.ogImage)
  return {
    title,
    description,
    keywords: getSiteKeywords(siteConfig),
    ogTitle: title,
    ogDescription: description,
    ogImage,
    twitterTitle: title,
    twitterDescription: description,
    twitterImage: ogImage,
    canonicalUrl: resolveSiteUrl(siteConfig, '/'),
    themeColor: getSiteThemeColor(siteConfig),
    favicon: getSiteFavicon(siteConfig),
  }
}

export function buildCategoryMeta(siteConfig = {}, categoryName, cover = '') {
  const safeCategoryName = cleanText(categoryName, '分类')
  const siteTitle = getSiteTitle(siteConfig)
  const description = `${safeCategoryName}壁纸`
  const ogImage = cleanText(cover, cleanText(siteConfig.meta?.ogImage))
  return {
    title: `${safeCategoryName} - ${siteTitle}`,
    description,
    keywords: joinKeywords(safeCategoryName, `${safeCategoryName}壁纸`, getSiteKeywords(siteConfig)),
    ogTitle: `${safeCategoryName} - ${siteTitle}`,
    ogDescription: description,
    ogImage,
    twitterTitle: `${safeCategoryName} - ${siteTitle}`,
    twitterDescription: description,
    twitterImage: ogImage,
    canonicalUrl: resolveSiteUrl(siteConfig, `/category/${encodeURIComponent(safeCategoryName)}/`),
    themeColor: getSiteThemeColor(siteConfig),
    favicon: getSiteFavicon(siteConfig),
  }
}

export function buildFavoritesMeta(siteConfig = {}) {
  const siteTitle = getSiteTitle(siteConfig)
  const description = '收藏壁纸'
  const ogImage = cleanText(siteConfig.meta?.ogImage)
  return {
    title: `收藏 - ${siteTitle}`,
    description,
    keywords: joinKeywords('收藏', '收藏壁纸', getSiteKeywords(siteConfig)),
    ogTitle: `收藏 - ${siteTitle}`,
    ogDescription: description,
    ogImage,
    twitterTitle: `收藏 - ${siteTitle}`,
    twitterDescription: description,
    twitterImage: ogImage,
    canonicalUrl: resolveSiteUrl(siteConfig, '/favorites/'),
    themeColor: getSiteThemeColor(siteConfig),
    favicon: getSiteFavicon(siteConfig),
  }
}

function upsertMeta(selector, create) {
  let node = document.head.querySelector(selector)
  if (!node) {
    node = create()
    document.head.appendChild(node)
  }
  return node
}

export function applyPageMeta(meta = {}) {
  if (typeof document === 'undefined') return

  if (meta.title) document.title = meta.title

  const namedMeta = {
    description: meta.description,
    keywords: meta.keywords,
    'theme-color': meta.themeColor,
    'twitter:title': meta.twitterTitle || meta.ogTitle || meta.title,
    'twitter:description': meta.twitterDescription || meta.ogDescription || meta.description,
    'twitter:image': meta.twitterImage || meta.ogImage,
  }

  for (const [name, content] of Object.entries(namedMeta)) {
    if (!content) continue
    const node = upsertMeta(`meta[name="${name}"]`, () => {
      const el = document.createElement('meta')
      el.setAttribute('name', name)
      return el
    })
    node.setAttribute('content', content)
  }

  const propertyMeta = {
    'og:title': meta.ogTitle || meta.title,
    'og:description': meta.ogDescription || meta.description,
    'og:image': meta.ogImage,
    'og:url': meta.canonicalUrl,
    'og:type': 'website',
  }

  for (const [property, content] of Object.entries(propertyMeta)) {
    if (!content) continue
    const node = upsertMeta(`meta[property="${property}"]`, () => {
      const el = document.createElement('meta')
      el.setAttribute('property', property)
      return el
    })
    node.setAttribute('content', content)
  }

  if (meta.favicon) {
    const icon = upsertMeta('link[rel="icon"]', () => {
      const el = document.createElement('link')
      el.setAttribute('rel', 'icon')
      return el
    })
    icon.setAttribute('href', meta.favicon)
  }

  if (meta.canonicalUrl) {
    const canonical = upsertMeta('link[rel="canonical"]', () => {
      const el = document.createElement('link')
      el.setAttribute('rel', 'canonical')
      return el
    })
    canonical.setAttribute('href', meta.canonicalUrl)
  }
}
