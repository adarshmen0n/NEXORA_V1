from typing import Optional
from pydantic import BaseModel, Field
import datetime

class BusCreate(BaseModel):
    bus_id: str = Field(..., min_length=3, max_length=50) # BUS-001
    registration_number: str = Field(..., min_length=3, max_length=50)
    route_id: Optional[str] = "Route A"

class BusUpdate(BaseModel):
    registration_number: Optional[str] = None
    route_id: Optional[str] = None
    status: Optional[str] = None # ACTIVE, IDLE, OFFLINE, MAINTENANCE
    driver_id: Optional[int] = None

class BusResponse(BaseModel):
    id: int
    bus_id: str
    registration_number: str
    driver_id: Optional[int] = None
    route_id: Optional[str] = None
    status: str
    current_latitude: Optional[float] = None
    current_longitude: Optional[float] = None
    current_speed: float
    last_updated: Optional[datetime.datetime] = None

    class Config:
        from_attributes = True
