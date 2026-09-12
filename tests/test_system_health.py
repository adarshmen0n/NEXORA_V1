import pytest
from fastapi.testclient import TestClient
from backend.main import app

client = TestClient(app)

def test_health_check():
    res = client.get("/api/health")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "healthy"
    assert data["system"] == "NEXORA V1"
    assert "timestamp" in data

def test_routes_retrieval():
    res = client.get("/api/routes")
    assert res.status_code == 200
    routes = res.json()
    assert len(routes) >= 5
    route_ids = [r["route_id"] for r in routes]
    assert "Route A" in route_ids
    assert "Route B" in route_ids

def test_fleet_buses():
    res = client.get("/api/buses")
    assert res.status_code == 200
    buses = res.json()
    assert len(buses) == 5
    bus_ids = [b["bus_id"] for b in buses]
    assert "BUS-001" in bus_ids
    assert "BUS-005" in bus_ids

def test_trip_start_and_stop():
    res_login = client.post("/api/auth/login", json={"email": "driver@nexora.local", "password": "Password123"})
    token = res_login.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Start trip
    res_start = client.post("/api/trips/start", json={
        "bus_id": "BUS-002",
        "route_id": "Route B"
    }, headers=headers)
    assert res_start.status_code == 200

    # Stop trip
    res_stop = client.post("/api/trips/stop", json={
        "bus_id": "BUS-002"
    }, headers=headers)
    assert res_stop.status_code == 200
    assert res_stop.json()["status"] == "success"
