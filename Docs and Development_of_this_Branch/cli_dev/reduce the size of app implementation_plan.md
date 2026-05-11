# Fix Application Performance — Bundle Splitting & Lazy Loading

## Problem

The entire app compiles into a **single 1.81 MB JavaScript file**. The browser must download and parse ALL code before showing anything — even just the Login page loads the full Admin, Editor, Scheduler, Calendar, Charts, Excel, and Drag-and-Drop code.

**Build output (current):**
```
dist/assets/index-B4CvGIlW.js   1,813.77 kB │ gzip: 546.82 kB
```

> [!WARNING]
> Vite recommends chunks stay under **500 kB**. Our single file is **3.6× over** that limit.

## Root Causes

| # | Issue | Impact |
|---|-------|--------|
| 1 | **No code splitting** — all 13 pages eagerly imported in [App.jsx](file:///c:/Users/HP/Documents/GitHub/The_Branch_Manager_3_11/src/App.jsx) | Everything loads on first page visit |
| 2 | **Heavy dependencies in one bundle** — `firebase` (~300KB), `xlsx` (~200KB), `recharts` (~150KB), `moment` (~70KB), `react-big-calendar` (~50KB) | Massive parse time |
| 3 | **Very large page files** — [Editor.jsx](file:///c:/Users/HP/Documents/GitHub/The_Branch_Manager_3_11/src/pages/Editor.jsx) (90KB), [Admin.jsx](file:///c:/Users/HP/Documents/GitHub/The_Branch_Manager_3_11/src/pages/Admin.jsx) (70KB), [Scheduler.jsx](file:///c:/Users/HP/Documents/GitHub/The_Branch_Manager_3_11/src/pages/Scheduler.jsx) (55KB) | All parsed even if user never visits those pages |

## Proposed Changes

### 1. Lazy-load all pages

#### [MODIFY] [App.jsx](file:///c:/Users/HP/Documents/GitHub/The_Branch_Manager_3_11/src/App.jsx)

Replace all `import Page from './pages/Page'` with `React.lazy(() => import('./pages/Page'))` and wrap routes in `<Suspense>`. This means each page only downloads when the user actually navigates to it.

### 2. Split heavy vendor libraries into separate chunks

#### [MODIFY] [vite.config.js](file:///c:/Users/HP/Documents/GitHub/The_Branch_Manager_3_11/vite.config.js)

Add `build.rollupOptions.output.manualChunks` to split the bundle:
- `firebase` → `vendor-firebase.js`
- `xlsx` → `vendor-xlsx.js`
- `recharts` → `vendor-recharts.js`
- `react-big-calendar` + `moment` → `vendor-calendar.js`
- `react`, `react-dom`, `react-router-dom` → `vendor-react.js`

### 3. Clean up dead files

#### [DELETE] Scheduler.jsx.backup, Scheduler.jsx.broken, Scheduler.jsx.broken2

These unused backup files (79KB total) may confuse the build tooling.

## Expected Result

Instead of **1 file × 1.81 MB**, the build should produce **6-8 files × ~100-300 KB each**, loaded on demand. Initial Login page load should drop from ~1.8 MB to ~200-300 KB.

## Verification Plan

- Run `npm run build` and compare total bundle size and chunk count
- Verify app loads correctly on `npm run dev`
- Check that navigating between pages triggers lazy chunk downloads in browser DevTools Network tab
