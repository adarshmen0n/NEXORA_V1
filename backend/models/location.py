import datetime
from sqlalchemy import Column, Integer, String, Float, DateTime
from backend.database import Base

class LocationLog(Base):
    __tablename__ = "location_logs"

    id = Column(Integer, primary_key=True, index=True)
    entity_type = Column(String(20), nullable=False) # BUS, PASSENGER, RESPONDER
    entity_id = Column(String(50), index=True, nullable=False)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    speed = Column(Float, default=0.0)
    accuracy = Column(Float, default=5.0)
    timestamp = Column(DateTime, default=lambda: datetime.datetime.now(datetime.timezone.utc), index=True)
