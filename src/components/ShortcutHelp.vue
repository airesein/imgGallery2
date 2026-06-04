<script setup>
defineEmits(['close'])
</script>

<template>
  <Transition name="shortcut-fade">
    <div class="shortcut-overlay" @click.self="$emit('close')">
      <div class="shortcut-panel">
        <div class="shortcut-header">
          <h3>快捷键说明</h3>
          <button class="shortcut-close" @click="$emit('close')">&times;</button>
        </div>
        <div class="shortcut-body">
          <div class="shortcut-section">图片操作</div>
          <div class="shortcut-row">
            <span class="shortcut-key">右键</span>
            <span class="shortcut-desc">复制图片链接</span>
          </div>
          <div class="shortcut-row">
            <span class="shortcut-key">Ctrl + 右键</span>
            <span class="shortcut-desc">收藏 / 取消收藏</span>
          </div>
          <div class="shortcut-row">
            <span class="shortcut-key">Ctrl + 左键</span>
            <span class="shortcut-desc">新窗口打开</span>
          </div>
          <div class="shortcut-row">
            <span class="shortcut-key">鼠标中键</span>
            <span class="shortcut-desc">下载图片</span>
          </div>

          <div class="shortcut-section">全图模式</div>
          <div class="shortcut-row">
            <span class="shortcut-key">←</span>
            <span class="shortcut-desc">上一张</span>
          </div>
          <div class="shortcut-row">
            <span class="shortcut-key">→</span>
            <span class="shortcut-desc">下一张</span>
          </div>
          <div class="shortcut-row">
            <span class="shortcut-key">Esc</span>
            <span class="shortcut-desc">退出全图</span>
          </div>
        </div>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.shortcut-overlay {
  position: fixed; inset: 0; z-index: 999;
  display: flex; align-items: flex-start; justify-content: center;
  padding-top: 80px;
  background: rgba(0,0,0,0.5);
}
.shortcut-panel {
  background: var(--bg-overlay);
  backdrop-filter: blur(24px);
  -webkit-backdrop-filter: blur(24px);
  border: 1px solid var(--border-subtle);
  border-radius: 12px;
  width: min(340px, 90vw);
  box-shadow: 0 20px 60px rgba(0,0,0,0.5);
}
.shortcut-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid rgba(30,32,34,0.04);
}
.shortcut-header h3 {
  color: var(--text-primary); font-size: 14px; font-weight: 600; letter-spacing: 0.01em;
}
.shortcut-close {
  background: none; border: none; color: var(--text-secondary);
  font-size: 22px; cursor: pointer; padding: 0 2px; line-height: 1;
}
.shortcut-close:hover { color: var(--text-primary); }
.shortcut-body { padding: 20px; display: flex; flex-direction: column; gap: 14px; }
.shortcut-section {
  font-size: 11px; font-weight: 600; color: var(--text-muted);
  letter-spacing: 0.06em; text-transform: uppercase;
  border-bottom: 1px solid var(--border-subtle); padding-bottom: 6px; margin-bottom: -6px;
}
.shortcut-row {
  display: flex; align-items: center; justify-content: space-between;
}
.shortcut-key {
  font-size: 12px; font-weight: 500; color: var(--text-primary);
  background: var(--bg-surface); padding: 4px 10px; border-radius: 6px;
  border: 1px solid var(--border-subtle);
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
}
.shortcut-desc { font-size: 13px; color: var(--text-secondary); }
.shortcut-fade-enter-active, .shortcut-fade-leave-active { transition: opacity 0.2s ease; }
.shortcut-fade-enter-from, .shortcut-fade-leave-to { opacity: 0; }
</style>
