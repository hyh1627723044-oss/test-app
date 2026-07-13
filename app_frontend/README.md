# App Frontend

`app_frontend` is the Android/H5 frontend migration of the recipe planner. It uses `uni-app` with Vue 3 so one UI codebase can be packaged as an Android app and a web app.

## Current scope

- Migrated visual shell for Recipes, Plan, and My pages.
- Reuses the existing hand-drawn illustrations from `src/static/illustrations`.
- Uses local mock data intentionally; the next phase is FastAPI + Postgres integration.

## Run locally

```powershell
cd app_frontend
npm install
npm run dev:h5
```

For Android, open `app_frontend` in HBuilderX and run to an Android emulator/device, or use its cloud/native packaging workflow after configuration.

## Planned backend contract

The frontend will call FastAPI only. FastAPI owns authorization, Postgres access, image upload signing, and all AI requests; no AI key or database service key belongs in the app.
