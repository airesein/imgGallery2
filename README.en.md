<div align="center">
  <img src="public/favicon.png" alt="Logo" width="92" height="92" />

  <h1>Img Gallery</h1>

  <p>
    A Vue 3 + Vite powered image browsing gallery with multi-source support, category browsing, favorites, full-screen preview, and batch download.
  </p>

  <p>
    <a href="./README.md">简体中文</a> / English
  </p>
</div>

![image-20260524155059343](assect/README/image-20260524155059343.png)

![image-20260524155127236](assect/README/image-20260524155127236.png)

---

## Quick Start

```bash
# Install dependencies
npm install

# Development mode
npm run dev

# Build production version
npm run build

# Preview production version
npm run preview
```

## Configuration

### rule.yaml Explained

`rule.yaml` is the **image source rule configuration file** that defines URL generation rules for third-party image hosts.

#### Configuration Structure

Each image source configuration contains the following fields:

| Field | Description |
|-------|-------------|
| `name` | Source name, corresponds to filenames under `data/` (e.g., `lh5`, `dt`) |
| `cover` | **Thumbnail URL template**, used for list page display |
| `display` | **Preview URL template**, used for detail page / full-screen viewing |
| `raw` | **Original image URL template**, used for downloading or highest resolution |
| `download` | **Download method**: `js` for JavaScript download, `zj` for redirect download |

The `{{id}}` in all URL templates will be automatically replaced with the corresponding ID. If the resource is a video, append `_video` to the field name.

#### Example Breakdown

Using `lh5` (NetEase Album) as an example:

```yaml
- name: "lh5"
  cover: "https://imglf5.lf127.net/img/{{id}}.jpg?imageView&thumbnail=811x0"
  display: "https://imglf5.lf127.net/img/{{id}}.jpg"
  raw: "https://imglf5.lf127.net/img/{{id}}.jpg"
  download: "js"
```

Thumbnail: https://imglf5.lf127.net/img/ab828c669a6a693b/MVoxa3hqaHFmdHVhT09aR01tRUZxYWpiRVN4ZGN3Njk.jpg?imageView&thumbnail=811x0

Original: https://imglf5.lf127.net/img/ab828c669a6a693b/MVoxa3hqaHFmdHVhT09aR01tRUZxYWpiRVN4ZGN3Njk.jpg

Simply replace the middle variable part with `{{id}}` and store the IDs in **`/data/category_name/xx.lh5`**, where **`category_name`** is the category displayed on the website.

## Adding New Content

### 1. Create Category Directory

Create a directory under `data/`, e.g., `data/MyCategory/`

### 2. Add Source Files

Create files named after the source extension under the category directory (e.g., `lh5`), one resource ID per line:

`data/MyCategory/1.lh5`

```
abc123def456
ghi789jkl012
```

### 3. Add Description File (Optional)

Add a `readme.md` file under the corresponding category folder.

## Site Information Configuration

`public/config.yml`

```yml
# Site configuration
name: "Ziworld"
url: "https://gallery.ziworld.top"
description: "Nothing is perfect; the world is not perfect, which is why it's beautiful."
keywords: "ziworld, images, wallpaper"
favicon: "/favicon.ico"

# Meta tags (auto-fallback to name/description if empty)
meta:
  title: "Ziworld"
  description: "My Gallery"
  ogImage: ""

# Default settings
settings:
  defaultCardGap: 10
  defaultColumns: 0

# GitHub icon (displayed on the right side of the homepage search bar)
github:
  show: true
  url: "https://github.com/airesein/imgGallery2"

```

## Project Structure

```
├── data/                    # Category data directories (each directory is a category)
│   ├── Genshin/
│   │   ├── lh5              # NetEase Album lh5 source ID list
│   │   └── dt               # Duitang source ID list
│   ├── Honkai/
│   └── ...
├── public/
│   └── sw.js                # Service Worker (image caching)
├── scripts/
│   └── generate-catalog.mjs # Catalog generation script
├── src/
│   ├── components/          # Vue components
│   ├── composables/         # Composable functions
│   ├── router/              # Router configuration
│   ├── utils/               # Utility functions
│   ├── App.vue
│   └── main.js
├── rule.yaml                # Image source rule configuration
├── vite.config.js
└── package.json
```

---

**Language**: 🇨🇳 [中文文档](README.md) | 🇬🇧 [English](README.en.md)
