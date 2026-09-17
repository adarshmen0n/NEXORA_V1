import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from backend.config import settings
from backend.database import get_db
from backend.security import get_current_user, require_roles
from backend.models import User, EmergencyCase, SOSAuditLog, Notification
from backend.schemas.sos import SOSCreateRequest, SOSActionRequest, SOSResponse
from backend.services.distance_service import calculate_haversine_km
from backend.services.geocoding_service import reverse_geocode
from backend.services.websocket_service import ws_manager

router = APIRouter(prefix="/api/sos", tags=["Emergency SOS"])

def format_sos_response(sos: EmergencyCase, db: Session, responder_coords: Optional[tuple] = None) -> dict:
    passenger = db.query(User).filter(User.id == sos.passenger_id).first()
    responder = db.query(User).filter(User.id == sos.responder_id).first() if sos.responder_id else None
    
    dist_km = None
    if responder_coords:
        r_lat, r_lng = responder_coords
        dist_km = round(calculate_haversine_km(r_lat, r_lng, sos.latitude, sos.longitude), 2)
    elif sos.responder_distance_km is not None:
        dist_km = sos.responder_distance_km
    elif responder and responder.last_latitude and responder.last_longitude:
        dist_km = round(calculate_haversine_km(responder.last_latitude, responder.last_longitude, sos.latitude, sos.longitude), 2)

    return {
        "id": sos.id,
        "sos_id": sos.sos_id,
        "passenger_id": sos.passenger_id,
        "passenger_name": passenger.name if passenger else "Unknown Passenger",
        "passenger_phone": passenger.phone if passenger else "N/A",
        "latitude": sos.latitude,
        "longitude": sos.longitude,
        "address": sos.address or "Location coordinates recorded",
        "responder_id": sos.responder_id,
        "responder_name": responder.name if responder else None,
        "responder_distance_km": dist_km,
        "status": sos.status,
        "created_at": sos.created_at,
        "acknowledged_at": sos.acknowledged_at,
        "resolved_at": sos.resolved_at,
    }

@router.post("", response_model=SOSResponse)
async def create_sos(
    data: SOSCreateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Strict GPS validation
    if not data.latitude or not data.longitude or (data.latitude == 0.0 and data.longitude == 0.0):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Valid, active GPS coordinates are strictly required before initiating an emergency SOS."
        )

    now = datetime.datetime.now(datetime.timezone.utc)

    # Check for active existing SOS for this passenger
    existing = db.query(EmergencyCase).filter(
        EmergencyCase.passenger_id == current_user.id,
        EmergencyCase.status.in_(["ACTIVE", "ACKNOWLEDGED", "RESPONDING"])
    ).first()
    if existing:
        # Update coordinates and address with fresh GPS fix
        if data.address and len(data.address.strip()) > 3 and not data.address.startswith("GPS Position"):
            address = data.address.strip()
        else:
            address = reverse_geocode(data.latitude, data.longitude)
        existing.latitude = data.latitude
        existing.longitude = data.longitude
        existing.address = address
        current_user.last_latitude = data.latitude
        current_user.last_longitude = data.longitude
        current_user.location_updated_at = now

        audit = SOSAuditLog(
            sos_id=existing.sos_id,
            action="SOS_UPDATED",
            actor_id=current_user.id,
            actor_role=current_user.role,
            notes=f"Emergency SOS updated with new coordinates at {address}",
            timestamp=now
        )
        db.add(audit)

        # Re-notify nearby responders
        responders = db.query(User).filter(User.role == "RESPONDER", User.is_active == True).all()
        notified_responders = []
        for resp in responders:
            dist = None
            if resp.last_latitude and resp.last_longitude:
                dist = calculate_haversine_km(resp.last_latitude, resp.last_longitude, data.latitude, data.longitude)
            if dist is None or dist <= settings.SOS_RADIUS_KM:
                dist_str = f" ({dist:.2f} km away)" if dist is not None else ""
                notif = Notification(
                    user_id=resp.id,
                    title="EMERGENCY SOS ALERT (UPDATE)",
                    message=f"Passenger {current_user.name} requires emergency assistance at {address}{dist_str}.",
                    type="EMERGENCY",
                    is_read=False,
                    created_at=now
                )
                db.add(notif)
                notified_responders.append(resp.id)

        # Long-distance fallback: notify all active responders with true distance so alerts are never lost
        if not notified_responders:
            for resp in responders:
                dist = None
                if resp.last_latitude and resp.last_longitude:
                    dist = calculate_haversine_km(resp.last_latitude, resp.last_longitude, data.latitude, data.longitude)
                dist_str = f" ({dist:.2f} km away)" if dist is not None else ""
                notif = Notification(
                    user_id=resp.id,
                    title="EMERGENCY SOS ALERT (UPDATE - METRO PERIMETER)",
                    message=f"Passenger {current_user.name} requires emergency assistance at {address}{dist_str}.",
                    type="EMERGENCY",
                    is_read=False,
                    created_at=now
                )
                db.add(notif)

        # Confirmation notification for passenger
        pax_notif = Notification(
            user_id=current_user.id,
            title="EMERGENCY SOS UPDATED",
            message=f"Distress coordinates for {existing.sos_id} updated. Rescue units alerted.",
            type="EMERGENCY",
            is_read=False,
            created_at=now
        )
        db.add(pax_notif)

        db.commit()
        db.refresh(existing)

        # Real-time WebSocket re-broadcast to all connected clients
        await ws_manager.broadcast({
            "type": "SOS_ALERT",
            "data": {
                "id": existing.id,
                "sos_id": existing.sos_id,
                "passenger_id": current_user.id,
                "passenger_name": current_user.name,
                "passenger_phone": current_user.phone or "N/A",
                "latitude": existing.latitude,
                "longitude": existing.longitude,
                "address": existing.address,
                "status": existing.status,
                "created_at": existing.created_at.isoformat() if hasattr(existing.created_at, "isoformat") else str(existing.created_at)
            }
        })

        return format_sos_response(existing, db)
    sos_count = db.query(EmergencyCase).count() + 1
    sos_id = f"SOS-{sos_count:06d}"

    # Reverse geocode location (use client-resolved address if valid)
    if data.address and len(data.address.strip()) > 3 and not data.address.startswith("GPS Position"):
        address = data.address.strip()
    else:
        address = reverse_geocode(data.latitude, data.longitude)

    # Update passenger's last known location
    current_user.last_latitude = data.latitude
    current_user.last_longitude = data.longitude
    current_user.location_updated_at = now

    sos = EmergencyCase(
        sos_id=sos_id,
        passenger_id=current_user.id,
        latitude=data.latitude,
        longitude=data.longitude,
        address=address,
        status="ACTIVE",
        created_at=now
    )
    db.add(sos)

    # Audit log
    audit = SOSAuditLog(
        sos_id=sos_id,
        action="SOS_CREATED",
        actor_id=current_user.id,
        actor_role=current_user.role,
        notes=f"Emergency SOS triggered at {address}",
        timestamp=now
    )
    db.add(audit)
    db.commit()
    db.refresh(sos)

    # Find nearby responders (within SOS_RADIUS_KM)
    responders = db.query(User).filter(User.role == "RESPONDER", User.is_active == True).all()
    nearby_responders = []
    for resp in responders:
        dist = None
        if resp.last_latitude and resp.last_longitude:
            dist = calculate_haversine_km(resp.last_latitude, resp.last_longitude, data.latitude, data.longitude)
        
        # If responder is within radius, or fallback to all active responders if coordinates not yet available
        if dist is None or dist <= settings.SOS_RADIUS_KM:
            dist_str = f" ({dist:.2f} km away)" if dist is not None else ""
            notif = Notification(
                user_id=resp.id,
                title="EMERGENCY SOS ALERT",
                message=f"Passenger {current_user.name} requires emergency assistance at {address}{dist_str}.",
                type="EMERGENCY",
                is_read=False,
                created_at=now
            )
            db.add(notif)
            nearby_responders.append(resp.id)

    # Long-distance fallback: notify all active responders with true distance so alerts are never lost
    if not nearby_responders:
        for resp in responders:
            dist = None
            if resp.last_latitude and resp.last_longitude:
                dist = calculate_haversine_km(resp.last_latitude, resp.last_longitude, data.latitude, data.longitude)
            dist_str = f" ({dist:.2f} km away)" if dist is not None else ""
            notif = Notification(
                user_id=resp.id,
                title="EMERGENCY SOS ALERT (METRO PERIMETER)",
                message=f"Passenger {current_user.name} requires emergency assistance at {address}{dist_str}.",
                type="EMERGENCY",
                is_read=False,
                created_at=now
            )
            db.add(notif)

    # Confirmation notification for passenger
    pax_notif = Notification(
        user_id=current_user.id,
        title="EMERGENCY SOS DISPATCHED",
        message=f"Your emergency distress call {sos.sos_id} has been transmitted to Coimbatore Emergency Response. Help is mobilizing.",
        type="EMERGENCY",
        is_read=False,
        created_at=now
    )
    db.add(pax_notif)

    db.commit()

    # Real-time WebSocket broadcast to admin, responders, and maps
    await ws_manager.broadcast({
        "type": "SOS_ALERT",
        "data": {
            "id": sos.id,
            "sos_id": sos.sos_id,
            "passenger_id": current_user.id,
            "passenger_name": current_user.name,
            "passenger_phone": current_user.phone or "N/A",
            "latitude": sos.latitude,
            "longitude": sos.longitude,
            "address": sos.address,
            "status": sos.status,
            "created_at": now.isoformat()
        }
    })

    return format_sos_response(sos, db)


@router.get("/active", response_model=List[SOSResponse])
def get_active_sos_cases(
    lat: Optional[float] = None,
    lon: Optional[float] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(EmergencyCase).filter(
        EmergencyCase.status.in_(["ACTIVE", "ACKNOWLEDGED", "RESPONDING"])
    )

    if current_user.role == "PASSENGER":
        query = query.filter(EmergencyCase.passenger_id == current_user.id)

    cases = query.order_by(EmergencyCase.created_at.desc()).all()
    
    responder_coords = None
    if lat is not None and lon is not None:
        responder_coords = (lat, lon)
        if current_user.role in ["RESPONDER", "ADMIN"]:
            current_user.last_latitude = lat
            current_user.last_longitude = lon
            current_user.location_updated_at = datetime.datetime.now(datetime.timezone.utc)
            db.commit()
    elif current_user.role in ["RESPONDER", "ADMIN"] and current_user.last_latitude and current_user.last_longitude:
        responder_coords = (current_user.last_latitude, current_user.last_longitude)

    return [format_sos_response(c, db, responder_coords) for c in cases]


@router.get("/history", response_model=List[SOSResponse])
def get_sos_history(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["ADMIN", "RESPONDER"]))
):
    cases = db.query(EmergencyCase).order_by(EmergencyCase.created_at.desc()).all()
    return [format_sos_response(c, db) for c in cases]


@router.get("/{sos_id}", response_model=SOSResponse)
def get_sos_case(
    sos_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    sos = db.query(EmergencyCase).filter(EmergencyCase.sos_id == sos_id).first()
    if not sos:
        raise HTTPException(status_code=404, detail="SOS case not found.")

    if current_user.role == "PASSENGER" and sos.passenger_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to view this SOS case.")

    return format_sos_response(sos, db)


@router.post("/{sos_id}/accept", response_model=SOSResponse)
async def accept_sos(
    sos_id: str,
    action: Optional[SOSActionRequest] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["RESPONDER", "ADMIN"]))
):
    sos = db.query(EmergencyCase).filter(EmergencyCase.sos_id == sos_id).first()
    if not sos:
        raise HTTPException(status_code=404, detail="SOS case not found.")

    now = datetime.datetime.now(datetime.timezone.utc)
    sos.status = "ACKNOWLEDGED"
    sos.responder_id = current_user.id
    sos.acknowledged_at = now

    if current_user.last_latitude and current_user.last_longitude:
        sos.responder_distance_km = round(
            calculate_haversine_km(current_user.last_latitude, current_user.last_longitude, sos.latitude, sos.longitude), 
            2
        )

    audit = SOSAuditLog(
        sos_id=sos.sos_id,
        action="ACCEPTED",
        actor_id=current_user.id,
        actor_role=current_user.role,
        notes=action.notes if action and action.notes else f"Accepted by {current_user.name}",
        timestamp=now
    )
    db.add(audit)

    # Notify passenger
    notif = Notification(
        user_id=sos.passenger_id,
        title="SOS Acknowledged",
        message=f"Emergency responder {current_user.name} has accepted your alert and is mobilizing.",
        type="EMERGENCY",
        is_read=False,
        created_at=now
    )
    db.add(notif)
    db.commit()
    db.refresh(sos)

    # Real-time broadcast
    await ws_manager.broadcast({
        "type": "SOS_STATUS_UPDATE",
        "data": {
            "sos_id": sos.sos_id,
            "status": sos.status,
            "responder_id": current_user.id,
            "responder_name": current_user.name,
            "distance_km": sos.responder_distance_km,
            "timestamp": now.isoformat()
        }
    })

    return format_sos_response(sos, db)


@router.post("/{sos_id}/respond", response_model=SOSResponse)
async def mark_responding_sos(
    sos_id: str,
    action: Optional[SOSActionRequest] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["RESPONDER", "ADMIN"]))
):
    sos = db.query(EmergencyCase).filter(EmergencyCase.sos_id == sos_id).first()
    if not sos:
        raise HTTPException(status_code=404, detail="SOS case not found.")

    now = datetime.datetime.now(datetime.timezone.utc)
    sos.status = "RESPONDING"
    if not sos.responder_id:
        sos.responder_id = current_user.id

    audit = SOSAuditLog(
        sos_id=sos.sos_id,
        action="RESPONDING",
        actor_id=current_user.id,
        actor_role=current_user.role,
        notes=action.notes if action and action.notes else f"Responder en route to location",
        timestamp=now
    )
    db.add(audit)

    # Notify passenger
    notif = Notification(
        user_id=sos.passenger_id,
        title="Responder En Route",
        message=f"Responder {current_user.name} is en route to your position.",
        type="EMERGENCY",
        is_read=False,
        created_at=now
    )
    db.add(notif)
    db.commit()
    db.refresh(sos)

    # Real-time broadcast
    await ws_manager.broadcast({
        "type": "SOS_STATUS_UPDATE",
        "data": {
            "sos_id": sos.sos_id,
            "status": sos.status,
            "responder_id": current_user.id,
            "responder_name": current_user.name,
            "timestamp": now.isoformat()
        }
    })

    return format_sos_response(sos, db)


@router.post("/{sos_id}/resolve", response_model=SOSResponse)
async def resolve_sos(
    sos_id: str,
    action: Optional[SOSActionRequest] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["RESPONDER", "ADMIN"]))
):
    sos = db.query(EmergencyCase).filter(EmergencyCase.sos_id == sos_id).first()
    if not sos:
        raise HTTPException(status_code=404, detail="SOS case not found.")

    now = datetime.datetime.now(datetime.timezone.utc)
    sos.status = "RESOLVED"
    sos.resolved_at = now

    notes = action.notes if action and action.notes else f"Emergency resolved successfully by {current_user.name}"
    audit = SOSAuditLog(
        sos_id=sos.sos_id,
        action="RESOLVED",
        actor_id=current_user.id,
        actor_role=current_user.role,
        notes=notes,
        timestamp=now
    )
    db.add(audit)

    # Notify passenger
    notif = Notification(
        user_id=sos.passenger_id,
        title="Emergency Resolved",
        message="Your emergency assistance ticket has been marked as resolved.",
        type="INFO",
        is_read=False,
        created_at=now
    )
    db.add(notif)
    db.commit()
    db.refresh(sos)

    # Real-time broadcast
    await ws_manager.broadcast({
        "type": "SOS_STATUS_UPDATE",
        "data": {
            "sos_id": sos.sos_id,
            "status": sos.status,
            "resolved_at": now.isoformat()
        }
    })

    return format_sos_response(sos, db)


@router.post("/{sos_id}/cancel", response_model=SOSResponse)
async def cancel_sos(
    sos_id: str,
    action: Optional[SOSActionRequest] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    sos = db.query(EmergencyCase).filter(EmergencyCase.sos_id == sos_id).first()
    if not sos:
        raise HTTPException(status_code=404, detail="SOS case not found.")

    if current_user.role == "PASSENGER" and sos.passenger_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to cancel this SOS.")

    now = datetime.datetime.now(datetime.timezone.utc)
    sos.status = "CANCELLED"
    sos.resolved_at = now

    notes = action.notes if action and action.notes else f"Cancelled by {current_user.name}"
    audit = SOSAuditLog(
        sos_id=sos.sos_id,
        action="CANCELLED",
        actor_id=current_user.id,
        actor_role=current_user.role,
        notes=notes,
        timestamp=now
    )
    db.add(audit)

    # Notify responders of stand-down / cancellation
    responders = db.query(User).filter(User.role == "RESPONDER", User.is_active == True).all()
    for resp in responders:
        notif = Notification(
            user_id=resp.id,
            title="Emergency SOS Cancelled",
            message=f"Emergency SOS {sos.sos_id} cancelled by commuter ({current_user.name}). Stand down.",
            type="INFO",
            is_read=False,
            created_at=now
        )
        db.add(notif)

    db.commit()
    db.refresh(sos)

    # Real-time broadcast
    await ws_manager.broadcast({
        "type": "SOS_STATUS_UPDATE",
        "data": {
            "sos_id": sos.sos_id,
            "status": sos.status,
            "timestamp": now.isoformat()
        }
    })

    return format_sos_response(sos, db)
