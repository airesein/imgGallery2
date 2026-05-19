import { ref, watch } from 'vue'

const STORAGE_KEY = 'gallery-settings'
const defaults = {
  cardGap: 10,
  columns: 0,
}

function loadSettings() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { ...defaults }
    const parsed = JSON.parse(raw)
    return {
      cardGap: typeof parsed.cardGap === 'number' ? parsed.cardGap : defaults.cardGap,
      columns: typeof parsed.columns === 'number' ? parsed.columns : defaults.columns,
    }
  } catch {
    return { ...defaults }
  }
}

function saveSettings(s) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s))
  } catch {}
}

const settings = ref(loadSettings())

function set(key, value) {
  settings.value = { ...settings.value, [key]: value }
  saveSettings(settings.value)
}

function reset() {
  settings.value = { ...defaults }
  saveSettings(settings.value)
}

watch(
  () => settings.value.cardGap,
  (gap) => {
    document.documentElement.style.setProperty('--card-gap', `${gap}px`)
  },
  { immediate: true }
)

watch(
  () => settings.value.columns,
  (cols) => {
    document.documentElement.style.setProperty('--column-count', cols > 0 ? cols : 'auto')
  },
  { immediate: true }
)

export function useSettings() {
  return { settings, set, reset, defaults }
}

export function getColumnCount() {
  const width = window.innerWidth
  if (width <= 560) return 1
  if (width <= 900) return 2
  if (width <= 1400) return 3
  return 4
}
