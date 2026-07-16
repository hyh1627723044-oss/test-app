# App Frontend

`app_frontend` is the Android/H5 frontend migration of the recipe planner. It uses `uni-app` with Vue 3 so one UI codebase can be packaged as an Android app and a web app.

## Current scope

- Migrated visual shell for Recipes, Plan, and My pages.
- Reuses the existing hand-drawn illustrations from `src/static/illustrations`.
- Recipes page can call the backend recipe list API.
- Falls back to local mock recipes when the backend is unavailable.

## Run locally

```powershell
cd app_frontend
npm install
npm run dev:h5
```

For Android, open `app_frontend` in HBuilderX and run to an Android emulator/device, or use its cloud/native packaging workflow after configuration.

## API backend

The frontend calls a unified HTTP API. The implementation can be FastAPI or Go as long as the route contract stays compatible.

Default local API base URL:

```text
http://localhost:8080
```

Override it with:

```powershell
$env:VITE_API_BASE_URL="http://你的局域网IP:8080"
npm run dev:h5
```

For Android emulator or a real phone, `localhost` points to the device itself, so use the computer's LAN IP instead.

The app must never contain AI keys, database passwords, or object storage secrets. Those belong in the backend only.
