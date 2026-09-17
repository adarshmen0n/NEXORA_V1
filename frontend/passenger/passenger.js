// NEXORA V1 - Passenger Portal & Strict SOS Controller

let map;
let userMarker;
let busMarkers = {};
let routeLine;
let socket;

let userLatitude = null;
let userLongitude = null;
let userAddress = "Detecting address...";
let isGpsActive = false;
let activeSOS = null;
let confirmCountdown = 3;
let countdownTimer = null;

const LANDMARK_COORDINATES = {
    "gandhipuram": { name: "Gandhipuram Central", lat: 11.0168, lng: 76.9558 },
    "lakshmimills": { name: "Lakshmi Mills Junction", lat: 11.0142, lng: 76.9804 },
    "peelamedu": { name: "Peelamedu / PSG Tech", lat: 11.0250, lng: 76.9950 },
    "airport": { name: "Coimbatore Airport (CJB)", lat: 11.0315, lng: 77.0330 },
    "junction": { name: "Coimbatore Railway Junction", lat: 11.0016, lng: 76.9628 }
};

document.addEventListener("DOMContentLoaded", async () => {
    let user = getUser();
    let token = getToken();

    if (!token || !user) {
        try {
            const loginRes = await loginUser("passenger1@nexora.local", "Password123");
            user = loginRes.user;
            token = loginRes.access_token;
        } catch (e) {
            window.location.href = "/";
            return;
        }
    }

    document.getElementById("paxName").textContent = user.name;
    document.getElementById("paxCode").textContent = user.user_code || "PAX-001";

    initMap();
    initWebSocket();
    await checkActiveEmergency();

    // Start GNSS satellite tracking immediately
    requestDeviceLocation();

    // Resilient fallback: poll for emergency status updates every 2.5s
    setInterval(checkActiveEmergency, 2500);
    setInterval(refreshNearbyBuses, 8000);
});

function initMap() {
    map = L.map("passengerMap", {
        zoomControl: false,
        attributionControl: false
    }).setView([11.0168, 76.9558], 14);

    L.tileLayer("https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png", {
        maxZoom: 19
    }).addTo(map);

    // Allow user to tap anywhere on the map to place/adjust exact emergency distress coordinates
    map.on("click", (e) => {
        updatePassengerPosition(e.latlng.lat, e.latlng.lng, "Manual Map Pin", 2.0);
        showToast(`Distress pin positioned: ${e.latlng.lat.toFixed(5)}, ${e.latlng.lng.toFixed(5)}`, "info");
    });
}

function setPresetLocation(key) {
    const loc = LANDMARK_COORDINATES[key];
    if (!loc) return;
    updatePassengerPosition(loc.lat, loc.lng, loc.name);
}

let paxWatchId = null;

function requestDeviceLocation() {
    if (!navigator.geolocation) {
        showToast("Geolocation is not supported by this browser or device.", "error");
        return;
    }

    showToast("Acquiring GNSS satellite fix...", "info");
    const ind = document.getElementById("gpsIndicator");
    if (ind) {
        ind.className = "gps-indicator acquiring";
        ind.innerHTML = "<span>🟡</span> Acquiring GNSS Satellites...";
    }

    // 1. Rapid network/cell/Wi-Fi fix for instant location response
    navigator.geolocation.getCurrentPosition(
        (pos) => {
            if (userLatitude === null || userLongitude === null) {
                updatePassengerPosition(pos.coords.latitude, pos.coords.longitude, "Network Fix", pos.coords.accuracy || 15.0);
            }
        },
        () => {},
        { enableHighAccuracy: false, timeout: 5000, maximumAge: 30000 }
    );

    // 2. High-precision GNSS satellite lock
    navigator.geolocation.getCurrentPosition(
        (pos) => {
            updatePassengerPosition(pos.coords.latitude, pos.coords.longitude, "Live GNSS Position", pos.coords.accuracy || 5.0);
            showToast(`GNSS fix acquired (±${(pos.coords.accuracy || 5.0).toFixed(1)}m)!`, "success");
        },
        (err) => {
            console.warn("GPS error:", err);
            let msg = "Could not acquire device GPS.";
            if (err.code === 1) msg = "Location permission denied. Please allow in browser settings or tap map.";
            else if (err.code === 2) msg = "GPS signal unavailable. Please ensure Device Location is ON.";
            else if (err.code === 3) msg = "GPS request timed out. Tap map to pin distress coordinates.";
            if (userLatitude === null) {
                showToast(msg, "error");
                if (ind) {
                    ind.className = "gps-indicator";
                    ind.innerHTML = `<span>⚠️</span> ${msg}`;
                }
            }
        },
        { enableHighAccuracy: true, timeout: 25000, maximumAge: 0 }
    );

    // 3. Continuous satellite track
    if (paxWatchId === null) {
        paxWatchId = navigator.geolocation.watchPosition(
            (pos) => {
                updatePassengerPosition(pos.coords.latitude, pos.coords.longitude, "Live GNSS Position", pos.coords.accuracy || 5.0);
            },
            (err) => {
                console.warn("Watch position notice:", err);
            },
            { enableHighAccuracy: true, timeout: 25000, maximumAge: 0 }
        );
    }
}

async function updatePassengerPosition(lat, lng, label, accuracy = 5.0) {
    userLatitude = lat;
    userLongitude = lng;
    isGpsActive = true;

    // Update GPS indicator UI
    const ind = document.getElementById("gpsIndicator");
    if (ind) {
        ind.className = "gps-indicator active";
        ind.innerHTML = `<span>🟢</span> GNSS Active (${lat.toFixed(5)}, ${lng.toFixed(5)} ±${accuracy.toFixed(1)}m)`;
    }

    // Arm the Strict SOS Button
    armSOSButton();

    // Update or create user marker
    if (userMarker) {
        userMarker.setLatLng([lat, lng]);
    } else {
        const icon = L.divIcon({
            className: "pax-user-marker",
            html: `<div style="background: #3b82f6; width: 18px; height: 18px; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 12px #3b82f6;"></div>`,
            iconSize: [18, 18],
            iconAnchor: [9, 9]
        });
        userMarker = L.marker([lat, lng], { icon: icon }).addTo(map);
        userMarker.bindPopup("<strong>You are here</strong>").openPopup();
    }
    map.setView([lat, lng], 14);

    // Send location to backend
    try {
        await fetchWithAuth("/api/tracking/passenger/location", {
            method: "POST",
            body: JSON.stringify({ latitude: lat, longitude: lng, accuracy: 5.0 })
        });
    } catch (e) {
        console.error("Error sending passenger location", e);
    }

    await refreshNearbyBuses();
}

function armSOSButton() {
    const btn = document.getElementById("btnSOSMain");
    const helper = document.getElementById("sosHelper");
    if (!isGpsActive || userLatitude === null) {
        btn.className = "btn-sos-main disabled";
        btn.innerHTML = "⚠️ GPS REQUIRED FOR EMERGENCY SOS (Click to Acquire)";
        btn.onclick = requestDeviceLocation;
        helper.innerHTML = "Please enable GPS above or tap anywhere on map before emergency dispatch can be activated.";
    } else {
        btn.className = "btn-sos-main armed";
        btn.innerHTML = "🚨 ACTIVATE EMERGENCY SOS";
        btn.onclick = openSOSConfirmationModal;
        helper.textContent = "GPS Verified • 2-Step Confirmed Emergency Dispatch Armed";
    }
}

function openSOSConfirmationModal() {
    if (!isGpsActive || userLatitude === null) {
        showToast("Error: GPS coordinate is missing.", "error");
        return;
    }

    document.getElementById("modalCoords").textContent = `${userLatitude.toFixed(5)}, ${userLongitude.toFixed(5)}`;
    const overlay = document.getElementById("sosModalOverlay");
    overlay.classList.add("show");

    // 3-second safety confirmation countdown
    confirmCountdown = 3;
    const confirmBtn = document.getElementById("btnConfirmSOS");
    confirmBtn.disabled = true;
    confirmBtn.textContent = `Confirm Immediate Emergency (${confirmCountdown}s)`;

    if (countdownTimer) clearInterval(countdownTimer);
    countdownTimer = setInterval(() => {
        confirmCountdown--;
        if (confirmCountdown > 0) {
            confirmBtn.textContent = `Confirm Immediate Emergency (${confirmCountdown}s)`;
        } else {
            clearInterval(countdownTimer);
            confirmBtn.disabled = false;
            confirmBtn.textContent = "🚨 DISPATCH EMERGENCY ASSISTANCE NOW";
        }
    }, 1000);
}

function closeSOSConfirmationModal() {
    if (countdownTimer) clearInterval(countdownTimer);
    document.getElementById("sosModalOverlay").classList.remove("show");
}

async function triggerEmergencySOS() {
    closeSOSConfirmationModal();
    const btn = document.getElementById("btnSOSMain");
    btn.disabled = true;
    btn.textContent = "Transmitting Emergency Signal...";

    try {
        const payload = {
            latitude: userLatitude,
            longitude: userLongitude
        };
        if (userAddress && !userAddress.startsWith("Detecting") && !userAddress.startsWith("GPS Position")) {
            payload.address = userAddress;
        }

        const res = await fetchWithAuth("/api/sos", {
            method: "POST",
            body: JSON.stringify(payload)
        });

        if (res.ok) {
            const data = await res.json();
            activeSOS = data;
            renderActiveSOSTracker(data);
            showToast("EMERGENCY SIGNAL BROADCASTED! Nearby responders alerted.", "success");
        } else {
            const err = await res.json();
            showToast(err.detail || "Failed to transmit SOS", "error");
        }
    } catch (e) {
        showToast("Network error transmitting SOS", "error");
    } finally {
        btn.disabled = false;
        armSOSButton();
    }
}

async function checkActiveEmergency() {
    try {
        const res = await fetchWithAuth("/api/sos/active");
        if (res.ok) {
            const cases = await res.json();
            if (cases.length > 0) {
                activeSOS = cases[0];
                renderActiveSOSTracker(cases[0]);
            }
        }
    } catch (e) {
        console.error("Error checking active emergency", e);
    }
}

function renderActiveSOSTracker(sos) {
    const container = document.getElementById("activeSOSContainer");
    if (!sos || sos.status === "CANCELLED") {
        container.style.display = "none";
        return;
    }

    container.style.display = "block";
    document.getElementById("activeSOSId").textContent = sos.sos_id;
    document.getElementById("activeSOSAddress").textContent = sos.address || "Resolving location...";
    document.getElementById("activeSOSStatus").textContent = sos.status;

    // Steps
    const s1 = document.getElementById("step1");
    const s2 = document.getElementById("step2");
    const s3 = document.getElementById("step3");
    const s4 = document.getElementById("step4");

    s1.className = "tracker-step completed";
    s2.className = "tracker-step";
    s3.className = "tracker-step";
    s4.className = "tracker-step";

    if (sos.status === "ACTIVE") {
        s1.className = "tracker-step active";
        document.getElementById("activeSOSDetail").textContent = "Alert broadcasted. Scanning for nearby emergency responders across Coimbatore sector...";
    } else if (sos.status === "ACKNOWLEDGED") {
        s1.className = "tracker-step completed";
        s2.className = "tracker-step active";
        document.getElementById("activeSOSDetail").textContent = `Accepted by Responder: ${sos.responder_name || 'Emergency Unit'}. Mobilizing.`;
    } else if (sos.status === "RESPONDING") {
        s1.className = "tracker-step completed";
        s2.className = "tracker-step completed";
        s3.className = "tracker-step active";
        document.getElementById("activeSOSDetail").textContent = `Responder ${sos.responder_name || 'Unit'} is EN ROUTE to your coordinates!`;
    } else if (sos.status === "RESOLVED") {
        s1.className = "tracker-step completed";
        s2.className = "tracker-step completed";
        s3.className = "tracker-step completed";
        s4.className = "tracker-step completed active";
        document.getElementById("activeSOSDetail").innerHTML = `<strong>★ Emergency resolved. You are marked safe!</strong> <button class="btn-sm" style="margin-left: 8px;" onclick="document.getElementById('activeSOSContainer').style.display='none'; activeSOS=null;">Dismiss</button>`;
    }
}

async function cancelEmergencySOS() {
    if (!activeSOS) return;
    if (!confirm("Are you sure you want to cancel this emergency alert?")) return;

    try {
        const res = await fetchWithAuth(`/api/sos/${activeSOS.sos_id}/cancel`, {
            method: "POST",
            body: JSON.stringify({ notes: "Cancelled by passenger (False Alarm)" })
        });
        if (res.ok) {
            showToast("Emergency cancelled.", "info");
            activeSOS = null;
            document.getElementById("activeSOSContainer").style.display = "none";
        }
    } catch (e) {
        showToast("Error cancelling emergency", "error");
    }
}

async function refreshNearbyBuses() {
    try {
        const res = await fetchWithAuth("/api/buses");
        if (!res.ok) return;
        const buses = await res.json();
        const listEl = document.getElementById("nearbyBusesList");
        listEl.innerHTML = "";

        // Calculate distance and ETAs if user coordinates are available
        const busCards = [];
        buses.forEach(b => {
            if (b.current_latitude && b.current_longitude) {
                let distKm = 0;
                let etaMinutes = 0;

                if (userLatitude !== null && userLongitude !== null) {
                    distKm = calculateHaversineKm(userLatitude, userLongitude, b.current_latitude, b.current_longitude);
                    const speed = Math.max(b.current_speed, 20.0);
                    etaMinutes = Math.max(1, Math.round((distKm / speed) * 60));
                }

                busCards.push({ ...b, distKm, etaMinutes });
                updateBusOnMap(b);
            }
        });

        busCards.sort((a, b) => a.etaMinutes - b.etaMinutes);

        busCards.forEach(b => {
            const card = document.createElement("div");
            card.className = "nearby-bus-card";
            card.onclick = () => focusBus(b.bus_id);
            card.innerHTML = `
                <div>
                    <strong>🚍 ${b.bus_id}</strong>
                    <div style="font-size: 0.75rem; color: var(--text-dim);">${b.route_id || "Transit"} • ${b.status}</div>
                </div>
                <div class="bus-eta-badge">
                    <div class="eta-minutes">${b.etaMinutes} min</div>
                    <div class="eta-dist">${b.distKm.toFixed(1)} km away</div>
                </div>
            `;
            listEl.appendChild(card);
        });

        if (busCards.length === 0) {
            listEl.innerHTML = `<div style="font-size: 0.8rem; color: var(--text-dim);">No buses currently active.</div>`;
        }
    } catch (e) {
        console.error("Error refreshing buses", e);
    }
}

function updateBusOnMap(b) {
    if (busMarkers[b.bus_id]) {
        busMarkers[b.bus_id].setLatLng([b.current_latitude, b.current_longitude]);
    } else {
        const icon = L.divIcon({
            className: "bus-map-icon",
            html: `<div style="background: #2563eb; color: white; padding: 2px 6px; border-radius: 4px; font-weight: bold; font-size: 10px; border: 1px solid white;">🚍 ${b.bus_id}</div>`,
            iconSize: [60, 22],
            iconAnchor: [30, 11]
        });
        const marker = L.marker([b.current_latitude, b.current_longitude], { icon: icon }).addTo(map);
        marker.bindPopup(`<strong>${b.bus_id}</strong><br>Route: ${b.route_id}<br>Speed: ${b.current_speed} km/h`);
        busMarkers[b.bus_id] = marker;
    }
}

function focusBus(busId) {
    if (busMarkers[busId]) {
        map.setView(busMarkers[busId].getLatLng(), 15, { animate: true });
        busMarkers[busId].openPopup();
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
            if (msg.type === "BUS_LOCATION_UPDATE") {
                refreshNearbyBuses();
            } else if (msg.type === "SOS_STATUS_UPDATE" && activeSOS && msg.data.sos_id === activeSOS.sos_id) {
                activeSOS.status = msg.data.status;
                if (msg.data.responder_name) activeSOS.responder_name = msg.data.responder_name;
                renderActiveSOSTracker(activeSOS);
            }
        } catch (err) {}
    };

    socket.onclose = () => {
        setTimeout(initWebSocket, 3000);
    };
}

function logout() {
    clearAuth();
    window.location.href = "/";
}
