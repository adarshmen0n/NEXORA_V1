import json
from typing import List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from backend.database import get_db
from backend.models.route import Route

router = APIRouter(prefix="/api/routes", tags=["Routes"])

@router.get("")
def get_all_routes(db: Session = Depends(get_db)):
    routes = db.query(Route).all()
    results = []
    for r in routes:
        try:
            stops = json.loads(r.stops_json) if r.stops_json else []
        except Exception:
            stops = []
        try:
            path = json.loads(r.path_json) if r.path_json else []
        except Exception:
            path = []

        results.append({
            "id": r.id,
            "route_id": r.route_id,
            "route_name": r.route_name,
            "start_point": r.start_point,
            "end_point": r.end_point,
            "total_distance_km": r.total_distance_km,
            "estimated_duration_minutes": r.estimated_duration_minutes,
            "stops": stops,
            "path": path
        })
    return results

@router.get("/{route_id}")
def get_route_by_id(route_id: str, db: Session = Depends(get_db)):
    r = db.query(Route).filter(Route.route_id == route_id).first()
    if not r:
        raise HTTPException(status_code=404, detail=f"Route '{route_id}' not found")

    stops = json.loads(r.stops_json) if r.stops_json else []
    path = json.loads(r.path_json) if r.path_json else []

    return {
        "id": r.id,
        "route_id": r.route_id,
        "route_name": r.route_name,
        "start_point": r.start_point,
        "end_point": r.end_point,
        "total_distance_km": r.total_distance_km,
        "estimated_duration_minutes": r.estimated_duration_minutes,
        "stops": stops,
        "path": path
    }
