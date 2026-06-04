import { ref } from 'vue'

const toasts = ref([])
let nextId = 0

export function useToast() {
  function showToast(message, type = 'info') {
    const id = ++nextId
    toasts.value = [...toasts.value, { id, message, type }]
    setTimeout(() => removeToast(id), 2200)
  }

  function removeToast(id) {
    toasts.value = toasts.value.filter(t => t.id !== id)
  }

  return { toasts, showToast, removeToast }
}
