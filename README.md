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

## 🔗 Live Links

| Resource        | URL                                                                 |
|-----------------|---------------------------------------------------------------------|
| GitHub repo     | https://github.com/bikash-20/Rentify-UI-design                      |
| Backend image   | `docker.io/talukder20/ticket-analyzer-backend:v1`                    |
| Frontend image  | `docker.io/talukder20/ticket-analyzer-frontend:v1`                   |
| Local app       | http://localhost:3000                                               |
| Health check    | http://localhost:8000/health → `{"status":"ok"}`                    |

> Image digests pushed:
> - backend  → `sha256:a9dcaad13ac9d0ae17f0cf20e6031967ed616b53d4c78a4ce7be2ad8daf0fbaf`
> - frontend → `sha256:825b02580c20b6eb253ed124b5e5a6538b13a1705931e9195479cdf1612f1ac9`

---

## 🏗 Architecture

## ☁️ Cloud VM Deployment

The repo ships a `docker-compose.prod.yml` that pulls the pre-built images from DockerHub instead of rebuilding — so the same artifact that you tested locally is what runs on the VM.

### On the cloud VM

```bash
# 1. Install Docker + Docker Compose plugin
sudo apt-get update && sudo apt-get install -y docker.io docker-compose-plugin

# 2. Clone the repo
git clone https://github.com/bikash-20/Rentify-UI-design.git
cd Rentify-UI-design

# 3. (optional) rename the folder for clarity
# 4. Run the deployment script
chmod +x deploy.sh
./deploy.sh
```

`deploy.sh` will:
1. `docker compose -f docker-compose.prod.yml pull` — pull the latest `talukder20/ticket-analyzer-backend:v1` and `talukder20/ticket-analyzer-frontend:v1` images.
2. `docker compose -f docker-compose.prod.yml up -d` — start `db`, `backend`, `frontend` as background services.
3. Poll `http://localhost:8000/health` inside the backend container until it returns `{"status":"ok"}`.

### Open firewall / security group

Make sure your cloud VM's security group (AWS / DigitalOcean / Hetzner / etc.) allows inbound:
- **TCP 80** — for the frontend (Nginx in the frontend container)
- **TCP 22** — for SSH (already enabled by default)

You do **not** need to expose **5432** (Postgres) or **8000** (backend) to the public internet — the frontend container proxies `/api` to the backend over the internal Docker network, and the backend talks to Postgres over the same network.

### Verify the live deployment

```bash
# From anywhere
curl http://<VM-PUBLIC-IP>/health          # not proxied by nginx — see below
curl http://<VM-PUBLIC-IP>/api/health      # should return {"status":"ok"}
open  http://<VM-PUBLIC-IP>/                # React UI
```

> Tip: if you want a public `/health` URL too, add a second `location = /health { proxy_pass http://backend:8000/health; }` block to `frontend/nginx.conf`, rebuild, and repush the frontend image.

---

## 📜 License
