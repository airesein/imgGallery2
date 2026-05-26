import fs from 'fs'
import path from 'path'
import yaml from 'js-yaml'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.resolve(__dirname, '..')
const dataDir = path.join(rootDir, 'data')
const publicDir = path.join(rootDir, 'public')
const catalogPath = path.join(publicDir, 'catalog.json')

export function generateCatalog() {
  const rulesRaw = yaml.load(fs.readFileSync(path.join(rootDir, 'rule.yaml'), 'utf-8'))
  const rules = {}
  for (const rule of rulesRaw) {
    rules[rule.name] = {
      cover: rule.cover || '',
      display: rule.display || '',
      display_video: rule.display_video || '',
      raw: rule.raw || '',
      download: rule.download || 'zj',
    }
  }

  const categories = []
  if (!fs.existsSync(dataDir)) {
    console.warn('Warning: data directory not found, generating empty catalog')
  } else {
    const categoryDirs = fs.readdirSync(dataDir, { withFileTypes: true })
      .filter(d => d.isDirectory())

    for (const dir of categoryDirs) {
      const categoryPath = path.join(dataDir, dir.name)
      const items = []

      let description = ''
      const readmePath = path.join(categoryPath, 'readme.md')
      if (fs.existsSync(readmePath)) {
        description = fs.readFileSync(readmePath, 'utf-8').trim()
      }

      const dataFiles = fs.readdirSync(categoryPath)
        .filter(f => f !== 'readme.md')

      for (const file of dataFiles) {
        const ext = path.extname(file).slice(1)
        if (!rules[ext]) {
          console.warn(`Warning: No rule for extension "${ext}" in "${file}"`)
          continue
        }

        const ids = fs.readFileSync(path.join(categoryPath, file), 'utf-8')
          .split('\n')
          .map(l => l.trim())
          .filter(l => l.length > 0)

        if (ids.length === 0) continue

        const type = rules[ext].display_video ? 'video' : 'image'

        let group = items.find(g => g.source === ext)
        if (!group) {
          group = { source: ext, type, ids: [] }
          items.push(group)
        }
        group.ids.push(...ids)
      }

      if (items.length > 0) {
        const total = items.reduce((sum, g) => sum + g.ids.length, 0)
        const firstGroup = items[0]
        const firstId = firstGroup.ids[0]
        const firstRule = rules[firstGroup.source]
        const cover = (firstRule.cover || '').replace(/\{\{id\}\}/g, firstId)
        categories.push({
          name: dir.name,
          description,
          total,
          cover,
          items,
        })
      }
    }
  }

  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true })
  }

  const output = { rules, categories }
  fs.writeFileSync(catalogPath, JSON.stringify(output))
  const totalItems = categories.reduce((s, c) => s + c.total, 0)
  console.log(`Generated catalog: ${categories.length} categories, ${totalItems} items`)

  return output
}

const isMain = process.argv[1] &&
  path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url))
if (isMain) {
  generateCatalog()
}
