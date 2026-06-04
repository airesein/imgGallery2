<script setup>
import { ref, computed, onMounted } from 'vue';
import { useAdminStore } from '../composables/useAdminStore.js';
import { useGitHub } from '../composables/useGitHub.js';

var store = useAdminStore();
var gh = useGitHub();

var tabs = ['Categories', 'Rules', 'Config', 'GitHub'];
var activeTab = ref(3);

var ghToken = ref('');
var ghOwner = ref('');
var ghRepo = ref('');
var ghBranch = ref('main');
var ghShowToken = ref(false);
var ghTesting = ref(false);
var ghTestOk = ref(false);

var catNewName = ref('');
var catRenameIdx = ref(-1);
var catRenameVal = ref('');
var catDragIdx = ref(-1);

var itemNewSource = ref('dt');
var itemNewIds = ref('');

var ruleNewName = ref('');

var showCommitModal = ref(false);
var commitMessage = ref('Update gallery data');
var committing = ref(false);
var commitFiles = ref([]);
var loadingCat = ref(false);

var selectedCat = computed(function() {
  var idx = store.selectedCatIndex.value;
  if (idx < 0 || idx >= store.categories.length) return null;
  return store.categories[idx];
});

var ruleKeys = computed(function() { return Object.keys(store.rules); });
var dirtyCount = computed(function() { return store.getDirtyCount(); });
var canCommit = computed(function() { return dirtyCount.value > 0 && !store.loading.value; });

onMounted(async function() {
  var creds = gh.getCreds();
  if (creds) {
    ghOwner.value = creds.owner;
    ghRepo.value = creds.repo;
    ghBranch.value = creds.branch;
    ghToken.value = creds.token;
    await store.loadFromGitHub();
    if (store.credsOK.value) activeTab.value = 0;
  }
});

async function saveGitHubSettings() {
  gh.setCreds(ghToken.value, ghOwner.value, ghRepo.value, ghBranch.value);
  ghTestOk.value = false;
  await store.loadFromGitHub();
  if (store.credsOK.value) activeTab.value = 0;
}

async function testGitHubConnection() {
  ghTesting.value = true; ghTestOk.value = false;
  try {
    await gh.testConnection(ghToken.value, ghOwner.value, ghRepo.value, ghBranch.value);
    ghTestOk.value = true; store.setToast('Connection OK');
  } catch (e) {
    ghTestOk.value = false; store.setToast('Failed: ' + e.message, 5000);
  } finally { ghTesting.value = false; }
}

function clearLocalCreds() {
  gh.removeCreds(); ghToken.value = ''; ghOwner.value = ''; ghRepo.value = '';
  store.credsOK.value = false; store.setToast('Cleared');
}

function doAddCategory() {
  var name = catNewName.value.trim(); if (!name) return;
  if (!store.addCategory(name)) { store.setToast('Exists'); return; }
  catNewName.value = '';
  store.selectedCatIndex.value = store.categories.length - 1;
}

function doRemoveCategory(index) {
  if (!confirm('Delete "' + store.categories[index].name + '"?')) return;
  store.removeCategory(index);
}

function startRename(index) { catRenameIdx.value = index; catRenameVal.value = store.categories[index].name; }

function finishRename(index) {
  var n = catRenameVal.value.trim();
  if (n && store.renameCategory(index, n)) catRenameIdx.value = -1;
}

function cancelRename() { catRenameIdx.value = -1; }

function onDragStart(index, e) { catDragIdx.value = index; e.dataTransfer.effectAllowed = 'move'; }
function onDragOver(e) { e.preventDefault(); }
function onDrop(index) {
  if (catDragIdx.value >= 0 && catDragIdx.value !== index) store.moveCategory(catDragIdx.value, index);
  catDragIdx.value = -1;
}

async function selectCategory(index) {
  store.selectedCatIndex.value = index;
  var cat = store.categories[index];
  if (cat && cat.items.length === 0 && store.credsOK.value) {
    loadingCat.value = true;
    await store.loadCategoryData(index);
    loadingCat.value = false;
  }
}

function doAddItems() {
  if (!selectedCat.value) return;
  var source = itemNewSource.value.trim(); if (!source) return;
  var ids = itemNewIds.value.split('\n').map(function(l){return l.trim()}).filter(function(l){return l});
  for (var i = 0; i < ids.length; i++) store.addItem(store.selectedCatIndex.value, source, ids[i]);
  itemNewIds.value = '';
}

function doRemoveItem(source, id) { store.removeItem(store.selectedCatIndex.value, source, id); }

function doAddRule() {
  var name = ruleNewName.value.trim(); if (!name) return;
  if (store.rules[name]) { store.setToast('Exists'); return; }
  store.addRule(name, { cover: '', display: '', raw: '', download: 'js' });
  ruleNewName.value = '';
}

function doRemoveRule(name) { if (confirm('Delete "' + name + '"?')) store.removeRule(name); }

function computeDirtyPreview() {
  var list = [];
  for (var i = 0; i < store.categories.length; i++) {
    var cat = store.categories[i];
    for (var j = 0; j < cat.items.length; j++) {
      list.push({ path: 'data/' + cat.name + '/1.' + cat.items[j].source, count: cat.items[j].ids.length });
    }
  }
  list.push({ path: 'rule.yaml', count: Object.keys(store.rules).length });
  list.push({ path: 'public/config.yml', extra: store.config.name || '' });
  list.push({ path: 'public/catalog.json', extra: 'auto' });
  return list;
}

function openCommitModal() { commitFiles.value = computeDirtyPreview(); showCommitModal.value = true; }

async function doCommit() {
  committing.value = true;
  try {
    await store.doCommit(commitMessage.value);
    store.setToast('Pushed!'); showCommitModal.value = false;
  } catch (e) { store.setToast('Push failed: ' + e.message, 5000); }
  finally { committing.value = false; }
}
</script>

<template>
  <div class="ap">
    <div v-if="store.toast.value" class="ap-t" @click="store.clearToast()">{{ store.toast.value }}</div>

    <div class="ap-b">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="14" height="14"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
      <span>Token stored in browser localStorage. Use a <code>repo</code>-scoped PAT.</span>
    </div>

    <div v-if="store.loading.value" class="ap-l">
      <div>Loading from GitHub...</div>
      <div class="ap-ls" v-if="store.loadProgress.value">{{ store.loadProgress.value }}</div>
    </div>

    <div v-if="store.error.value && !store.loading.value" class="ap-e" @click="store.error.value = ''">
      X {{ store.error.value }}
    </div>

    <template v-if="!store.loading.value">
      <div class="ap-tabs">
        <button v-for="(tab, i) in tabs" :key="tab" :class="['ap-tb', { on: activeTab === i }]" @click="activeTab = i">{{ tab }}</button>
      </div>

      <!-- Categories -->
      <div v-if="activeTab === 0" class="ap-p">
        <div class="cl">
          <div class="cl-l">
            <div class="cl-h">Categories ({{ store.categories.length }})</div>
            <div class="cl-i">
              <div v-for="(cat, i) in store.categories" :key="i" :class="['cl-r', { on: store.selectedCatIndex.value === i }]" draggable="true" @click="selectCategory(i)" @dragstart="onDragStart(i, $event)" @dragover="onDragOver" @drop="onDrop(i)">
                <span class="cl-g">=</span>
                <span v-if="catRenameIdx !== i" class="cl-n">{{ cat.name }}</span>
                <input v-else class="cl-ri" v-model="catRenameVal" @blur="finishRename(i)" @keyup.enter="finishRename(i)" @keyup.escape="cancelRename()" @click.stop />
                <span class="cl-t">{{ cat.items.reduce(function(s,g){return s+g.ids.length}, 0) }}</span>
                <button class="cl-b" @click.stop="startRename(i)" title="Rename"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="13" height="13"><path d="M17 3a2.85 2.85 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg></button>
                <button class="cl-b cl-bd" @click.stop="doRemoveCategory(i)" title="Delete"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="13" height="13"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg></button>
              </div>
            </div>
            <div class="cl-a">
              <input class="cl-ai" v-model="catNewName" placeholder="New category" @keyup.enter="doAddCategory" />
              <button class="cl-ab" @click="doAddCategory" :disabled="!catNewName.trim()">Add</button>
            </div>
          </div>

          <div class="cl-e">
            <template v-if="selectedCat">
              <div class="cl-eh">
                <span>{{ selectedCat.name }}</span>
                <span class="cl-ed">{{ selectedCat.description }}</span>
              </div>
              <div v-for="group in selectedCat.items" :key="group.source" class="ig">
                <div class="ig-h"><span class="ig-b">{{ group.source }}</span><span class="ig-c">{{ group.ids.length }} IDs</span></div>
                <div class="ig-l">
                  <div v-for="id in group.ids" :key="id" class="ig-r">
                    <code class="ig-id">{{ id }}</code>
                    <button class="ig-d" @click="doRemoveItem(group.source, id)" title="Remove"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="12" height="12"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
                  </div>
                </div>
              </div>
              <div class="ia">
                <select v-model="itemNewSource" class="ia-s"><option v-for="rk in ruleKeys" :key="rk" :value="rk">{{ rk }}</option></select>
                <textarea class="ia-t" v-model="itemNewIds" placeholder="Paste IDs, one per line" rows="4"></textarea>
                <button class="ia-b" @click="doAddItems" :disabled="!itemNewIds.trim()">Add {{ itemNewSource }} images</button>
              </div>
            </template>
            <div v-if="loadingCat" class="cl-em">Loading...</div>
            <div v-if="!selectedCat && !loadingCat" class="cl-em">Select a category</div>
          </div>
        </div>
      </div>

      <!-- Rules -->
      <div v-if="activeTab === 1" class="ap-p">
        <div class="rg">
          <div v-for="key in ruleKeys" :key="key" class="rc">
            <div class="rc-h"><span class="rc-n">{{ key }}</span><button class="rc-d" @click="doRemoveRule(key)" title="Remove"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="14" height="14"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button></div>
            <label class="rl">Cover <input class="ri" v-model="store.rules[key].cover" placeholder="Cover template ({{id}})" /></label>
            <label class="rl">Display <input class="ri" v-model="store.rules[key].display" placeholder="Display template" /></label>
            <label class="rl">Video <input class="ri" v-model="store.rules[key].display_video" placeholder="Video (optional)" /></label>
            <label class="rl">Raw <input class="ri" v-model="store.rules[key].raw" placeholder="Raw template" /></label>
            <label class="rl">DL <select class="ri" v-model="store.rules[key].download"><option value="js">js</option><option value="zj">zj</option></select></label>
          </div>
        </div>
        <div class="ra"><input class="rai" v-model="ruleNewName" placeholder="Rule name (e.g. lh5)" @keyup.enter="doAddRule" /><button class="rab" @click="doAddRule" :disabled="!ruleNewName.trim()">Add</button></div>
      </div>

      <!-- Config -->
      <div v-if="activeTab === 2" class="ap-p cp">
        <div class="cs"><h3>Site</h3><label class="clb">Name <input class="ci" v-model="store.config.name" /></label><label class="clb">URL <input class="ci" v-model="store.config.url" /></label><label class="clb">Desc <input class="ci" v-model="store.config.description" /></label><label class="clb">KW <input class="ci" v-model="store.config.keywords" /></label><label class="clb">Fav <input class="ci" v-model="store.config.favicon" /></label></div>
        <div class="cs"><h3>Meta</h3><label class="clb">Title <input class="ci" v-model="store.config.meta.title" /></label><label class="clb">Desc <input class="ci" v-model="store.config.meta.description" /></label><label class="clb">OG <input class="ci" v-model="store.config.meta.ogImage" /></label></div>
        <div class="cs"><h3>Settings</h3><label class="clb">Gap <input class="ci" type="number" v-model.number="store.config.settings.defaultCardGap" /></label><label class="clb">Cols <input class="ci" type="number" v-model.number="store.config.settings.defaultColumns" /></label></div>
        <div class="cs"><h3>GitHub</h3><label class="clb cli"><input type="checkbox" v-model="store.config.github.show" /> Show</label><label class="clb">URL <input class="ci" v-model="store.config.github.url" /></label></div>
      </div>

      <!-- GitHub Settings -->
      <div v-if="activeTab === 3" class="ap-p gp">
        <div class="gf">
          <label class="gl">Token
            <div class="giw"><input :type="ghShowToken ? 'text' : 'password'" class="gi" v-model="ghToken" placeholder="ghp_..." /><button class="gt" @click="ghShowToken = !ghShowToken" :title="ghShowToken ? 'Hide' : 'Show'">
              <svg v-if="ghShowToken" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="14" height="14"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
              <svg v-if="!ghShowToken" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="14" height="14"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
            </button></div>
          </label>
          <label class="gl">Owner <input class="gi" v-model="ghOwner" placeholder="airesein" /></label>
          <label class="gl">Repo <input class="gi" v-model="ghRepo" placeholder="imgGallery2" /></label>
          <label class="gl">Branch <input class="gi" v-model="ghBranch" placeholder="main" /></label>
          <div class="ga">
            <button class="gb gbt" @click="testGitHubConnection" :disabled="ghTesting || !ghToken || !ghOwner || !ghRepo">{{ ghTesting ? '...' : (ghTestOk ? 'OK' : 'Test') }}</button>
            <button class="gb gbs" @click="saveGitHubSettings" :disabled="!ghToken || !ghOwner || !ghRepo">Save + Load</button>
            <button v-if="store.credsOK.value || ghToken" class="gb gbc" @click="clearLocalCreds">Clear</button>
          </div>
        </div>
      </div>
    </template>

    <div v-if="store.credsOK.value && !store.loading.value" class="ab">
      <span class="abs"><template v-if="dirtyCount > 0">{{ dirtyCount }} file(s) modified</template><template v-if="dirtyCount === 0">No changes</template></span>
      <button class="abb" @click="openCommitModal" :disabled="!canCommit">Commit + Push</button>
    </div>

    <div v-if="showCommitModal" class="amo" @click.self="showCommitModal = false">
      <div class="am">
        <div class="amh"><span>Commit</span><button class="amx" @click="showCommitModal = false"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="16" height="16"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button></div>
        <div class="amb">
          <div class="cf">
            <div v-for="f in commitFiles" :key="f.path" class="cfr">
              <code class="cfp">{{ f.path }}</code>
              <span v-if="f.count !== undefined" class="cfm">{{ f.count }} IDs</span>
              <span v-if="f.count === undefined && f.extra" class="cfm">{{ f.extra }}</span>
            </div>
          </div>
          <label class="cml">Message <input class="cmi" v-model="commitMessage" placeholder="Describe changes..." /></label>
        </div>
        <div class="amf"><button class="amc" @click="showCommitModal = false">Cancel</button><button class="amcf" @click="doCommit" :disabled="committing || !commitMessage.trim()">{{ committing ? '...' : 'Push' }}</button></div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.ap{min-height:100vh;background:var(--bg-main);color:var(--text-body);padding-bottom:64px}
.ap-t{position:fixed;bottom:68px;right:14px;z-index:9999;padding:8px 16px;border-radius:8px;font-size:13px;background:var(--bg-overlay);backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px);border:1px solid var(--border-subtle);box-shadow:0 4px 20px rgba(0,0,0,0.12);cursor:pointer}
.ap-b{display:flex;align-items:center;gap:8px;padding:8px 20px;background:rgba(179,142,109,0.1);border-bottom:1px solid var(--border-subtle);font-size:12px;color:var(--text-secondary)}
.ap-b code{font-size:11px;background:rgba(30,32,34,0.06);padding:1px 5px;border-radius:4px}
.ap-l{display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:200px;font-size:16px;color:var(--text-muted);gap:8px}
.ap-ls{font-size:12px;color:var(--color-accent)}
.ap-e{display:flex;align-items:center;justify-content:center;gap:8px;margin:10px 20px;padding:10px 20px;font-size:13px;color:var(--color-error);background:var(--color-error-bg);border-radius:8px;border:1px solid rgba(194,95,78,0.2);cursor:pointer}
.ap-tabs{display:flex;gap:0;border-bottom:1px solid var(--border-subtle);padding:0 20px;background:var(--bg-surface)}
.ap-tb{padding:14px 20px;border:none;background:none;font-size:14px;color:var(--text-secondary);cursor:pointer;border-bottom:2px solid transparent;transition:all .15s;font-family:inherit}
.ap-tb:hover{color:var(--text-primary)}
.ap-tb.on{color:var(--text-primary);font-weight:600;border-bottom-color:var(--color-accent)}
.ap-p{padding:24px 20px;max-width:1200px;margin:0 auto}
.cl{display:grid;grid-template-columns:260px 1fr;gap:20px;min-height:400px}
.cl-l{border:1px solid var(--border-subtle);border-radius:8px;background:var(--bg-surface);display:flex;flex-direction:column}
.cl-h{padding:12px 14px;font-size:13px;font-weight:600;color:var(--text-secondary);border-bottom:1px solid var(--border-subtle)}
.cl-i{flex:1;overflow-y:auto}
.cl-r{display:flex;align-items:center;gap:6px;padding:8px 10px;cursor:pointer;font-size:14px;border-bottom:1px solid var(--border-subtle);transition:background .1s}
.cl-r:hover{background:rgba(30,32,34,0.04)}
.cl-r.on{background:rgba(179,142,109,0.12);font-weight:600}
.cl-g{color:var(--text-muted);font-size:12px;cursor:grab;flex-shrink:0;font-weight:700}
.cl-n{flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.cl-t{color:var(--text-muted);font-size:11px;flex-shrink:0}
.cl-b{background:none;border:none;color:var(--text-muted);cursor:pointer;padding:2px;border-radius:4px;flex-shrink:0}
.cl-b:hover{color:var(--text-primary);background:rgba(30,32,34,0.06)}
.cl-bd:hover{color:var(--color-error)}
.cl-ri{flex:1;border:1px solid var(--border-active);border-radius:4px;padding:2px 6px;font-size:14px;background:var(--bg-main);font-family:inherit}
.cl-a{display:flex;gap:6px;padding:10px;border-top:1px solid var(--border-subtle)}
.cl-ai{flex:1;border:1px solid var(--border-subtle);border-radius:6px;padding:6px 10px;font-size:13px;background:var(--bg-main);font-family:inherit}
.cl-ab{padding:6px 14px;border:none;border-radius:6px;background:var(--color-accent);color:#fff;font-size:13px;cursor:pointer;font-family:inherit}
.cl-ab:disabled{opacity:.4;cursor:default}
.cl-e{border:1px solid var(--border-subtle);border-radius:8px;background:var(--bg-surface);padding:16px}
.cl-eh{margin-bottom:16px;font-size:15px;font-weight:600;display:flex;flex-direction:column;gap:4px}
.cl-ed{font-size:12px;color:var(--text-muted);font-weight:400;white-space:pre-wrap}
.cl-em{display:flex;align-items:center;justify-content:center;min-height:200px;color:var(--text-muted);font-size:14px}
.ig{margin-bottom:16px}
.ig-h{display:flex;align-items:center;gap:8px;margin-bottom:6px}
.ig-b{padding:2px 8px;border-radius:4px;font-size:11px;font-weight:600;background:var(--color-accent);color:#fff}
.ig-c{font-size:11px;color:var(--text-muted)}
.ig-l{max-height:200px;overflow-y:auto;font-size:12px;background:var(--bg-main);border-radius:6px;border:1px solid var(--border-subtle)}
.ig-r{display:flex;align-items:center;gap:6px;padding:4px 8px;border-bottom:1px solid var(--border-subtle)}
.ig-r:last-child{border-bottom:none}
.ig-id{flex:1;font-size:11px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.ig-d{background:none;border:none;color:var(--text-muted);cursor:pointer;padding:2px;border-radius:4px;flex-shrink:0}
.ig-d:hover{color:var(--color-error)}
.ia{margin-top:16px}
.ia-s{padding:5px 10px;border:1px solid var(--border-subtle);border-radius:6px;font-size:13px;background:var(--bg-main);font-family:inherit;margin-bottom:8px;display:block}
.ia-t{width:100%;border:1px solid var(--border-subtle);border-radius:6px;padding:8px 10px;font-size:12px;font-family:monospace;background:var(--bg-main);resize:vertical}
.ia-b{margin-top:8px;padding:6px 14px;border:none;border-radius:6px;background:var(--color-accent);color:#fff;font-size:13px;cursor:pointer;font-family:inherit}
.ia-b:disabled{opacity:.4;cursor:default}
.rg{display:grid;grid-template-columns:repeat(auto-fill, minmax(360px, 1fr));gap:16px}
.rc{border:1px solid var(--border-subtle);border-radius:8px;background:var(--bg-surface);padding:16px}
.rc-h{display:flex;align-items:center;justify-content:space-between;margin-bottom:12px}
.rc-n{font-weight:600;font-size:14px;padding:2px 8px;border-radius:4px;background:var(--color-accent);color:#fff}
.rc-d{background:none;border:none;color:var(--text-muted);cursor:pointer;padding:2px;border-radius:4px}
.rc-d:hover{color:var(--color-error)}
.rl{display:flex;flex-direction:column;gap:3px;font-size:11px;color:var(--text-secondary);margin-bottom:8px}
.ri{padding:5px 8px;border:1px solid var(--border-subtle);border-radius:4px;font-size:12px;font-family:monospace;background:var(--bg-main)}
.ra{display:flex;gap:8px;margin-top:16px}
.rai{padding:7px 12px;border:1px solid var(--border-subtle);border-radius:6px;font-size:13px;font-family:inherit;background:var(--bg-main);width:200px}
.rab{padding:7px 16px;border:none;border-radius:6px;background:var(--color-accent);color:#fff;font-size:13px;cursor:pointer;font-family:inherit}
.rab:disabled{opacity:.4;cursor:default}
.cp{max-width:600px}
.cs{margin-bottom:24px}
.cs h3{font-size:14px;font-weight:600;color:var(--text-primary);margin-bottom:10px;padding-bottom:6px;border-bottom:1px solid var(--border-subtle)}
.clb{display:flex;flex-direction:column;gap:4px;font-size:12px;color:var(--text-secondary);margin-bottom:10px}
.cli{flex-direction:row;align-items:center;gap:8px}
.ci{padding:7px 10px;border:1px solid var(--border-subtle);border-radius:6px;font-size:13px;font-family:inherit;background:var(--bg-main)}
.gp{max-width:440px}
.gf{display:flex;flex-direction:column;gap:14px}
.gl{display:flex;flex-direction:column;gap:4px;font-size:13px;color:var(--text-secondary)}
.gi{padding:8px 12px;border:1px solid var(--border-subtle);border-radius:6px;font-size:14px;font-family:monospace;background:var(--bg-main)}
.giw{display:flex;position:relative}
.giw .gi{flex:1;padding-right:36px}
.gt{position:absolute;right:5px;top:50%;transform:translateY(-50%);background:none;border:none;color:var(--text-muted);cursor:pointer;padding:4px;border-radius:4px}
.gt:hover{color:var(--text-primary)}
.ga{display:flex;gap:10px;margin-top:6px;flex-wrap:wrap}
.gb{padding:8px 18px;border:none;border-radius:6px;font-size:14px;cursor:pointer;font-family:inherit}
.gb:disabled{opacity:.4;cursor:default}
.gbt{background:var(--bg-surface);color:var(--text-primary);border:1px solid var(--border-subtle)}
.gbs{background:var(--color-accent);color:#fff}
.gbc{background:none;color:var(--color-error);border:1px solid var(--color-error)}
.ab{position:fixed;bottom:0;left:0;right:0;padding:12px 24px;z-index:50;display:flex;align-items:center;justify-content:space-between;background:var(--bg-overlay);backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);border-top:1px solid var(--border-subtle)}
.abs{font-size:13px;color:var(--text-secondary)}
.abb{padding:8px 24px;border:none;border-radius:8px;background:var(--color-accent);color:#fff;font-size:14px;font-weight:600;cursor:pointer;font-family:inherit}
.abb:disabled{opacity:.4;cursor:default}
.amo{position:fixed;inset:0;z-index:200;background:rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center}
.am{background:var(--bg-main);border-radius:12px;width:90vw;max-width:520px;box-shadow:0 8px 40px rgba(0,0,0,0.15)}
.amh{display:flex;align-items:center;justify-content:space-between;padding:16px 20px;border-bottom:1px solid var(--border-subtle);font-size:15px;font-weight:600}
.amx{background:none;border:none;color:var(--text-muted);cursor:pointer;padding:2px;border-radius:4px}
.amx:hover{color:var(--text-primary)}
.amb{padding:20px}
.cf{max-height:200px;overflow-y:auto;margin-bottom:16px;border:1px solid var(--border-subtle);border-radius:8px;background:var(--bg-surface)}
.cfr{display:flex;align-items:center;justify-content:space-between;padding:6px 12px;font-size:12px;border-bottom:1px solid var(--border-subtle)}
.cfr:last-child{border-bottom:none}
.cfp{font-family:monospace;font-size:11px;color:var(--text-primary)}
.cfm{font-size:11px;color:var(--text-muted);white-space:nowrap}
.cml{display:flex;flex-direction:column;gap:4px;font-size:12px;color:var(--text-secondary)}
.cmi{padding:8px 12px;border:1px solid var(--border-subtle);border-radius:6px;font-size:14px;font-family:inherit;background:var(--bg-main)}
.amf{display:flex;gap:10px;justify-content:flex-end;padding:16px 20px;border-top:1px solid var(--border-subtle)}
.amc{padding:8px 20px;border:1px solid var(--border-subtle);border-radius:8px;background:var(--bg-surface);font-size:14px;cursor:pointer;font-family:inherit}
.amcf{padding:8px 24px;border:none;border-radius:8px;background:var(--color-accent);color:#fff;font-size:14px;font-weight:600;cursor:pointer;font-family:inherit}
.amcf:disabled{opacity:.4;cursor:default}
</style>
