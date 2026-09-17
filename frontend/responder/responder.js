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
let responderWatchId = null;

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
    startResponderLiveGPS();
    await loadActiveAlerts();

    setInterval(loadActiveAlerts, 4000);
});

function startResponderLiveGPS() {
    if (!navigator.geolocation) {
        console.warn("Geolocation API not supported by device.");
        updateBeaconLocation(responderLat, responderLng);
        return;
    }

    const geoOptions = {
        enableHighAccuracy: true,
        timeout: 30000,
        maximumAge: 0
    };

    navigator.geolocation.getCurrentPosition(
        (pos) => {
            updateBeaconLocation(pos.coords.latitude, pos.coords.longitude, pos.coords.accuracy || 5.0);
            if (map) map.setView([pos.coords.latitude, pos.coords.longitude], 14);
            loadActiveAlerts();
        },
        (err) => {
            console.warn("Responder initial GNSS acquisition error:", err);
            updateBeaconLocation(responderLat, responderLng);
        },
        geoOptions
    );

    responderWatchId = navigator.geolocation.watchPosition(
        (pos) => {
            updateBeaconLocation(pos.coords.latitude, pos.coords.longitude, pos.coords.accuracy || 5.0);
        },
        (err) => {
            console.warn("Responder watchPosition error:", err);
        },
        geoOptions
    );
}

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

async function updateBeaconLocation(lat, lng, acc = 5.0) {
    responderLat = lat;
    responderLng = lng;

    if (responderMarker) responderMarker.setLatLng([lat, lng]);
    if (radiusCircle) radiusCircle.setLatLng([lat, lng]);

    const coordsEl = document.getElementById("beaconCoords");
    if (coordsEl) {
        coordsEl.textContent = `${lat.toFixed(5)}, ${lng.toFixed(5)} (±${acc.toFixed(1)}m)`;
    }

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

let victimZoneCircle = null;
let tacticalPoiMarkers = [];

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
        if (victimZoneCircle) { map.removeLayer(victimZoneCircle); victimZoneCircle = null; }
        tacticalPoiMarkers.forEach(m => map.removeLayer(m));
        tacticalPoiMarkers = [];
        return;
    }

    // Auto-focus map on passenger SOS location (Primary Active Incident)
    const primary = cases[0];
    map.setView([primary.latitude, primary.longitude], 14, { animate: true });

    // Draw 10 km Tactical Emergency Zone Circle around Victim
    if (victimZoneCircle) {
        victimZoneCircle.setLatLng([primary.latitude, primary.longitude]);
    } else {
        victimZoneCircle = L.circle([primary.latitude, primary.longitude], {
            radius: 10000,
            color: "#dc2626",
            fillColor: "#ef4444",
            fillOpacity: 0.08,
            weight: 2.5,
            dashArray: "6, 6"
        }).addTo(map);
    }
    victimZoneCircle.bindTooltip("🚨 Tactical Emergency Zone (10.0 km Radius around Victim)", { permanent: false });

    // Calculate & render nearby tactical services within 10 km (Hospitals, Police, Fire)
    tacticalPoiMarkers.forEach(m => map.removeLayer(m));
    tacticalPoiMarkers = [];

    let nearbyEmergencyServices = [];
    if (typeof COIMBATORE_POIS !== "undefined") {
        nearbyEmergencyServices = COIMBATORE_POIS.filter(p => ["hospital", "police", "fire"].includes(p.category))
            .map(p => {
                const distFromVictim = calculateHaversineKm(primary.latitude, primary.longitude, p.lat, p.lng);
                return { ...p, distFromVictim };
            })
            .filter(p => p.distFromVictim <= 10.0)
            .sort((a, b) => a.distFromVictim - b.distFromVictim);

        // Add markers on map for nearby emergency services
        nearbyEmergencyServices.forEach(p => {
            const catColors = { hospital: "#dc2626", police: "#2563eb", fire: "#ea580c" };
            const catIcons = { hospital: "🏥", police: "🚓", fire: "🚒" };
            const m = L.circleMarker([p.lat, p.lng], {
                radius: 7,
                fillColor: catColors[p.category] || "#10b981",
                color: "#ffffff",
                weight: 1.5,
                opacity: 1,
                fillOpacity: 0.9
            }).addTo(map);

            m.bindPopup(`
                <div style="font-family: sans-serif; font-size: 12px; line-height: 1.4;">
                    <strong style="color: ${catColors[p.category]};">${catIcons[p.category]} ${p.name}</strong><br>
                    <span style="color: #64748b; font-size: 11px;">${p.type}</span><br>
                    <strong>Distance from Victim:</strong> ${p.distFromVictim.toFixed(2)} km<br>
                    <strong>Phone:</strong> <a href="tel:${p.phone}">${p.phone}</a><br>
                    <small>${p.address}</small>
                </div>
            `);
            tacticalPoiMarkers.push(m);
        });
    }

    // Direct tactical line from Responder to Victim
    if (incidentLine) map.removeLayer(incidentLine);
    incidentLine = L.polyline([[responderLat, responderLng], [primary.latitude, primary.longitude]], {
        color: "#ef4444",
        weight: 3,
        dashArray: "6, 8"
    }).addTo(map);

    cases.forEach(c => {
        const distKm = calculateHaversineKm(responderLat, responderLng, c.latitude, c.longitude);
        const isWithinRadius = distKm <= SOS_RADIUS_KM;
        const distText = distKm < 1.0 ? `${Math.round(distKm * 1000)} meters away` : `${distKm.toFixed(2)} km away`;

        // Generate nearby tactical units HTML for this incident
        let tacticalUnitsHtml = "";
        if (nearbyEmergencyServices.length > 0) {
            const topUnits = nearbyEmergencyServices.slice(0, 6);
            tacticalUnitsHtml = `
                <div style="margin-top: 12px; background: rgba(15, 23, 42, 0.6); border: 1px solid rgba(239, 68, 68, 0.3); border-radius: 8px; padding: 10px;">
                    <div style="font-size: 0.8rem; font-weight: 700; color: #fca5a5; margin-bottom: 6px; display: flex; justify-content: space-between;">
                        <span>🎯 TACTICAL UNITS WITHIN 10 KM OF VICTIM (${nearbyEmergencyServices.length} AVAILABLE)</span>
                        <span style="color: #94a3b8; font-weight: normal;">Radius: 10.0 km</span>
                    </div>
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 6px;">
                        ${topUnits.map(u => `
                            <div style="background: rgba(30, 41, 59, 0.8); padding: 6px 8px; border-radius: 6px; font-size: 0.75rem; border-left: 3px solid ${u.category === 'hospital' ? '#ef4444' : (u.category === 'police' ? '#3b82f6' : '#f97316')};">
                                <div style="font-weight: 600; color: #f8fafc; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                                    ${u.icon} ${u.name}
                                </div>
                                <div style="color: #93c5fd; font-family: monospace;">📍 ${u.distFromVictim.toFixed(2)} km • 📞 <a href="tel:${u.phone}" style="color: #6ee7b7; text-decoration: none;">${u.phone.split('/')[0].trim()}</a></div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        }

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
                <div class="address-title">Reverse-Geocoded Street Address (Victim Coordinates)</div>
                <div class="address-text">📍 ${c.address || 'Address dispatched'}</div>
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
                    <strong>Victim GNSS:</strong><br>${c.latitude.toFixed(5)}, ${c.longitude.toFixed(5)}
                </div>
            </div>

            ${tacticalUnitsHtml}

            <div class="action-workflow-row" style="margin-top: 12px;">
                <button class="btn-action" style="background: #334155; color: white;" onclick="focusIncidentOnMap(${c.latitude}, ${c.longitude})">
                    🗺️ Zoom Victim
                </button>
                <button class="btn-action btn-accept" id="btnAccept-${c.sos_id}" onclick="acceptAlert('${c.sos_id}')" ${c.status !== 'ACTIVE' ? 'disabled style="opacity:0.5"' : ''}>
                    ✓ Accept Alert
                </button>
                <button class="btn-action btn-responding" id="btnRespond-${c.sos_id}" onclick="setResponding('${c.sos_id}')" ${c.status === 'RESOLVED' ? 'disabled' : ''}>
                    🏃 En Route (Responding)
                </button>
                <button class="btn-action btn-resolve" id="btnResolve-${c.sos_id}" onclick="resolveAlert('${c.sos_id}')">
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
    const btn = document.getElementById(`btnAccept-${sosId}`);
    if (btn) { btn.disabled = true; btn.textContent = "Accepting..."; }
    try {
        const res = await fetchWithAuth(`/api/sos/${sosId}/accept`, {
            method: "POST",
            body: JSON.stringify({ notes: "Unit RSP-001 accepted dispatch." })
        });
        if (res.ok) {
            showToast(`Alert ${sosId} accepted. You are assigned to incident.`, "success");
            await loadActiveAlerts();
        } else {
            const err = await res.json().catch(() => ({}));
            showToast("Failed to accept alert: " + (err.detail || "Server error"), "error");
            if (btn) { btn.disabled = false; btn.textContent = "✓ Accept Alert"; }
        }
    } catch (e) {
        showToast("Network error accepting alert", "error");
        if (btn) { btn.disabled = false; btn.textContent = "✓ Accept Alert"; }
    }
}

async function setResponding(sosId) {
    const btn = document.getElementById(`btnRespond-${sosId}`);
    if (btn) { btn.disabled = true; btn.textContent = "Dispatching..."; }
    try {
        const res = await fetchWithAuth(`/api/sos/${sosId}/respond`, {
            method: "POST",
            body: JSON.stringify({ notes: "Unit RSP-001 en route." })
        });
        if (res.ok) {
            showToast(`Status updated: En route to ${sosId}`, "info");
            await loadActiveAlerts();
        } else {
            const err = await res.json().catch(() => ({}));
            showToast("Failed to update status: " + (err.detail || "Server error"), "error");
            if (btn) { btn.disabled = false; btn.textContent = "🏃 En Route (Responding)"; }
        }
    } catch (e) {
        showToast("Network error updating status", "error");
        if (btn) { btn.disabled = false; btn.textContent = "🏃 En Route (Responding)"; }
    }
}

async function resolveAlert(sosId) {
    let notes = prompt("Enter incident resolution notes:", "Victim assisted safely. Incident resolved.");
    if (notes === null || notes.trim() === "") {
        notes = "Victim assisted safely. Emergency resolved by rescue unit.";
    }

    const btn = document.getElementById(`btnResolve-${sosId}`);
    if (btn) { btn.disabled = true; btn.textContent = "Resolving..."; }

    try {
        const res = await fetchWithAuth(`/api/sos/${sosId}/resolve`, {
            method: "POST",
            body: JSON.stringify({ notes })
        });
        if (res.ok) {
            showToast(`Incident ${sosId} closed successfully.`, "success");
            await loadActiveAlerts();
        } else {
            const err = await res.json().catch(() => ({}));
            showToast("Failed to resolve alert: " + (err.detail || "Server error"), "error");
            if (btn) { btn.disabled = false; btn.textContent = "★ Resolve Incident"; }
        }
    } catch (e) {
        showToast("Network error resolving alert", "error");
        if (btn) { btn.disabled = false; btn.textContent = "★ Resolve Incident"; }
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
