import pytest
from fastapi.testclient import TestClient
from backend.main import app

client = TestClient(app)

def test_login_admin():
    res = client.post("/api/auth/login", json={
        "email": "admin@nexora.local",
        "password": "Password123"
    })
    assert res.status_code == 200
    data = res.json()
    assert "access_token" in data
    assert data["user"]["role"] == "ADMIN"
    assert data["user"]["user_code"] == "ADM-001"

def test_login_invalid_password():
    res = client.post("/api/auth/login", json={
        "email": "admin@nexora.local",
        "password": "WrongPassword999"
    })
    assert res.status_code == 401
    assert "Invalid email or password" in res.json()["detail"]

def test_register_passenger_public():
    import uuid
    random_email = f"commuter_{uuid.uuid4().hex[:6]}@test.com"
    res = client.post("/api/auth/register", json={
        "name": "Arun Kumar",
        "email": random_email,
        "password": "Password123",
        "phone": "+91 9988776655",
        "role": "PASSENGER"
    })
    assert res.status_code == 201
    data = res.json()
    assert data["user"]["role"] == "PASSENGER"
    assert data["user"]["email"] == random_email
    assert data["user"]["user_code"].startswith("PAX-")

def test_register_admin_rejected_public():
    res = client.post("/api/auth/register", json={
        "name": "Fake Admin",
        "email": "fakeadmin@test.com",
        "password": "Password123",
        "phone": "+91 9988776655",
        "role": "ADMIN"
    })
    assert res.status_code == 403
    assert "Public registration is restricted" in res.json()["detail"]

def test_rbac_passenger_forbidden_admin_dashboard():
    # Login as passenger
    res = client.post("/api/auth/login", json={
        "email": "passenger1@nexora.local",
        "password": "Password123"
    })
    token = res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Attempt to hit admin endpoint
    res_admin = client.get("/api/admin/dashboard", headers=headers)
    assert res_admin.status_code == 403
    assert "Access denied" in res_admin.json()["detail"]

def test_rbac_admin_allowed_dashboard():
    res = client.post("/api/auth/login", json={
        "email": "admin@nexora.local",
        "password": "Password123"
    })
    token = res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    res_admin = client.get("/api/admin/dashboard", headers=headers)
    assert res_admin.status_code == 200
    data = res_admin.json()
    assert "total_users" in data
    assert "active_buses" in data
