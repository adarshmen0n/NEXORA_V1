import pytest
from fastapi.testclient import TestClient
from backend.main import app

client = TestClient(app)

def get_token(email: str):
    res = client.post("/api/auth/login", json={"email": email, "password": "Password123"})
    return res.json()["access_token"]

def test_bus_gps_telemetry_update():
    token = get_token("driver@nexora.local")
    headers = {"Authorization": f"Bearer {token}"}

    payload = {
        "bus_id": "BUS-001",
        "latitude": 11.01853,
        "longitude": 76.99124,
        "speed": 36.5
    }
    res = client.post("/api/tracking/bus/location", json=payload, headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "success"
    assert data["bus_id"] == "BUS-001"
    assert data["speed"] == 36.5

    # Verify bus record in fleet reflects the new GPS fix
    res_bus = client.get("/api/buses/BUS-001")
    assert res_bus.status_code == 200
    bus_info = res_bus.json()
    assert bus_info["current_latitude"] == 11.01853
    assert bus_info["current_speed"] == 36.5
    assert bus_info["status"] == "ACTIVE"

def test_passenger_location_update():
    token = get_token("passenger1@nexora.local")
    headers = {"Authorization": f"Bearer {token}"}

    payload = {
        "latitude": 11.0168,
        "longitude": 76.9558,
        "accuracy": 4.5
    }
    res = client.post("/api/tracking/passenger/location", json=payload, headers=headers)
    assert res.status_code == 200
    assert res.json()["status"] == "success"

def test_responder_beacon_update():
    token = get_token("responder@nexora.local")
    headers = {"Authorization": f"Bearer {token}"}

    payload = {
        "latitude": 11.0180,
        "longitude": 76.9600
    }
    res = client.post("/api/tracking/responder/location", json=payload, headers=headers)
    assert res.status_code == 200
    assert res.json()["status"] == "success"

def test_distance_and_eta_logic():
    from backend.services.distance_service import calculate_haversine_km
    from backend.services.eta_service import calculate_eta_minutes

    # Gandhipuram to Airport is approx 11.5 km
    dist = calculate_haversine_km(11.0168, 76.9558, 11.0315, 77.0330)
    assert 8.0 < dist < 14.0

    # At 30 km/h, 11.5 km should take roughly 20-25 mins
    eta = calculate_eta_minutes(dist, speed_kmh=30.0)
    assert 15 <= eta <= 30
