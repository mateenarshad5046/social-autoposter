require('dotenv').config();
const express = require('express');
const session = require('express-session');
const path = require('path');
const crypto = require('crypto');
const db = require('./src/db');
const { checkFeed } = require('./src/feeds');
const { PLATFORMS, configured, publishItem } = require('./src/publishers');
const { startScheduler, processFeed } = require('./src/scheduler');

const app = express();
app.use(express.json());
app.use(session({
  secret: process.env.SESSION_SECRET || 'dev-secret-change-me',
  resave: false,
  saveUninitialized: false,
  cookie: { httpOnly: true, sameSite: 'lax', maxAge: 1000 * 60 * 60 * 24 * 7 }
}));

const authed = (req) => !!(req.session && req.session.ok);
const requireApi = (req, res, next) => authed(req) ? next() : res.status(401).json({ error: 'Login required' });

function safeEqual(a, b) {
  const ha = crypto.createHash('sha256').update(String(a)).digest();
  const hb = crypto.createHash('sha256').update(String(b)).digest();
  return crypto.timingSafeEqual(ha, hb);
}

app.post('/login', (req, res) => {
  const pw = process.env.ADMIN_PASSWORD || 'change-me';
  if (req.body && safeEqual(req.body.password || '', pw)) {
    req.session.ok = true;
    return res.json({ ok: true });
  }
  setTimeout(() => res.status(401).json({ error: 'Ghalat password' }), 700);
});
app.post('/logout', (req, res) => req.session.destroy(() => res.json({ ok: true })));

app.get('/', (req, res) => authed(req) ? res.sendFile(path.join(__dirname, 'public', 'index.html')) : res.redirect('/login.html'));
app.use(express.static(path.join(__dirname, 'public'), { index: false }));

// ---------- API ----------
app.get('/api/status', requireApi, (req, res) => res.json({ platforms: configured() }));

app.get('/api/feeds', requireApi, (req, res) => {
  res.json(db.prepare('SELECT * FROM feeds ORDER BY id DESC').all());
});

app.post('/api/feeds', requireApi, async (req, res) => {
  const url = String((req.body && req.body.url) || '').trim();
  if (!/^https?:\/\//i.test(url)) return res.status(400).json({ error: 'Valid RSS URL dein (http/https)' });
  let feed;
  try {
    const r = db.prepare('INSERT INTO feeds (url) VALUES (?)').run(url);
    feed = db.prepare('SELECT * FROM feeds WHERE id=?').get(r.lastInsertRowid);
  } catch { return res.status(400).json({ error: 'Ye feed pehle se add hai' }); }
  try {
    await checkFeed(feed, true);
    res.json(db.prepare('SELECT * FROM feeds WHERE id=?').get(feed.id));
  } catch (e) {
    db.prepare('DELETE FROM feeds WHERE id=?').run(feed.id);
    res.status(400).json({ error: 'Feed parse nahi hui: ' + e.message });
  }
});

app.patch('/api/feeds/:id', requireApi, (req, res) => {
  for (const p of PLATFORMS) {
    if (p in (req.body || {})) db.prepare(`UPDATE feeds SET ${p}=? WHERE id=?`).run(req.body[p] ? 1 : 0, req.params.id);
  }
  res.json({ ok: true });
});

app.delete('/api/feeds/:id', requireApi, (req, res) => {
  db.prepare('DELETE FROM feeds WHERE id=?').run(req.params.id);
  res.json({ ok: true });
});

app.post('/api/feeds/:id/check', requireApi, async (req, res) => {
  const feed = db.prepare('SELECT * FROM feeds WHERE id=?').get(req.params.id);
  if (!feed) return res.status(404).json({ error: 'Feed nahi mili' });
  try { res.json({ newItems: await processFeed(feed) }); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/posts', requireApi, (req, res) => {
  res.json(db.prepare(`
    SELECT p.id, p.platform, p.status, p.error, p.posted_at, p.created_at, i.title, i.link
    FROM posts p JOIN items i ON i.id = p.item_id
    ORDER BY p.id DESC LIMIT 100`).all());
});

app.post('/api/posts/:id/retry', requireApi, async (req, res) => {
  const post = db.prepare('SELECT * FROM posts WHERE id=?').get(req.params.id);
  if (!post) return res.status(404).json({ error: 'Post nahi mili' });
  const item = db.prepare('SELECT * FROM items WHERE id=?').get(post.item_id);
  await publishItem(item, post.platform, post.id);
  res.json(db.prepare('SELECT status, error FROM posts WHERE id=?').get(post.id));
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Dashboard: http://localhost:${port}`);
  startScheduler();
});
