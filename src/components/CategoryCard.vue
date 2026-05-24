<script setup>
import { ref, computed } from 'vue'

const props = defineProps({
  name: String,
  cover: String,
  count: Number
})

const emit = defineEmits(['click'])
const loaded = ref(false)
const imgFailed = ref(false)
const retryCount = ref(0)
const MAX_RETRIES = 3
const retryTimer = ref(null)

const retryTs = ref(0)
const displaySrc = computed(() => {
  if (!props.cover) return ''
  if (retryCount.value === 0) return props.cover
  const sep = props.cover.includes('?') ? '&' : '?'
  return props.cover + sep + '_retry=' + retryCount.value + '_' + retryTs.value
})

function onLoad() {
  loaded.value = true
  retryCount.value = 0
}

function onError() {
  if (loaded.value || imgFailed.value) return
  if (retryTimer.value) clearTimeout(retryTimer.value)
  
    if (retryCount.value < MAX_RETRIES) {
      retryCount.value++
      retryTs.value = Date.now()
      const delay = 600 * retryCount.value
      retryTimer.value = setTimeout(() => {
        if (!loaded.value && !imgFailed.value) imgFailed.value = false
      }, delay)
  } else {
    imgFailed.value = true
    loaded.value = true
  }
}

function onRetry() {
  imgFailed.value = false
  loaded.value = false
  retryCount.value = 0
}
</script>

<template>
  <div class="category-card" @click="emit('click')">
    <div class="category-card-img-wrap" :class="{ loaded }">
      <div v-if="!loaded" class="category-card-skeleton"></div>
      <img
        v-if="!imgFailed && cover"
        :key="retryCount"
        :src="displaySrc"
        :alt="name"
        class="category-card-img"
        @load="onLoad"
        @error="onError"
      />
      <div v-else-if="imgFailed" class="category-card-placeholder" @click.stop="onRetry">
        {{ retryCount < MAX_RETRIES ? '加载中...' : '加载失败 (点击重试)' }}
      </div>
    </div>
    <div class="category-card-overlay">
      <div class="category-card-label">
        <span class="category-card-name">{{ name }}</span>
        <span class="category-card-count">{{ count }} 个资源</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.category-card {
  position: relative;
  border-radius: 12px;
  overflow: hidden;
  cursor: pointer;
  background: var(--bg-surface);
  transition: transform 0.25s;
}

.category-card:hover {
  transform: scale(1.03);
}

.category-card::after {
  content: '';
  position: absolute;
  inset: 0;
  background: radial-gradient(120% 80% at 20% 20%, rgba(179,142,109,0.05), transparent 55%);
  pointer-events: none;
}

.category-card-img-wrap {
  width: 100%;
  position: relative;
}

.category-card-skeleton {
  width: 100%;
  padding-bottom: 65%;
  background: linear-gradient(110deg, #ece9e4 30%, #e4e0da 50%, #ece9e4 70%);
  background-size: 200% 100%;
  animation: shimmer 1.5s ease-in-out infinite;
}

.loaded .category-card-skeleton {
  display: none;
}

@keyframes shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

.category-card-img {
  width: 100%;
  height: auto;
  display: block;
  opacity: 0;
  transition: opacity 0.3s ease;
}

.loaded .category-card-img {
  opacity: 1;
}

.category-card-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: flex-end;
  justify-content: flex-start;
  padding: 0;
  pointer-events: none;
}

.category-card-label {
  margin: 10px;
}

.category-card-name {
  display: block;
  font-size: 14px;
  font-weight: 600;
  color: #fff;
  text-shadow: 0 1px 3px rgba(0,0,0,0.6);
  margin-bottom: 2px;
}

.category-card-count {
  display: block;
  font-size: 11px;
  color: rgba(255,255,255,0.85);
  text-shadow: 0 1px 3px rgba(0,0,0,0.5);
}

.category-card-placeholder {
  width: 100%;
  min-height: 220px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: rgba(30,32,34,0.18);
  font-size: 13px;
  cursor: pointer;
  background: #e8e5e0;
}
.category-card-placeholder:hover {
  color: rgba(30,32,34,0.35);
  background: #ece9e4;
}
</style>
