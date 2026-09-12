import time
import math
import logging
import argparse
import datetime
import requests

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("nexora.simulator")

DEFAULT_SERVER = "http://127.0.0.1:8000"

# Authentic GPS corridor waypoints for Route A (Gandhipuram Central -> Peelamedu -> Airport)
ROUTE_A_WAYPOINTS = [
    {"name": "Gandhipuram Central Bus Stand", "lat": 11.01684, "lng": 76.95583, "speed": 15.0},
    {"name": "Park Gate / Cross Cut Road", "lat": 11.01750, "lng": 76.96200, "speed": 28.0},
    {"name": "GKNM Hospital Junction", "lat": 11.01502, "lng": 76.96805, "speed": 32.0},
    {"name": "Lakshmi Mills Flyover Base", "lat": 11.01421, "lng": 76.98042, "speed": 38.0},
    {"name": "Nava India Signal", "lat": 11.01853, "lng": 76.99124, "speed": 26.0},
    {"name": "Peelamedu / PSG College of Tech", "lat": 11.02501, "lng": 76.99502, "speed": 34.0},
    {"name": "Fun Republic Mall", "lat": 11.02610, "lng": 77.00420, "speed": 30.0},
    {"name": "Hope College Junction", "lat": 11.02753, "lng": 77.01201, "speed": 35.0},
    {"name": "Coimbatore Medical College (CMC)", "lat": 11.03001, "lng": 77.01804, "speed": 38.0},
    {"name": "CIT Campus / Aerodrome Road", "lat": 11.02852, "lng": 77.02652, "speed": 40.0},
    {"name": "SITRA Junction", "lat": 11.03100, "lng": 77.03000, "speed": 25.0},
    {"name": "Coimbatore International Airport", "lat": 11.03154, "lng": 77.03302, "speed": 10.0}
]

def authenticate_driver(server_url: str, email: str = "driver@nexora.local", password: str = "Password123") -> str:
    login_url = f"{server_url}/api/auth/login"
    payload = {"email": email, "password": password}
    try:
        res = requests.post(login_url, json=payload, timeout=5)
        if res.status_code == 200:
            token = res.json().get("access_token")
            logger.info(f"Authenticated simulator as '{email}' successfully.")
            return token
        else:
            logger.error(f"Failed to authenticate: {res.status_code} {res.text}")
            return ""
    except Exception as e:
        logger.error(f"Cannot connect to NEXORA backend at {server_url}: {e}")
        return ""

def interpolate_points(p1, p2, steps=6):
    points = []
    for i in range(steps):
        t = i / float(steps)
        lat = p1["lat"] + (p2["lat"] - p1["lat"]) * t
        lng = p1["lng"] + (p2["lng"] - p1["lng"]) * t
        speed = p1["speed"] + (p2["speed"] - p1["speed"]) * t
        points.append({
            "name": f"Heading towards {p2['name']}",
            "lat": round(lat, 6),
            "lng": round(lng, 6),
            "speed": round(speed, 1)
        })
    return points

def run_simulation(server_url: str, bus_id: str = "BUS-001", interval_sec: float = 2.5):
    logger.info("=" * 60)
    logger.info(f" Starting NEXORA V1 GPS Broadcast Simulator for {bus_id}")
    logger.info(f" Target Server: {server_url}")
    logger.info("=" * 60)

    token = authenticate_driver(server_url)
    if not token:
        logger.error("Simulator could not log in. Make sure the backend server is running and database is seeded.")
        return

    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }

    # Start trip if not already started
    trip_start_url = f"{server_url}/api/trips/start"
    try:
        res = requests.post(trip_start_url, json={"bus_id": bus_id, "route_id": "Route A"}, headers=headers, timeout=5)
        logger.info(f"Trip initialization status: {res.json().get('status', 'ok')}")
    except Exception as e:
        logger.warning(f"Trip start call encountered: {e}")

    # Build interpolated trajectory
    trajectory = []
    for i in range(len(ROUTE_A_WAYPOINTS) - 1):
        trajectory.extend(interpolate_points(ROUTE_A_WAYPOINTS[i], ROUTE_A_WAYPOINTS[i+1], steps=5))
    trajectory.append(ROUTE_A_WAYPOINTS[-1])

    # Return loop (reverse)
    reverse_wp = list(reversed(ROUTE_A_WAYPOINTS))
    for i in range(len(reverse_wp) - 1):
        trajectory.extend(interpolate_points(reverse_wp[i], reverse_wp[i+1], steps=5))

    update_url = f"{server_url}/api/tracking/bus/location"
    point_idx = 0
    total_points = len(trajectory)

    logger.info(f"Trajectory generated: {total_points} discrete GPS telemetry fixes. Broadcasting...")

    try:
        while True:
            pt = trajectory[point_idx]
            payload = {
                "bus_id": bus_id,
                "latitude": pt["lat"],
                "longitude": pt["lng"],
                "speed": pt["speed"],
                "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat()
            }

            try:
                r = requests.post(update_url, json=payload, headers=headers, timeout=4)
                if r.status_code == 200:
                    logger.info(f"[{bus_id}] Fix {point_idx+1}/{total_points} | Pos: ({pt['lat']:.5f}, {pt['lng']:.5f}) | Speed: {pt['speed']:4.1f} km/h | {pt['name']}")
                else:
                    logger.warning(f"GPS update returned HTTP {r.status_code}: {r.text}")
            except requests.exceptions.RequestException as e:
                logger.error(f"Network error transmitting telemetry: {e}")

            point_idx = (point_idx + 1) % total_points
            time.sleep(interval_sec)

    except KeyboardInterrupt:
        logger.info("\nSimulator stopped by user.")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="NEXORA V1 Live Bus GPS Telemetry Simulator")
    parser.add_argument("--server", default=DEFAULT_SERVER, help="NEXORA Backend URL")
    parser.add_argument("--bus", default="BUS-001", help="Bus ID to simulate")
    parser.add_argument("--interval", type=float, default=2.5, help="Update interval in seconds")
    args = parser.parse_args()

    run_simulation(args.server, args.bus, args.interval)
