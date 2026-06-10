# Staff Portal (static files)

This folder is **HTML/CSS/JS only**. It is **not** a separate Node app.

The portal uses native **ES modules** (no bundler). The backend serves these files at `/admin/`.

## Run

```bash
# From here:
npm run dev

# Or from backend:
cd ../backend && npm run dev
```

Then open: **http://localhost:4000/admin/**

Login: admin, cashier, or employer (not passenger).

## Folder structure

```
admin-portal/
  index.html          Entry HTML — loads js/main.js as type="module"
  styles.css          Global styles
  js/
    main.js           Boot: restore session, render auth or app shell
    core/
      config.js       API base URL, TOKEN_KEY, nav constants, REPORT_NAV_FALLBACK
      state.js        Shared app state ($app, user, view)
      auth.js         getToken / setToken (localStorage)
      api.js          Fetch wrapper for /api/*
    utils/
      format.js       formatBirr, roleLabel
      permissions.js  can(), expandPermKeys, getAdminNav, staffNav
      alerts.js       showAlert
    shell/
      navigation.js   goReport, goToView, reloadView (callback-based, no circular imports)
      app.js          renderApp, loadView — sidebar + page router dispatch
    components/
      dialog.js       Unified alerts — sfSuccess, sfError, sfWarning, sfConfirm
      loading.js      Global loading overlay (used by api.js)
      modal.js        Form modals + save spinner
      charts.js       Dashboard Chart.js helpers
      sidebar.js      Admin sidebar + reports sub-nav
    pages/
      auth/login.js   Staff sign-in screen
      admin/          One file per admin view (dashboard, buses, …)
      cashier/        Cashier QR / dashboard views
      employer/       Legacy employer views (mobile app is primary)
    modals/
      index.js        All show*Modal dialogs
```

## Module notes

- `index.html` sets `<base href="/admin/" />` so relative imports resolve under `/admin/js/…`.
- Pages import shared modules directly (`api`, `can`, `formatBirr`, modals).
- `shell/navigation.js` registers `renderApp`, `loadView`, and `renderAuth` callbacks in `main.js` to avoid circular dependencies between shell and pages.
- Chart.js remains a global `<script>` (UMD); dashboard charts use `window.Chart`.

## Server update (after git push)

On the server:

```bash
cd /var/www/html/Safe-Fare-Bus
./deploy/update-server.sh
```

From MacBook (push + SSH update in one command):

```bash
./deploy/push-and-update.sh
```

## Adding a new admin page

1. Create `js/pages/admin/yourpage.js` exporting `renderYourpage(content)`.
2. Add nav entry in `js/core/config.js` (`ADMIN_NAV_ALL`).
3. Register title, permission, and renderer in `js/pages/admin/index.js`.
