import { ref } from 'vue'

const SW_KEY = 'sw-cache-enabled'

const pendingMessages = []
let ready = false
let activeWorker = null
const isReady = ref(false)
const isEnabled = ref(true)
const stats = ref({ itemCount: 0, byLevel: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, other: 0 } })

let messageHandler = null

function loadEnabled() {
  try {
    const v = localStorage.getItem(SW_KEY)
    return v !== null ? v === 'true' : true
  } catch {
    return true
  }
}

function saveEnabled(v) {
  try {
    localStorage.setItem(SW_KEY, v ? 'true' : 'false')
  } catch {}
}

function flushPending() {
  while (pendingMessages.length) {
    const msg = pendingMessages.shift()
    if (activeWorker) activeWorker.postMessage(msg)
    else if (navigator.serviceWorker.controller) navigator.serviceWorker.controller.postMessage(msg)
  }
}

function resolveReady() {
  if (ready) return
  ready = true
  isReady.value = true
  flushPending()
}

function waitReady() {
  return new Promise((resolve) => {
    if (ready) { resolve(); return }
    const check = setInterval(() => {
      if (ready) { clearInterval(check); resolve() }
    }, 50)
  })
}

function registerMessageHandler() {
  if (messageHandler) return
  messageHandler = (e) => {
    const msg = e.data
    if (!msg || !msg.type) return
    switch (msg.type) {
      case 'init-ack': resolveReady(); break
      case 'cache-stats': if (msg.data) stats.value = msg.data; break
    }
  }
  navigator.serviceWorker.addEventListener('message', messageHandler)
}

export function useSwCache() {
  async function init() {
    if (!('serviceWorker' in navigator)) return
    registerMessageHandler()
    try {
      const registration = await navigator.serviceWorker.ready
      activeWorker = registration.active
      if (!activeWorker) activeWorker = navigator.serviceWorker.controller
      const enabled = loadEnabled()
      isEnabled.value = enabled
      pendingMessages.push({ type: 'init', enabled })
      flushPending()
    } catch (e) {
      console.error('SW init failed:', e)
    }
  }

  async function setPriority(urls, level) {
    if (!Array.isArray(urls) || urls.length === 0) return
    await waitReady()
    const msg = { type: 'set-priority', urls, level }
    if (activeWorker) activeWorker.postMessage(msg)
    else if (navigator.serviceWorker.controller) navigator.serviceWorker.controller.postMessage(msg)
    else pendingMessages.push(msg)
  }

  async function removePriority(urls) {
    if (!Array.isArray(urls) || urls.length === 0) return
    await waitReady()
    const msg = { type: 'remove-priority', urls }
    if (activeWorker) activeWorker.postMessage(msg)
    else if (navigator.serviceWorker.controller) navigator.serviceWorker.controller.postMessage(msg)
    else pendingMessages.push(msg)
  }

  async function clearCache() {
    await waitReady()
    const msg = { type: 'clear-cache' }
    if (activeWorker) activeWorker.postMessage(msg)
    else if (navigator.serviceWorker.controller) navigator.serviceWorker.controller.postMessage(msg)
    else pendingMessages.push(msg)
    stats.value = { itemCount: 0, byLevel: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, other: 0 } }
  }

  async function refreshStats() {
    await waitReady()
    const msg = { type: 'get-stats' }
    if (activeWorker) activeWorker.postMessage(msg)
    else if (navigator.serviceWorker.controller) navigator.serviceWorker.controller.postMessage(msg)
    else pendingMessages.push(msg)
  }

  async function enable() {
    isEnabled.value = true
    saveEnabled(true)
    await waitReady()
    const msg = { type: 'set-enabled', enabled: true }
    if (activeWorker) activeWorker.postMessage(msg)
    else if (navigator.serviceWorker.controller) navigator.serviceWorker.controller.postMessage(msg)
    else pendingMessages.push(msg)
  }

  async function disable() {
    isEnabled.value = false
    saveEnabled(false)
    await waitReady()
    const msg = { type: 'set-enabled', enabled: false }
    if (activeWorker) activeWorker.postMessage(msg)
    else if (navigator.serviceWorker.controller) navigator.serviceWorker.controller.postMessage(msg)
    else pendingMessages.push(msg)
  }

  return { isReady, isEnabled, stats, init, setPriority, removePriority, clearCache, refreshStats, enable, disable }
}
