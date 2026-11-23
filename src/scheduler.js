const cron = require('node-cron');
const db = require('./db');
const { checkFeed } = require('./feeds');
const { PLATFORMS, publishItem } = require('./publishers');

async function processFeed(feed) {
  const fresh = await checkFeed(feed, false);
  for (const item of fresh) {
    for (const p of PLATFORMS) {
      if (feed[p]) await publishItem(item, p);
    }
  }
  return fresh.length;
}

let running = false;
async function runAll() {
  if (running) return;
  running = true;
  try {
    for (const feed of db.prepare('SELECT * FROM feeds').all()) {
      try { await processFeed(feed); } catch (e) { console.error(`[feed ${feed.id}]`, e.message); }
    }
  } finally { running = false; }
}

function startScheduler() {
  const mins = Math.max(1, parseInt(process.env.CHECK_EVERY_MINUTES || '15', 10));
  cron.schedule(`*/${mins} * * * *`, runAll);
  console.log(`Scheduler: har ${mins} minute baad feeds check hongi`);
}

module.exports = { startScheduler, processFeed };
