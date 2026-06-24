"""
Ticket Analyzer - FastAPI Backend
Accepts support tickets, runs sentiment analysis with a tiny HF model,
persists results in PostgreSQL, and exposes the ticket history.
"""

import os
from datetime import datetime
from typing import List, Optional

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from sqlalchemy import (
    Column,
    DateTime,
    Float,
    Integer,
    String,
    Text,
    create_engine,
)
from sqlalchemy.orm import declarative_base, sessionmaker

from transformers import pipeline

# -----------------------------------------------------------------------------
# Database configuration
# -----------------------------------------------------------------------------
DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://postgres:postgres@db:5432/ticket_db",
)

engine = create_engine(DATABASE_URL, pool_pre_ping=True)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


# -----------------------------------------------------------------------------
# SQLAlchemy model
# -----------------------------------------------------------------------------
class Ticket(Base):
    __tablename__ = "tickets"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), nullable=False)
    message = Column(Text, nullable=False)
    category = Column(String(64), nullable=True)
    sentiment = Column(String(32), nullable=False)
    confidence = Column(Float, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)


# -----------------------------------------------------------------------------
# Pydantic schemas
# -----------------------------------------------------------------------------
class TicketCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=255)
    message: str = Field(..., min_length=1)
    category: Optional[str] = Field(default=None, max_length=64)


class TicketOut(BaseModel):
    id: int
    title: str
    message: str
    category: Optional[str]
    sentiment: str
    confidence: float
    created_at: datetime

    class Config:
        from_attributes = True


# -----------------------------------------------------------------------------
# FastAPI app
# -----------------------------------------------------------------------------
app = FastAPI(
    title="Ticket Analyzer API",
    version="1.0.0",
    description="Minimal sentiment-analysis ticket service.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# -----------------------------------------------------------------------------
# Model: pre-loaded once at startup (per PRD)
# -----------------------------------------------------------------------------
MODEL_NAME = os.getenv(
    "MODEL_NAME", "distilbert-base-uncased-finetuned-sst-2-english"
)
sentiment_pipeline = None


@app.on_event("startup")
def _startup() -> None:
    """Create DB tables and load the HF model into memory once."""
    global sentiment_pipeline

    # Create tables on startup so a fresh Postgres volume works
    # without manual migrations.
    Base.metadata.create_all(bind=engine)

    # Load the model once at startup (not lazily) so the first
    # ticket submission is fast during the demo.
    sentiment_pipeline = pipeline("sentiment-analysis", model=MODEL_NAME)


# -----------------------------------------------------------------------------
# Routes
# -----------------------------------------------------------------------------
@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/tickets", response_model=TicketOut)
def create_ticket(payload: TicketCreate):
    if sentiment_pipeline is None:
        raise HTTPException(status_code=503, detail="Model not ready")

    # Combine title + message for sentiment analysis context.
    text = f"{payload.title}. {payload.message}"
    result = sentiment_pipeline(text)[0]

    ticket = Ticket(
        title=payload.title,
        message=payload.message,
        category=payload.category,
        sentiment=result["label"],   # POSITIVE / NEGATIVE
        confidence=float(result["score"]),
        created_at=datetime.utcnow(),
    )

    with SessionLocal() as db:
        db.add(ticket)
        db.commit()
        db.refresh(ticket)

    return ticket


@app.get("/tickets", response_model=List[TicketOut])
def list_tickets():
    with SessionLocal() as db:
        tickets = (
            db.query(Ticket).order_by(Ticket.id.desc()).all()
        )
        return tickets
