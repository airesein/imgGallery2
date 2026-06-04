import { ref } from 'vue'
import { downloadItemsAsZip } from '../utils/batchDownload.js'

const tasks = ref([])
let _id = 0
const upd = (id, p) => { tasks.value = tasks.value.map(t => t.id === id ? { ...t, ...p } : t) }

export function useDownload() {
  const rm = (id) => { tasks.value = tasks.value.filter(t => t.id !== id) }

  function startSingle(url, fileName, dlType) {
    const id = ++_id
    tasks.value = [...tasks.value, { id, name: fileName, type: 'single',
      progress: 0, total: 1, current: 0, status: 'downloading', cancel: null,
      url, fileName, dlType }]
    _runSingle(id)
  }

  async function _runSingle(id) {
    const t = tasks.value.find(x => x.id === id)
    if (!t) return
    const ct = new AbortController()
    upd(id, { status: 'downloading', progress: 0, cancel: () => ct.abort() })
    try {
      if (t.dlType === 'js') {
        upd(id, { progress: 10 })
        const r = await fetch(t.url, { mode: 'cors', signal: ct.signal })
        if (!r.ok) throw new Error(`HTTP_${r.status}`)
        upd(id, { progress: 60 })
        const blob = await r.blob()
        upd(id, { progress: 80 })
        const a = document.createElement('a')
        const u = URL.createObjectURL(blob)
        a.href = u; a.download = t.fileName
        document.body.appendChild(a); a.click(); document.body.removeChild(a)
        URL.revokeObjectURL(u)
      } else {
        window.open(t.url, '_blank')
      }
      upd(id, { progress: 100, status: 'done' })
      setTimeout(() => rm(id), 2000)
    } catch (e) {
      if (e.name === 'AbortError') { rm(id); return }
      upd(id, { status: 'error' })
    }
  }

  function startBatch(items, getItemUrl, zipName) {
    const id = ++_id
    tasks.value = [...tasks.value, { id, name: zipName, type: 'batch',
      progress: 0, total: items.length, current: 0, status: 'downloading', cancel: null,
      items, getItemUrl, zipName }]
    _runBatch(id)
  }

  async function _runBatch(id) {
    const t = tasks.value.find(x => x.id === id)
    if (!t) return
    const ct = new AbortController()
    upd(id, { status: 'downloading', progress: 0, current: 0, cancel: () => ct.abort() })
    try {
      await downloadItemsAsZip(t.items, t.zipName,
        (p, total, fails, st) => upd(id, { current: p, total, progress: p === total ? 100 : Math.round((p / total) * 100), status: st || 'downloading' }),
        t.getItemUrl, ct.signal)
      if (!ct.signal.aborted) upd(id, { progress: 100, status: 'done' })
      setTimeout(() => rm(id), 3000)
    } catch (e) {
      if (e.name === 'AbortError') { rm(id); return }
      upd(id, { status: 'error' })
    }
  }

  function retry(t) {
    t.type === 'batch' ? _runBatch(t.id) : _runSingle(t.id)
  }

  return { tasks, startSingle, startBatch, retry, rm }
}
