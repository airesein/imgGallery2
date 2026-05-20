<script setup>
import { ref, computed } from 'vue'

const props = defineProps({
  name: String,
  cover: String,
  count: Number
})

const emit = defineEmits(['click'])
const imgFailed = ref(false)
const retryCount = ref(0)
const MAX_RETRIES = 2

const displaySrc = computed(() => {
  if (retryCount.value === 0) return props.cover
  const sep = props.cover.includes('?') ? '&' : '?'
  return props.cover + sep + '_retry=' + retryCount.value + '_' + Date.now()
})

function onError() {
  if (retryCount.value < MAX_RETRIES) {
    retryCount.value++
    imgFailed.value = false
  } else {
    imgFailed.value = true
  }
}

function onRetry() {
  if (retryCount.value < MAX_RETRIES) {
    retryCount.value++
    imgFailed.value = false
  }
}
</script>

<template>
  <div class="category-card" @click="emit('click')">
    <div class="category-card-img-wrap">
      <img
        v-if="!imgFailed"
        :key="retryCount"
        :src="displaySrc"
        :alt="name"
        class="category-card-img"
        referrerpolicy="no-referrer"
        @error="onError"
      />
      <div v-else class="category-card-placeholder" @click.stop="onRetry">
        加载失败 (点击重试)
      </div>
    </div>
    <div class="category-card-overlay">
      <span class="category-card-name">{{ name }}</span>
      <span class="category-card-count">{{ count }} 个资源</span>
    </div>
  </div>
</template>

<style scoped>
.category-card {
  position: relative;
  border-radius: 12px;
  overflow: hidden;
  cursor: pointer;
  background: #1a1a1a;
  transition: transform 0.25s;
}

.category-card:hover {
  transform: scale(1.03);
}

.category-card::after {
  content: '';
  position: absolute;
  inset: 0;
  background: radial-gradient(120% 80% at 20% 20%, rgba(255,255,255,0.08), transparent 55%);
  pointer-events: none;
}

.category-card-img-wrap {
  width: 100%;
}

.category-card-img {
  width: 100%;
  height: auto;
  display: block;
}

.category-card-overlay {
  position: absolute;
  inset: 0;
  background: linear-gradient(transparent 50%, rgba(0, 0, 0, 0.7));
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  padding: 16px;
}

.category-card-name {
  font-size: 16px;
  font-weight: 600;
  color: #fff;
}

.category-card-count {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.6);
  margin-top: 2px;
}

.category-card-placeholder {
  width: 100%;
  min-height: 220px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: rgba(255, 255, 255, 0.3);
  font-size: 13px;
  cursor: pointer;
  background: #111;
}
.category-card-placeholder:hover {
  color: rgba(255, 255, 255, 0.6);
  background: #1a1a1a;
}
</style>
