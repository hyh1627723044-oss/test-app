# Backend

FastAPI backend for the ordering mini program.

## Docker

```bash
docker compose up --build
```

API docs:

```text
http://127.0.0.1:8000/docs
```

Default database:

```text
sqlite:////app/data/app.db
```

## Local Python

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```
