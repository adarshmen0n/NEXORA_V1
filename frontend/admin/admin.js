// NEXORA V1 - Admin Central Dispatch Control Logic

let map;
let busMarkers = {};
let routeLayers = {};
let sosMarkers = {};
let responderMarkers = {};
let socket;

const ROUTE_COLORS = {
    "Route A": "#3b82f6", // Blue
    "Route B": "#10b981", // Green
    "Route C": "#f59e0b", // Amber
    "Route D": "#8b5cf6", // Purple
    "Route E": "#06b6d4"  // Cyan
};

document.addEventListener("DOMContentLoaded", async () => {
    // 1. Verify Authentication & Role (with seamless demo auto-login fallback)
    let user = getUser();
    let token = getToken();
    if (!token || !user || user.role !== "ADMIN") {
        try {
            const loginRes = await loginUser("admin@nexora.local", "Password123");
            user = loginRes.user;
            token = loginRes.access_token;
        } catch (e) {
            window.location.href = "/";
            return;
        }
    }

    document.getElementById("adminName").textContent = user.name;
    document.getElementById("adminCode").textContent = user.user_code || "ADM-001";

    // 2. Initialize Map
    initMap();

    // 3. Load initial datasets
    await loadRoutes();
    await loadFleet();
    await loadDashboardMetrics();
    await loadActiveSOS();
    await loadUsers();

    // 4. Connect WebSocket
    initWebSocket();

    // 5. Periodic polling fallback (2.5s dynamic sync)
    setInterval(loadDashboardMetrics, 10000);
    setInterval(loadFleet, 2500);
    setInterval(loadActiveSOS, 8000);
});

function initMap() {
    // Center on Coimbatore
    map = L.map("adminMap", {
        zoomControl: true,
        attributionControl: false
    }).setView([11.0168, 76.9558], 13);

    // Dark Matter tile layer
    L.tileLayer("https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png", {
        maxZoom: 19
    }).addTo(map);
}

async function loadDashboardMetrics() {
    try {
        const res = await fetchWithAuth("/api/admin/dashboard");
        if (res.ok) {
            const data = await res.json();
            document.getElementById("kpiTotalBuses").textContent = "5";
            document.getElementById("kpiActiveBuses").textContent = data.active_buses;
            document.getElementById("kpiOnlineDevices").textContent = data.online_devices;
            document.getElementById("kpiActiveTrips").textContent = data.active_trips;
            
            const sosEl = document.getElementById("kpiActiveSOS");
            sosEl.textContent = data.active_sos;
            if (data.active_sos > 0) {
                sosEl.classList.add("danger");
            } else {
                sosEl.classList.remove("danger");
            }
        }
    } catch (e) {
        console.error("Failed to load metrics", e);
    }
}

async function loadRoutes() {
    try {
        const res = await fetchWithAuth("/api/routes");
        if (res.ok) {
            const routes = await res.json();
            routes.forEach(route => {
                const color = ROUTE_COLORS[route.route_id] || "#3b82f6";
                if (route.stops && route.stops.length > 0) {
                    const latlngs = route.stops.map(s => [s.latitude, s.longitude]);
                    const polyline = L.polyline(latlngs, {
                        color: color,
                        weight: 4,
                        opacity: 0.7,
                        dashArray: "6, 8"
                    }).addTo(map);

                    polyline.bindPopup(`<strong>${route.route_id}</strong><br>${route.route_name}`);
                    routeLayers[route.route_id] = polyline;

                    // Add stop markers
                    route.stops.forEach(s => {
                        L.circleMarker([s.latitude, s.longitude], {
                            radius: 4,
                            fillColor: color,
                            color: "#fff",
                            weight: 1,
                            opacity: 1,
                            fillOpacity: 0.8
                        }).bindPopup(`<strong>${s.name}</strong><br>Stop ${s.sequence} (${route.route_id})`).addTo(map);
                    });
                }
            });
        }
    } catch (e) {
        console.error("Failed to load routes", e);
    }
}

async function loadFleet() {
    try {
        const res = await fetchWithAuth("/api/buses");
        if (res.ok) {
            const buses = await res.json();
            const listEl = document.getElementById("fleetList");
            listEl.innerHTML = "";

            buses.forEach(b => {
                // Update fleet panel list
                const item = document.createElement("div");
                item.className = "fleet-item";
                item.onclick = () => focusBusOnMap(b.bus_id);
                item.innerHTML = `
                    <div class="fleet-item-info">
                        <strong>🚍 ${b.bus_id} (${b.registration_number})</strong>
                        <small>${b.route_id || "Unassigned"} • ${b.current_speed.toFixed(1)} km/h</small>
                    </div>
                    <span class="status-pill ${b.status === 'ACTIVE' ? 'active' : 'idle'}">${b.status}</span>
                `;
                listEl.appendChild(item);

                // Update marker on map
                if (b.current_latitude && b.current_longitude) {
                    updateBusMarker(b);
                }
            });
        }
    } catch (e) {
        console.error("Failed to load fleet", e);
    }
}

function updateBusMarker(bus) {
    const lat = bus.current_latitude;
    const lng = bus.current_longitude;

    const iconHtml = `<div class="bus-marker-icon">🚍 ${bus.bus_id}</div>`;
    const icon = L.divIcon({
        className: "custom-bus-icon",
        html: iconHtml,
        iconSize: [80, 26],
        iconAnchor: [40, 13]
    });

    if (busMarkers[bus.bus_id]) {
        busMarkers[bus.bus_id].setLatLng([lat, lng]);
        busMarkers[bus.bus_id].setPopupContent(`
            <strong>🚍 ${bus.bus_id}</strong><br>
            Reg: ${bus.registration_number}<br>
            Route: ${bus.route_id || "N/A"}<br>
            Speed: ${bus.current_speed.toFixed(1)} km/h<br>
            Status: ${bus.status}
        `);
    } else {
        const marker = L.marker([lat, lng], { icon: icon }).addTo(map);
        marker.bindPopup(`
            <strong>🚍 ${bus.bus_id}</strong><br>
            Reg: ${bus.registration_number}<br>
            Route: ${bus.route_id || "N/A"}<br>
            Speed: ${bus.current_speed.toFixed(1)} km/h<br>
            Status: ${bus.status}
        `);
        busMarkers[bus.bus_id] = marker;
    }
}

function focusBusOnMap(busId) {
    if (busMarkers[busId]) {
        const latlng = busMarkers[busId].getLatLng();
        map.setView(latlng, 15, { animate: true });
        busMarkers[busId].openPopup();
    }
}

function fitAllBuses() {
    const group = Object.values(busMarkers);
    if (group.length > 0) {
        const featureGroup = L.featureGroup(group);
        map.fitBounds(featureGroup.getBounds().pad(0.2));
    }
}

async function loadActiveSOS() {
    try {
        const res = await fetchWithAuth("/api/sos/active");
        if (res.ok) {
            const cases = await res.json();
            renderSOSList(cases);
        }
    } catch (e) {
        console.error("Failed to load SOS cases", e);
    }
}

function renderSOSList(cases) {
    const container = document.getElementById("sosIncidentsList");
    container.innerHTML = "";

    // Clear old markers not in current cases
    const activeIds = cases.map(c => c.sos_id);
    for (const sid in sosMarkers) {
        if (!activeIds.includes(sid)) {
            map.removeLayer(sosMarkers[sid]);
            delete sosMarkers[sid];
        }
    }

    if (cases.length === 0) {
        container.innerHTML = `<div style="color: var(--text-dim); font-size: 0.85rem; padding: 8px;">No active emergency cases. System nominal.</div>`;
        return;
    }

    cases.forEach(c => {
        const card = document.createElement("div");
        card.className = "emergency-card";
        card.innerHTML = `
            <div class="emergency-header">
                <span class="emergency-code">🚨 ${c.sos_id}</span>
                <span class="status-pill active">${c.status}</span>
            </div>
            <div class="emergency-address"><strong>📍 Location:</strong> ${c.address}</div>
            <div class="emergency-meta">
                Passenger: ${c.passenger_name} (${c.passenger_phone})<br>
                Responder: ${c.responder_name || 'Awaiting response'}<br>
                Coordinates: ${c.latitude.toFixed(5)}, ${c.longitude.toFixed(5)}
            </div>
            <div style="display: flex; gap: 6px;">
                <button class="btn-sm" onclick="zoomToSOS('${c.sos_id}', ${c.latitude}, ${c.longitude})">Zoom Map</button>
                <button class="btn-sm btn-danger" onclick="adminResolveSOS('${c.sos_id}')">Resolve Alert</button>
            </div>
        `;
        container.appendChild(card);

        // Marker on map
        updateSOSMarker(c);
    });
}

function updateSOSMarker(c) {
    const iconHtml = `<div class="sos-marker-icon">SOS</div>`;
    const icon = L.divIcon({
        className: "custom-sos-icon",
        html: iconHtml,
        iconSize: [28, 28],
        iconAnchor: [14, 14]
    });

    if (sosMarkers[c.sos_id]) {
        sosMarkers[c.sos_id].setLatLng([c.latitude, c.longitude]);
    } else {
        const marker = L.marker([c.latitude, c.longitude], { icon: icon }).addTo(map);
        marker.bindPopup(`
            <strong style="color: #ef4444;">🚨 EMERGENCY: ${c.sos_id}</strong><br>
            Passenger: ${c.passenger_name}<br>
            Phone: ${c.passenger_phone}<br>
            Address: ${c.address}<br>
            Status: ${c.status}
        `);
        sosMarkers[c.sos_id] = marker;
    }
}

function zoomToSOS(sosId, lat, lng) {
    map.setView([lat, lng], 16, { animate: true });
    if (sosMarkers[sosId]) {
        sosMarkers[sosId].openPopup();
    }
}

async function adminResolveSOS(sosId) {
    if (!confirm(`Are you sure you want to mark ${sosId} as RESOLVED?`)) return;
    try {
        const res = await fetchWithAuth(`/api/sos/${sosId}/resolve`, {
            method: "POST",
            body: JSON.stringify({ notes: "Resolved by Admin from central console" })
        });
        if (res.ok) {
            showToast(`Incident ${sosId} resolved successfully.`, "success");
            await loadActiveSOS();
            await loadDashboardMetrics();
        }
    } catch (e) {
        showToast("Error resolving SOS", "error");
    }
}

async function loadUsers() {
    try {
        const res = await fetchWithAuth("/api/admin/users");
        if (res.ok) {
            const users = await res.json();
            const tbody = document.getElementById("usersTableBody");
            if (!tbody) return;
            tbody.innerHTML = "";
            users.forEach(u => {
                const tr = document.createElement("tr");
                tr.innerHTML = `
                    <td><strong>${u.user_code}</strong></td>
                    <td>${u.name}</td>
                    <td><span class="role-pill">${u.role}</span></td>
                    <td>${u.email}</td>
                    <td>${u.phone}</td>
                    <td>
                        <button class="btn-sm" onclick="toggleUserStatus(${u.id}, ${!u.is_active})">
                            ${u.is_active ? 'Active' : 'Disabled'}
                        </button>
                    </td>
                `;
                tbody.appendChild(tr);
            });
        }
    } catch (e) {
        console.error("Failed to load users", e);
    }
}

async function toggleUserStatus(userId, newStatus) {
    try {
        const res = await fetchWithAuth(`/api/admin/users/${userId}/status`, {
            method: "PUT",
            body: JSON.stringify({ is_active: newStatus })
        });
        if (res.ok) {
            loadUsers();
        }
    } catch (e) {
        console.error("Error toggling user status", e);
    }
}

function addEventLog(msg, type = "normal") {
    const stream = document.getElementById("logStream");
    if (!stream) return;
    const item = document.createElement("div");
    item.className = `log-entry ${type}`;
    const time = new Date().toLocaleTimeString();
    item.textContent = `[${time}] ${msg}`;
    stream.prepend(item);
}

let adminWsHeartbeat = null;

function initWebSocket() {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;

    if (socket) {
        try { socket.close(); } catch(e) {}
    }

    socket = new WebSocket(wsUrl);

    socket.onopen = () => {
        addEventLog("Live WebSocket telemetry pipe connected.", "normal");
        if (adminWsHeartbeat) clearInterval(adminWsHeartbeat);
        adminWsHeartbeat = setInterval(() => {
            if (socket && socket.readyState === WebSocket.OPEN) {
                socket.send("ping");
            }
        }, 15000);
    };

    socket.onmessage = (event) => {
        try {
            if (event.data === "pong") return;
            const msg = JSON.parse(event.data);
            handleIncomingWsEvent(msg);
        } catch (e) {
            console.warn("Invalid WS packet", event.data);
        }
    };

    socket.onclose = () => {
        if (adminWsHeartbeat) clearInterval(adminWsHeartbeat);
        addEventLog("Telemetry pipe disconnected. Reconnecting in 2.5s...", "alert");
        setTimeout(initWebSocket, 2500);
    };
}

function handleIncomingWsEvent(msg) {
    if (msg.type === "BUS_LOCATION_UPDATE") {
        const b = msg.data;
        updateBusMarker({
            bus_id: b.bus_id,
            registration_number: b.registration_number,
            current_latitude: b.latitude,
            current_longitude: b.longitude,
            current_speed: b.speed,
            route_id: b.route_id,
            status: b.status
        });
        addEventLog(`GPS FIX: ${b.bus_id} | ${b.speed.toFixed(1)} km/h | (${b.latitude.toFixed(4)}, ${b.longitude.toFixed(4)})`, "normal");
    } else if (msg.type === "SOS_ALERT") {
        addEventLog(`🚨 EMERGENCY SOS TRIGGERED: ${msg.data.sos_id} at ${msg.data.address}`, "alert");
        playAlarmSound();
        loadActiveSOS();
        loadDashboardMetrics();
    } else if (msg.type === "SOS_STATUS_UPDATE") {
        addEventLog(`SOS UPDATE: ${msg.data.sos_id} -> ${msg.data.status}`, "normal");
        loadActiveSOS();
        loadDashboardMetrics();
    } else if (msg.type === "TRIP_STARTED") {
        addEventLog(`TRIP STARTED: Bus ${msg.data.bus_id} on ${msg.data.route_id}`, "trip");
        loadFleet();
        loadDashboardMetrics();
    } else if (msg.type === "TRIP_STOPPED") {
        addEventLog(`TRIP COMPLETED: Bus ${msg.data.bus_id}`, "trip");
        loadFleet();
        loadDashboardMetrics();
    }
}

function playAlarmSound() {
    try {
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(880, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(440, audioCtx.currentTime + 0.4);
        gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.4);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.4);
    } catch (e) {
        // AudioContext not permitted or supported without gesture
    }
}

function switchAdminView(view) {
    const leftPanel = document.getElementById("fleetPanelSection");
    const usersPanel = document.getElementById("usersPanelSection");
    const tabFleet = document.getElementById("tabBtnFleet");
    const tabUsers = document.getElementById("tabBtnUsers");

    if (view === "fleet") {
        leftPanel.style.display = "block";
        usersPanel.style.display = "none";
        tabFleet.classList.add("active");
        tabUsers.classList.remove("active");
    } else {
        leftPanel.style.display = "none";
        usersPanel.style.display = "block";
        tabFleet.classList.remove("active");
        tabUsers.classList.add("active");
        loadUsers();
    }
}

function logout() {
    clearAuth();
    window.location.href = "/";
}
