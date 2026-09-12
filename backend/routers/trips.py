import datetime
from typing import List, Optional
from pydantic import BaseModel
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from backend.database import get_db
from backend.security import get_current_user, require_roles
from backend.models import User, Bus, Trip, Route
from backend.services.distance_service import calculate_haversine_km
from backend.services.websocket_service import ws_manager

router = APIRouter(prefix="/api/trips", tags=["Trips"])

class TripStartRequest(BaseModel):
    bus_id: str
    route_id: str
    start_latitude: Optional[float] = None
    start_longitude: Optional[float] = None

class TripStopRequest(BaseModel):
    trip_id: Optional[str] = None
    bus_id: Optional[str] = None
    end_latitude: Optional[float] = None
    end_longitude: Optional[float] = None
    distance_km: Optional[float] = None

@router.post("/start")
async def start_trip(
    data: TripStartRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["DRIVER", "ADMIN"]))
):
    bus = db.query(Bus).filter(Bus.bus_id == data.bus_id).first()
    if not bus:
        raise HTTPException(status_code=404, detail=f"Bus '{data.bus_id}' not found.")

    # Check route
    route = db.query(Route).filter(Route.route_id == data.route_id).first()
    if not route:
        raise HTTPException(status_code=404, detail=f"Route '{data.route_id}' not found.")

    # Check if there is an existing active trip on this bus
    existing = db.query(Trip).filter(Trip.bus_id == data.bus_id, Trip.status == "ACTIVE").first()
    if existing:
        return {
            "status": "already_active",
            "message": f"Bus {data.bus_id} already has an active trip {existing.trip_id}",
            "trip": {
                "trip_id": existing.trip_id,
                "bus_id": existing.bus_id,
                "route_id": existing.route_id,
                "start_time": existing.start_time.isoformat(),
                "status": existing.status
            }
        }

    now = datetime.datetime.now(datetime.timezone.utc)
    trip_count = db.query(Trip).count() + 1
    trip_id = f"TRIP-{trip_count:06d}"

    start_lat = data.start_latitude or bus.current_latitude
    start_lng = data.start_longitude or bus.current_longitude

    trip = Trip(
        trip_id=trip_id,
        bus_id=bus.bus_id,
        driver_id=current_user.id,
        route_id=data.route_id,
        start_time=now,
        start_latitude=start_lat,
        start_longitude=start_lng,
        status="ACTIVE"
    )
    db.add(trip)

    # Update bus status
    bus.status = "ACTIVE"
    bus.route_id = data.route_id
    bus.driver_id = current_user.id
    if start_lat and start_lng:
        bus.current_latitude = start_lat
        bus.current_longitude = start_lng
    bus.last_updated = now

    db.commit()
    db.refresh(trip)

    # Real-time WebSocket announcement
    await ws_manager.broadcast({
        "type": "TRIP_STARTED",
        "data": {
            "trip_id": trip.trip_id,
            "bus_id": bus.bus_id,
            "route_id": data.route_id,
            "driver_name": current_user.name,
            "start_time": now.isoformat()
        }
    })

    return {
        "status": "success",
        "trip_id": trip.trip_id,
        "bus_id": bus.bus_id,
        "route_id": data.route_id,
        "start_time": now.isoformat()
    }


@router.post("/stop")
async def stop_trip(
    data: TripStopRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["DRIVER", "ADMIN"]))
):
    query = db.query(Trip).filter(Trip.status == "ACTIVE")
    if data.trip_id:
        query = query.filter(Trip.trip_id == data.trip_id)
    elif data.bus_id:
        query = query.filter(Trip.bus_id == data.bus_id)
    else:
        query = query.filter(Trip.driver_id == current_user.id)

    trip = query.first()
    if not trip:
        raise HTTPException(status_code=404, detail="Active trip not found.")

    bus = db.query(Bus).filter(Bus.bus_id == trip.bus_id).first()

    now = datetime.datetime.now(datetime.timezone.utc)
    end_lat = data.end_latitude or (bus.current_latitude if bus else None)
    end_lng = data.end_longitude or (bus.current_longitude if bus else None)

    trip.end_time = now
    trip.end_latitude = end_lat
    trip.end_longitude = end_lng
    trip.status = "COMPLETED"

    # Compute duration
    if trip.start_time:
        st = trip.start_time
        if st.tzinfo is None:
            st = st.replace(tzinfo=datetime.timezone.utc)
        duration_secs = (now - st).total_seconds()
        trip.duration_minutes = round(duration_secs / 60.0, 1)

    # Compute distance
    if data.distance_km is not None:
        trip.distance_km = data.distance_km
    elif trip.start_latitude and trip.start_longitude and end_lat and end_lng:
        trip.distance_km = round(calculate_haversine_km(
            trip.start_latitude, trip.start_longitude, end_lat, end_lng
        ), 2)

    # Set bus back to IDLE
    if bus:
        bus.status = "IDLE"
        bus.current_speed = 0.0
        bus.last_updated = now

    db.commit()

    # Real-time WebSocket announcement
    await ws_manager.broadcast({
        "type": "TRIP_STOPPED",
        "data": {
            "trip_id": trip.trip_id,
            "bus_id": trip.bus_id,
            "duration_minutes": trip.duration_minutes,
            "distance_km": trip.distance_km,
            "end_time": now.isoformat()
        }
    })

    return {
        "status": "success",
        "trip_id": trip.trip_id,
        "bus_id": trip.bus_id,
        "duration_minutes": trip.duration_minutes,
        "distance_km": trip.distance_km,
        "end_time": now.isoformat()
    }


@router.get("/active")
def get_active_trips(db: Session = Depends(get_db)):
    trips = db.query(Trip).filter(Trip.status == "ACTIVE").all()
    results = []
    for t in trips:
        bus = db.query(Bus).filter(Bus.bus_id == t.bus_id).first()
        driver = db.query(User).filter(User.id == t.driver_id).first()
        results.append({
            "trip_id": t.trip_id,
            "bus_id": t.bus_id,
            "route_id": t.route_id,
            "driver_name": driver.name if driver else "Driver",
            "start_time": t.start_time,
            "current_lat": bus.current_latitude if bus else None,
            "current_lng": bus.current_longitude if bus else None,
            "current_speed": bus.current_speed if bus else 0.0,
            "status": t.status
        })
    return results


@router.get("")
def list_trips(db: Session = Depends(get_db), limit: int = 50):
    trips = db.query(Trip).order_by(Trip.start_time.desc()).limit(limit).all()
    results = []
    for t in trips:
        driver = db.query(User).filter(User.id == t.driver_id).first()
        results.append({
            "trip_id": t.trip_id,
            "bus_id": t.bus_id,
            "route_id": t.route_id,
            "driver_name": driver.name if driver else "Driver",
            "start_time": t.start_time,
            "end_time": t.end_time,
            "distance_km": t.distance_km,
            "duration_minutes": t.duration_minutes,
            "status": t.status
        })
    return results
