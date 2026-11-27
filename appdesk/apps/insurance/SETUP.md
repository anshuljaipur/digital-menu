# Setup: GitHub Pages + Firebase + phone app

The app works in three modes, all from the same files:

| Mode | When | Data lives |
|---|---|---|
| Local | `config/firebase-config.js` left as `null` | This browser only |
| Cloud | Firebase config filled in | Your private Firestore database (syncs across devices, works offline) |
| Installed | Cloud/Local + "Add to Home Screen" | Opens full-screen like an app |

Do the Firebase part first, then GitHub.

---

## 1. Firebase (about 10 minutes, free "Spark" plan is enough)

1. Go to <https://console.firebase.google.com> → **Add project** (Google Analytics not needed).
2. **Build → Firestore Database → Create database** → *Production mode* → pick a region near you (e.g. `asia-south1` Mumbai). The region can't be changed later.
3. In Firestore, open the **Rules** tab, paste the contents of `firestore.rules`, and **Publish**.
4. **Build → Authentication → Get started → Sign-in method → Email/Password → Enable.**
5. Authentication → **Users → Add user** → enter *your* email and a strong password. This is the only account; there is no sign-up screen in the app.
6. *(Recommended)* Authentication → **Settings → User actions** → untick **Enable create (sign-up)** so nobody else can register against your project.
7. **Project settings (gear) → General → Your apps → Web (`</>`)** → register the app (no hosting) → copy the `firebaseConfig` values.
8. Open `config/firebase-config.js`, replace `null` with your config object (the commented example shows the shape), save.

> The config values are not secrets. Your data is protected by the sign-in and the rules in step 3.

## 2. GitHub Pages

1. Create a new **public** repository on GitHub (free Pages needs a public repo; your data is *not* in the repo).
2. Upload everything inside the `insurance-app` folder to the repo root (so `dashboard.html`, `manifest.json`, `sw.js` sit at the top level). Either drag the files/folders into the GitHub web page, or:
   ```
   git init && git add . && git commit -m "first version"
   git branch -M main
   git remote add origin https://github.com/YOUR-USER/YOUR-REPO.git
   git push -u origin main
   ```
3. Repo → **Settings → Pages → Build and deployment** → Source: *Deploy from a branch* → `main` / `/ (root)` → Save.
4. After a minute your app is at `https://YOUR-USER.github.io/YOUR-REPO/dashboard.html`.
5. Back in Firebase: **Authentication → Settings → Authorized domains → Add domain** → `YOUR-USER.github.io`.

## 3. Install on your phone

- **Android (Chrome):** open the link → menu ⋮ → **Install app** / **Add to Home screen**.
- **iPhone (Safari):** open the link → Share → **Add to Home Screen**.

Sign in once; it stays signed in.

## 4. Moving the data you already entered

Local data is stored per website address, so the new GitHub address starts empty. Move it with a backup:

1. In your **old** copy of the app: Settings (or Import/Export) → **Download Full Backup**.
2. Open the **new** site, sign in, go to **Import / Export → Restore Full Backup**, choose that file (leave "Replace" unticked).

Check a couple of policies and payments afterwards, then keep the backup file somewhere safe.

## 5. Updating the app later

Replace the changed files in the repo and commit. Also bump `CACHE_VERSION` at the top of `sw.js` (e.g. `ipm-v2`) so phones drop the old cached copy. Online, the app always fetches the newest files first.

## Notes

- **Offline:** after one online visit the app opens offline. Changes made offline sync when you're back online (give it a few seconds, and don't clear the browser data before it has synced).
- **Sensitive fields:** PAN and Aadhaar are optional fields. Now that data is in the cloud, consider leaving them blank.
- **Backups still matter:** use Settings → Download Full Backup occasionally. It exports from the cloud copy.
- **Free-tier limits** (50k reads / 20k writes per day) are far above personal use.
- **Troubleshooting:** "Cloud access denied" → rules not published or wrong account. Sign-in shows "Incorrect email or password" → user not created in step 5. Blank page on GitHub → check that files are at the repo root, not inside a sub-folder.
