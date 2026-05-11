# `npm run dev` — Full Execution Breakdown (React + Vite)

> **Project:** `The_Branch_Manager_3_11`
> **Stack:** React 19 + Vite 7 + Firebase + Tailwind CSS

---

## ❌ `npm run dev` Should NOT Be Used Before Deploying

`npm run dev` is **purely a local development tool**. You should **never** use it for deployment — to GCP, Firebase Hosting, or any cloud.

Cloud platforms need **static files** they can serve. The dev server only works while the terminal process is running — stop it and the app disappears.

---

## What `npm run dev` Actually Does (Step by Step)

In your `package.json`, the script is:

```json
"dev": "vite"
```

### Step 1 — npm reads `package.json`

npm finds `"dev": "vite"` and calls the locally installed Vite binary at:

```
./node_modules/.bin/vite
```

---

### Step 2 — Vite reads `vite.config.js`

```js
// vite.config.js
export default defineConfig({
  plugins: [react()],   // Enables JSX transform & React Fast Refresh
  build: { ... }        // ← This section is IGNORED during dev mode
})
```

The `@vitejs/plugin-react` plugin enables:
- **JSX → JavaScript** transformation (via Babel/SWC)
- **React Fast Refresh** — live-reload without losing component state

---

### Step 3 — Vite starts a Native ESM Dev Server

Vite does **NOT** bundle your code the way `npm run build` does. 

| What Vite does in Dev Mode | Result |
|---|---|
| Starts HTTP server on `http://localhost:5173` | Your app is served |
| Serves source files as native ES Modules | Browser gets raw `.jsx` files |
| Transforms `.jsx` files **on-demand** when requested | No pre-bundling needed |
| Watches all files for changes | HMR updates browser instantly |
| Pre-bundles only `node_modules` with esbuild (once) | Fast cold start |

---

### Step 4 — Your Entry Point is Loaded

```
index.html  →  src/main.jsx  →  src/App.jsx  →  All page components
```

The browser requests each file individually. Vite transforms and serves them one by one — no single large bundle file.

---

### Step 5 — Ongoing HMR (Hot Module Replacement)

When you edit any file (e.g., `src/pages/Editor.jsx`), Vite:

1. Detects the change via file system watcher
2. Re-transforms **only that specific file**
3. Sends a WebSocket message to the browser
4. The browser swaps the module **in memory** — no full page reload

---

## Why the Dev Output Can Never Be Deployed

Because **no `dist/` folder is created**. There are no compiled, minified, static files. The app only works while the dev server process is alive.

---

## The Correct Command for Deployment: `npm run build`

```json
"build": "vite build"
```

This is what you use before deploying. It runs Rollup under the hood and applies the full `vite.config.js` build configuration.

### Your `vite.config.js` splits the output into 6 cached chunks:

```
dist/
├── index.html
├── assets/
│   ├── index-[hash].js          ← Your app code (App.jsx, pages, etc.)
│   ├── vendor-react-[hash].js   ← react, react-dom, react-router-dom
│   ├── vendor-firebase-[hash].js← firebase/app, /auth, /firestore
│   ├── vendor-recharts-[hash].js← recharts (charts)
│   ├── vendor-xlsx-[hash].js    ← xlsx (Excel export)
│   ├── vendor-calendar-[hash].js← react-big-calendar, moment
│   └── vendor-dnd-[hash].js     ← @dnd-kit/core, /sortable, /utilities
```

Each chunk is cached separately by the browser. If you update your app code, only `index-[hash].js` changes — users don't re-download the Firebase SDK or React.

---

## Full Command Comparison

| | `npm run dev` | `npm run build` | `npm run preview` |
|---|---|---|---|
| **Purpose** | Local development | Create deployable files | Test the build locally |
| **Creates `dist/`** | ❌ No | ✅ Yes | ❌ No (reads existing `dist/`) |
| **Speed** | Instant start | Slower (full bundle) | Fast |
| **Optimized/Minified** | ❌ No | ✅ Yes | Same as build output |
| **Can deploy this?** | ❌ Never | ✅ Deploy `dist/` folder | ❌ Never |
| **Script** | `vite` | `vite build` | `vite preview` |

---

## Correct Deployment Flow for This Project

```bash
# Step 1: Build production-ready static files
npm run build
# → Creates /dist with all chunked, minified JS/CSS files

# Step 2: (Optional) Test the build locally before deploying
npm run preview
# → Serves /dist at http://localhost:4173

# Step 3: Deploy to Firebase Hosting
firebase deploy
# → Uploads /dist to https://brands-manager-staging.web.app/
```

---

## Summary

| Command | Role |
|---|---|
| `npm run dev` | **Development only** — temporary local server, no output files |
| `npm run build` | **Pre-deployment** — creates optimized `/dist` folder |
| `npm run preview` | **Pre-deployment testing** — serves the `/dist` folder locally |
| `firebase deploy` | **Deployment** — pushes `/dist` to Firebase Hosting |
