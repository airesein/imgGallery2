import { readFileSync, writeFileSync, mkdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import yaml from 'js-yaml'
import { buildHomeMeta, buildCategoryMeta, buildFavoritesMeta } from '../src/utils/siteMeta.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const rootDir = join(__dirname, '..')
const distDir = join(rootDir, 'dist')
const publicDir = join(rootDir, 'public')

const template = readFileSync(join(distDir, 'index.html'), 'utf-8')
const siteConfig = yaml.load(readFileSync(join(publicDir, 'config.yml'), 'utf-8')) || {}
const catalog = JSON.parse(readFileSync(join(publicDir, 'catalog.json'), 'utf-8'))

function esc(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function upsertTag(html, matcher, tag) {
  return matcher.test(html) ? html.replace(matcher, tag) : html.replace('</head>', `  ${tag}\n</head>`)
}

function withMeta(html, meta) {
  let next = html

  const replacements = [
    [/<title>[\s\S]*?<\/title>/i, `<title>${esc(meta.title)}</title>`],
    [/<meta\s+name="description"\s+content="[^"]*"\s*\/?>/i, `<meta name="description" content="${esc(meta.description)}">`],
    [/<meta\s+name="keywords"\s+content="[^"]*"\s*\/?>/i, `<meta name="keywords" content="${esc(meta.keywords)}">`],
    [/<meta\s+name="theme-color"\s+content="[^"]*"\s*\/?>/i, `<meta name="theme-color" content="${esc(meta.themeColor)}">`],
    [/<meta\s+property="og:title"\s+content="[^"]*"\s*\/?>/i, `<meta property="og:title" content="${esc(meta.ogTitle)}">`],
    [/<meta\s+property="og:description"\s+content="[^"]*"\s*\/?>/i, `<meta property="og:description" content="${esc(meta.ogDescription)}">`],
    [/<meta\s+property="og:type"\s+content="[^"]*"\s*\/?>/i, '<meta property="og:type" content="website">'],
    [/<meta\s+property="og:image"\s+content="[^"]*"\s*\/?>/i, `<meta property="og:image" content="${esc(meta.ogImage || '')}">`],
    [/<meta\s+property="og:url"\s+content="[^"]*"\s*\/?>/i, `<meta property="og:url" content="${esc(meta.canonicalUrl || '')}">`],
    [/<meta\s+name="twitter:card"\s+content="[^"]*"\s*\/?>/i, '<meta name="twitter:card" content="summary_large_image">'],
    [/<meta\s+name="twitter:title"\s+content="[^"]*"\s*\/?>/i, `<meta name="twitter:title" content="${esc(meta.twitterTitle)}">`],
    [/<meta\s+name="twitter:description"\s+content="[^"]*"\s*\/?>/i, `<meta name="twitter:description" content="${esc(meta.twitterDescription)}">`],
    [/<meta\s+name="twitter:image"\s+content="[^"]*"\s*\/?>/i, `<meta name="twitter:image" content="${esc(meta.twitterImage || '')}">`],
    [/<link\s+rel="canonical"\s+href="[^"]*"\s*\/?>/i, `<link rel="canonical" href="${esc(meta.canonicalUrl || '')}">`],
    [/<link\s+rel="icon"\s+href="[^"]*"\s*\/?>/i, `<link rel="icon" href="${esc(meta.favicon)}">`],
  ]

  for (const [matcher, tag] of replacements) {
    next = upsertTag(next, matcher, tag)
  }

  return next
}

function writeHtml(relativeDir, meta) {
  const targetDir = join(distDir, relativeDir)
  mkdirSync(targetDir, { recursive: true })
  writeFileSync(join(targetDir, 'index.html'), withMeta(template, meta))
}

writeFileSync(join(distDir, 'index.html'), withMeta(template, buildHomeMeta(siteConfig)))

for (const category of catalog.categories || []) {
  writeHtml(join('category', category.name), buildCategoryMeta(siteConfig, category.name, category.cover))
}

writeHtml('favorites', buildFavoritesMeta(siteConfig))

console.log(`Generated ${1 + (catalog.categories?.length || 0) + 1} static pages`)
