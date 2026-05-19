import { ref } from 'vue'

const STORAGE_KEY = 'gallery-favorites'

function load() {
  try {
    const data = localStorage.getItem(STORAGE_KEY)
    return data ? JSON.parse(data) : []
  } catch {
    return []
  }
}

function save(items) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
}

// Shared singleton so all views stay in sync.
const favorites = ref(load())

export function useFavorites() {
  function add(item) {
    if (!favorites.value.some(f => f.id === item.id && f.source === item.source)) {
      favorites.value.push({
        id: item.id,
        source: item.source,
        type: item.type,
      })
      save(favorites.value)
    }
  }

  function remove(item) {
    favorites.value = favorites.value.filter(f => !(f.id === item.id && f.source === item.source))
    save(favorites.value)
  }

  function isFav(item) {
    return favorites.value.some(f => f.id === item.id && f.source === item.source)
  }

  function toggle(item) {
    isFav(item) ? remove(item) : add(item)
  }

  function reload() {
    favorites.value = load()
  }

  return { favorites, add, remove, isFav, toggle, reload }
}
