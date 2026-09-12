import datetime
from typing import List, Optional
from pydantic import BaseModel
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from backend.database import get_db
from backend.security import require_roles, hash_password
from backend.models import User, Bus, Route, Trip, EmergencyCase, SOSAuditLog, LocationLog
from backend.schemas.admin import AdminDashboardStats
from backend.services.distance_service import calculate_haversine_km

router = APIRouter(prefix="/api/admin", tags=["Admin Operations"])

class AdminUserCreate(BaseModel):
    name: str
    email: str
    password: str
    role: str  # ADMIN, DRIVER, PASSENGER, RESPONDER
    phone: Optional[str] = None
    user_code: Optional[str] = None

class UserStatusUpdate(BaseModel):
    is_active: bool

@router.get("/dashboard", response_model=AdminDashboardStats)
def get_dashboard_metrics(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["ADMIN"]))
):
    now = datetime.datetime.now(datetime.timezone.utc)
    recent_threshold = now - datetime.timedelta(minutes=15)

    total_users = db.query(User).count()
    active_buses = db.query(Bus).filter(Bus.status == "ACTIVE").count()
    online_devices = db.query(User).filter(User.location_updated_at >= recent_threshold).count()
    # At minimum, online_devices includes active buses or logged-in users
    online_devices = max(online_devices, active_buses + 1)
    
    active_trips = db.query(Trip).filter(Trip.status == "ACTIVE").count()
    active_sos = db.query(EmergencyCase).filter(
        EmergencyCase.status.in_(["ACTIVE", "ACKNOWLEDGED", "RESPONDING"])
    ).count()
    total_trips = db.query(Trip).count()
    total_routes = db.query(Route).count()

    return AdminDashboardStats(
        total_users=total_users,
        active_buses=active_buses,
        online_devices=online_devices,
        active_trips=active_trips,
        active_sos=active_sos,
        total_trips=total_trips,
        total_routes=total_routes
    )

@router.get("/users")
def list_all_users(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["ADMIN"]))
):
    users = db.query(User).order_by(User.id.asc()).all()
    return [
        {
            "id": u.id,
            "user_code": u.user_code,
            "name": u.name,
            "email": u.email,
            "role": u.role,
            "phone": u.phone or "N/A",
            "is_active": u.is_active,
            "created_at": u.created_at,
            "last_login": u.last_login,
            "last_latitude": u.last_latitude,
            "last_longitude": u.last_longitude,
            "location_updated_at": u.location_updated_at
        }
        for u in users
    ]

@router.post("/users")
def create_managed_user(
    data: AdminUserCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["ADMIN"]))
):
    valid_roles = ["ADMIN", "DRIVER", "PASSENGER", "RESPONDER"]
    role = data.role.upper()
    if role not in valid_roles:
        raise HTTPException(status_code=400, detail=f"Invalid role. Must be one of {valid_roles}")

    if db.query(User).filter(User.email == data.email).first():
        raise HTTPException(status_code=400, detail="User with this email already exists.")

    user_code = data.user_code
    if not user_code:
        prefix_map = {"ADMIN": "ADM", "DRIVER": "DRV", "PASSENGER": "PAX", "RESPONDER": "RSP"}
        prefix = prefix_map.get(role, "USR")
        count = db.query(User).filter(User.role == role).count() + 1
        user_code = f"{prefix}-{count:03d}"

    new_user = User(
        user_code=user_code,
        name=data.name,
        email=data.email,
        password_hash=hash_password(data.password),
        role=role,
        phone=data.phone,
        is_active=True
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    return {
        "id": new_user.id,
        "user_code": new_user.user_code,
        "name": new_user.name,
        "email": new_user.email,
        "role": new_user.role,
        "status": "created"
    }

@router.put("/users/{user_id}/status")
def toggle_user_status(
    user_id: int,
    data: UserStatusUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["ADMIN"]))
):
    target = db.query(User).filter(User.id == user_id).first()
    if not target:
        raise HTTPException(status_code=404, detail="User not found.")

    if target.id == current_user.id and not data.is_active:
        raise HTTPException(status_code=400, detail="Cannot deactivate the active admin session.")

    target.is_active = data.is_active
    db.commit()
    return {"status": "success", "user_id": user_id, "is_active": target.is_active}

@router.get("/logs")
def get_system_audit_logs(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["ADMIN"])),
    limit: int = 100
):
    logs = db.query(SOSAuditLog).order_by(SOSAuditLog.timestamp.desc()).limit(limit).all()
    return [
        {
            "id": l.id,
            "sos_id": l.sos_id,
            "action": l.action,
            "actor_id": l.actor_id,
            "actor_role": l.actor_role,
            "notes": l.notes,
            "timestamp": l.timestamp
        }
        for l in logs
    ]

@router.get("/sos-history")
def get_admin_sos_history(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["ADMIN"]))
):
    cases = db.query(EmergencyCase).order_by(EmergencyCase.created_at.desc()).all()
    results = []
    for c in cases:
        passenger = db.query(User).filter(User.id == c.passenger_id).first()
        responder = db.query(User).filter(User.id == c.responder_id).first() if c.responder_id else None
        results.append({
            "sos_id": c.sos_id,
            "passenger_name": passenger.name if passenger else "Unknown",
            "passenger_phone": passenger.phone if passenger else "N/A",
            "latitude": c.latitude,
            "longitude": c.longitude,
            "address": c.address,
            "status": c.status,
            "responder_name": responder.name if responder else None,
            "created_at": c.created_at,
            "acknowledged_at": c.acknowledged_at,
            "resolved_at": c.resolved_at
        })
    return results
