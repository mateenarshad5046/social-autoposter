function truncate(str, max) {
  str = String(str || '').replace(/\s+/g, ' ').trim();
  return str.length <= max ? str : str.slice(0, max - 1).trimEnd() + '…';
}

function stripHtml(html) {
  return String(html || '').replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ').trim();
}

// Article page se og:image nikalta hai (Pinterest ko image chahiye)
async function ogImage(url) {
  try {
    const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 SocialAutoposter' }, signal: AbortSignal.timeout(15000) });
    const html = await res.text();
    const m = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i)
           || html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i);
    return m ? m[1] : null;
  } catch { return null; }
}

module.exports = { truncate, stripHtml, ogImage };
