# AppDesk – setup on GitHub Pages

1. Upload everything in this folder to a GitHub repo (index.html, apps.json, apps/).
2. Repo Settings → Pages → deploy from the main branch (root).
3. Open https://YOUR-USERNAME.github.io/YOUR-REPO/

## Adding an app
1. Create a folder: `apps/my-app/` and put ALL its files there (index.html, css, js, images…).
   Use relative paths inside the app (e.g. `<script src="app.js">`, not `/app.js`).
2. Add one line to `apps.json`:
   `{ "name": "My App", "icon": "📦", "color": "#3b82f6", "path": "apps/my-app/index.html" }`
   (optional: use `"url": "https://…"` instead of `path` for an app hosted elsewhere)
3. Commit. The icon appears on the desktop after Pages redeploys (about a minute).

## Firebase
- Apps keep their own Firebase config and work as before, because they run on your github.io domain.
- In Firebase Console → Authentication → Settings → Authorized domains, add `YOUR-USERNAME.github.io`.
- Google sign-in by popup works inside windows. Redirect sign-in may not; use signInWithPopup, or open the app in its own tab (↗).

## Notes
- Apps added with “＋ Add app” (single file or URL) are saved only in that browser. Use folders + apps.json for permanent apps.
