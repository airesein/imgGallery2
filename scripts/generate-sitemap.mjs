import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.resolve(__dirname, '..')
const catalogPath = path.join(rootDir, 'public', 'catalog.json')
const configPath = path.join(rootDir, 'public', 'site-config.json')
const sitemapPath = path.join(rootDir, 'public', 'sitemap.xml')

// 确定站点 URL：site-config.json > SITE_URL 环境变量 > 占位符
function resolveSiteUrl() {
  if (process.env.SITE_URL) return process.env.SITE_URL.replace(/\/+$/, '')
  try {
    if (fs.existsSync(configPath)) {
      const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'))
      if (config.url) return config.url.replace(/\/+$/, '')
    }
  } catch {}
  // 无法确定 URL 时输出警告，但仍生成占位文件
  console.warn('Warning: SITE_URL not set. Set site-config.json "url" or SITE_URL env.')
  return 'https://example.com'
}

// 读取 catalog
let categories = []
try {
  const catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf-8'))
  categories = catalog.categories || []
} catch (e) {
  console.error('Failed to read catalog.json, run "npm run generate" first')
  process.exit(1)
}

const SITE_URL = resolveSiteUrl()

// 构建 URL 列表
const urls = [
  { loc: '/', priority: '1.0', changefreq: 'weekly' },
  { loc: '/favorites', priority: '0.3', changefreq: 'monthly' },
]

for (const cat of categories) {
  urls.push({
    loc: `/category/${encodeURIComponent(cat.name)}`,
    priority: '0.8',
    changefreq: 'weekly',
  })
}

// 按路径排序
urls.sort((a, b) => a.loc.localeCompare(b.loc))

// 生成 XML (手动拼接避免额外依赖)
const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(u => `  <url>
    <loc>${SITE_URL}${u.loc}</loc>
    <priority>${u.priority}</priority>
    <changefreq>${u.changefreq}</changefreq>
  </url>`).join('\n')}
</urlset>
`

fs.writeFileSync(sitemapPath, xml, 'utf-8')
console.log(`Generated sitemap: ${urls.length} URLs (${sitemapPath})`)