from typing import Optional, List, Dict, Any
from pydantic import BaseModel
import datetime

class AdminDashboardStats(BaseModel):
    total_users: int
    active_buses: int
    online_devices: int
    active_trips: int
    active_sos: int
    total_trips: int
    total_routes: int

class SystemHealthResponse(BaseModel):
    status: str
    database: str
    server: str
    websocket: str
    timestamp: datetime.datetime
