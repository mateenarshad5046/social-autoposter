const { truncate } = require('../util');

const BASE = 'https://graph.threads.net/v1.0';
const configured = () => !!(process.env.THREADS_USER_ID && process.env.THREADS_ACCESS_TOKEN);

async function call(path, params) {
  const res = await fetch(BASE + path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ ...params, access_token: process.env.THREADS_ACCESS_TOKEN })
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error('Threads: ' + ((data.error && data.error.message) || res.status));
  return data;
}

async function publish(item) {
  const uid = process.env.THREADS_USER_ID;
  const container = await call(`/${uid}/threads`, {
    media_type: 'TEXT',
    text: truncate(item.title, 480),
    link_attachment: item.link
  });
  // Meta recommend karta hai publish se pehle thora intezar
  await new Promise(r => setTimeout(r, 3000));
  const done = await call(`/${uid}/threads_publish`, { creation_id: container.id });
  return String(done.id);
}

module.exports = { publish, configured };
