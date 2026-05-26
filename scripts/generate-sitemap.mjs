import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import yaml from 'js-yaml'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.resolve(__dirname, '..')
const dataDir = path.join(rootDir, 'data')
const catalogPath = path.join(rootDir, 'public', 'catalog.json')
const configPath = path.join(rootDir, 'public', 'config.yml')
const sitemapPath = path.join(rootDir, 'public', 'sitemap.xml')

function resolveSiteUrl() {
  if (process.env.SITE_URL) return process.env.SITE_URL.replace(/\/+$/, '')
  try {
    if (fs.existsSync(configPath)) {
      const cfg = yaml.load(fs.readFileSync(configPath, 'utf-8'))
      if (cfg.url) return cfg.url.replace(/\/+$/, '')
    }
  } catch {}
  console.warn('Warning: SITE_URL not set. Set config.yml "url" or SITE_URL env.')
  return 'https://example.com'
}

function getCategoryLastmod(dirPath) {
  if (!fs.existsSync(dirPath)) return toDateStr(new Date())
  try {
    const files = fs.readdirSync(dirPath)
    let latest = 0
    for (const f of files) {
      if (f === 'readme.md') continue
      const fp = path.join(dirPath, f)
      try {
        const st = fs.statSync(fp)
        if (st.isFile() && st.mtimeMs > latest) latest = st.mtimeMs
      } catch {}
    }
    return toDateStr(latest > 0 ? new Date(latest) : new Date())
  } catch {
    return toDateStr(new Date())
  }
}

function toDateStr(d) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function escapeXml(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;')
}

export function generateSitemap() {
  let categories = []
  try {
    const catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf-8'))
    categories = catalog.categories || []
  } catch (e) {
    console.error('Failed to read catalog.json, run catalog generation first')
    return
  }

  const SITE_URL = resolveSiteUrl()
  let globalLastmod = ''

  const urls = []

  {
    let homepageLatest = ''
    for (const cat of categories) {
      const catDir = path.join(dataDir, cat.name)
      const lm = getCategoryLastmod(catDir)
      if (lm > homepageLatest) homepageLatest = lm
    }
    globalLastmod = homepageLatest
    urls.push({ loc: '/', lastmod: homepageLatest, priority: '1.0', changefreq: 'weekly' })
  }

  urls.push({ loc: '/favorites', lastmod: globalLastmod, priority: '0.3', changefreq: 'monthly' })

  for (const cat of categories) {
    const catDir = path.join(dataDir, cat.name)
    const lastmod = getCategoryLastmod(catDir)
    urls.push({
      loc: `/category/${encodeURIComponent(cat.name)}`,
      lastmod,
      priority: '0.8',
      changefreq: 'weekly',
    })
  }

  urls.sort((a, b) => a.loc.localeCompare(b.loc))

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(u => `  <url>
    <loc>${SITE_URL}${escapeXml(u.loc)}</loc>
    <lastmod>${u.lastmod}</lastmod>
    <priority>${u.priority}</priority>
    <changefreq>${u.changefreq}</changefreq>
  </url>`).join('\n')}
</urlset>
`

  fs.writeFileSync(sitemapPath, xml, 'utf-8')
  console.log(`Generated sitemap: ${urls.length} URLs, lastmod=${globalLastmod}`)
}

const isMain = process.argv[1] &&
  path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url))
if (isMain) {
  generateSitemap()
}
