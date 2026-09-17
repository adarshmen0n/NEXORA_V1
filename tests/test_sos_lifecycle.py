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

def test_sos_exact_20km_distance_and_dispatch():
    pax_token = get_token("passenger1@nexora.local")
    resp_token = get_token("responder@nexora.local")
    pax_headers = {"Authorization": f"Bearer {pax_token}"}
    resp_headers = {"Authorization": f"Bearer {resp_token}"}

    # 1. Responder is at their genuine GPS location (20.0 km south of Gandhipuram)
    resp_loc_res = client.post("/api/tracking/responder/location", json={
        "latitude": 10.8381,
        "longitude": 76.9600
    }, headers=resp_headers)
    assert resp_loc_res.status_code == 200

    # 2. Passenger triggers SOS at Gandhipuram (11.0180, 76.9600)
    res_trigger = client.post("/api/sos", json={
        "latitude": 11.0180,
        "longitude": 76.9600
    }, headers=pax_headers)
    assert res_trigger.status_code == 200
    sos_data = res_trigger.json()
    sos_id = sos_data["sos_id"]

    # 3. Check responder active alerts returns exact 20 km distance
    res_active = client.get("/api/sos/active", headers=resp_headers)
    assert res_active.status_code == 200
    cases = res_active.json()
    matching = [c for c in cases if c["sos_id"] == sos_id]
    assert len(matching) > 0
    assert abs(matching[0]["responder_distance_km"] - 20.00) < 0.1

    # 4. Check notification sent to responder contains exact ~20 km distance
    resp_notifs = client.get("/api/notifications", headers=resp_headers).json()
    assert any("20.00 km away" in n["message"] or "20.0 km away" in n["message"] for n in resp_notifs)

    # 5. Clean up by resolving
    client.post(f"/api/sos/{sos_id}/resolve", json={"notes": "20km test completed."}, headers=resp_headers)

def test_responder_action_rbac_and_sync():
    pax_token = get_token("passenger1@nexora.local")
    resp_token = get_token("responder@nexora.local")
    pax_headers = {"Authorization": f"Bearer {pax_token}"}
    resp_headers = {"Authorization": f"Bearer {resp_token}"}

    # 1. Trigger SOS
    res_trigger = client.post("/api/sos", json={"latitude": 11.0180, "longitude": 76.9600}, headers=pax_headers)
    assert res_trigger.status_code == 200
    sos_id = res_trigger.json()["sos_id"]

    # 2. Passenger cannot accept their own SOS (RBAC check)
    res_unauth = client.post(f"/api/sos/{sos_id}/accept", json={"notes": "Illegal attempt"}, headers=pax_headers)
    assert res_unauth.status_code == 403

    # 3. Responder accepts SOS
    res_accept = client.post(f"/api/sos/{sos_id}/accept", json={"notes": "Unit assigned"}, headers=resp_headers)
    assert res_accept.status_code == 200
    assert res_accept.json()["status"] == "ACKNOWLEDGED"

    # 4. Passenger /api/sos/active immediately reflects ACKNOWLEDGED
    res_pax_check1 = client.get("/api/sos/active", headers=pax_headers)
    assert res_pax_check1.status_code == 200
    active_pax = res_pax_check1.json()
    assert len(active_pax) > 0
    assert active_pax[0]["status"] == "ACKNOWLEDGED"

    # 5. Responder updates to RESPONDING
    res_respond = client.post(f"/api/sos/{sos_id}/respond", json={"notes": "Unit en route"}, headers=resp_headers)
    assert res_respond.status_code == 200
    assert res_respond.json()["status"] == "RESPONDING"

    # 6. Passenger /api/sos/active immediately reflects RESPONDING
    res_pax_check2 = client.get("/api/sos/active", headers=pax_headers)
    assert res_pax_check2.status_code == 200
    assert res_pax_check2.json()[0]["status"] == "RESPONDING"

    # 7. Responder resolves SOS
    res_resolve = client.post(f"/api/sos/{sos_id}/resolve", json={"notes": "Resolved successfully."}, headers=resp_headers)
    assert res_resolve.status_code == 200
    assert res_resolve.json()["status"] == "RESOLVED"

    # 8. Verify resolved case detail
    res_detail = client.get(f"/api/sos/{sos_id}", headers=pax_headers)
    assert res_detail.status_code == 200
    assert res_detail.json()["status"] == "RESOLVED"

def test_tactical_10km_emergency_services_pois():
    from backend.services.distance_service import calculate_haversine_km

    # Victim coordinates at Gandhipuram Central
    victim_lat = 11.0168
    victim_lng = 76.9558

    # Fetch all POIs
    res = client.get("/api/pois")
    assert res.status_code == 200
    pois = res.json()
    assert len(pois) > 0

    # Filter emergency services within 10 km
    emergency_categories = ["hospital", "police", "fire"]
    tactical_units = []
    for p in pois:
        if p["category"] in emergency_categories:
            dist = calculate_haversine_km(victim_lat, victim_lng, p["lat"], p["lng"])
            if dist <= 10.0:
                tactical_units.append({**p, "dist": dist})

    # Verify that tactical rescue units are present within 10km
    hospitals = [u for u in tactical_units if u["category"] == "hospital"]
    police = [u for u in tactical_units if u["category"] == "police"]
    fire = [u for u in tactical_units if u["category"] == "fire"]

    assert len(hospitals) >= 5, f"Expected at least 5 hospitals within 10km, found {len(hospitals)}"
    assert len(police) >= 4, f"Expected at least 4 police stations within 10km, found {len(police)}"
    assert len(fire) >= 3, f"Expected at least 3 fire stations within 10km, found {len(fire)}"

    # Check all tactical units have valid phone contacts
    for u in tactical_units:
        assert u["phone"] is not None and len(u["phone"]) > 0

def test_sos_client_address_and_dynamic_query_coords():
    pax_token = get_token("passenger1@nexora.local")
    resp_token = get_token("responder@nexora.local")
    pax_headers = {"Authorization": f"Bearer {pax_token}"}
    resp_headers = {"Authorization": f"Bearer {resp_token}"}

    # 1. Trigger SOS with explicit client-provided human-readable address
    custom_addr = "Near PSG Tech, Avinashi Road, Peelamedu, Coimbatore - 641004"
    res = client.post("/api/sos", json={
        "latitude": 11.0250,
        "longitude": 76.9950,
        "address": custom_addr
    }, headers=pax_headers)
    assert res.status_code == 200
    sos_data = res.json()
    assert sos_data["address"] == custom_addr
    sos_id = sos_data["sos_id"]

    # 2. Query /api/sos/active with dynamic query parameters from responder
    # Responder at Eachanari (10.9250, 76.9720) - ~11.38 km away
    res_active = client.get("/api/sos/active?lat=10.9250&lon=76.9720", headers=resp_headers)
    assert res_active.status_code == 200
    cases = res_active.json()
    matching = [c for c in cases if c["sos_id"] == sos_id]
    assert len(matching) > 0
    # Expected distance from (10.9250, 76.9720) to (11.0250, 76.9950) is ~11.38 km
    from backend.services.distance_service import calculate_haversine_km
    expected_dist = round(calculate_haversine_km(10.9250, 76.9720, 11.0250, 76.9950), 2)
    assert abs(matching[0]["responder_distance_km"] - expected_dist) < 0.05

    # 3. Clean up
    client.post(f"/api/sos/{sos_id}/resolve", json={"notes": "Test address & query verified."}, headers=resp_headers)



