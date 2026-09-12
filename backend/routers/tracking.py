import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from backend.database import get_db
from backend.security import get_current_user, require_roles
from backend.models import User, Bus, LocationLog
from backend.schemas.tracking import BusLocationCreate, PassengerLocationCreate, ResponderLocationCreate
from backend.services.websocket_service import ws_manager

router = APIRouter(prefix="/api/tracking", tags=["Tracking"])

@router.post("/bus/location")
async def update_bus_location(
    data: BusLocationCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["DRIVER", "ADMIN"]))
):
    bus = db.query(Bus).filter(Bus.bus_id == data.bus_id).first()
    if not bus:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Bus '{data.bus_id}' not found in fleet."
        )

    now = datetime.datetime.now(datetime.timezone.utc)
    bus.current_latitude = data.latitude
    bus.current_longitude = data.longitude
    bus.current_speed = data.speed
    bus.status = "ACTIVE"
    bus.last_updated = now

    # Also log history
    log = LocationLog(
        entity_type="BUS",
        entity_id=bus.bus_id,
        latitude=data.latitude,
        longitude=data.longitude,
        speed=data.speed,
        timestamp=now
    )
    db.add(log)
    db.commit()
    db.refresh(bus)

    # Broadcast real-time location update to all connected maps
    await ws_manager.broadcast({
        "type": "BUS_LOCATION_UPDATE",
        "data": {
            "bus_id": bus.bus_id,
            "registration_number": bus.registration_number,
            "latitude": bus.current_latitude,
            "longitude": bus.current_longitude,
            "speed": bus.current_speed,
            "route_id": bus.route_id,
            "status": bus.status,
            "timestamp": now.isoformat()
        }
    })

    return {
        "status": "success",
        "bus_id": bus.bus_id,
        "latitude": bus.current_latitude,
        "longitude": bus.current_longitude,
        "speed": bus.current_speed,
        "timestamp": now.isoformat()
    }


@router.post("/passenger/location")
async def update_passenger_location(
    data: PassengerLocationCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    now = datetime.datetime.now(datetime.timezone.utc)
    current_user.last_latitude = data.latitude
    current_user.last_longitude = data.longitude
    current_user.location_updated_at = now

    log = LocationLog(
        entity_type="PASSENGER",
        entity_id=str(current_user.id),
        latitude=data.latitude,
        longitude=data.longitude,
        speed=0.0,
        timestamp=now
    )
    db.add(log)
    db.commit()

    return {
        "status": "success",
        "user_id": current_user.id,
        "latitude": current_user.last_latitude,
        "longitude": current_user.last_longitude,
        "updated_at": now.isoformat()
    }


@router.post("/responder/location")
async def update_responder_location(
    data: ResponderLocationCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["RESPONDER", "ADMIN"]))
):
    now = datetime.datetime.now(datetime.timezone.utc)
    current_user.last_latitude = data.latitude
    current_user.last_longitude = data.longitude
    current_user.location_updated_at = now

    log = LocationLog(
        entity_type="RESPONDER",
        entity_id=str(current_user.id),
        latitude=data.latitude,
        longitude=data.longitude,
        speed=0.0,
        timestamp=now
    )
    db.add(log)
    db.commit()

    # Broadcast responder location update so admin and nearby responders can see beacons
    await ws_manager.broadcast({
        "type": "RESPONDER_LOCATION_UPDATE",
        "data": {
            "responder_id": current_user.id,
            "responder_name": current_user.name,
            "latitude": current_user.last_latitude,
            "longitude": current_user.last_longitude,
            "timestamp": now.isoformat()
        }
    })

    return {
        "status": "success",
        "responder_id": current_user.id,
        "latitude": current_user.last_latitude,
        "longitude": current_user.last_longitude,
        "timestamp": now.isoformat()
    }
