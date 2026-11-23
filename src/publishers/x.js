const { TwitterApi } = require('twitter-api-v2');
const { truncate } = require('../util');

const configured = () => !!(process.env.X_API_KEY && process.env.X_API_SECRET && process.env.X_ACCESS_TOKEN && process.env.X_ACCESS_SECRET);

function client() {
  return new TwitterApi({
    appKey: process.env.X_API_KEY,
    appSecret: process.env.X_API_SECRET,
    accessToken: process.env.X_ACCESS_TOKEN,
    accessSecret: process.env.X_ACCESS_SECRET
  });
}

async function publish(item) {
  const api = client().v2;
  const mode = (process.env.X_MODE || 'single').toLowerCase();

  if (mode === 'thread') {
    const first = truncate(item.title + (item.summary ? '\n\n' + item.summary : ''), 275);
    const second = 'Read more: ' + item.link;
    const res = await api.tweetThread([first, second]);
    return res.map(r => r.data.id).join(',');
  }
  // links X par 23 chars count hote hain
  const text = truncate(item.title, 280 - 23 - 2) + '\n' + item.link;
  const { data } = await api.tweet(text);
  return data.id;
}

module.exports = { publish, configured };
