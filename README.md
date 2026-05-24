# Img Gallery

一个基于 Vue 3 + Vite 的图片浏览画廊，支持多图源、分类浏览、收藏、全屏预览和批量下载。

![image-20260524155059343](assect/README/image-20260524155059343.png)

![image-20260524155127236](assect/README/image-20260524155127236.png)

## 特性

- **分类浏览** — 按主题目录（原神、崩坏、碧蓝航线等）组织内容
- **多图源支持** — 网易相册（lh5/lh6）、堆糖、超星学习通、Zoho 等
- **Service Worker 缓存** — 自动缓存外部图床图片，离线可访问
- **优先级管理** — P1-P5 分级缓存策略，重要内容优先保留
- **收藏功能** — 收藏喜欢的条目，数据持久化到 localStorage
- **全屏预览** — 支持图片/视频全屏浏览，切换含/填充模式
- **瀑布流布局** — 自适应列数的瀑布流排版
- **批量下载** — 支持 JSZip 打包下载或跳转下载

## 快速开始

```bash
# 安装依赖
npm install

# 开发模式
npm run dev

# 构建生产版本
npm run build

# 预览生产版本
npm run preview
```

## 项目结构

```
├── data/                    # 分类数据目录（每个目录是一个分类）
│   ├── 原神/
│   │   ├── lh5              # 网易相册 lh5 图源 ID 列表
│   │   └── dt               # 堆糖图源 ID 列表
│   ├── 崩坏/
│   └── ...
├── public/
│   └── sw.js                # Service Worker（图片缓存）
├── scripts/
│   └── generate-catalog.mjs # 目录生成脚本
├── src/
│   ├── components/          # Vue 组件
│   ├── composables/         # 组合式函数
│   ├── router/              # 路由配置
│   ├── utils/               # 工具函数
│   ├── App.vue
│   └── main.js
├── rule.yaml                # 图源规则配置
├── vite.config.js
└── package.json
```

## 添加新内容

### 1. 新建分类目录

在 `data/` 下创建目录，例如 `data/我的分类/`

### 2. 添加图源文件

在分类目录下创建以图源扩展名命名的文件（如 `lh5`、`dt`、`xxt`），每行一个资源 ID：

```
# data/我的分类/lh5
abc123def456
ghi789jkl012
```

### 3. 可选：添加描述

创建 `readme.md` 文件，内容将作为分类描述显示在页面上。

### 4. 重新生成目录

```bash
npm run generate
```

或在开发/构建时自动执行。

## 图源规则

`rule.yaml` 定义了各图源的 URL 模板，支持 `cover`（缩略图）、`display`（预览图）、`raw`（原图）三种 URL 模式，`{{id}}` 会被替换为资源 ID。

| 图源 | 说明 |
|------|------|
| `lh5` | 网易相册（imglf5.lf127.net） |
| `lh6` | 网易相册（imglf6.lf127.net） |
| `dt` | 堆糖（c-ssl.dtstatic.com） |
| `xxt` | 超星学习通（p.ananas.chaoxing.com） |
| `zoho` | Zoho Workdrive |

## Service Worker 缓存

项目使用自定义 Service Worker（`public/sw.js`）缓存来自外部图床的图片：

- **上限**：最多 2000 条缓存，超限后自动修剪至 1500 条
- **优先级**：P1-P5 数字越小越重要，优先保留高优先级条目
- **缓存策略**：Cache First，缓存命中直接返回，未命中则 fetch 后缓存

### 优先级说明

| 优先级 | 用途 |
|--------|------|
| P1 | 分类封面（Category Covers） |
| P2 | 收藏的封面（Fav Covers） |
| P3 | 收藏的预览图（Fav Display） |
| P4 | 其他封面（Other Covers） |
| P5 | 其他预览图（Other Display） |

可在设置面板中查看缓存状态、清除缓存或禁用缓存。

