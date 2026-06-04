/**
 * GitHub API wrapper for admin page.
 * Uses fine-grained Personal Access Token stored in localStorage.
 * Each API call has a 15-second timeout via AbortController.
 */
var STORAGE_KEY = 'admin_github_creds';

/* ---------- localStorage helpers ---------- */
function loadCreds() {
  try {
    var raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    var json = JSON.parse(atob(raw));
    if (json.token && json.owner && json.repo && json.branch) return json;
    return null;
  } catch (e) { return null; }
}

function saveCreds(token, owner, repo, branch) {
  var json = { token: token, owner: owner, repo: repo, branch: branch };
  localStorage.setItem(STORAGE_KEY, btoa(JSON.stringify(json)));
}

function clearCreds() {
  localStorage.removeItem(STORAGE_KEY);
}

/* ---------- API helpers ---------- */
function apiBase(creds) {
  return 'https://api.github.com/repos/' + creds.owner + '/' + creds.repo;
}

function authHeaders(creds) {
  return {
    Authorization: 'token ' + creds.token,
    Accept: 'application/vnd.github.v3+json',
  };
}

async function ghFetch(creds, path, opts) {
  opts = opts || {};
  var url = path.indexOf('https://') === 0 ? path : apiBase(creds) + path;
  console.log('[ghFetch]', (opts.method || 'GET'), url.substring(0, 80));
  var controller = new AbortController();
  var timeout = setTimeout(function() { controller.abort(); }, 15000);
  opts.signal = controller.signal;
  opts.headers = Object.assign({}, authHeaders(creds), opts.headers || {});
  try {
    var res = await fetch(url, opts);
    if (!res.ok) {
      var body = {};
      try { body = await res.json(); } catch (e) {}
      throw new Error('GitHub API ' + res.status + ': ' + (body.message || res.statusText));
    }
    var data = await res.json();
    console.log('[ghFetch] OK', url.substring(0, 60));
    return data;
  } finally {
    clearTimeout(timeout);
    if (opts.signal && opts.signal.aborted) console.warn('[ghFetch] ABORTED', url.substring(0, 60));
  }
}

/* Raw fetch that returns ArrayBuffer (for zipball) */
async function ghFetchRaw(creds, path) {
  var url = path.indexOf('https://') === 0 ? path : apiBase(creds) + path;
  console.log('[ghFetchRaw] GET', url.substring(0, 80));
  var controller = new AbortController();
  var timeout = setTimeout(function() { controller.abort(); }, 30000);
  try {
    var res = await fetch(url, {
      headers: authHeaders(creds),
      signal: controller.signal,
    });
    if (!res.ok) {
      var body = {};
      try { body = await res.json(); } catch (e) {}
      throw new Error('GitHub API ' + res.status + ': ' + (body.message || res.statusText));
    }
    var buf = await res.arrayBuffer();
    console.log('[ghFetchRaw] OK, ' + buf.byteLength + ' bytes');
    return buf;
  } finally {
    clearTimeout(timeout);
  }
}


/* GraphQL query */
async function ghGraphQL(creds, query, vars) {
  vars = vars || {};
  var url = 'https://api.github.com/graphql';
  console.log('[ghGraphQL] POST');
  var controller = new AbortController();
  var timeout = setTimeout(function() { controller.abort(); }, 20000);
  try {
    var res = await fetch(url, {
      method: 'POST',
      headers: Object.assign({ Authorization: 'token ' + creds.token }, { 'Content-Type': 'application/json' }),
      body: JSON.stringify({ query: query, variables: vars }),
      signal: controller.signal,
    });
    if (!res.ok) {
      var body = {};
      try { body = await res.json(); } catch (e) {}
      throw new Error('GraphQL ' + res.status + ': ' + (body.message || res.statusText));
    }
    var data = await res.json();
    if (data.errors) {
      throw new Error('GraphQL error: ' + data.errors[0].message);
    }
    console.log('[ghGraphQL] OK');
    return data.data;
  } finally {
    clearTimeout(timeout);
  }
}

/* ---------- Public API ---------- */

export function useGitHub() {
  function getCreds() { return loadCreds(); }

  function setCreds(token, owner, repo, branch) {
    saveCreds(token, owner, repo, branch);
  }

  function removeCreds() { clearCreds(); }

  async function testConnection(token, owner, repo, branch) {
    var creds = { token: token, owner: owner, repo: repo, branch: branch };
    return await ghFetch(creds, '');
  }

  async function getRepoTree(creds) {
    var ref = await ghFetch(creds, '/git/refs/heads/' + creds.branch);
    var sha = ref.object.sha;
    var commit = await ghFetch(creds, '/git/commits/' + sha);
    var treeSha = commit.tree.sha;
    var tree = await ghFetch(creds, '/git/trees/' + treeSha + '?recursive=1');
    return { tree: tree, baseCommitSha: sha, baseTreeSha: treeSha };
  }

  async function getFileContent(creds, filePath) {
    var data = await ghFetch(creds, '/contents/' + encodeURIComponent(filePath));
    if (!data.content) throw new Error('No content for ' + filePath);
    var binaryStr = atob(data.content.replace(/\n/g, ''));
    var bytes = new Uint8Array(binaryStr.length);
    for (var i = 0; i < binaryStr.length; i++) bytes[i] = binaryStr.charCodeAt(i);
    return new TextDecoder('utf-8').decode(bytes);
  }

  async function fetchZipball(creds) {
    var ref = await ghFetch(creds, '/git/refs/heads/' + creds.branch);
    var sha = ref.object.sha;
    return await ghFetchRaw(creds, apiBase(creds) + '/zipball/' + sha);
  }

  async function pushCommit(creds, message, files) {
    var ref = await ghFetch(creds, '/git/refs/heads/' + creds.branch);
    var baseCommitSha = ref.object.sha;
    var baseCommit = await ghFetch(creds, '/git/commits/' + baseCommitSha);
    var baseTreeSha = baseCommit.tree.sha;

    var baseTree = await ghFetch(creds, '/git/trees/' + baseTreeSha + '?recursive=1');
    var treeEntries = baseTree.tree.map(function(e) {
      return { path: e.path, mode: e.mode, type: e.type, sha: e.sha };
    });

    var newEntries = [];
    for (var i = 0; i < files.length; i++) {
      var file = files[i];
      var blobData = await ghFetch(creds, '/git/blobs', {
        method: 'POST',
        body: JSON.stringify({ content: file.content, encoding: 'utf-8' }),
      });
      newEntries.push({
        path: file.path.replace(/\\/g, '/'),
        mode: '100644', type: 'blob', sha: blobData.sha,
      });
    }

    var merged = new Map();
    for (var j = 0; j < treeEntries.length; j++) merged.set(treeEntries[j].path, treeEntries[j]);
    for (var k = 0; k < newEntries.length; k++) merged.set(newEntries[k].path, newEntries[k]);

    var treeData = await ghFetch(creds, '/git/trees', {
      method: 'POST',
      body: JSON.stringify({ base_tree: baseTreeSha, tree: Array.from(merged.values()) }),
    });

    var commitData = await ghFetch(creds, '/git/commits', {
      method: 'POST',
      body: JSON.stringify({ message: message, tree: treeData.sha, parents: [baseCommitSha] }),
    });

    await ghFetch(creds, '/git/refs/heads/' + creds.branch, {
      method: 'PATCH',
      body: JSON.stringify({ sha: commitData.sha, force: false }),
    });

    return commitData;
  }

  return {
    getCreds: getCreds, setCreds: setCreds, removeCreds: removeCreds,
    testConnection: testConnection, getRepoTree: getRepoTree,
    getFileContent: getFileContent, pushCommit: pushCommit,
    graphql: ghGraphQL,
    fetchZipball: fetchZipball,
  };
}

export default useGitHub;
