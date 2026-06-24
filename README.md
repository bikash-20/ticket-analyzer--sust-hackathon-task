# 🎫 Ticket Analyzer

A minimal full-stack application that accepts a support ticket, runs sentiment analysis on it with a tiny Hugging Face model, stores it in PostgreSQL, and shows the ticket history in a clean React UI.

> **bKash presents SUST CSE Carnival 2026 — Codex Community Hackathon**

---

## 🧱 Stack

- **Frontend:** React 18 + Vite, served by Nginx on port `3000`
- **Backend:** FastAPI + Uvicorn on port `8000`
- **AI:** `distilbert-base-uncased-finetuned-sst-2-english` (CPU-only PyTorch)
- **Database:** PostgreSQL 15 (named Docker volume for persistence)
- **Orchestration:** Docker Compose

---

## 🏗 Architecture

```
React Frontend  (Nginx :3000)  --/api-->  FastAPI Backend  (:8000)  -->  PostgreSQL (:5432)
                                          └─> Tiny HF Sentiment Model
```

- The frontend Nginx container **reverse-proxies `/api/*` → `http://backend:8000/`**, so the same image works on `localhost` and on a remote VM without CORS changes.
- The backend **bakes the model weights into the Docker image** at build time using `from_pretrained()` + `HF_HOME=/opt/hf-cache`, and sets `TRANSFORMERS_OFFLINE=1` at runtime — so the container fails loudly if weights are missing rather than silently downloading on stage.
- The model is **loaded into memory once at backend startup**, so the first ticket submission is fast.
- The `tickets` table is **auto-created** via `Base.metadata.create_all(engine)` at startup, so a fresh Postgres volume works with no manual migrations.

---

## 📁 Repository Structure

```
ticket-analyzer/
├── PRD.md
├── README.md
├── docker-compose.yml
├── .gitignore
├── backend/
│   ├── Dockerfile
│   ├── requirements.txt
│   └── app/
│       ├── __init__.py
│       └── main.py
└── frontend/
    ├── Dockerfile
    ├── nginx.conf
    ├── package.json
    ├── vite.config.js
    ├── index.html
    ├── .gitignore
    └── src/
        ├── main.jsx
        ├── App.jsx
        └── index.css
```

---

## 🚀 Local Setup

### Prerequisites
- Docker + Docker Compose v2
- ~3 GB free disk (the backend image bakes ~250 MB of model weights)

### Run

```bash
# Build images and start the full stack
docker compose up --build
```

Open the app at **http://localhost:3000**.

The first build takes a few minutes (it downloads the HF model weights inside the backend image build step). Subsequent builds use the Docker layer cache.

### Tear down

```bash
# Stop the stack (keep the database volume)
docker compose down

# Stop and WIPE the database
docker compose down -v
```

---

## 🔌 API Reference

Base URL (through the frontend reverse proxy): `http://localhost:3000/api`

### `GET /health`
Returns backend status.

```json
{ "status": "ok" }
```

### `POST /tickets`
Create a ticket and run sentiment analysis on it.

Request:
```json
{
  "title": "Lab VM issue",
  "message": "My lab VM is not opening before the deadline.",
  "category": "lab"
}
```

Response (`201 Created`):
```json
{
  "id": 1,
  "title": "Lab VM issue",
  "message": "My lab VM is not opening before the deadline.",
  "category": "lab",
  "sentiment": "NEGATIVE",
  "confidence": 0.999,
  "created_at": "2026-06-25T12:34:56"
}
```

### `GET /tickets`
List all saved tickets, **newest first** (`ORDER BY id DESC`).

```json
[
  {
    "id": 1,
    "title": "Lab VM issue",
    "message": "My lab VM is not opening before the deadline.",
    "category": "lab",
    "sentiment": "NEGATIVE",
    "confidence": 0.999,
    "created_at": "2026-06-25T12:34:56"
  }
]
```

---

## ⚙️ Environment Variables

| Service   | Variable               | Default                                                                 |
|-----------|------------------------|-------------------------------------------------------------------------|
| `db`      | `POSTGRES_DB`          | `ticket_db`                                                             |
| `db`      | `POSTGRES_USER`        | `postgres`                                                              |
| `db`      | `POSTGRES_PASSWORD`    | `postgres`                                                              |
| `backend` | `DATABASE_URL`         | `postgresql://postgres:postgres@db:5432/ticket_db`                      |
| `backend` | `MODEL_NAME`           | `distilbert-base-uncased-finetuned-sst-2-english`                       |
| `backend` | `HF_HOME`              | `/opt/hf-cache`                                                         |
| `backend` | `TRANSFORMERS_OFFLINE` | `1`                                                                     |
| `frontend`| `VITE_API_BASE_URL`    | `/api` (baked at build time, served via Nginx reverse proxy)            |

---

## ✅ Acceptance Criteria

- [x] Frontend opens successfully (locally and on the deployed endpoint).
- [x] `GET /health` returns `status: ok`.
- [x] A user can submit a ticket from the frontend.
- [x] The backend analyzes ticket sentiment with the tiny Hugging Face model.
- [x] Each ticket is saved in PostgreSQL and survives a page refresh.
- [x] Backend container starts with **no network** to `huggingface.co` (weights are baked into the image).
- [x] Fresh Postgres volume → table is auto-created, `POST /tickets` succeeds.
- [x] Browser off-VM can submit a ticket (Nginx reverse-proxy + `/api` base URL).
- [x] Sentiment output uses `POSITIVE`/`NEGATIVE` labels (real `distilbert-sst-2`).

---

## 🛠 Troubleshooting

| Issue | Fix |
|---|---|
| Backend exits with `Connection refused` on cold start | The Postgres healthcheck in `docker-compose.yml` already prevents this. If you see it, run `docker compose down -v` and `docker compose up --build` to reset the DB volume. |
| `OSError: Can't load tokenizer for distilbert-base-uncased-finetuned-sst-2-english` at runtime | Model weights were not baked into the image. Rebuild without the cache: `docker compose build --no-cache backend`. |
| Frontend shows "API down" | Check `docker compose logs backend` — most often a model-load or DB connection error. |
| Port 3000 / 8000 / 5432 already in use | Change the host-side port in `docker-compose.yml` (e.g. `"8080:3000"` for the frontend). |
| First demo request is slow | The model is loaded once at startup; the first `/tickets` POST should be fast. If slow, increase the VM CPU/memory. |

---

## 📜 License

MIT — for educational/demo use as part of the SUST CSE Carnival 2026 workshop.
