const API_URL = 'https://68bb0df284055bce63f10639.mockapi.io/api/v1/bicicletas';
let currentDeviceId;
let currentDeviceData;
let isDataLoaded = false;
let map;
let marker;

/**
 * Punto de entrada principal al cargar la página.
 */
window.onload = () => {
    const urlParams = new URLSearchParams(window.location.search);
    currentDeviceId = urlParams.get('id');
    
    if (!currentDeviceId) {
        window.location.href = 'admin.html';
        return;
    }

    initMap();

    document.getElementById('systemStatusSwitch').addEventListener('change', toggleSystemStatus);
    document.getElementById('sirenSwitch').addEventListener('change', toggleSiren);
    
    // CAMBIO: El botón ahora llama a la nueva función para obtener la ubicación real.
    document.getElementById('refreshLocationBtn').addEventListener('click', updateWithCurrentLocation);

    loadDeviceData();
};

/**
 * NUEVO: Función principal para obtener y subir la ubicación actual del navegador.
 */
function updateWithCurrentLocation() {
    const btn = document.getElementById('refreshLocationBtn');

    // Verificamos si el navegador soporta la Geolocalización
    if (!navigator.geolocation) {
        alert("Tu navegador no soporta la geolocalización.");
        return;
    }

    // Deshabilitamos el botón para evitar múltiples clics
    btn.disabled = true;
    btn.innerText = "Obteniendo ubicación...";

    // Pedimos la ubicación al navegador
    navigator.geolocation.getCurrentPosition(
        async (position) => {
            // Éxito: Se obtuvieron las coordenadas
            const lat = position.coords.latitude;
            const lon = position.coords.longitude;
            
            console.log(`Ubicación obtenida: ${lat}, ${lon}`);
            
            // Usamos la función existente para subir el nuevo estado
            await updateDeviceStatus({ latitud: lat, longitud: lon });

            // Reactivamos el botón
            btn.disabled = false;
            btn.innerText = "Actualizar Ubicación";
        },
        (error) => {
            // Error: El usuario negó el permiso o hubo un fallo
            console.error("Error de geolocalización:", error);
            alert(`No se pudo obtener la ubicación: ${error.message}`);
            
            // Reactivamos el botón
            btn.disabled = false;
            btn.innerText = "Actualizar Ubicación";
        }
    );
}


// ... (El resto de las funciones: initMap, loadDeviceData, getLatestStatus, updateUI, etc., permanecen igual que en la respuesta anterior) ...

function initMap() {
    const initialCoords = [19.4326, -99.1332];
    map = L.map('map').setView(initialCoords, 13);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);
}

async function loadDeviceData() {
    try {
        const response = await fetch(`${API_URL}/${currentDeviceId}`);
        if (!response.ok) {
            throw new Error(`Error ${response.status}: No se pudo cargar la info.`);
        }
        currentDeviceData = await response.json();
        isDataLoaded = true;
        
        document.getElementById('deviceName').innerText = `Control para: ${currentDeviceData.nombre}`;
        updateUI();

    } catch (error) {
        console.error("Error en loadDeviceData:", error);
        document.getElementById('deviceName').innerText = "Error al cargar dispositivo";
        alert("No se pudieron cargar los datos del dispositivo.");
    }
}

function getLatestStatus() {
    if (!isDataLoaded || !currentDeviceData.historial_estados || currentDeviceData.historial_estados.length === 0) {
        return null;
    }
    return [...currentDeviceData.historial_estados].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))[0];
}

function updateUI() {
    const latestStatus = getLatestStatus();
    
    if (latestStatus) {
        document.getElementById('systemStatusSwitch').checked = latestStatus.estado_sistema === 'ARMADO';
        document.getElementById('sirenSwitch').checked = latestStatus.sirena_activa;
        document.getElementById('currentStatus').innerHTML = `
            <strong>Estatus Actual:</strong> <span class="badge bg-primary">${latestStatus.estado_sistema}</span> <br>
            <strong>Batería:</strong> ${latestStatus.bateria_nivel || 'N/A'}% <br>
            <strong>Último Reporte:</strong> ${new Date(latestStatus.timestamp).toLocaleString()}
        `;

        const lat = latestStatus.latitud;
        const lon = latestStatus.longitud;
        if (typeof lat === 'number' && typeof lon === 'number') {
            const coordinates = [lat, lon];
            map.setView(coordinates, 16);
            if (!marker) {
                marker = L.marker(coordinates).addTo(map);
            } else {
                marker.setLatLng(coordinates);
            }
            marker.bindPopup(`<b>Ubicación Actual</b><br>${currentDeviceData.nombre}`).openPopup();
        }

    } else {
         document.getElementById('currentStatus').innerText = 'Este dispositivo aún no tiene reportes de estado.';
    }
}

async function updateDeviceStatus(newStatusData) {
    const latestStatus = getLatestStatus() || { 
        latitud: 0, longitud: 0, bateria_nivel: 100, 
        estado_sistema: 'DESARMADO', sirena_activa: false 
    };
    
    const newStatusEntry = {
        ...latestStatus, ...newStatusData, timestamp: new Date().toISOString()
    };
    
    currentDeviceData.historial_estados.push(newStatusEntry);
    currentDeviceData.historial_estados = currentDeviceData.historial_estados.slice(-50);

    try {
        const response = await fetch(`${API_URL}/${currentDeviceId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(currentDeviceData)
        });
        if (!response.ok) { throw new Error('La API rechazó la actualización.'); }
        
        updateUI();

    } catch (error) {
        console.error("Error al actualizar el estado:", error);
        alert("No se pudo guardar el cambio.");
    }
}

function handleToggle(event, updateDataCallback) {
    if (!isDataLoaded) {
        alert("Los datos del dispositivo aún no han cargado. Por favor, espera un momento.");
        event.target.checked = !event.target.checked;
        return;
    }
    updateDataCallback(event.target.checked);
}

function toggleSystemStatus(event) {
    handleToggle(event, (isChecked) => {
        updateDeviceStatus({ estado_sistema: isChecked ? 'ARMADO' : 'DESARMADO' });
    });
}

function toggleSiren(event) {
    handleToggle(event, (isChecked) => {
        updateDeviceStatus({ sirena_activa: isChecked });
    });
}