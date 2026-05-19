import JSZip from 'jszip'

function getExtension(item, contentType = '') {
  const rawName = item.raw?.split('?')[0]?.split('/').pop() || ''
  const rawExt = rawName.includes('.') ? rawName.split('.').pop() : ''
  if (rawExt) return rawExt
  if (contentType.includes('png')) return 'png'
  if (contentType.includes('webp')) return 'webp'
  if (contentType.includes('gif')) return 'gif'
  if (contentType.includes('mp4')) return 'mp4'
  return 'jpg'
}

function getFileName(item, index, contentType) {
  const ext = getExtension(item, contentType)
  const safeId = String(item.id || `item-${index + 1}`).replace(/[\\/:*?"<>|]/g, '_')
  return `${index + 1}-${safeId}.${ext}`
}

export async function downloadItemsAsZip(items, zipName = 'gallery-download', onProgress = null, getItemUrl = null) {
  const zip = new JSZip()
  const failures = []
  const total = items.length

  for (let i = 0; i < total; i++) {
    const item = items[i]
    const rawUrl = getItemUrl ? getItemUrl(item, 'raw') : item.raw
    try {
      const response = await fetch(rawUrl, {
        mode: 'cors',
        credentials: 'omit',
        referrerPolicy: 'no-referrer',
      })
      if (!response.ok) throw new Error(`HTTP_${response.status}`)
      const blob = await response.blob()
      if (!blob || blob.size === 0) throw new Error('EMPTY_BLOB')
      zip.file(getFileName(item, i, response.headers.get('content-type') || ''), blob)
    } catch (error) {
      failures.push({ item, error })
    }
    if (onProgress) onProgress(i + 1, total, failures.length)
  }

  if (Object.keys(zip.files).length === 0) {
    throw new Error('NO_FILES_ADDED')
  }

  if (onProgress) onProgress(total, total, failures.length, 'generating')

  const blob = await zip.generateAsync({ type: 'blob' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = `${zipName}.zip`
  document.body.appendChild(anchor)
  anchor.click()
  document.body.removeChild(anchor)
  URL.revokeObjectURL(url)

  return failures
}
