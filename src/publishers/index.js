const db = require('../db');
const modules = {
  x: require('./x'),
  pinterest: require('./pinterest'),
  threads: require('./threads'),
  facebook: require('./facebook')
};
const PLATFORMS = Object.keys(modules);

function configured() {
  const out = {};
  for (const p of PLATFORMS) out[p] = modules[p].configured();
  return out;
}

async function publishItem(item, platform, existingPostId) {
  let id = existingPostId;
  if (!id) {
    const r = db.prepare('INSERT OR IGNORE INTO posts (item_id, platform, status) VALUES (?,?,?)').run(item.id, platform, 'pending');
    if (!r.changes) return; // already attempted
    id = r.lastInsertRowid;
  }
  try {
    if (!modules[platform].configured()) throw new Error(`${platform} ki keys .env mein set nahi hain`);
    const remote = await modules[platform].publish(item);
    db.prepare("UPDATE posts SET status='posted', error=NULL, remote_id=?, posted_at=datetime('now') WHERE id=?").run(remote, id);
  } catch (e) {
    db.prepare("UPDATE posts SET status='failed', error=? WHERE id=?").run(String(e.message).slice(0, 500), id);
  }
}

module.exports = { PLATFORMS, configured, publishItem };