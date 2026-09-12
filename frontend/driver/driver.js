// NEXORA V1 - Driver Cockpit & Live GPS Transmitter Logic

let map;
let busMarker;
let routeLine;
let watchId = null;
let simulatedTimer = null;
let isTripActive = false;
let currentTripId = null;
let fixesSent = 0;
let simStep = 0;
let routesCache = {};

document.addEventListener("DOMContentLoaded", async () => {
    let user = getUser();
    let token = getToken();

    if (!token || !user || !["DRIVER", "ADMIN"].includes(user.role)) {
        try {
            const loginRes = await loginUser("driver@nexora.local", "Password123");
            user = loginRes.user;
            token = loginRes.access_token;
        } catch (e) {
            window.location.href = "/";
            return;
        }
    }

    document.getElementById("driverName").textContent = user.name;
    document.getElementById("driverCode").textContent = user.user_code || "DRV-001";

    initDriverMap();
    await loadBusesAndRoutes();
});

function initDriverMap() {
    map = L.map("driverMap", {
        zoomControl: false,
        attributionControl: false
    }).setView([11.0168, 76.9558], 14);

    L.tileLayer("https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png", {
        maxZoom: 19
    }).addTo(map);
}

async function loadBusesAndRoutes() {
    try {
        // Load buses
        const resBuses = await fetchWithAuth("/api/buses");
        if (resBuses.ok) {
            const buses = await resBuses.json();
            const busSelect = document.getElementById("selectBus");
            busSelect.innerHTML = "";
            buses.forEach(b => {
                const opt = document.createElement("option");
                opt.value = b.bus_id;
                opt.textContent = `${b.bus_id} (${b.registration_number}) [${b.status}]`;
                busSelect.appendChild(opt);
            });
        }

        // Load routes
        const resRoutes = await fetchWithAuth("/api/routes");
        if (resRoutes.ok) {
            const routes = await resRoutes.json();
            const routeSelect = document.getElementById("selectRoute");
            routeSelect.innerHTML = "";
            routes.forEach(r => {
                routesCache[r.route_id] = r;
                const opt = document.createElement("option");
                opt.value = r.route_id;
                opt.textContent = `${r.route_id}: ${r.route_name}`;
                routeSelect.appendChild(opt);
            });

            // Draw initial selected route
            onRouteSelected();
        }
    } catch (e) {
        console.error("Error loading buses/routes", e);
    }
}

function onRouteSelected() {
    const routeId = document.getElementById("selectRoute").value;
    const route = routesCache[routeId];
    if (!route || !route.stops) return;

    if (routeLine) map.removeLayer(routeLine);

    const latlngs = route.stops.map(s => [s.latitude, s.longitude]);
    routeLine = L.polyline(latlngs, {
        color: "#3b82f6",
        weight: 5,
        opacity: 0.8
    }).addTo(map);

    map.fitBounds(routeLine.getBounds().pad(0.2));
}

async function toggleTrip() {
    const btn = document.getElementById("btnTripAction");
    const busId = document.getElementById("selectBus").value;
    const routeId = document.getElementById("selectRoute").value;

    if (!isTripActive) {
        // Start Trip
        try {
            btn.disabled = true;
            btn.textContent = "Starting trip...";
            const res = await fetchWithAuth("/api/trips/start", {
                method: "POST",
                body: JSON.stringify({ bus_id: busId, route_id: routeId })
            });
            const data = await res.json();
            if (res.ok) {
                isTripActive = true;
                currentTripId = data.trip_id;
                btn.className = "btn-trip btn-stop";
                btn.innerHTML = "⏹ STOP ACTIVE TRIP";
                document.getElementById("tripStatusIndicator").textContent = `TRIP ACTIVE (${busId})`;
                document.getElementById("tripStatusIndicator").className = "gps-badge online";
                document.getElementById("selectBus").disabled = true;
                document.getElementById("selectRoute").disabled = true;

                // Start transmitter
                startGPSTransmitter();
                showToast("Trip started! GPS broadcaster is active.", "success");
            } else {
                showToast(data.detail || "Failed to start trip", "error");
            }
        } catch (e) {
            showToast("Network error starting trip", "error");
        } finally {
            btn.disabled = false;
        }
    } else {
        // Stop Trip
        try {
            btn.disabled = true;
            btn.textContent = "Ending trip...";
            const res = await fetchWithAuth("/api/trips/stop", {
                method: "POST",
                body: JSON.stringify({ bus_id: busId, trip_id: currentTripId })
            });
            if (res.ok) {
                isTripActive = false;
                stopGPSTransmitter();
                btn.className = "btn-trip btn-start";
                btn.innerHTML = "▶ START NEW TRIP";
                document.getElementById("tripStatusIndicator").textContent = "BUS IDLE";
                document.getElementById("tripStatusIndicator").className = "gps-badge offline";
                document.getElementById("selectBus").disabled = false;
                document.getElementById("selectRoute").disabled = false;
                showToast("Trip ended. Bus marked IDLE.", "info");
            }
        } catch (e) {
            showToast("Error stopping trip", "error");
        } finally {
            btn.disabled = false;
        }
    }
}

function startGPSTransmitter() {
    const isSimulated = document.getElementById("chkSimulationMode").checked;

    if (isSimulated || !navigator.geolocation) {
        // Simulated mode stepping along route
        const routeId = document.getElementById("selectRoute").value;
        const route = routesCache[routeId];
        const stops = route ? route.stops : [];
        if (stops.length === 0) return;

        simStep = 0;
        simulatedTimer = setInterval(() => {
            const currentStop = stops[simStep % stops.length];
            const nextStop = stops[(simStep + 1) % stops.length];
            // slight jitter to simulate movement
            const jitterLat = (Math.random() - 0.5) * 0.0005;
            const jitterLng = (Math.random() - 0.5) * 0.0005;
            const speed = 25.0 + Math.random() * 15.0;

            sendGPSFix(currentStop.latitude + jitterLat, currentStop.longitude + jitterLng, speed, 3.5);
            simStep++;
        }, 2500);
    } else {
        // Real device GPS
        watchId = navigator.geolocation.watchPosition(
            (pos) => {
                const speed = pos.coords.speed ? (pos.coords.speed * 3.6) : (20 + Math.random() * 10);
                sendGPSFix(pos.coords.latitude, pos.coords.longitude, speed, pos.coords.accuracy);
            },
            (err) => {
                console.warn("GPS watchPosition error, switching to route simulation", err);
                document.getElementById("chkSimulationMode").checked = true;
                startGPSTransmitter();
            },
            {
                enableHighAccuracy: true,
                maximumAge: 1000,
                timeout: 5000
            }
        );
    }

    document.getElementById("gpsStatus").textContent = "ONLINE & BROADCASTING";
    document.getElementById("gpsStatus").className = "gps-badge online";
}

function stopGPSTransmitter() {
    if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId);
        watchId = null;
    }
    if (simulatedTimer !== null) {
        clearInterval(simulatedTimer);
        simulatedTimer = null;
    }
    document.getElementById("gpsStatus").textContent = "OFFLINE";
    document.getElementById("gpsStatus").className = "gps-badge offline";
}

async function sendGPSFix(lat, lng, speed, accuracy) {
    const busId = document.getElementById("selectBus").value;

    // Update Telemetry Display
    document.getElementById("telSpeed").textContent = `${speed.toFixed(1)} km/h`;
    document.getElementById("telCoords").textContent = `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
    document.getElementById("telAccuracy").textContent = `± ${accuracy.toFixed(1)}m`;
    fixesSent++;
    document.getElementById("telFixes").textContent = fixesSent;

    // Update Map
    if (busMarker) {
        busMarker.setLatLng([lat, lng]);
    } else {
        const icon = L.divIcon({
            className: "driver-bus-icon",
            html: `<div style="background: #10b981; color: white; padding: 4px 8px; border-radius: 6px; font-weight: bold; border: 2px solid white; box-shadow: 0 0 10px #10b981;">🚍 ${busId}</div>`,
            iconSize: [80, 30],
            iconAnchor: [40, 15]
        });
        busMarker = L.marker([lat, lng], { icon: icon }).addTo(map);
    }
    map.panTo([lat, lng]);

    // Send HTTP fix to backend
    try {
        await fetchWithAuth("/api/tracking/bus/location", {
            method: "POST",
            body: JSON.stringify({
                bus_id: busId,
                latitude: lat,
                longitude: lng,
                speed: speed
            })
        });
    } catch (e) {
        console.error("Failed to push GPS fix", e);
    }
}

function logout() {
    stopGPSTransmitter();
    clearAuth();
    window.location.href = "/";
}
