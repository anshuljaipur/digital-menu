1. Copy common.js, common.css (and your filled firebase-config.js) into the same GitHub folder as AppDesk's index.html.
2. In AppDesk use "+ Add app" and choose each app folder (timetrack, calculator, cashflow), or paste these lines into apps.json:
   { "name": "Staff Time", "icon": "⏱️", "path": "apps/timetrack/index.html" },
   { "name": "Calculator", "icon": "🧮", "path": "apps/calculator/index.html" },
   { "name": "Cash Flow", "icon": "💵", "path": "apps/cashflow/index.html" }
3. Firebase Console: publish firestore.rules (Firestore -> Rules). Authentication -> enable Google, add your github.io domain to Authorized domains.
