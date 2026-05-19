import { ref } from 'vue'

const rules = ref({})
const catalog = ref(null)
const flatItemsCache = new Map()

function applyUrl(template, id) {
  return template.replace(/\{\{id\}\}/g, id)
}

function getItemUrl(item, type) {
  const rule = rules.value[item.source]
  if (!rule) return ''
  switch (type) {
    case 'cover': return applyUrl(rule.cover, item.id)
    case 'display':
      return applyUrl(rule.display_video || rule.display, item.id)
    case 'raw': return applyUrl(rule.raw, item.id)
    default: return ''
  }
}

function getItemType(item) {
  return item.type || 'image'
}

function getItemDownload(item) {
  const rule = rules.value[item.source]
  return rule?.download || 'zj'
}

function isVideo(item) {
  return getItemType(item) === 'video'
}

function flattenCategory(cat) {
  if (flatItemsCache.has(cat.name)) return flatItemsCache.get(cat.name)
  const flat = []
  for (const group of cat.items) {
    for (const id of group.ids) {
      flat.push({ id, source: group.source, type: group.type })
    }
  }
  flatItemsCache.set(cat.name, flat)
  return flat
}

export function useCatalog() {
  return {
    rules,
    catalog,
    getItemUrl,
    getItemType,
    getItemDownload,
    isVideo,
    flattenCategory,
  }
}
