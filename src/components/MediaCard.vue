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
  if (retryCount.value < MAX_RETRIES) {
    retryCount.value++
    const delay = 500 * retryCount.value
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
        referrerpolicy="no-referrer"
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
  border-radius: 14px;
  overflow: hidden;
  background: #161616;
  box-shadow: 0 2px 12px rgba(0,0,0,0.25);
  transition: transform 0.25s, box-shadow 0.25s;
}
.mc.selectable {
  box-shadow: 0 0 0 1px rgba(255,255,255,0.06), 0 2px 12px rgba(0,0,0,0.25);
}
.mc.selected {
  box-shadow: 0 0 0 2px rgba(112,164,255,0.8), 0 8px 24px rgba(0,0,0,0.32);
}
.mc:hover {
  transform: translateY(-3px) scale(1.012);
  box-shadow: 0 8px 30px rgba(0,0,0,0.4);
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
  background: linear-gradient(110deg, #1a1a1a 30%, #222 50%, #1a1a1a 70%);
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
  background: rgba(12,12,12,0.72);
  border: 1px solid rgba(255,255,255,0.16);
  color: #fff;
  font-size: 13px;
  font-weight: 700;
}

.mc-fail {
  width: 100%; min-height: 220px;
  display: flex; align-items: center; justify-content: center;
  color: rgba(255,255,255,0.25); font-size: 13px;
}
</style>
