import datetime
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from backend.config import settings
from backend.database import get_db
from backend.models.bus import Bus
from backend.models.user import User
from backend.schemas.bus import BusCreate, BusUpdate, BusResponse
from backend.security import get_current_user, require_roles

router = APIRouter(prefix="/api/buses", tags=["Buses"])

@router.get("", response_model=List[BusResponse])
def get_all_buses(db: Session = Depends(get_db)):
    """Retrieve all buses in the fleet with live status and coordinates."""
    buses = db.query(Bus).order_by(Bus.bus_id).all()
    now = datetime.datetime.now(datetime.timezone.utc)
    
    # Auto-detect offline status if no GPS update within BUS_OFFLINE_TIMEOUT
    for b in buses:
        if b.last_updated and b.status == "ACTIVE":
            diff = (now - b.last_updated.replace(tzinfo=datetime.timezone.utc)).total_seconds()
            if diff > settings.BUS_OFFLINE_TIMEOUT:
                b.status = "OFFLINE"
    db.commit()
    return buses

@router.get("/{bus_id}", response_model=BusResponse)
def get_bus_by_id(bus_id: str, db: Session = Depends(get_db)):
    bus = db.query(Bus).filter(Bus.bus_id == bus_id).first()
    if not bus:
        raise HTTPException(status_code=404, detail=f"Bus '{bus_id}' not found")
    return bus

@router.post("", response_model=BusResponse, status_code=status.HTTP_201_CREATED)
def create_bus(
    payload: BusCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["ADMIN"]))
):
    existing = db.query(Bus).filter(Bus.bus_id == payload.bus_id).first()
    if existing:
        raise HTTPException(status_code=400, detail=f"Bus with ID '{payload.bus_id}' already exists")

    bus = Bus(
        bus_id=payload.bus_id.upper().strip(),
        registration_number=payload.registration_number.upper().strip(),
        route_id=payload.route_id,
        status="IDLE"
    )
    db.add(bus)
    db.commit()
    db.refresh(bus)
    return bus

@router.put("/{bus_id}", response_model=BusResponse)
def update_bus(
    bus_id: str,
    payload: BusUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["ADMIN", "DRIVER"]))
):
    bus = db.query(Bus).filter(Bus.bus_id == bus_id).first()
    if not bus:
        raise HTTPException(status_code=404, detail=f"Bus '{bus_id}' not found")

    if payload.registration_number is not None:
        bus.registration_number = payload.registration_number
    if payload.route_id is not None:
        bus.route_id = payload.route_id
    if payload.status is not None:
        bus.status = payload.status
    if payload.driver_id is not None:
        bus.driver_id = payload.driver_id

    db.commit()
    db.refresh(bus)
    return bus
