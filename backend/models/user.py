import datetime
from sqlalchemy import Column, Integer, String, Boolean, DateTime, Float
from backend.database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    user_code = Column(String(50), unique=True, index=True, nullable=False) # ADM-001, DRV-001, PAX-001, RSP-001
    name = Column(String(100), nullable=False)
    email = Column(String(120), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    role = Column(String(20), nullable=False, default="PASSENGER") # ADMIN, DRIVER, PASSENGER, RESPONDER
    phone = Column(String(25), nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=lambda: datetime.datetime.now(datetime.timezone.utc))
    last_login = Column(DateTime, nullable=True)

    # Latest known GPS location (optional for passenger, active for driver/responder)
    last_latitude = Column(Float, nullable=True)
    last_longitude = Column(Float, nullable=True)
    location_updated_at = Column(DateTime, nullable=True)
