import { readFileSync, writeFileSync, mkdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import yaml from 'js-yaml'

const __dirname = dirname(fileURLToPath(import.meta.url))
const rootDir = join(__dirname, '..')
const distDir = join(rootDir, 'dist')
const publicDir = join(rootDir, 'public')

const template = readFileSync(join(distDir, 'index.html'), 'utf-8')
const siteConfig = yaml.load(readFileSync(join(publicDir, 'config.yml'), 'utf-8'))
const catalog = JSON.parse(readFileSync(join(publicDir, 'catalog.json'), 'utf-8'))

function esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

const META = {
  title: ['<title>图片视频展示</title>', v => `<title>${esc(v)}</title>`],
  description: ['<meta name="description" content="静态图片/视频画廊展示站">', v => `<meta name="description" content="${esc(v)}">`],
  keywords: ['<meta name="keywords" content="gallery, images, photos">', v => `<meta name="keywords" content="${esc(v)}">`],
  themeColor: ['<meta name="theme-color" content="#0d0d0d">', v => `<meta name="theme-color" content="${esc(v)}">`],
  ogTitle: ['<meta property="og:title" content="画廊">', v => `<meta property="og:title" content="${esc(v)}">`],
  ogDescription: ['<meta property="og:description" content="静态图片/视频画廊展示站">', v => `<meta property="og:description" content="${esc(v)}">`],
  twitterTitle: ['<meta name="twitter:title" content="画廊">', v => `<meta name="twitter:title" content="${esc(v)}">`],
  twitterDescription: ['<meta name="twitter:description" content="静态图片/视频画廊展示站">', v => `<meta name="twitter:description" content="${esc(v)}">`],
}

function fixAssetPaths(html, depth) {
  if (depth === 0) return html
  const prefix = '../'.repeat(depth)
  return html.replace(/(src|href)="\.\/assets\//g, `$1="${prefix}assets/`)
}

function generatePage(template, opts) {
  let html = template
  const { title, description, keywords, ogTitle, ogDescription, ogImage, themeColor, depth = 0 } = opts
  html = fixAssetPaths(html, depth)
  html = html.replace(META.title[0], META.title[1](title))
  html = html.replace(META.description[0], META.description[1](description))
  html = html.replace(META.keywords[0], META.keywords[1](keywords || 'gallery, images, photos'))
  html = html.replace(META.themeColor[0], META.themeColor[1](themeColor || '#fcfbfa'))
  html = html.replace(META.ogTitle[0], META.ogTitle[1](ogTitle || title))
  html = html.replace(META.ogDescription[0], META.ogDescription[1](ogDescription || description))
  html = html.replace(META.twitterTitle[0], META.twitterTitle[1](ogTitle || title))
  html = html.replace(META.twitterDescription[0], META.twitterDescription[1](ogDescription || description))
  if (ogImage) {
    html = html.replace('<meta property="og:type" content="website">', `<meta property="og:image" content="${esc(ogImage)}">\n  <meta property="og:type" content="website">`)
  }
  return html
}

updateMain()

let count = 2
for (const cat of catalog.categories || []) {
  const name = cat.name
  const title = `${name}壁纸「Ziworld」`
  const desc = `${name}精美 4K 壁纸，二次元小窝「Ziworld」`
  const html = generatePage(template, {
    title,
    description: desc,
    keywords: `${name}, 壁纸, ziworld`,
    ogTitle: title,
    ogDescription: desc,
    ogImage: cat.cover || '',
    themeColor: '#fcfbfa',
    depth: 1,
  })
  const dir = join(distDir, 'category', name)
  mkdirSync(dir, { recursive: true })
  writeFileSync(join(dir, 'index.html'), html)
  count++
}

{
  const dir = join(distDir, 'favorites')
  mkdirSync(dir, { recursive: true })
  writeFileSync(join(dir, 'index.html'), generatePage(template, {
    title: '收藏壁纸「Ziworld」',
    description: '收藏的精美 4K 壁纸，二次元小窝「Ziworld」',
    keywords: '收藏, 壁纸, ziworld',
    ogTitle: '收藏壁纸「Ziworld」',
    ogDescription: '收藏的精美 4K 壁纸，二次元小窝「Ziworld」',
    ogImage: '',
    themeColor: '#fcfbfa',
    depth: 1,
  }))
}

function updateMain() {
  const name = siteConfig.name || 'Ziworld'
  const meta = siteConfig.meta || {}
  writeFileSync(join(distDir, 'index.html'), generatePage(template, {
    title: meta.title || name,
    description: meta.description || siteConfig.description || '我的图库',
    keywords: siteConfig.keywords || 'ziworld, images',
    ogTitle: meta.title || name,
    ogDescription: meta.description || siteConfig.description || '我的图库',
    ogImage: meta.ogImage || '',
    themeColor: meta.themeColor || '#fcfbfa',
  }))
}

console.log(`Generated ${count} static pages`)
