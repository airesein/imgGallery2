import { ref, watch } from 'vue'

const STORAGE_KEY = 'gallery-settings'
const USER_DEFAULTS_KEY = 'gallery-user-defaults'

const baseDefaults = { cardGap: 10, columns: 0 }
let defaults = { ...baseDefaults }

function loadUserDefaults() {
  try {
    const raw = localStorage.getItem(USER_DEFAULTS_KEY)
    return raw ? JSON.parse(raw) : null
  } catch { return null }
}

function loadSettings() {
  const userDefs = loadUserDefaults() || {}
  const merged = { ...defaults, ...userDefs }
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { ...merged }
    return { ...merged, ...JSON.parse(raw) }
  } catch { return { ...merged } }
}

function saveSettings(s) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(s)) } catch {}
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

function saveAsDefaults() {
  const toSave = { cardGap: settings.value.cardGap, columns: settings.value.columns }
  localStorage.setItem(USER_DEFAULTS_KEY, JSON.stringify(toSave))
}

function applySiteDefaults(cfg) {
  if (cfg.defaultCardGap !== undefined) defaults.cardGap = cfg.defaultCardGap
  if (cfg.defaultColumns !== undefined) defaults.columns = cfg.defaultColumns
  settings.value = loadSettings()
}

watch(
  () => settings.value.cardGap,
  (gap) => { document.documentElement.style.setProperty('--card-gap', `${gap}px`) },
  { immediate: true }
)

watch(
  () => settings.value.columns,
  (cols) => { document.documentElement.style.setProperty('--column-count', cols > 0 ? cols : 'auto') },
  { immediate: true }
)

export function useSettings() {
  return { settings, set, reset, saveAsDefaults, applySiteDefaults, defaults }
}
