from typing import Optional
from pydantic import BaseModel, Field
import datetime

class SOSCreateRequest(BaseModel):
    latitude: float = Field(..., ge=-90.0, le=90.0)
    longitude: float = Field(..., ge=-180.0, le=180.0)
    address: Optional[str] = None

class SOSActionRequest(BaseModel):
    notes: Optional[str] = None

class SOSResponse(BaseModel):
    id: int
    sos_id: str
    passenger_id: int
    passenger_name: Optional[str] = None
    passenger_phone: Optional[str] = None
    latitude: float
    longitude: float
    address: Optional[str] = None
    responder_id: Optional[int] = None
    responder_name: Optional[str] = None
    responder_distance_km: Optional[float] = None
    status: str
    created_at: datetime.datetime
    acknowledged_at: Optional[datetime.datetime] = None
    resolved_at: Optional[datetime.datetime] = None

    class Config:
        from_attributes = True
