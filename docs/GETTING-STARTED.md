# Getting started

This guide assumes no programming experience. It takes about 20 minutes the first time.

## 1. Install the tools (once)

| Tool | Why | Where |
| --- | --- | --- |
| **Node.js 20+** (LTS) | Runs the backend, the web app and the simulator | [nodejs.org](https://nodejs.org) |
| **Git** | Downloads the code and keeps its history | [git-scm.com](https://git-scm.com) |
| **VS Code** (optional) | A friendly code editor | [code.visualstudio.com](https://code.visualstudio.com) |
| **Expo Go** app on your phone | Runs the mobile app without building it | App Store / Google Play |

Check Node is installed: open a terminal (Mac: *Terminal*; Windows: *PowerShell*) and type `node -v`. You should see `v20` or higher.

## 2. Download the code

```bash
git clone https://github.com/bkramadan/smartpod.git
cd smartpod
```

## 3. Start the backend

```bash
cd backend
npm install        # first time only: downloads the developer tools
npm run dev
```

You should see:

```
  Smart Pod backend is running (mock data)
  On this computer:  http://localhost:4000/api/health
  For your phone:    http://192.168.1.20:4000   (use this in mobile/.env)
```

Keep this window open. Open <http://localhost:4000/api/health> in a browser: you should see `"ok": true`.

**Optional: Claude explanations.** Copy `backend/.env.example` to `backend/.env` and put an Anthropic API key in `ANTHROPIC_API_KEY`. Restart the backend. Without a key, the AI still works; its summary is written from a template instead of by Claude.

**Your data is saved** in `backend/data/demo-db.json` between restarts. To start fresh: the "Reset demo data" link on the web sign-in page, or delete that file.

## 4. Start the web dashboards

Open a **second** terminal window:

```bash
cd web
npm install
npm run dev
```

Open <http://localhost:5173>. Pick **Dr. Salma Aoun** to see the doctor dashboard.

## 5. Start the mobile app on your phone

Your phone and computer must be on the **same Wi-Fi**.

1. In a third terminal window:
   ```bash
   cd mobile
   npm install
   ```
2. Copy `mobile/.env.example` to `mobile/.env`. Put in the address the backend printed after "For your phone", for example:
   ```
   EXPO_PUBLIC_API_URL=http://192.168.1.20:4000
   ```
   (`localhost` does not work on a phone: for the phone, localhost is the phone itself.)
3. Start it:
   ```bash
   npx expo start
   ```
4. Scan the QR code: on iPhone with the Camera app, on Android from inside Expo Go.

**If Expo Go says the project uses an older SDK**, update the project to your Expo Go version, then start again:

```bash
npx expo install expo@latest
npx expo install --fix
npx expo start --clear
```

**No phone handy?** Press `w` in the Expo window to open the app in your web browser.

## 6. Start the Pod simulator (optional)

In a fourth window:

```bash
cd pod-simulator
node pod.mjs           # releases each of Maria's doses at its time
node pod.mjs --now     # release the next dose now (if it is within 2 hours)
node pod.mjs --jam     # pretend the Pod jammed: Maria and Lina get an alert
```

No `npm install` needed.

## Something is not working

| What you see | What to do |
| --- | --- |
| Web: "The backend is not running" | Start it (step 3). Check nothing else uses port 4000. |
| Phone: "Cannot reach the backend" | Check `mobile/.env` has your computer's address, not localhost. Same Wi-Fi? Restart Expo with `npx expo start --clear` after changing `.env`. Some office or campus Wi-Fi blocks this: try a phone hotspot. |
| `npm: command not found` | Node.js is not installed, or the terminal was open before installing. Close and reopen it. |
| `EADDRINUSE: 4000` | The backend is already running in another window. |
| Times look wrong | The prototype uses the backend computer's time zone. |

## Common changes, and where to make them

| I want to… | Change |
| --- | --- |
| Add a medicine or supplement to the list | `backend/src/ai/catalog.ts` |
| Add a conflict rule | `backend/src/ai/rules.ts` (then run `npm test`) |
| Change the demo people or their medicines | `backend/src/store/seed.ts`, then reset the demo data |
| Change who can do what | `backend/src/services/access.ts` (and [ROLES-AND-PERMISSIONS.md](ROLES-AND-PERMISSIONS.md)) |
| Change a web screen | `web/src/pages/` |
| Change a mobile screen | `mobile/app/` — one file per screen |
| Change colours | `web/src/styles.css` and `mobile/src/theme.ts` |
| When a dose counts as missed | `MISSED_AFTER_MINUTES` in `backend/.env` |

After changing the backend, run `npm test` in `backend/` to check nothing broke.
