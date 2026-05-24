<script setup>
import { inject, watch, onUnmounted } from 'vue'
import { useSwCache } from '../composables/useSwCache.js'

const showSettings = inject('showSettings')
const settings = inject('settings')
const setSetting = inject('setSetting')
const resetSettings = inject('resetSettings')

const { stats, isEnabled, refreshStats, clearCache, enable, disable } = useSwCache()

let statsTimer = null

function openStats() {
  if (statsTimer) clearInterval(statsTimer)
  refreshStats()
  statsTimer = setInterval(refreshStats, 2000)
}

function closeStats() {
  if (statsTimer) { clearInterval(statsTimer); statsTimer = null }
}

watch(showSettings, (v) => {
  if (v) openStats()
  else closeStats()
})

function clearHandler() {
  clearCache()
}

function toggleEnabled() {
  if (isEnabled.value) disable()
  else enable()
}

onUnmounted(closeStats)
</script>

<template>
  <Transition name="settings-fade">
    <div v-if="showSettings" class="settings-overlay" @click.self="showSettings = false">
      <div class="settings-panel">
        <div class="settings-header">
          <h3>Settings</h3>
          <button class="settings-close" @click="showSettings = false">&times;</button>
        </div>
        <div class="settings-body">
          <div class="settings-row">
            <label class="settings-label">Card Gap <span class="settings-value">{{ settings.cardGap }}px</span></label>
            <input type="range" class="settings-range" min="6" max="20" :value="settings.cardGap" @input="setSetting('cardGap', Number($event.target.value))" />
          </div>
          <div class="settings-row">
            <label class="settings-label">Columns <span class="settings-value">{{ settings.columns === 0 ? 'Auto' : settings.columns }}</span></label>
            <input type="range" class="settings-range" min="0" max="6" :value="settings.columns" @input="setSetting('columns', Number($event.target.value))" />
          </div>
          <div class="settings-row">
            <button class="settings-reset" @click="resetSettings">Reset Defaults</button>
          </div>

          <div class="settings-divider"></div>

          <div class="settings-section-title">Cache</div>

          <div class="settings-row">
            <label class="settings-label">Service Worker Cache</label>
            <label class="settings-toggle">
              <input type="checkbox" :checked="isEnabled" @change="toggleEnabled" />
              <span class="settings-toggle-track"></span>
            </label>
          </div>

          <div class="settings-row" v-if="isEnabled">
            <div class="settings-stats">
              <div class="settings-stat-row">
                <span class="settings-stat-label">Cached Items</span>
                <span class="settings-stat-value">{{ stats.itemCount.toLocaleString() }}</span>
              </div>
              <div class="settings-stat-row settings-stat-sub">
                <span>P1 (Category Covers)</span>
                <span>{{ stats.byLevel[1] }}</span>
              </div>
              <div class="settings-stat-row settings-stat-sub">
                <span>P2 (Fav Covers)</span>
                <span>{{ stats.byLevel[2] }}</span>
              </div>
              <div class="settings-stat-row settings-stat-sub">
                <span>P3 (Fav Display)</span>
                <span>{{ stats.byLevel[3] }}</span>
              </div>
              <div class="settings-stat-row settings-stat-sub">
                <span>P4 (Other Covers)</span>
                <span>{{ stats.byLevel[4] }}</span>
              </div>
              <div class="settings-stat-row settings-stat-sub">
                <span>P5 (Other Display)</span>
                <span>{{ stats.byLevel[5] }}</span>
              </div>
            </div>
          </div>

          <div class="settings-row">
            <button class="settings-reset settings-clear" @click="clearHandler">Clear Cache</button>
          </div>
        </div>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.settings-overlay {
  position: fixed;
  inset: 0;
  z-index: 999;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding-top: 80px;
  background: rgba(0,0,0,0.5);
}
.settings-panel {
  background: var(--bg-overlay);
  backdrop-filter: blur(24px);
  -webkit-backdrop-filter: blur(24px);
  border: 1px solid var(--border-subtle);
  border-radius: 12px;
  width: min(340px, 90vw);
  box-shadow: 0 20px 60px rgba(0,0,0,0.5);
  max-height: 80vh;
  overflow-y: auto;
}
.settings-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid rgba(30,32,34,0.04);
}
.settings-header h3 {
  color: var(--text-primary);
  font-size: 14px;
  font-weight: 600;
  letter-spacing: 0.01em;
}
.settings-close {
  background: none;
  border: none;
  color: var(--text-secondary);
  font-size: 22px;
  cursor: pointer;
  padding: 0 2px;
  line-height: 1;
}
.settings-close:hover { color: var(--text-primary); }
.settings-body { padding: 20px; }
.settings-row { margin-bottom: 20px; }
.settings-row:last-child { margin-bottom: 0; }
.settings-label {
  display: flex;
  justify-content: space-between;
  align-items: center;
  color: var(--text-primary);
  font-size: 13px;
  margin-bottom: 10px;
}
.settings-value { color: var(--text-secondary); font-variant-numeric: tabular-nums; }
.settings-range {
  -webkit-appearance: none;
  appearance: none;
  width: 100%;
  height: 4px;
  border-radius: 999px;
  background: rgba(30,32,34,0.08);
  outline: none;
  cursor: pointer;
}
.settings-range::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: var(--color-accent);
  cursor: pointer;
  transition: transform 0.15s;
}
.settings-range::-webkit-slider-thumb:hover { transform: scale(1.2); }
.settings-range::-moz-range-thumb {
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: var(--color-accent);
  border: none;
  cursor: pointer;
}
.settings-reset {
  width: 100%;
  padding: 10px;
  border-radius: 8px;
  border: 1px solid rgba(30,32,34,0.08);
  background: transparent;
  color: var(--text-secondary);
  font-size: 13px;
  letter-spacing: 0.02em;
  cursor: pointer;
  transition: background 0.2s, color 0.2s, border-color 0.2s;
}
.settings-reset:hover {
  background: rgba(179,142,109,0.06);
  color: var(--text-primary);
  border-color: rgba(179,142,109,0.15);
}
.settings-clear {
  color: var(--color-error);
  border-color: rgba(194,95,78,0.2);
}
.settings-clear:hover {
  background: rgba(194,95,78,0.06);
  color: var(--color-error);
  border-color: rgba(194,95,78,0.3);
}
.settings-divider {
  height: 1px;
  background: rgba(30,32,34,0.06);
  margin: 20px 0;
}
.settings-section-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 16px;
}
.settings-toggle {
  position: relative;
  display: inline-block;
  width: 40px;
  height: 22px;
  cursor: pointer;
}
.settings-toggle input {
  position: absolute;
  opacity: 0;
  width: 0;
  height: 0;
}
.settings-toggle-track {
  position: absolute;
  inset: 0;
  background: rgba(30,32,34,0.12);
  border-radius: 999px;
  transition: background 0.2s;
}
.settings-toggle-track::after {
  content: '';
  position: absolute;
  top: 3px;
  left: 3px;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: #fff;
  transition: transform 0.2s;
  box-shadow: 0 1px 3px rgba(0,0,0,0.15);
}
.settings-toggle input:checked + .settings-toggle-track {
  background: var(--color-accent);
}
.settings-toggle input:checked + .settings-toggle-track::after {
  transform: translateX(18px);
}
.settings-stats {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.settings-stat-row {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  color: var(--text-secondary);
}
.settings-stat-value {
  font-variant-numeric: tabular-nums;
}
.settings-stat-sub {
  padding-left: 12px;
  color: var(--text-muted);
  font-size: 11px;
}
.settings-fade-enter-active, .settings-fade-leave-active { transition: opacity 0.2s ease; }
.settings-fade-enter-from, .settings-fade-leave-to { opacity: 0; }
</style>
