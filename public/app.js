const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const when = s => s ? new Date(s.replace(' ', 'T') + 'Z').toLocaleString() : '—';
const LABEL = { x: 'X', pinterest: 'Pinterest', threads: 'Threads', facebook: 'Facebook' };

async function api(path, opts = {}) {
  const r = await fetch('/api' + path, {
    method: opts.method || 'GET',
    headers: { 'Content-Type': 'application/json' },
    body: opts.body ? JSON.stringify(opts.body) : undefined
  });
  if (r.status === 401) { location.href = '/login.html'; throw new Error('login'); }
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(d.error || 'Request failed');
  return d;
}

async function loadStatus() {
  const { platforms } = await api('/status');
  $('#chips').innerHTML = Object.keys(platforms).map(p =>
    `<span class="chip ${platforms[p] ? 'on' : ''}">${LABEL[p]}: ${platforms[p] ? 'keys set' : 'keys missing'}</span>`).join('');
}

async function loadFeeds() {
  const feeds = await api('/feeds');
  const head = '<tr><th>Feed</th><th>X</th><th>Pinterest</th><th>Threads</th><th>Facebook</th><th>Last check</th><th></th></tr>';
  const rows = feeds.map(f => `<tr data-id="${f.id}">
    <td>${esc(f.title || f.url)}<br><span class="muted">${esc(f.url)}</span>${f.last_error ? `<br><span class="err">${esc(f.last_error)}</span>` : ''}</td>
    ${['x', 'pinterest', 'threads', 'facebook'].map(p => `<td><input type="checkbox" data-p="${p}" ${f[p] ? 'checked' : ''}></td>`).join('')}
    <td class="muted">${when(f.last_checked)}</td>
    <td><button class="ghost small" data-act="check">Check now</button> <button class="danger small" data-act="del">Delete</button></td>
  </tr>`).join('');
  $('#feeds').innerHTML = head + (rows || '<tr><td colspan="7" class="muted">Abhi koi feed nahi.</td></tr>');
}

async function loadPosts() {
  const posts = await api('/posts');
  const head = '<tr><th>Time</th><th>Platform</th><th>Article</th><th>Status</th><th></th></tr>';
  const rows = posts.map(p => `<tr>
    <td class="muted">${when(p.posted_at || p.created_at)}</td>
    <td>${esc(LABEL[p.platform] || p.platform)}</td>
    <td><a href="${esc(p.link)}" target="_blank" rel="noopener">${esc(p.title || p.link)}</a></td>
    <td class="${p.status === 'posted' ? 'ok' : p.status === 'failed' ? 'bad' : ''}">${esc(p.status)}${p.error ? `<br><span class="muted">${esc(p.error)}</span>` : ''}</td>
    <td>${p.status === 'failed' ? `<button class="ghost small" data-retry="${p.id}">Retry</button>` : ''}</td>
  </tr>`).join('');
  $('#posts').innerHTML = head + (rows || '<tr><td colspan="5" class="muted">Abhi koi post nahi.</td></tr>');
}

$('#add').onclick = async () => {
  $('#msg').textContent = '';
  try { await api('/feeds', { method: 'POST', body: { url: $('#url').value } }); $('#url').value = ''; await loadFeeds(); }
  catch (e) { $('#msg').textContent = e.message; }
};

$('#feeds').addEventListener('change', async e => {
  const cb = e.target.closest('input[data-p]'); if (!cb) return;
  const id = cb.closest('tr').dataset.id;
  await api('/feeds/' + id, { method: 'PATCH', body: { [cb.dataset.p]: cb.checked } });
});

$('#feeds').addEventListener('click', async e => {
  const btn = e.target.closest('button[data-act]'); if (!btn) return;
  const id = btn.closest('tr').dataset.id;
  if (btn.dataset.act === 'del') {
    if (!confirm('Is feed ko delete karna hai?')) return;
    await api('/feeds/' + id, { method: 'DELETE' });
  } else {
    btn.disabled = true; btn.textContent = 'Checking…';
    try { const r = await api('/feeds/' + id + '/check', { method: 'POST' }); alert(r.newItems + ' naye article mile'); }
    catch (err) { alert(err.message); }
  }
  await loadFeeds(); await loadPosts();
});

$('#posts').addEventListener('click', async e => {
  const b = e.target.closest('button[data-retry]'); if (!b) return;
  b.disabled = true; b.textContent = '…';
  await api('/posts/' + b.dataset.retry + '/retry', { method: 'POST' });
  loadPosts();
});

$('#refresh').onclick = () => { loadFeeds(); loadPosts(); };
$('#logout').onclick = async () => { await fetch('/logout', { method: 'POST' }); location.href = '/login.html'; };

loadStatus(); loadFeeds(); loadPosts();
setInterval(loadPosts, 30000);