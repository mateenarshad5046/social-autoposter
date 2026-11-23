const { truncate } = require('../util');

const BASE = 'https://graph.facebook.com/v21.0';
const configured = () => !!(process.env.FACEBOOK_PAGE_ID && process.env.FACEBOOK_PAGE_ACCESS_TOKEN);

async function publish(item) {
  const pageId = process.env.FACEBOOK_PAGE_ID;
  const message = truncate(
    item.title + (item.summary ? '\n\n' + item.summary : ''),
    2000
  );

  const res = await fetch(`${BASE}/${pageId}/feed`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      message,
      link: item.link,
      access_token: process.env.FACEBOOK_PAGE_ACCESS_TOKEN
    })
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error('Facebook: ' + ((data.error && data.error.message) || res.status));
  }
  return String(data.id);
}

module.exports = { publish, configured };