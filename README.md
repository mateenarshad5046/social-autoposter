# Social Autoposter (X + Pinterest + Threads)

RSS feed se naye articles automatically X, Pinterest aur Threads par post karta hai.

## Setup (VS Code terminal)
1. Node.js 20 ya 22 LTS install karein.
2. `npm install`
3. `.env.example` ki copy bana kar naam `.env` rakhein, aur values bharein (kam az kam `ADMIN_PASSWORD` aur `SESSION_SECRET` badlein).
4. `npm start` (ya `npm run dev`)
5. Browser mein http://localhost:3000 kholein, login karein, feed add karein, aur har feed ke saamne platforms tick karein.

## Keys kahan se milengi
**X:** developer.x.com par app banayein, App permissions ko **Read and Write** karein, phir API Key/Secret aur Access Token/Secret (apne account ke) generate karein. Permission badalne ke baad tokens dobara generate karne parte hain. `X_MODE=thread` rakhein to 2-tweet thread banega.

**Pinterest:** developers.pinterest.com par app banayein, scopes `pins:write`, `boards:read` ke saath access token lein. `PINTEREST_BOARD_ID` board ka numeric id hai (API `GET /v5/boards` se milta hai). Trial access mein pehle sandbox (`https://api-sandbox.pinterest.com/v5`) use hota hai, production approval ke baad `PINTEREST_API_BASE` badal dein. Pin ke liye image zaroori hai (RSS se ya article ke og:image se li jati hai).

**Threads:** developers.facebook.com par Threads API use case add karein, `threads_basic` aur `threads_content_publish` permissions ke saath long-lived token aur apna Threads user id lein.

## Kaise kaam karta hai
- Har `CHECK_EVERY_MINUTES` baad sab feeds check hoti hain.
- Naya feed add hone par purane articles skip hote hain (sirf aage ke post honge).
- Fail hone wali post history mein "failed" dikhti hai, Retry button se dobara try karein.

## Folder
- `server.js` web server + API
- `src/feeds.js` RSS parsing, `src/scheduler.js` timer
- `src/publishers/` x.js, pinterest.js, threads.js (naya platform = naya file)
- `public/` dashboard
- `data/app.db` SQLite database (auto ban jata hai)
