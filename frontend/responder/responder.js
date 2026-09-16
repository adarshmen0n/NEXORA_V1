// NEXORA V1 - Tactical Emergency Responder Console

let map;
let responderMarker;
let radiusCircle;
let sosMarkers = {};
let incidentLine;
let socket;

let responderLat = 11.0180; // Gandhipuram Quick Response Base
let responderLng = 76.9600;
const SOS_RADIUS_KM = 35.0;

document.addEventListener("DOMContentLoaded", async () => {
    let user = getUser();
    let token = getToken();

    if (!token || !user || !["RESPONDER", "ADMIN"].includes(user.role)) {
        try {
            const loginRes = await loginUser("responder@nexora.local", "Password123");
            user = loginRes.user;
            token = loginRes.access_token;
        } catch (e) {
            window.location.href = "/";
            return;
        }
    }

    document.getElementById("responderName").textContent = user.name;
    document.getElementById("responderCode").textContent = user.user_code || "RSP-001";

    initMap();
    initWebSocket();
    await updateBeaconLocation(responderLat, responderLng);
    await loadActiveAlerts();

    setInterval(loadActiveAlerts, 8000);
});

function initMap() {
    map = L.map("responderMap", {
        zoomControl: false,
        attributionControl: false
    }).setView([responderLat, responderLng], 14);

    L.tileLayer("https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png", {
        maxZoom: 19
    }).addTo(map);

    // Add Responder marker
    const icon = L.divIcon({
        className: "responder-beacon-icon",
        html: `<div style="background: #2563eb; color: white; padding: 4px 8px; border-radius: 8px; font-weight: 800; font-size: 11px; border: 2px solid white; box-shadow: 0 0 14px #2563eb;">🛡️ YOU (UNIT-1)</div>`,
        iconSize: [90, 26],
        iconAnchor: [45, 13]
    });
    responderMarker = L.marker([responderLat, responderLng], { icon: icon }).addTo(map);

    // Draw 35.0 km tactical radius
    radiusCircle = L.circle([responderLat, responderLng], {
        radius: SOS_RADIUS_KM * 1000,
        color: "#ef4444",
        fillColor: "#ef4444",
        fillOpacity: 0.08,
        weight: 1.5,
        dashArray: "4, 6"
    }).addTo(map);
}

async function updateBeaconLocation(lat, lng) {
    responderLat = lat;
    responderLng = lng;

    if (responderMarker) responderMarker.setLatLng([lat, lng]);
    if (radiusCircle) radiusCircle.setLatLng([lat, lng]);

    document.getElementById("beaconCoords").textContent = `${lat.toFixed(5)}, ${lng.toFixed(5)}`;

    // Push responder location fix
    try {
        await fetchWithAuth("/api/tracking/responder/location", {
            method: "POST",
            body: JSON.stringify({ latitude: lat, longitude: lng })
        });
    } catch (e) {
        console.error("Beacon transmission error", e);
    }
}

function setResponderPreset(lat, lng, name) {
    updateBeaconLocation(lat, lng);
    map.panTo([lat, lng]);
    showToast(`Beacon repositioned to: ${name}`, "info");
    loadActiveAlerts();
}

async function loadActiveAlerts() {
    try {
        const res = await fetchWithAuth("/api/sos/active");
        if (res.ok) {
            const cases = await res.json();
            renderIncidents(cases);
        }
    } catch (e) {
        console.error("Failed to load alerts", e);
    }
}

function renderIncidents(cases) {
    const list = document.getElementById("activeIncidentsList");
    list.innerHTML = "";

    // Clear old map markers
    const currentIds = cases.map(c => c.sos_id);
    for (const sid in sosMarkers) {
        if (!currentIds.includes(sid)) {
            map.removeLayer(sosMarkers[sid]);
            delete sosMarkers[sid];
        }
    }

    if (cases.length === 0) {
        list.innerHTML = `<div style="padding: 20px; text-align: center; color: var(--text-dim);">No active emergency dispatches within sector. Standing by on high alert.</div>`;
        if (incidentLine) { map.removeLayer(incidentLine); incidentLine = null; }
        return;
    }

    cases.forEach(c => {
        const distKm = calculateHaversineKm(responderLat, responderLng, c.latitude, c.longitude);
        const isWithinRadius = distKm <= SOS_RADIUS_KM;
        const distText = distKm < 1.0 ? `${Math.round(distKm * 1000)} meters away` : `${distKm.toFixed(2)} km away`;

        const card = document.createElement("div");
        card.className = `incident-card ${isWithinRadius ? 'within-radius' : ''}`;
        card.innerHTML = `
            <div class="incident-top">
                <span class="incident-code">🚨 ${c.sos_id}</span>
                <span class="distance-badge ${isWithinRadius ? 'immediate' : ''}">
                    ${isWithinRadius ? '📍 WITHIN 35.0 KM GEOFENCE' : '⚠️ OUTSIDE GEOFENCE'} • ${distText}
                </span>
            </div>

            <div class="incident-address-box">
                <div class="address-title">Reverse-Geocoded Street Address</div>
                <div class="address-text">📍 ${c.address}</div>
            </div>

            <div class="incident-meta-grid">
                <div class="meta-item">
                    <strong>Passenger:</strong><br>${c.passenger_name}
                </div>
                <div class="meta-item">
                    <strong>Phone Contact:</strong><br>${c.passenger_phone}
                </div>
                <div class="meta-item">
                    <strong>Incident Status:</strong><br><span style="color: #60a5fa; font-weight: bold;">${c.status}</span>
                </div>
                <div class="meta-item">
                    <strong>GPS Coordinates:</strong><br>${c.latitude.toFixed(4)}, ${c.longitude.toFixed(4)}
                </div>
            </div>

            <div class="action-workflow-row">
                <button class="btn-action" style="background: #334155; color: white;" onclick="focusIncidentOnMap(${c.latitude}, ${c.longitude})">
                    🗺️ Zoom Map
                </button>
                <button class="btn-action btn-accept" onclick="acceptAlert('${c.sos_id}')" ${c.status !== 'ACTIVE' ? 'disabled style="opacity:0.5"' : ''}>
                    ✓ Accept Alert
                </button>
                <button class="btn-action btn-responding" onclick="setResponding('${c.sos_id}')" ${c.status === 'RESOLVED' ? 'disabled' : ''}>
                    🏃 En Route (Responding)
                </button>
                <button class="btn-action btn-resolve" onclick="resolveAlert('${c.sos_id}')">
                    ★ Resolve Incident
                </button>
            </div>
        `;
        list.appendChild(card);

        // Marker on map
        updateIncidentMarker(c);
    });
}

function updateIncidentMarker(c) {
    if (sosMarkers[c.sos_id]) {
        sosMarkers[c.sos_id].setLatLng([c.latitude, c.longitude]);
    } else {
        const icon = L.divIcon({
            className: "sos-tactical-icon",
            html: `<div style="background: #ef4444; color: white; width: 26px; height: 26px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; border: 2px solid white; box-shadow: 0 0 15px #ef4444;">!</div>`,
            iconSize: [26, 26],
            iconAnchor: [13, 13]
        });
        const marker = L.marker([c.latitude, c.longitude], { icon: icon }).addTo(map);
        marker.bindPopup(`<strong>🚨 EMERGENCY: ${c.sos_id}</strong><br>${c.address}<br>Status: ${c.status}`);
        sosMarkers[c.sos_id] = marker;
    }
}

function focusIncidentOnMap(lat, lng) {
    map.setView([lat, lng], 16, { animate: true });

    // Draw direct tactical vector line from responder to victim
    if (incidentLine) map.removeLayer(incidentLine);
    incidentLine = L.polyline([[responderLat, responderLng], [lat, lng]], {
        color: "#ef4444",
        weight: 3,
        dashArray: "6, 8"
    }).addTo(map);
}

async function acceptAlert(sosId) {
    try {
        const res = await fetchWithAuth(`/api/sos/${sosId}/accept`, {
            method: "POST",
            body: JSON.stringify({ notes: "Unit RSP-001 accepted dispatch." })
        });
        if (res.ok) {
            showToast(`Alert ${sosId} accepted. You are assigned.`, "success");
            await loadActiveAlerts();
        }
    } catch (e) {
        showToast("Error accepting alert", "error");
    }
}

async function setResponding(sosId) {
    try {
        const res = await fetchWithAuth(`/api/sos/${sosId}/respond`, {
            method: "POST",
            body: JSON.stringify({ notes: "Unit RSP-001 en route." })
        });
        if (res.ok) {
            showToast(`Status updated: En route to ${sosId}`, "info");
            await loadActiveAlerts();
        }
    } catch (e) {
        showToast("Error updating status", "error");
    }
}

async function resolveAlert(sosId) {
    const notes = prompt("Enter incident resolution notes:", "Victim assisted safely. Incident resolved.");
    if (notes === null) return;

    try {
        const res = await fetchWithAuth(`/api/sos/${sosId}/resolve`, {
            method: "POST",
            body: JSON.stringify({ notes })
        });
        if (res.ok) {
            showToast(`Incident ${sosId} closed successfully.`, "success");
            await loadActiveAlerts();
        }
    } catch (e) {
        showToast("Error resolving alert", "error");
    }
}

function calculateHaversineKm(lat1, lon1, lat2, lon2) {
    const R = 6371.0;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

function initWebSocket() {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    socket = new WebSocket(`${protocol}//${window.location.host}/ws`);

    socket.onmessage = (e) => {
        try {
            const msg = JSON.parse(e.data);
            if (msg.type === "SOS_ALERT") {
                playChime();
                showToast(`🚨 NEW EMERGENCY DISPATCH: ${msg.data.sos_id}!`, "error");
                loadActiveAlerts();
            } else if (msg.type === "SOS_STATUS_UPDATE") {
                loadActiveAlerts();
            }
        } catch (err) {}
    };

    socket.onclose = () => {
        setTimeout(initWebSocket, 3000);
    };
}

function playChime() {
    try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
        osc.frequency.setValueAtTime(880, ctx.currentTime + 0.15); // A5
        gain.gain.setValueAtTime(0.3, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.4);
    } catch (e) {}
}

function logout() {
    clearAuth();
    window.location.href = "/";
}
