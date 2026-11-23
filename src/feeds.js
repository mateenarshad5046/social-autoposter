const Parser = require('rss-parser');
const db = require('./db');
const { stripHtml } = require('./util');

const parser = new Parser({
  timeout: 20000,
  customFields: {
    item: [['media:content', 'mediaContent'], ['media:thumbnail', 'mediaThumb'], ['content:encoded', 'contentEncoded']]
  }
});

function findImage(it) {
  if (it.enclosure && it.enclosure.url && /image/i.test(it.enclosure.type || 'image')) return it.enclosure.url;
  if (it.mediaContent && it.mediaContent.$ && it.mediaContent.$.url) return it.mediaContent.$.url;
  if (it.mediaThumb && it.mediaThumb.$ && it.mediaThumb.$.url) return it.mediaThumb.$.url;
  const html = it.contentEncoded || it.content || '';
  const m = html.match(/<img[^>]+src=["']([^"']+)["']/i);
  return m ? m[1] : null;
}

// initial=true: pehli dafa feed add hone par purane articles "seen" mark hote hain, post nahi hote.
async function checkFeed(feed, initial = false) {
  try {
    const parsed = await parser.parseURL(feed.url);
    if (!feed.title && parsed.title) db.prepare('UPDATE feeds SET title=? WHERE id=?').run(parsed.title, feed.id);

    const insert = db.prepare(
      'INSERT OR IGNORE INTO items (feed_id, guid, title, link, image, summary, skip) VALUES (?,?,?,?,?,?,?)'
    );
    const fresh = [];
    // purane se naye order mein, taake posting chronological ho
    for (const it of [...parsed.items].reverse()) {
      const guid = it.guid || it.link || it.title;
      if (!guid) continue;
      const summary = stripHtml(it.contentSnippet || it.contentEncoded || it.content || '').slice(0, 600);
      const r = insert.run(feed.id, guid, it.title || '', it.link || '', findImage(it), summary, initial ? 1 : 0);
      if (r.changes && !initial) fresh.push(db.prepare('SELECT * FROM items WHERE id=?').get(r.lastInsertRowid));
    }
    db.prepare("UPDATE feeds SET last_checked=datetime('now'), last_error=NULL WHERE id=?").run(feed.id);
    return fresh.slice(-10); // ek dafa mein max 10 naye posts
  } catch (e) {
    db.prepare("UPDATE feeds SET last_checked=datetime('now'), last_error=? WHERE id=?").run(e.message, feed.id);
    throw e;
  }
}

module.exports = { checkFeed };
