<script setup>
import { ref, computed, inject, onMounted, onUnmounted } from 'vue'

const props = defineProps({ item: Object, selectable: Boolean, selected: Boolean })
const emit = defineEmits(['click'])

const getItemUrl = inject('getItemUrl')
const isVideoFn = inject('isVideo')

const loaded = ref(false)
const failed = ref(false)
const retryCount = ref(0)
const MAX_RETRIES = 3
const retryTimer = ref(null)

const itemKey = computed(() => `${props.item?.source || 'src'}:${props.item?.id || ''}`)
const isVideo = computed(() => isVideoFn(props.item))
const ratio = ref('')

const RATIO_KEY = 'gallery-item-ratios'
const baseCoverUrl = getItemUrl(props.item, 'cover')
const coverUrl = ref(baseCoverUrl)

function loadRatioCache() {
  try {
    return JSON.parse(localStorage.getItem(RATIO_KEY) || '{}')
  } catch {
    return {}
  }
}

onMounted(() => {
  const cache = loadRatioCache()
  const key = itemKey.value
  if (cache[key]) ratio.value = cache[key]
})

onUnmounted(() => {
  if (retryTimer.value) clearTimeout(retryTimer.value)
})

function onLoad(e) {
  const img = e?.target
  if (img?.naturalWidth && img?.naturalHeight) {
    const cache = loadRatioCache()
    cache[itemKey.value] = `${img.naturalWidth}/${img.naturalHeight}`
    try {
      localStorage.setItem(RATIO_KEY, JSON.stringify(cache))
    } catch {}
  }
  loaded.value = true
  retryCount.value = 0
}

function onError() {
  if (loaded.value || failed.value) return
  if (retryTimer.value) clearTimeout(retryTimer.value)
  
  if (retryCount.value < MAX_RETRIES) {
    retryCount.value++
    const delay = 600 * retryCount.value
    retryTimer.value = setTimeout(() => {
      if (!loaded.value && !failed.value) {
        const sep = baseCoverUrl.includes('?') ? '&' : '?'
        coverUrl.value = baseCoverUrl + sep + '_retry=' + retryCount.value + '_' + Date.now()
      }
    }, delay)
  } else {
    failed.value = true
    loaded.value = true
  }
}
</script>

<template>
  <div class="mc" :class="{ selectable, selected }" @click="emit('click')">
    <div class="mc-img" :class="{ loaded, failed }">
      <div v-if="!loaded" class="mc-skeleton"></div>
      <img
        v-if="!failed"
        :src="coverUrl"
        :alt="item.id"
        class="mc-real"
        loading="lazy"
        @load="onLoad"
        @error="onError"
      />
      <div v-else class="mc-fail">加载失败</div>
      <div v-if="isVideo && !failed" class="mc-play">
        <svg viewBox="0 0 24 24" width="36" height="36" fill="white"><path d="M8 5v14l11-7z"/></svg>
      </div>
      <div v-if="selectable" class="mc-check">
        <span class="mc-check-dot">{{ selected ? '✓' : '' }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.mc {
  break-inside: avoid;
  margin-bottom: 10px;
  cursor: pointer;
  border-radius: 8px;
  overflow: hidden;
  background: var(--bg-surface);
  border: 1px solid var(--border-subtle);
  box-shadow: inset 0 0 0 1px rgba(30,32,34,0.03), 0 4px 12px rgba(0, 0, 0, 0.08);
  transition: border-color 0.3s ease, box-shadow 0.3s ease, transform 0.4s cubic-bezier(0.16, 1, 0.3, 1);
}
.mc.selectable {
  border-color: var(--border-subtle);
}
.mc.selected {
  border-color: var(--color-accent);
  box-shadow: 0 0 0 1px var(--color-accent), 0 8px 24px rgba(0, 0, 0, 0.1);
}
.mc:hover {
  transform: scale(1.015);
  border-color: rgba(30, 32, 34, 0.12);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.1);
}

.mc-img {
  position: relative;
  width: 100%;
  min-height: 0;
}

.mc-skeleton {
  position: relative;
  width: 100%;
  height: 220px;
  background: linear-gradient(110deg, #ece9e4 30%, #e4e0da 50%, #ece9e4 70%);
  background-size: 250% 100%;
  animation: shimmer 1.6s ease-in-out infinite;
}

@keyframes shimmer {
  0% { background-position: 250% 0; }
  100% { background-position: -250% 0; }
}

.mc-real {
  width: 100%;
  display: block;
  position: relative; z-index: 1;
  opacity: 0;
  transition: opacity 0.45s ease;
}
.mc-img.loaded .mc-real { opacity: 1; }
.mc-img.loaded .mc-skeleton { display: none; }

.mc-play {
  position: absolute; inset: 0; z-index: 2;
  display: flex; align-items: center; justify-content: center;
  background: rgba(0,0,0,0.18);
  opacity: 0; transition: opacity 0.2s;
}
.mc:hover .mc-play { opacity: 1; }
.mc-play svg {
  filter: drop-shadow(0 2px 10px rgba(0,0,0,0.5));
}

.mc-check {
  position: absolute;
  top: 10px;
  right: 10px;
  z-index: 3;
}

.mc-check-dot {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: rgba(255,255,255,0.85);
  border: 1px solid rgba(30,32,34,0.1);
  color: var(--text-primary);
  font-size: 13px;
  font-weight: 700;
}

.mc-fail {
  width: 100%; min-height: 220px;
  display: flex; align-items: center; justify-content: center;
  color: rgba(30,32,34,0.18); font-size: 13px;
}
</style>
