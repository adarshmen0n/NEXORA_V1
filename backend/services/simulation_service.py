import asyncio
import datetime
import logging
from typing import Dict, List, Optional
from backend.database import SessionLocal
from backend.models import Bus, LocationLog
from backend.services.websocket_service import ws_manager

logger = logging.getLogger("nexora.simulation")

WAYPOINTS = [
    {"name": "Gandhipuram Central Bus Stand", "road": "Gandhipuram Central (Cross Cut Rd)", "lat": 11.01684, "lng": 76.95583, "speed": 18.0},
    {"name": "Park Gate / VOC Park", "road": "Park Gate / VOC Grounds", "lat": 11.01750, "lng": 76.96200, "speed": 28.0},
    {"name": "GKNM Hospital Junction", "road": "Avinashi Rd (Near GKNM Hospital)", "lat": 11.01502, "lng": 76.96805, "speed": 32.0},
    {"name": "Lakshmi Mills Flyover", "road": "Lakshmi Mills Flyover Base", "lat": 11.01421, "lng": 76.98042, "speed": 42.0},
    {"name": "Nava India Signal", "road": "Nava India / Hindustan Junction", "lat": 11.01853, "lng": 76.99124, "speed": 28.0},
    {"name": "Peelamedu / PSG Tech", "road": "Peelamedu (PSG College of Tech)", "lat": 11.02501, "lng": 76.99502, "speed": 35.0},
    {"name": "Fun Republic Mall", "road": "Avinashi Rd (Fun Republic Mall)", "lat": 11.02610, "lng": 77.00420, "speed": 32.0},
    {"name": "Hope College Junction", "road": "Hope College Overbridge", "lat": 11.02753, "lng": 77.01201, "speed": 38.0},
    {"name": "Coimbatore Medical College", "road": "Avinashi Rd (Coimbatore Medical College)", "lat": 11.03001, "lng": 77.01804, "speed": 40.0},
    {"name": "CIT Campus", "road": "CIT Campus / Aerodrome Road", "lat": 11.02852, "lng": 77.02652, "speed": 42.0},
    {"name": "SITRA Junction", "road": "SITRA Airport Junction", "lat": 11.03100, "lng": 77.03000, "speed": 25.0},
    {"name": "Coimbatore Airport", "road": "Coimbatore Airport Terminus (CJB)", "lat": 11.03154, "lng": 77.03302, "speed": 12.0}
]

def generate_trajectory(steps_per_segment: int = 8) -> List[Dict]:
    trajectory = []
    # Outbound: Gandhipuram -> Airport
    for i in range(len(WAYPOINTS) - 1):
        p1 = WAYPOINTS[i]
        p2 = WAYPOINTS[i + 1]
        for step in range(steps_per_segment):
            t = step / float(steps_per_segment)
            lat = p1["lat"] + (p2["lat"] - p1["lat"]) * t
            lng = p1["lng"] + (p2["lng"] - p1["lng"]) * t
            speed = p1["speed"] + (p2["speed"] - p1["speed"]) * t
            trajectory.append({
                "name": p1["name"],
                "road": p1["road"],
                "heading": f"Towards {p2['name']}",
                "lat": round(lat, 6),
                "lng": round(lng, 6),
                "speed": round(speed, 1)
            })
    # Return loop: Airport -> Gandhipuram
    rev = list(reversed(WAYPOINTS))
    for i in range(len(rev) - 1):
        p1 = rev[i]
        p2 = rev[i + 1]
        for step in range(steps_per_segment):
            t = step / float(steps_per_segment)
            lat = p1["lat"] + (p2["lat"] - p1["lat"]) * t
            lng = p1["lng"] + (p2["lng"] - p1["lng"]) * t
            speed = p1["speed"] + (p2["speed"] - p1["speed"]) * t
            trajectory.append({
                "name": p1["name"],
                "road": p1["road"],
                "heading": f"Return towards {p2['name']}",
                "lat": round(lat, 6),
                "lng": round(lng, 6),
                "speed": round(speed, 1)
            })
    return trajectory

class TransitSimulationService:
    def __init__(self, bus_id: str = "BUS-001", interval: float = 2.0):
        self.bus_id = bus_id
        self.interval = interval
        self.trajectory = generate_trajectory(steps_per_segment=8)
        self.current_index = 0
        self.is_running = False
        self._task: Optional[asyncio.Task] = None

    def start(self):
        if self.is_running:
            return
        self.is_running = True
        self._task = asyncio.create_task(self._run_loop())
        logger.info(f"NEXORA Transit Simulation Service started for {self.bus_id} ({len(self.trajectory)} waypoints).")

    def stop(self):
        if not self.is_running:
            return
        self.is_running = False
        if self._task and not self._task.done():
            self._task.cancel()
        logger.info(f"NEXORA Transit Simulation Service stopped for {self.bus_id}.")

    def get_status(self) -> Dict:
        curr = self.trajectory[self.current_index] if self.trajectory else {}
        return {
            "is_running": self.is_running,
            "bus_id": self.bus_id,
            "current_index": self.current_index,
            "total_waypoints": len(self.trajectory),
            "interval_sec": self.interval,
            "current_point": curr
        }

    async def _run_loop(self):
        total = len(self.trajectory)
        while self.is_running:
            try:
                pt = self.trajectory[self.current_index]
                now = datetime.datetime.now(datetime.timezone.utc)

                # Persist to database
                db = SessionLocal()
                try:
                    bus = db.query(Bus).filter(Bus.bus_id == self.bus_id).first()
                    if bus:
                        bus.current_latitude = pt["lat"]
                        bus.current_longitude = pt["lng"]
                        bus.current_speed = pt["speed"]
                        bus.status = "ACTIVE"
                        bus.last_updated = now

                        log = LocationLog(
                            entity_type="BUS",
                            entity_id=self.bus_id,
                            latitude=pt["lat"],
                            longitude=pt["lng"],
                            speed=pt["speed"],
                            timestamp=now
                        )
                        db.add(log)
                        db.commit()
                finally:
                    db.close()

                # Broadcast live telemetry over WebSocket to all connected clients
                await ws_manager.broadcast({
                    "type": "BUS_LOCATION_UPDATE",
                    "data": {
                        "bus_id": self.bus_id,
                        "registration_number": "TN 38 BX 1001",
                        "latitude": pt["lat"],
                        "longitude": pt["lng"],
                        "speed": pt["speed"],
                        "location_name": pt["name"],
                        "road": pt["road"],
                        "heading": pt["heading"],
                        "route_id": "Route 1",
                        "status": "ACTIVE",
                        "timestamp": now.isoformat()
                    }
                })

                self.current_index = (self.current_index + 1) % total
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Error in simulation step: {e}")

            await asyncio.sleep(self.interval)

simulation_service = TransitSimulationService()
