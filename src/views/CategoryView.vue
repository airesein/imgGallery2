<script setup>
import { inject, computed, watchEffect } from 'vue'
import { useRouter } from 'vue-router'
import CategoryCard from '../components/CategoryCard.vue'
import { useFavorites } from '../composables/useFavorites.js'
import { useCatalog } from '../composables/useCatalog.js'

const catalog = inject('catalog')
const uiState = inject('uiState')
const uiActions = inject('uiActions')
const { getItemUrl, flattenCategory } = useCatalog()
const router = useRouter()
const { favorites } = useFavorites()

const filtered = computed(() => {
  const q = uiState.searchQuery.trim().toLowerCase()
  if (!q) return catalog.value.categories
  return catalog.value.categories.filter(c => c.name.toLowerCase().includes(q))
})

function getFirstItemCover(cat) {
  const flat = flattenCategory(cat)
  return flat.length > 0 ? getItemUrl(flat[0], 'cover') : cat.cover
}

function openCategory(name) {
  router.push(`/category/${encodeURIComponent(name)}`)
}

watchEffect(() => {
  uiActions.canSelect = false
  uiState.selectionMode = false
  uiState.selectedCount = 0
})
</script>

<template>
  <div class="cat-page">
    <div class="cat-masonry">
      <div class="cat-fav-card" @click="router.push('/favorites')">
        <div class="cat-fav-inner">
          <span class="cat-fav-icon">★</span>
          <span class="cat-fav-label">收藏</span>
          <span class="cat-fav-count">{{ favorites.length }} 个</span>
        </div>
      </div>

      <CategoryCard
        v-for="cat in filtered"
        :key="cat.name"
        :name="cat.name"
        :cover="getFirstItemCover(cat)"
        :count="cat.total"
        @click="openCategory(cat.name)"
      />
    </div>
    <div v-if="filtered.length === 0" class="cat-empty">没有匹配的分类</div>
  </div>
</template>

<style scoped>
.cat-page { padding: 68px 12px 48px; max-width: 1600px; margin: 0 auto; }
.cat-masonry {
  column-count: 4;
  column-gap: 10px;
}
.cat-masonry > * { break-inside: avoid; margin-bottom: 10px; }
.cat-empty { text-align: center; padding: 60px 20px; color: rgba(255,255,255,0.35); }

@media (max-width: 1100px) { .cat-masonry { column-count: 3; } }
@media (max-width: 820px) { .cat-masonry { column-count: 2; } }
@media (max-width: 560px) { .cat-masonry { column-count: 1; } }

.cat-fav-card {
  border-radius: 12px; overflow: hidden; cursor: pointer;
  width: 100%;
  min-height: 220px;
  background: linear-gradient(135deg, #2a1f3d, #1a1a2e);
  transition: transform 0.25s; display: flex; align-items: center; justify-content: center;
}
.cat-fav-card:hover { transform: scale(1.03); }

.cat-fav-card,
:deep(.category-card) {
  box-shadow: 0 10px 30px rgba(0,0,0,0.32);
}

.cat-fav-inner {
  display: flex; flex-direction: column; align-items: center; gap: 6px;
}
.cat-fav-icon { font-size: 36px; color: #f0c040; }
.cat-fav-label { font-size: 16px; font-weight: 600; color: #e0e0e0; }
.cat-fav-count { font-size: 12px; color: rgba(255,255,255,0.45); }
</style>
