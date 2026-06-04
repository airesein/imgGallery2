import { reactive, ref } from 'vue';
import { useGitHub } from './useGitHub.js';

const gh = useGitHub();

/* in-browser catalog generation (ported from generate-catalog.mjs) */
function generateCatalog(rulesObj, categoriesData) {
  const rulesOut = {};
  for (const [name, rule] of Object.entries(rulesObj)) {
    rulesOut[name] = {
      cover: rule.cover || '',
      display: rule.display || '',
      display_video: rule.display_video || '',
      raw: rule.raw || '',
      download: rule.download || 'zj',
    };
  }
  const categories = [];
  for (const cat of categoriesData) {
    const items = [];
    for (const group of cat.items) {
      const ext = group.source;
      if (!rulesOut[ext]) continue;
      const ids = group.ids.filter(id => id.trim());
      if (ids.length === 0) continue;
      const type = rulesOut[ext].display_video ? 'video' : 'image';
      items.push({ source: ext, type, ids });
    }
    if (items.length === 0) continue;
    const total = items.reduce((s, g) => s + g.ids.length, 0);
    const firstId = items[0].ids[0];
    const coverTpl = rulesOut[items[0].source].cover || '';
    const cover = coverTpl.replace(/\{\{id\}\}/g, firstId);
    categories.push({ name: cat.name, description: cat.description || '', total, cover, items });
  }
  return { rules: rulesOut, categories };
}

/* ---- yaml serializer for config.yml ---- */
function serializeConfigYaml(cfg) {
  var s = cfg.settings || {};
  var m = cfg.meta || {};
  var gh = cfg.github || {};
  return [
    '# site config',
    'name: "' + (cfg.name || '') + '"',
    'url: "' + (cfg.url || '') + '"',
    'description: "' + (cfg.description || '') + '"',
    'keywords: "' + (cfg.keywords || '') + '"',
    'favicon: "' + (cfg.favicon || '/favicon.ico') + '"',
    '',
    '# meta tags',
    'meta:',
    '  title: "' + (m.title || '') + '"',
    '  description: "' + (m.description || '') + '"',
    '  ogImage: "' + (m.ogImage || '') + '"',
    '',
    '# default settings',
    'settings:',
    '  defaultCardGap: ' + (s.defaultCardGap != null ? s.defaultCardGap : 10),
    '  defaultColumns: ' + (s.defaultColumns != null ? s.defaultColumns : 0),
    '',
    '# github link',
    'github:',
    '  show: ' + (gh.show !== false),
    '  url: "' + (gh.url || '') + '"',
  ].join('\n') + '\n';
}

/* ---- yaml serializer for rule.yaml ---- */
function serializeRulesYaml(rulesObj) {
  var lines = [];
  for (var name in rulesObj) {
    var rule = rulesObj[name];
    lines.push('- name: "' + name + '"');
    lines.push('  cover: "' + (rule.cover || '') + '"');
    if (rule.display_video) lines.push('  display_video: "' + rule.display_video + '"');
    lines.push('  display: "' + (rule.display || '') + '"');
    lines.push('  raw: "' + (rule.raw || '') + '"');
    lines.push('  download: "' + (rule.download || 'js') + '"');
    lines.push('');
  }
  return lines.join('\n');
}

/* ---- data file serializer (one id per line) ---- */
function serializeDataFile(ids) {
  return ids.join('\n') + '\n';
}

/* ---- default config ---- */
function defaultConfig() {
  return {
    name: '', url: '', description: '', keywords: '', favicon: '/favicon.ico',
    meta: { title: '', description: '', ogImage: '' },
    settings: { defaultCardGap: 10, defaultColumns: 0 },
    github: { show: true, url: '' },
  };
}

function defaultRules() {
  return {
    lh5: { cover: '', display: '', raw: '', download: 'js' },
    lh6: { cover: '', display: '', raw: '', download: 'js' },
    dt:  { cover: '', display: '', raw: '', download: 'js' },
    xxt: { cover: '', display: '', raw: '', download: 'js' },
    zoho:{ cover: '', display_video: '', raw: '', download: 'zj' },
  };
}

/* ---- singleton store ---- */
var loading = ref(false);
var error = ref('');
var toast = ref('');
var credsOK = ref(false);

var rules = reactive({});
Object.assign(rules, defaultRules());
var config = reactive(defaultConfig());
var categories = reactive([]);

var _origRules = null;
var _cachedTree = null;
var _dataFileIndex = null;
var _origConfig = null;
var _origCategories = null;

var selectedCatIndex = ref(-1);
var loadProgress = ref('');

function setToast(msg, ms) {
  if (ms === void 0) ms = 3000;
  toast.value = msg;
  if (ms) setTimeout(function() { if (toast.value === msg) toast.value = ''; }, ms);
}

function clearToast() { toast.value = ''; }

/* ---- load from GitHub ---- */
async function loadFromGitHub() {
  var creds = gh.getCreds();
  if (!creds) { credsOK.value = false; return; }
  console.log("[loadFromGitHub] Bootstrap...");
  loading.value = true; error.value = "";
  loadProgress.value = "Connecting...";
  try {
    await gh.testConnection(creds.token, creds.owner, creds.repo, creds.branch);
    credsOK.value = true;

    // Fetch tree once and cache (1 call)
    loadProgress.value = "Fetching repo structure...";
    var treeRes = await gh.getRepoTree(creds);
    _cachedTree = treeRes.tree;
    console.log("[loadFromGitHub] Tree cached, " + _cachedTree.tree.length + " entries");

    // Build data-file index from tree
    _dataFileIndex = {};
    for (var i = 0; i < _cachedTree.tree.length; i++) {
      var entry = _cachedTree.tree[i];
      if (entry.path.indexOf("data/") === 0 && entry.type === "blob") {
        var parts = entry.path.split("/");
        if (parts.length >= 3) {
          var catName = parts[1];
          var fname = parts[2];
          if (!catName || !fname) continue;
          if (!_dataFileIndex[catName]) _dataFileIndex[catName] = [];
          _dataFileIndex[catName].push({ name: fname, path: entry.path });
        }
      }
    }

    // Load catalog.json (1 call)
    loadProgress.value = "Loading catalog...";
    var catRaw = await gh.getFileContent(creds, "public/catalog.json");
    var catalog = JSON.parse(catRaw);

    // Load rule.yaml + config.yml (2 calls)
    loadProgress.value = "Loading configs...";
    var rulesData = {};
    Object.assign(rulesData, defaultRules());
    try {
      var rRaw = await gh.getFileContent(creds, "rule.yaml");
      Object.assign(rulesData, parseRuleYaml(rRaw));
    } catch (e) {}
    var configData = defaultConfig();
    try {
      var cRaw = await gh.getFileContent(creds, "public/config.yml");
      console.log('[config] raw:', cRaw.substring(0, 500));
      configData = Object.assign({}, defaultConfig(), parseConfigYaml(cRaw));
      console.log('[config] parsed name:', configData.name, 'meta:', JSON.stringify(configData.meta));
    } catch (e) {}

    Object.assign(rules, rulesData);
    Object.assign(config, configData);
    console.log('[config] final name:', config.name, 'url:', config.url, 'desc:', (config.description||'').substring(0,40), 'ghShow:', config.github.show, 'ghUrl:', config.github.url);

    // Build category shells
    categories.splice(0, categories.length);
    for (var i = 0; i < catalog.categories.length; i++) {
      var cat = catalog.categories[i];
      categories.push({ name: cat.name, description: cat.description || "", items: [] });
    }

    _origRules = JSON.parse(JSON.stringify(rulesData));
    _origConfig = JSON.parse(JSON.stringify(configData));
    _origCategories = JSON.parse(JSON.stringify(categories));

    loadProgress.value = "";
    console.log("[loadFromGitHub] Bootstrap done, " + categories.length + " categories");
    setToast("Loaded " + categories.length + " categories");
  } catch (e) {
    console.error("[loadFromGitHub] ERROR:", e.message);
    error.value = e.message; credsOK.value = false;
    loadProgress.value = "";
    setToast("Load failed: " + e.message);
  } finally {
    loading.value = false;
  }
}

// Lazy-load category data using cached tree (no extra API call to find files)// Lazy-load a category data files on demand
async function loadCategoryData(catIndex) {
  if (catIndex < 0 || catIndex >= categories.length) return;
  var cat = categories[catIndex];
  if (cat.items.length > 0) return;
  var creds = gh.getCreds();
  if (!creds) return;
  var expr = creds.branch + ":data/" + cat.name + "/";
  console.log("[loadCategory] GraphQL: " + cat.name);
  loadProgress.value = cat.name + "...";
  try {
    var query = "query($owner:String!, $repo:String!, $expr:String!){repository(owner:$owner,name:$repo){dir:object(expression:$expr){... on Tree{entries{name type object{... on Blob{text}}}}}}}";
    var data = await gh.graphql(creds, query, { owner: creds.owner, repo: creds.repo, expr: expr });
    var entries = (data.repository.dir && data.repository.dir.entries) ? data.repository.dir.entries : [];
    for (var fi = 0; fi < entries.length; fi++) {
      var entry = entries[fi];
      if (entry.type !== "blob" || !entry.object || !entry.object.text) continue;
      if (entry.name === "readme.md") {
        cat.description = entry.object.text;
        continue;
      }
      var extIdx = entry.name.lastIndexOf(".");
      if (extIdx === -1) continue;
      var ext = entry.name.substring(extIdx + 1);
      if (!rules[ext]) continue;
      var ids = entry.object.text.split("\n").map(function(l) { return l.trim(); }).filter(function(l) { return l; });
      if (ids.length > 0) {
        var group = null;
        for (var gi = 0; gi < cat.items.length; gi++) {
          if (cat.items[gi].source === ext) { group = cat.items[gi]; break; }
        }
        if (!group) { group = { source: ext, ids: [] }; cat.items.push(group); }
        group.ids.push.apply(group.ids, ids);
      }
    }
    loadProgress.value = "";
    console.log("[loadCategory] " + cat.name + " loaded via GraphQL");
  } catch (e) {
    console.error("[loadCategory] ERROR:", e.message);
    loadProgress.value = "";
    setToast("Failed to load " + cat.name);
  }
}

function parseConfigYaml(raw) {
  var cfg = defaultConfig();
  console.log('[config/parse] starting, lines:', lines.length);
  var lines = raw.split('\n');
  var section = '';
  for (var i = 0; i < lines.length; i++) {
    var trimmed = lines[i].trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    var idx = trimmed.indexOf(':');
    if (idx === -1) continue;
    var key = trimmed.substring(0, idx).trim();
    var val = trimmed.substring(idx + 1).trim();
    val = val.replace(/^"(.*)"$/, '$1').replace(/^'(.*)'$/, '$1');

    if (['name','url','description','keywords','favicon'].indexOf(key) !== -1) {
      console.log('[config/parse] top:', key, '=', val.substring(0,30));
      cfg[key] = val;
    } else if (key === 'meta' || key === 'settings' || key === 'github') {
      console.log('[config/parse] section:', key);
      section = key;
    } else if (section === 'meta') {
      console.log('[config/parse] meta:', key, '=', val);
      cfg.meta[key] = val;
    } else if (section === 'settings') {
      console.log('[config/parse] settings:', key, '=', val);
      cfg.settings[key] = isNaN(Number(val)) ? val : Number(val);
    } else if (section === 'github') {
      console.log('[config/parse] github:', key, '=', val);
      if (key === 'show') cfg.github.show = val === 'true';
      else if (key === 'url') cfg.github.url = val;
    }
  }
  return cfg;
}

function parseRuleYaml(raw) {
  var result = {};
  var lines = raw.split('\n');
  var current = null;
  for (var i = 0; i < lines.length; i++) {
    var trimmed = lines[i].trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    if (trimmed.startsWith('- name:')) {
      var name = trimmed.substring(7).trim().replace(/"/g, '');
      current = { cover: '', display: '', display_video: '', raw: '', download: 'js' };
      result[name] = current;
    } else if (current && trimmed.startsWith('cover:')) {
      current.cover = trimmed.substring(6).trim().replace(/"/g, '');
    } else if (current && trimmed.startsWith('display_video:')) {
      current.display_video = trimmed.substring(14).trim().replace(/"/g, '');
    } else if (current && trimmed.startsWith('display:')) {
      current.display = trimmed.substring(8).trim().replace(/"/g, '');
    } else if (current && trimmed.startsWith('raw:')) {
      current.raw = trimmed.substring(4).trim().replace(/"/g, '');
    } else if (current && trimmed.startsWith('download:')) {
      current.download = trimmed.substring(9).trim().replace(/"/g, '');
    }
  }
  return result;
}

/* ---- dirty tracking ---- */
function getDirtyFiles() {
  var files = [];
  if (_origRules && JSON.stringify(rules) !== JSON.stringify(_origRules)) {
    files.push({ path: 'rule.yaml', content: serializeRulesYaml(rules) });
  }
  if (_origConfig && JSON.stringify(config) !== JSON.stringify(_origConfig)) {
    files.push({ path: 'public/config.yml', content: serializeConfigYaml(config) });
  }
  if (_origCategories && JSON.stringify(categories) !== JSON.stringify(_origCategories)) {
    for (var i = 0; i < categories.length; i++) {
      var cat = categories[i];
      var origCat = null;
      for (var j = 0; j < (_origCategories || []).length; j++) {
        if (_origCategories[j].name === cat.name) { origCat = _origCategories[j]; break; }
      }
      if (!origCat || JSON.stringify(cat.items) !== JSON.stringify(origCat.items)) {
        for (var k = 0; k < cat.items.length; k++) {
          var group = cat.items[k];
          var ext = group.source;
          var fileName = '1.' + ext;
          files.push({ path: 'data/' + cat.name + '/' + fileName, content: serializeDataFile(group.ids) });
        }
      }
    }
    for (var li = 0; li < (_origCategories || []).length; li++) {
      var origCat2 = _origCategories[li];
      var found = false;
      for (var mi = 0; mi < categories.length; mi++) {
        if (categories[mi].name === origCat2.name) { found = true; break; }
      }
      if (!found) {
        for (var ni = 0; ni < origCat2.items.length; ni++) {
          var g2 = origCat2.items[ni];
          files.push({ path: 'data/' + origCat2.name + '/1.' + g2.source, content: '' });
        }
      }
    }
  }
  return files;
}

function getDirtyCount() {
  return getDirtyFiles().length;
}

/* ---- commit ---- */
async function doCommit(message) {
  var creds = gh.getCreds();
  if (!creds) return;
  var files = getDirtyFiles();
  var catalogData = generateCatalog(rules, categories);
  var catalogJson = JSON.stringify(catalogData);
  files = files.filter(function(f) { return f.path !== 'public/catalog.json'; });
  files.push({ path: 'public/catalog.json', content: catalogJson });
  await gh.pushCommit(creds, message, files);
  _origRules = JSON.parse(JSON.stringify(rules));
  _origConfig = JSON.parse(JSON.stringify(config));
  _origCategories = JSON.parse(JSON.stringify(categories));
}

/* ---- category helpers ---- */
function addCategory(name) {
  for (var i = 0; i < categories.length; i++) {
    if (categories[i].name === name) return false;
  }
  categories.push({ name: name, description: '', items: [] });
  return true;
}

function removeCategory(index) {
  if (index < 0 || index >= categories.length) return false;
  categories.splice(index, 1);
  if (selectedCatIndex.value >= categories.length) selectedCatIndex.value = -1;
  return true;
}

function renameCategory(index, newName) {
  if (index < 0 || index >= categories.length) return false;
  for (var i = 0; i < categories.length; i++) {
    if (i !== index && categories[i].name === newName) return false;
  }
  categories[index].name = newName;
  return true;
}

function moveCategory(fromIndex, toIndex) {
  if (fromIndex < 0 || fromIndex >= categories.length) return;
  if (toIndex < 0 || toIndex >= categories.length) return;
  var item = categories.splice(fromIndex, 1)[0];
  categories.splice(toIndex, 0, item);
}

/* ---- item helpers ---- */
function addItem(catIndex, source, id) {
  if (catIndex < 0 || catIndex >= categories.length) return;
  var cat = categories[catIndex];
  var group = null;
  for (var i = 0; i < cat.items.length; i++) {
    if (cat.items[i].source === source) { group = cat.items[i]; break; }
  }
  if (!group) {
    group = { source: source, ids: [] };
    cat.items.push(group);
  }
  if (group.ids.indexOf(id) === -1) group.ids.push(id);
}

function removeItem(catIndex, source, id) {
  if (catIndex < 0 || catIndex >= categories.length) return;
  var cat = categories[catIndex];
  var group = null;
  for (var i = 0; i < cat.items.length; i++) {
    if (cat.items[i].source === source) { group = cat.items[i]; break; }
  }
  if (!group) return;
  var newIds = [];
  for (var i = 0; i < group.ids.length; i++) {
    if (group.ids[i] !== id) newIds.push(group.ids[i]);
  }
  group.ids = newIds;
  if (group.ids.length === 0) {
    var newItems = [];
    for (var j = 0; j < cat.items.length; j++) {
      if (cat.items[j].source !== source) newItems.push(cat.items[j]);
    }
    cat.items = newItems;
  }
}

/* ---- rule helpers ---- */
function addRule(name, ruleData) {
  var data = {};
  for (var key in ruleData) data[key] = ruleData[key];
  rules[name] = data;
}

function removeRule(name) {
  delete rules[name];
}

export function useAdminStore() {
  return {
    loading: loading, error: error, toast: toast, credsOK: credsOK,
    rules: rules, config: config, categories: categories,
    selectedCatIndex: selectedCatIndex,
    loadProgress: loadProgress,
    setToast: setToast, clearToast: clearToast,
    loadFromGitHub: loadFromGitHub,
    loadCategoryData: loadCategoryData,
    getDirtyCount: getDirtyCount,
    doCommit: doCommit,
    addCategory: addCategory, removeCategory: removeCategory,
    renameCategory: renameCategory, moveCategory: moveCategory,
    addItem: addItem, removeItem: removeItem,
    addRule: addRule, removeRule: removeRule,
    generateCatalog: generateCatalog,
  };
}

export default useAdminStore;
