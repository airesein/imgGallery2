<script setup>
import { ref, inject } from "vue"
import { applyPageMeta, buildApiDocsMeta } from "../utils/siteMeta.js"

const siteConfig = inject("siteConfig")
const catalog = inject("catalog")
const showToast = inject("showToast")

const baseUrl = "https://gallery.ziworld.top/api"
const copied = ref("")

async function copy(text) {
  try {
    await navigator.clipboard.writeText(text)
    copied.value = text
    showToast("已复制到剪贴板")
    setTimeout(() => { copied.value = "" }, 2000)
  } catch {
    showToast("复制失败")
  }
}

applyPageMeta(buildApiDocsMeta(siteConfig))
</script>

<template>
  <div class="api-page">
    <router-link to="/" class="api-back-home">← 返回主页</router-link>
    <header class="api-header">
      <h1>随机图片 API</h1>
      <p class="api-subtitle">GET 请求，无需认证，支持跨域</p>
      <button class="api-base-url" @click="copy(baseUrl)">{{ baseUrl }}</button>
    </header>

    <section class="api-section">
      <h2>接口概述</h2>
      <p class="api-desc">
        请求 <code>{{ baseUrl }}</code> 将从指定分类中随机返回一张图片。
        默认以 <b>302 重定向</b> 直接跳转到图片地址，适合 <code>&lt;img&gt;</code> 标签直接使用。
        传入 <code>type=json</code> 则返回 JSON 数据，包含多种尺寸的图片 URL。
      </p>
    </section>

    <section class="api-section">
      <h2>请求参数</h2>
      <table>
        <thead>
          <tr><th>参数</th><th>类型</th><th>必填</th><th>默认值</th><th>说明</th></tr>
        </thead>
        <tbody>
          <tr>
            <td><code>category</code></td>
            <td>string</td>
            <td>是</td>
            <td>-</td>
            <td>分类名称，多个用英文逗号 <code>,</code> 分隔，严格区分大小写，支持中文（需 URL 编码）</td>
          </tr>
          <tr>
            <td><code>type</code></td>
            <td>string</td>
            <td>否</td>
            <td>-</td>
            <td>设为 <code>json</code> 返回 JSON 数据；省略则直接 302 重定向到图片</td>
          </tr>
          <tr>
            <td><code>quality</code></td>
            <td>string</td>
            <td>否</td>
            <td><code>display</code></td>
            <td><code>display</code> = 压缩展示图（WebP/JPEG，适合网页）；<code>raw</code> = 原始图片（体积较大）</td>
          </tr>
        </tbody>
      </table>
    </section>

    <section class="api-section">
      <h2>响应方式</h2>
      <table>
        <thead>
          <tr><th>请求方式</th><th>状态码</th><th>响应</th></tr>
        </thead>
        <tbody>
          <tr>
            <td>省略 <code>type</code></td>
            <td><code>302</code></td>
            <td>重定向到 <code>quality</code> 对应的图片 URL，浏览器自动加载图片</td>
          </tr>
          <tr>
            <td><code>type=json</code></td>
            <td><code>200</code></td>
            <td>JSON 对象，包含 <code>url</code>、<code>raw_url</code>、<code>display_url</code> 等字段</td>
          </tr>
        </tbody>
      </table>
    </section>

    <section class="api-section">
      <h2>JSON 响应字段</h2>
      <table>
        <thead>
          <tr><th>字段</th><th>类型</th><th>说明</th></tr>
        </thead>
        <tbody>
          <tr><td><code>success</code></td><td>boolean</td><td>固定为 <code>true</code></td></tr>
          <tr><td><code>url</code></td><td>string</td><td>当前质量档位的图片地址（受 <code>quality</code> 参数影响）</td></tr>
          <tr><td><code>raw_url</code></td><td>string</td><td>原始图片地址（与 <code>quality</code> 无关，始终返回）</td></tr>
          <tr><td><code>display_url</code></td><td>string</td><td>压缩展示图地址</td></tr>
          <tr><td><code>cover_url</code></td><td>string</td><td>封面缩略图地址</td></tr>
          <tr><td><code>source</code></td><td>string</td><td>图片来源标识（<code>dt</code> / <code>xxt</code> / <code>lh5</code> / <code>lh6</code> / <code>zoho</code>）</td></tr>
          <tr><td><code>type</code></td><td>string</td><td>媒体类型（<code>image</code> 或 <code>video</code>）</td></tr>
          <tr><td><code>quality</code></td><td>string</td><td>实际使用的质量档位</td></tr>
        </tbody>
      </table>
    </section>

    <section class="api-section">
      <h2>错误响应</h2>
      <table>
        <thead>
          <tr><th>状态码</th><th>触发条件</th><th>响应内容</th></tr>
        </thead>
        <tbody>
          <tr>
            <td><code>400</code></td>
            <td>缺少 <code>category</code> 参数</td>
            <td><code>{ "error": "Missing required parameter: category", "availableCategories": [...] }</code></td>
          </tr>
          <tr>
            <td><code>404</code></td>
            <td>分类名称不存在或无内容</td>
            <td><code>{ "error": "No items found for category: xxx", "availableCategories": [...] }</code></td>
          </tr>
          <tr>
            <td><code>500</code></td>
            <td>服务器内部错误</td>
            <td><code>{ "error": "Internal server error", "detail": "..." }</code></td>
          </tr>
        </tbody>
      </table>
    </section>

    <section class="api-section">
      <h2>请求示例</h2>
      <div class="api-example">
        <button class="api-url-row" @click="copy(`${baseUrl}?category=原神`)">
          <span class="api-label">基础用法</span>
          <code>{{ baseUrl }}?category=原神</code>
        </button>
        <button class="api-url-row" @click="copy(`${baseUrl}?category=原神&quality=raw`)">
          <span class="api-label">原图质量</span>
          <code>{{ baseUrl }}?category=原神&amp;quality=raw</code>
        </button>
        <button class="api-url-row" @click="copy(`${baseUrl}?category=原神&type=json`)">
          <span class="api-label">JSON 格式</span>
          <code>{{ baseUrl }}?category=原神&amp;type=json</code>
        </button>
        <button class="api-url-row" @click="copy(`${baseUrl}?category=原神,PC,二次元&type=json`)">
          <span class="api-label">多分类</span>
          <code>{{ baseUrl }}?category=原神,PC,二次元&amp;type=json</code>
        </button>
      </div>
    </section>

    <section class="api-section">
      <h2>HTML 嵌入</h2>
      <div class="api-example">
        <button class="api-url-row" @click="copy(`<img src=&quot;${baseUrl}?category=${catalog?.categories[0]?.name || '原神'}&quot; alt=&quot;&quot; />`)">
          <span class="api-label">img 标签</span>
          <code>&lt;img src="{{ baseUrl }}?category={{ catalog?.categories[0]?.name || '原神' }}" alt="" /&gt;</code>
        </button>
        <button class="api-url-row" @click="copy(`<img src=&quot;${baseUrl}?category=${catalog?.categories[0]?.name || '原神'}&amp;quality=raw&quot; alt=&quot;&quot; />`)">
          <span class="api-label">img + 原图</span>
          <code>&lt;img src="{{ baseUrl }}?category={{ catalog?.categories[0]?.name || '原神' }}&amp;quality=raw" alt="" /&gt;</code>
        </button>
      </div>
    </section>

    <section class="api-section">
      <h2>可用分类</h2>
      <p class="api-desc" style="margin-bottom:14px">共 {{ catalog?.categories?.length || 0 }} 个分类，{{ catalog?.categories?.reduce((s, c) => s + c.total, 0)?.toLocaleString() || 0 }} 项内容。点击名称复制。</p>
      <div class="api-cats">
        <button
          v-for="cat in catalog?.categories || []"
          :key="cat.name"
          class="api-cat-tag"
          @click="copy(cat.name)"
          :title="`${cat.name}（${cat.total} 项）`"
        >
          {{ cat.name }} <span class="api-cat-count">{{ cat.total }}</span>
        </button>
      </div>
    </section>

    <section class="api-section">
      <h2>使用说明</h2>
      <ul class="api-notes">
        <li>接口支持跨域（CORS），可直接在前端 JavaScript 中调用</li>
        <li><code>category</code> 参数中的中文需要使用 URL 编码（浏览器中 <code>encodeURIComponent</code> 可自动处理）</li>
        <li>每次请求随机返回一张图片，无缓存策略（<code>cache-control: no-cache</code>）</li>
        <li>多个分类用英文逗号分隔，会从所有匹配分类的图片池中随机选取</li>
        <li>当某个 source 不支持视频时，对应 <code>type</code> 始终返回 <code>image</code></li>
      </ul>
    </section>
  </div>
</template>

<style scoped>
.api-page {
  max-width: 740px;
  margin: 0 auto;
  padding: 40px 20px 80px;
  -webkit-user-select: text;
  user-select: text;
}


.api-back-home {
  display: inline-block;
  font-size: 13px;
  color: var(--text-secondary);
  transition: color 0.2s;
  margin-bottom: 20px;
}
.api-back-home:hover { color: var(--text-primary); }

.api-header {
  text-align: center;
  margin-bottom: 48px;
}

.api-header h1 {
  font-size: 36px;
  font-weight: 700;
  letter-spacing: -0.03em;
  color: var(--text-primary);
  margin: 0 0 8px;
}

.api-subtitle {
  font-size: 14px;
  color: var(--text-secondary);
  margin-bottom: 18px;
}

.api-base-url {
  display: inline-block;
  background: var(--bg-surface);
  border: 1px solid var(--border-subtle);
  border-radius: 8px;
  padding: 10px 22px;
  font-size: 15px;
  color: var(--color-accent);
  font-family: "SF Mono", "Fira Code", "Consolas", monospace;
  cursor: pointer;
  transition: border-color 0.2s, background 0.2s;
}
.api-base-url:hover {
  border-color: var(--border-active);
  background: var(--bg-main);
}

.api-desc {
  font-size: 14px;
  color: var(--text-body);
  line-height: 1.7;
}
.api-desc code {
  background: var(--bg-surface);
  padding: 1px 6px;
  border-radius: 4px;
  font-size: 13px;
  color: var(--color-accent);
  font-family: "SF Mono", "Fira Code", "Consolas", monospace;
}

.api-section {
  margin-bottom: 44px;
}

.api-section h2 {
  font-size: 20px;
  font-weight: 700;
  color: var(--text-primary);
  margin-bottom: 14px;
  padding-bottom: 6px;
  border-bottom: 1px solid var(--border-subtle);
}

.api-section table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}

.api-section th,
.api-section td {
  text-align: left;
  padding: 10px 14px;
  border-bottom: 1px solid var(--border-subtle);
  vertical-align: top;
}

.api-section th {
  font-weight: 600;
  color: var(--text-secondary);
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  background: var(--bg-surface);
}

.api-section td code {
  background: var(--bg-surface);
  padding: 2px 7px;
  border-radius: 4px;
  font-size: 12px;
  color: var(--color-accent);
  font-family: "SF Mono", "Fira Code", "Consolas", monospace;
  white-space: nowrap;
}

.api-example {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.api-url-row {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  text-align: left;
  background: var(--bg-surface);
  border: 1px solid var(--border-subtle);
  border-radius: 6px;
  padding: 10px 14px;
  cursor: pointer;
  transition: border-color 0.2s, background 0.2s;
}
.api-url-row:hover {
  border-color: var(--border-active);
  background: var(--bg-main);
}
.api-url-row code {
  font-size: 12px;
  color: var(--color-accent);
  font-family: "SF Mono", "Fira Code", "Consolas", monospace;
  word-break: break-all;
  flex: 1;
}
.api-label {
  font-size: 11px;
  font-weight: 600;
  color: var(--text-secondary);
  background: var(--border-subtle);
  padding: 2px 8px;
  border-radius: 4px;
  white-space: nowrap;
  flex-shrink: 0;
}

.api-cats {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.api-cat-tag {
  background: var(--bg-surface);
  border: 1px solid var(--border-subtle);
  border-radius: 6px;
  padding: 6px 14px;
  font-size: 13px;
  color: var(--text-primary);
  cursor: pointer;
  transition: border-color 0.2s, background 0.2s;
}
.api-cat-tag:hover {
  border-color: var(--border-active);
  background: var(--bg-main);
}
.api-cat-count {
  color: var(--text-muted);
  font-size: 11px;
  margin-left: 4px;
}

.api-notes {
  margin: 0;
  padding-left: 18px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.api-notes li {
  font-size: 13px;
  color: var(--text-body);
  line-height: 1.6;
}
.api-notes li code {
  background: var(--bg-surface);
  padding: 1px 5px;
  border-radius: 4px;
  font-size: 12px;
  color: var(--color-accent);
  font-family: "SF Mono", "Fira Code", "Consolas", monospace;
}

@media (max-width: 600px) {
  .api-page { padding: 20px 14px 60px; }
  .api-header h1 { font-size: 26px; }
  .api-section h2 { font-size: 17px; }
  .api-url-row { flex-direction: column; align-items: flex-start; gap: 4px; }
}
</style>






