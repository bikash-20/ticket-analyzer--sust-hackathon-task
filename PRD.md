# Product Requirement Document — Ticket Analyzer

> Minimal full-stack engineering demo.

## Field | Detail
---|---
**Workshop** | FDE Capability Buildup
**Demo Goal** | Build locally, containerize, push, and deploy on a cloud VM
**Core Stack** | React/Vite, FastAPI, tiny Hugging Face model, PostgreSQL, Docker Compose
**Scope** | Minimal live demo focused on workflow, not feature depth

## 1. Product Overview
Ticket Analyzer is a small full-stack application that accepts a support ticket, analyzes its sentiment using a tiny Hugging Face model, stores the ticket in PostgreSQL, and shows the ticket history in a simple frontend.

The purpose is to demonstrate the complete engineering path: PRD, frontend, backend, AI model integration, database persistence, Docker images, DockerHub, GitHub, and deployment on a cloud VM.

## 2. Demo Objective
- Turn a PRD into a working full-stack application.
- Containerize the frontend and backend separately.
- Push source code to GitHub and images to DockerHub.
- Deploy the same application on a cloud VM using Docker Compose.

## 3. Minimal Scope
| Area | Included | Not Included |
|---|---|---|
| Frontend | One page form and ticket list | Authentication, dashboard |
| Backend | Three API endpoints | Complex service layers |
| AI | Tiny sentiment model | Fine-tuning or LLM agents |
| Database | PostgreSQL persistence | Migrations or analytics |
| Deployment | Docker Compose on VM | Kubernetes or CI/CD |

## 4. User Flow
1. User opens the Ticket Analyzer frontend.
2. User enters a ticket title, message, and optional category.
3. Frontend sends the ticket to the FastAPI backend.
4. Backend runs sentiment analysis using the tiny model.
5. Backend saves the result in PostgreSQL.
6. Frontend refreshes the ticket list.

## 5. Features
- **Submit ticket** — title, message, optional category.
- **Analyze ticket** — backend returns sentiment label and confidence score.
- **Persist ticket** — every ticket is saved in PostgreSQL.
- **View tickets** — frontend displays latest saved tickets.
- **Health check** — backend exposes `GET /health`.

## 6. Architecture
```
React Frontend      ->  FastAPI Backend
                          ->  Tiny Hugging Face Sentiment Model
                          ->  PostgreSQL Database
```
- **frontend:** React production build served by Nginx on port `3000`.
- **backend:** FastAPI served by Uvicorn on port `8000`.
- **db:** PostgreSQL with a named Docker volume for persistence.

## 7. API Requirements
| Method | Endpoint     | Purpose |
|---|---|---|
| GET    | `/health`    | Return backend status |
| POST   | `/tickets`   | Create ticket and analyze sentiment |
| GET    | `/tickets`   | List saved tickets |

## 8. Data Model
| Field | Type | Notes |
|---|---|---|
| id | integer | Primary key |
| title | string | Ticket title |
| message | text | Ticket body |
| category | string | Optional category |
| sentiment | string | Model output label |
| confidence | float | Model confidence score |
| created_at | timestamp | Created by backend |

## 9. AI Model Requirement
Use a very small Hugging Face sentiment classification model. Suggested: `distilbert-base-uncased-finetuned-sst-2-english`.
- Bake model weights into the Docker image at build time.
- Pin `HF_HOME` and set `TRANSFORMERS_OFFLINE=1` at runtime.
- Load model into memory once at backend startup.
- Pre-build and push the backend image to DockerHub before the demo.

## 10. Docker & Deployment Requirements
- **Backend image:** `talukder20/ticket-analyzer-backend:v1`
- **Frontend image:** `talukder20/ticket-analyzer-frontend:v1`
- **Database image:** official `postgres:15` image
- Backend image installs `torch` from the CPU-only index to keep the image ~600–800 MB.
- Backend Dockerfile bakes the model weights using `from_pretrained()` during build.
- `Base.metadata.create_all(engine)` creates the `tickets` table on startup.
- `docker-compose.yml` uses `depends_on` with a Postgres healthcheck.
- Frontend Nginx reverse-proxies `/api` → backend service.
