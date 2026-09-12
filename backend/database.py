from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker
import logging
from backend.config import settings

logger = logging.getLogger("nexora.database")

connect_args = {}
if settings.DATABASE_URL.startswith("sqlite"):
    connect_args = {"check_same_thread": False}

try:
    engine = create_engine(settings.DATABASE_URL, connect_args=connect_args)
except Exception as e:
    logger.error(f"Failed to connect to {settings.DATABASE_URL}: {e}")
    logger.warning("Falling back to local SQLite engine (nexora.db)")
    engine = create_engine("sqlite:///./nexora.db", connect_args={"check_same_thread": False})

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
