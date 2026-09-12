import datetime
from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Text
from backend.database import Base

class EmergencyCase(Base):
    __tablename__ = "emergency_cases"

    id = Column(Integer, primary_key=True, index=True)
    sos_id = Column(String(50), unique=True, index=True, nullable=False) # SOS-000001
    passenger_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    address = Column(Text, nullable=True)
    responder_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    responder_distance_km = Column(Float, nullable=True)
    status = Column(String(30), default="ACTIVE") # CREATED, ACTIVE, ACKNOWLEDGED, RESPONDING, RESOLVED, CANCELLED
    created_at = Column(DateTime, default=lambda: datetime.datetime.now(datetime.timezone.utc))
    acknowledged_at = Column(DateTime, nullable=True)
    resolved_at = Column(DateTime, nullable=True)

class SOSAuditLog(Base):
    __tablename__ = "sos_audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    sos_id = Column(String(50), index=True, nullable=False)
    action = Column(String(50), nullable=False) # SOS_CREATED, NOTIFIED, ACCEPTED, RESPONDING, RESOLVED, CANCELLED
    actor_id = Column(Integer, nullable=True)
    actor_role = Column(String(20), nullable=True)
    notes = Column(Text, nullable=True)
    timestamp = Column(DateTime, default=lambda: datetime.datetime.now(datetime.timezone.utc))
