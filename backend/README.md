# Backend

FastAPI + PostgreSQL backend for the recipe and meal-planning app.

## First API scope

- `POST /api/auth/dev-login` issues a local development JWT.
- `/api/recipes` provides searchable recipe CRUD with author/admin write checks.
- `/api/tags` provides system and personal tags.
- `/api/plans` manages date-based meal-plan items.
- `/api/favorites` manages each user's favorites.
- `/api/ai` safely proxies Tencent MaaS text recommendations and image recognition.

Image URLs are stored as a list on each recipe. A storage upload endpoint will be added after the core API is connected to the App frontend.

AI requests are already proxied at `/api/ai`. Set `TENCENT_MAAS_API_KEY` only in the server `.env`; never put it in the Android App.

## Docker

```bash
docker compose up --build
```

API docs:

```text
http://127.0.0.1:8000/docs
```

The compose file starts PostgreSQL and the API together. Copy `.env.example` to `.env` before a non-local deployment and replace `JWT_SECRET`.

## Local Python

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```
