const { truncate, ogImage } = require('../util');

const configured = () => !!(process.env.PINTEREST_ACCESS_TOKEN && process.env.PINTEREST_BOARD_ID);

async function publish(item) {
  const base = process.env.PINTEREST_API_BASE || 'https://api.pinterest.com/v5';
  const image = item.image || (await ogImage(item.link));
  if (!image) throw new Error('Is article mein image nahi mili (Pinterest ko image chahiye)');

  const res = await fetch(base + '/pins', {
    method: 'POST',
    headers: {
      Authorization: 'Bearer ' + process.env.PINTEREST_ACCESS_TOKEN,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      board_id: process.env.PINTEREST_BOARD_ID,
      title: truncate(item.title, 100),
      description: truncate(item.summary || item.title, 500),
      link: item.link,
      media_source: { source_type: 'image_url', url: image }
    })
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error('Pinterest: ' + (data.message || res.status));
  return String(data.id);
}

module.exports = { publish, configured };
