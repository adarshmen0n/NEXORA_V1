import datetime
from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey
from backend.database import Base

class Bus(Base):
    __tablename__ = "buses"

    id = Column(Integer, primary_key=True, index=True)
    bus_id = Column(String(50), unique=True, index=True, nullable=False) # BUS-001 .. BUS-005
    registration_number = Column(String(50), nullable=False)            # TN 38 BX 1001
    driver_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    route_id = Column(String(50), nullable=True)                       # Route A .. Route E
    status = Column(String(30), default="IDLE")                         # ACTIVE, IDLE, OFFLINE, MAINTENANCE
    current_latitude = Column(Float, nullable=True)
    current_longitude = Column(Float, nullable=True)
    current_speed = Column(Float, default=0.0)                          # km/h
    last_updated = Column(DateTime, default=lambda: datetime.datetime.now(datetime.timezone.utc))
