import feedparser, requests, json, os, time

RSS = "YOUR_RSS_URL"
PAGE_ID = os.environ["FB_PAGE_ID"]
TOKEN = os.environ["FB_TOKEN"]

first_run = not os.path.exists("seen.json")
seen = json.load(open("seen.json")) if not first_run else []

entries = feedparser.parse(RSS).entries

for e in reversed(entries):  # purani se nayi
    if e.link in seen:
        continue
    if not first_run:
        r = requests.post(
            f"https://graph.facebook.com/v19.0/{PAGE_ID}/feed",
            data={"message": e.title, "link": e.link, "access_token": TOKEN},
        )
        print(r.status_code, r.text)
        if r.status_code != 200:
            continue  # fail hua to seen mein na dalo, agli dafa retry hoga
        time.sleep(30)  # posts ke beech gap
    seen.append(e.link)

json.dump(seen, open("seen.json", "w"))