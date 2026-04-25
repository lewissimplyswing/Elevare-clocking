# ⏱ TimeClockPro

A **progressive web app** for freelancers to track time, log notes, and generate monthly invoices.

![PWA](https://img.shields.io/badge/PWA-ready-brightgreen) ![Vanilla JS](https://img.shields.io/badge/Vanilla_JS-no_deps-yellow) ![Offline](https://img.shields.io/badge/Offline-supported-blue)

---

## Features

- **Log time entries** – set date, clock-in, clock-out with a notes field for each session
- **Edit / delete** any past entry at any time
- **History view** – browse and filter by month
- **Monthly summary** – total hours and earnings at a glance
- **Invoice generator** – build a clean printable invoice for any month
  - Configurable rate (default £15/hr)
  - Your name, client name & address, invoice number, payment details
  - Print to PDF via browser
  - Open pre-filled in your email client
- **Offline-first** – works without internet after first load (service worker cache)
- **Installable** – add to home screen on iOS/Android/desktop (PWA manifest)
- **Zero dependencies** – pure HTML, CSS, vanilla JS; no build step

---

## Getting Started

### Option 1 – GitHub Pages (easiest)

1. Fork / push this repo to GitHub
2. Go to **Settings → Pages** and set source to `main` branch, `/ (root)`
3. Your app is live at `https://yourusername.github.io/timeclock-pwa/`

### Option 2 – Any static host

Upload all files to Netlify, Vercel, Cloudflare Pages, or any web host.  
The app must be served over **HTTPS** for the service worker (and PWA install) to work.

### Option 3 – Local dev

```bash
# Python 3
python3 -m http.server 8080

# Node (npx)
npx serve .
```

Open `http://localhost:8080` in your browser.

---

## File Structure

```
timeclock-pwa/
├── index.html          # App shell
├── style.css           # All styles
├── app.js              # App logic (storage, UI, invoice)
├── sw.js               # Service worker (offline cache)
├── manifest.json       # PWA manifest
├── generate_icons.py   # One-time icon generator (stdlib only)
├── icons/
│   ├── icon-192.png
│   └── icon-512.png
└── README.md
```

---

## Customisation

| What | Where |
|---|---|
| Default hourly rate | `app.js` – Invoice view, or change the `value="15"` in `index.html` |
| Accent colours | `style.css` → `--accent` and `--accent2` CSS variables |
| App name | `manifest.json` → `"name"` field + `<title>` in `index.html` |

---

## Data Storage

All data is stored in **`localStorage`** in the browser — nothing is sent to a server.  
To back up your entries, open the browser console and run:

```js
copy(localStorage.getItem('tcp_entries'))
```

Then paste into a text file. To restore, paste the JSON back:

```js
localStorage.setItem('tcp_entries', '/* your JSON here */')
```

---

## License

MIT — do whatever you like with it.
