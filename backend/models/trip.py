import datetime
from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey
from backend.database import Base

class Trip(Base):
    __tablename__ = "trips"

    id = Column(Integer, primary_key=True, index=True)
    trip_id = Column(String(50), unique=True, index=True, nullable=False) # TRIP-000001
    bus_id = Column(String(50), nullable=False)
    driver_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    route_id = Column(String(50), nullable=False)
    start_time = Column(DateTime, default=lambda: datetime.datetime.now(datetime.timezone.utc))
    end_time = Column(DateTime, nullable=True)
    start_latitude = Column(Float, nullable=True)
    start_longitude = Column(Float, nullable=True)
    end_latitude = Column(Float, nullable=True)
    end_longitude = Column(Float, nullable=True)
    distance_km = Column(Float, default=0.0)
    duration_minutes = Column(Float, default=0.0)
    status = Column(String(30), default="ACTIVE") # ACTIVE, COMPLETED, CANCELLED
