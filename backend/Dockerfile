FROM python:3.11-slim

# System dependencies for psycopg2 + general build needs
RUN apt-get update && apt-get install -y --no-install-recommends \
        build-essential \
        libpq-dev \
        curl \
    && rm -rf /var/lib/apt/lists/*

# HuggingFace cache directory (baked into the image)
ENV HF_HOME=/opt/hf-cache
ENV TRANSFORMERS_CACHE=/opt/hf-cache
ENV HF_HUB_CACHE=/opt/hf-cache

WORKDIR /app

# Install Python dependencies first for better layer caching
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Bake the model weights into the image by running from_pretrained()
# at build time. This way the runtime container does NOT need network
# access to huggingface.co (TRANSFORMERS_OFFLINE=1 below).
RUN python -c "from transformers import pipeline; \
    pipeline('sentiment-analysis', model='distilbert-base-uncased-finetuned-sst-2-english')"

# Runtime: fail loudly if weights are missing instead of silently
# downloading on stage.
ENV TRANSFORMERS_OFFLINE=1

COPY app/ ./app/

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
