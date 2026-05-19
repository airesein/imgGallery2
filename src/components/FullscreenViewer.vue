<script setup>
import { ref, computed, onMounted, onUnmounted, watch, inject } from 'vue'

const props = defineProps({ items: Array, currentIndex: Number })
const emit = defineEmits(['close'])

const getItemUrl = inject('getItemUrl')
const isVideoFn = inject('isVideo')

const currentIdx = ref(props.currentIndex)
const displayMode = ref('contain')
const touchStartX = ref(0)
const fullLoaded = ref(false)

const currentItem = computed(() => props.items[currentIdx.value] || null)
const isFirst = computed(() => currentIdx.value === 0)
const isLast = computed(() => currentIdx.value === props.items.length - 1)
const coverUrl = computed(() => currentItem.value ? getItemUrl(currentItem.value, 'cover') : '')
const displayUrl = computed(() => currentItem.value ? getItemUrl(currentItem.value, 'display') : '')
const isVideo = computed(() => currentItem.value ? isVideoFn(currentItem.value) : false)

function prev() {
  if (!isFirst.value) {
    currentIdx.value--
    fullLoaded.value = false
  }
}

function next() {
  if (!isLast.value) {
    currentIdx.value++
    fullLoaded.value = false
  }
}

function toggleMode() {
  displayMode.value = displayMode.value === 'contain' ? 'cover' : 'contain'
}

function exit() {
  try {
    if (document.fullscreenElement) document.exitFullscreen?.()
    else if (document.webkitFullscreenElement) document.webkitExitFullscreen?.()
  } catch {}
  emit('close')
}

function onKey(e) {
  if (e.key === 'ArrowLeft') prev()
  else if (e.key === 'ArrowRight') next()
  else if (e.key === 'Escape') exit()
}

function onTouchStart(e) { touchStartX.value = e.touches[0].clientX }
function onTouchEnd(e) {
  const diff = touchStartX.value - e.changedTouches[0].clientX
  if (Math.abs(diff) > 50) diff > 0 ? next() : prev()
}

function onFSChange() {
  if (!document.fullscreenElement && !document.webkitFullscreenElement) emit('close')
}

function enterFS() {
  const el = document.documentElement
  ;(el.requestFullscreen?.() || el.webkitRequestFullscreen?.())
}

watch(() => props.currentIndex, (i) => {
  if (i >= 0) {
    currentIdx.value = i
    fullLoaded.value = false
  }
})

watch(currentItem, () => {
  fullLoaded.value = false
})

onMounted(() => {
  enterFS()
  document.documentElement.style.overflow = 'hidden'
  document.body.style.overflow = 'hidden'
  document.addEventListener('keydown', onKey)
  document.addEventListener('fullscreenchange', onFSChange)
  document.addEventListener('webkitfullscreenchange', onFSChange)
})

onUnmounted(() => {
  document.documentElement.style.overflow = ''
  document.body.style.overflow = ''
  document.removeEventListener('keydown', onKey)
  document.removeEventListener('fullscreenchange', onFSChange)
  document.removeEventListener('webkitfullscreenchange', onFSChange)
})
</script>

<template>
  <div class="fs-wrap" @click="exit" @touchstart="onTouchStart" @touchend="onTouchEnd">
    <template v-if="!isVideo">
      <img
        :src="coverUrl"
        :class="['fs-media', displayMode, 'fs-cover', { hidden: fullLoaded }]"
        referrerpolicy="no-referrer"
        alt=""
      />
      <img
        :src="displayUrl"
        :class="['fs-media', displayMode, 'fs-full', { loaded: fullLoaded }]"
        referrerpolicy="no-referrer"
        alt=""
        @load="fullLoaded = true"
      />
    </template>
    <video
      v-else-if="currentItem"
      :src="displayUrl"
      :class="['fs-media', displayMode]"
      controls
      autoplay
      @click.stop
    />

    <div class="fs-top" @click.stop>
      <button class="fs-btn" @click="toggleMode">
        {{ displayMode === 'contain' ? '全图' : '填充' }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.fs-wrap {
  position: fixed; inset: 0; z-index: 9999;
  background: #000; display: flex; align-items: center; justify-content: center;
  overflow: hidden;
}

.fs-media {
  position: absolute;
  inset: 0;
  width: 100vw;
  height: 100vh;
  max-width: 100vw;
  max-height: 100vh;
}

.fs-media.contain { object-fit: contain; }
.fs-media.cover { object-fit: cover; }

.fs-cover {
  opacity: 1;
  filter: blur(8px);
  transform: scale(1.02);
  transition: opacity 0.2s ease;
}

.fs-cover.hidden { opacity: 0; }

.fs-full {
  opacity: 0;
  transition: opacity 0.28s ease;
}

.fs-full.loaded { opacity: 1; }

.fs-top {
  position: absolute;
  top: 12px;
  right: 12px;
}

.fs-btn {
  background: rgba(255,255,255,0.12);
  border: 1px solid rgba(255,255,255,0.2);
  color: #fff;
  padding: 8px 14px;
  border-radius: 999px;
  font-size: 13px;
  cursor: pointer;
}

.fs-btn:hover { background: rgba(255,255,255,0.2); }
</style>
