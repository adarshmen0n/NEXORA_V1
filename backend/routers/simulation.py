from fastapi import APIRouter
from backend.services.simulation_service import simulation_service

router = APIRouter(prefix="/api/simulation", tags=["Simulation"])

@router.get("/status")
def get_simulation_status():
    return simulation_service.get_status()

@router.post("/start")
def start_simulation():
    simulation_service.start()
    return {"status": "started", "detail": "Live city bus movement simulation is active."}

@router.post("/stop")
def stop_simulation():
    simulation_service.stop()
    return {"status": "stopped", "detail": "Live city bus movement simulation paused."}

@router.post("/toggle")
def toggle_simulation():
    if simulation_service.is_running:
        simulation_service.stop()
        return {"status": "stopped", "is_running": False}
    else:
        simulation_service.start()
        return {"status": "started", "is_running": True}
