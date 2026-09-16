import pytest
from fastapi.testclient import TestClient
from backend.main import app

client = TestClient(app)

def get_token(email: str):
    res = client.post("/api/auth/login", json={"email": email, "password": "Password123"})
    return res.json()["access_token"]

def test_sos_rejected_without_coordinates():
    token = get_token("passenger2@nexora.local")
    headers = {"Authorization": f"Bearer {token}"}

    # Coordinates 0, 0 or missing should be rejected
    res = client.post("/api/sos", json={"latitude": 0.0, "longitude": 0.0}, headers=headers)
    assert res.status_code == 400
    assert "GPS coordinates are strictly required" in res.json()["detail"]

def test_sos_full_lifecycle():
    pax_token = get_token("passenger1@nexora.local")
    resp_token = get_token("responder@nexora.local")
    admin_token = get_token("admin@nexora.local")

    pax_headers = {"Authorization": f"Bearer {pax_token}"}
    resp_headers = {"Authorization": f"Bearer {resp_token}"}
    admin_headers = {"Authorization": f"Bearer {admin_token}"}

    # 1. Trigger SOS
    res_trigger = client.post("/api/sos", json={
        "latitude": 11.0168,
        "longitude": 76.9558
    }, headers=pax_headers)
    assert res_trigger.status_code == 200
    sos_data = res_trigger.json()
    assert "sos_id" in sos_data
    assert sos_data["status"] in ["ACTIVE", "ACKNOWLEDGED", "RESPONDING"]
    assert sos_data["address"] is not None
    sos_id = sos_data["sos_id"]

    # 2. Responder views active alerts
    res_active = client.get("/api/sos/active", headers=resp_headers)
    assert res_active.status_code == 200
    active_cases = res_active.json()
    matching = [c for c in active_cases if c["sos_id"] == sos_id]
    assert len(matching) > 0

    # 3. Responder accepts SOS
    res_accept = client.post(f"/api/sos/{sos_id}/accept", json={
        "notes": "Quick response team mobilized"
    }, headers=resp_headers)
    assert res_accept.status_code == 200
    assert res_accept.json()["status"] == "ACKNOWLEDGED"

    # 4. Responder transitions to RESPONDING
    res_respond = client.post(f"/api/sos/{sos_id}/respond", json={
        "notes": "Unit en route with first aid"
    }, headers=resp_headers)
    assert res_respond.status_code == 200
    assert res_respond.json()["status"] == "RESPONDING"

    # 5. Responder marks RESOLVED
    res_resolve = client.post(f"/api/sos/{sos_id}/resolve", json={
        "notes": "Assistance rendered, victim safe."
    }, headers=resp_headers)
    assert res_resolve.status_code == 200
    assert res_resolve.json()["status"] == "RESOLVED"

    # 6. Verify audit logs recorded in admin console
    res_logs = client.get("/api/admin/logs", headers=admin_headers)
    assert res_logs.status_code == 200
    logs = res_logs.json()
    sos_actions = [l["action"] for l in logs if l["sos_id"] == sos_id]
    assert "RESOLVED" in sos_actions

def test_sos_retrigger_and_notification_dispatch():
    pax_token = get_token("passenger2@nexora.local")
    resp_token = get_token("responder@nexora.local")
    pax_headers = {"Authorization": f"Bearer {pax_token}"}
    resp_headers = {"Authorization": f"Bearer {resp_token}"}

    # First SOS trigger
    res1 = client.post("/api/sos", json={"latitude": 11.0180, "longitude": 76.9600}, headers=pax_headers)
    assert res1.status_code == 200
    sos1 = res1.json()
    sos_id = sos1["sos_id"]

    # Re-trigger with new coordinates while active
    res2 = client.post("/api/sos", json={"latitude": 11.0195, "longitude": 76.9620}, headers=pax_headers)
    assert res2.status_code == 200
    sos2 = res2.json()
    assert sos2["sos_id"] == sos_id
    assert abs(sos2["latitude"] - 11.0195) < 0.0001

    # Check passenger received confirmation notifications
    pax_notifs = client.get("/api/notifications", headers=pax_headers).json()
    assert len(pax_notifs) > 0
    assert any("SOS" in n["title"] for n in pax_notifs)

    # Check responder received alert notifications
    resp_notifs = client.get("/api/notifications", headers=resp_headers).json()
    assert len(resp_notifs) > 0
    assert any("EMERGENCY" in n["type"] for n in resp_notifs)

    # Commuter cancels emergency
    res_cancel = client.post(f"/api/sos/{sos_id}/cancel", json={"notes": "False alarm, safe."}, headers=pax_headers)
    assert res_cancel.status_code == 200
    assert res_cancel.json()["status"] == "CANCELLED"

    # Verify responder received stand-down notification
    resp_notifs_after = client.get("/api/notifications", headers=resp_headers).json()
    assert any("STAND-DOWN" in n["title"] or "Cancelled" in n["title"] for n in resp_notifs_after)

