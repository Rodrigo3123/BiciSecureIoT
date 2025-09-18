const API_URL = 'https://68bb0df284055bce63f10639.mockapi.io/api/v1/bicicletas';
let allDevicesData = [];
let map; // Variable global para el objeto del mapa
let marker; // Variable global para el marcador

/**
 * Obtiene el timestamp del último reporte de un dispositivo.
 * Es clave para poder ordenar la lista de dispositivos.
 * @param {object} device - El objeto del dispositivo.
 * @returns {string} - El timestamp en formato ISO.
 */
function getLatestTimestamp(device) {
    if (!device.historial_estados || device.historial_estados.length === 0) {
        // Si no tiene historial, le damos una fecha muy antigua para que quede al final.
        return '1970-01-01T00:00:00.000Z';
    }
    // Devuelve el timestamp más reciente del historial.
    const latestStatus = [...device.historial_estados].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))[0];
    return latestStatus.timestamp;
}

/**
 * Función principal que se ejecuta cada 2 segundos para actualizar toda la información.
 */
async function refreshData() {
    const selector = document.getElementById('deviceSelector');
    // Guardamos el ID del dispositivo que está seleccionado actualmente para no perderlo.
    const selectedDeviceId = selector.value;

    try {
        const response = await fetch(API_URL);
        allDevicesData = await response.json();

        // Ordenamos el array de dispositivos por el reporte más reciente.
        allDevicesData.sort((a, b) => {
            const dateA = new Date(getLatestTimestamp(a));
            const dateB = new Date(getLatestTimestamp(b));
            return dateB - dateA; // Orden descendente (más nuevo primero)
        });

        // Limpiamos la vista antes de redibujar.
        const cardsContainer = document.getElementById('statusCards');
        cardsContainer.innerHTML = '';
        selector.innerHTML = '';

        // Volvemos a llenar la información ya ordenada.
        allDevicesData.forEach(device => {
            selector.innerHTML += `<option value="${device.id}">${device.nombre}</option>`;
            loadStatusCard(device, cardsContainer);
        });

        // Si había un dispositivo seleccionado, lo volvemos a seleccionar.
        if (selectedDeviceId) {
            selector.value = selectedDeviceId;
        }
        
        // Actualizamos la tabla de historial y el mapa para el dispositivo seleccionado.
        loadHistory(selector.value || (allDevicesData[0] ? allDevicesData[0].id : null));

    } catch (error) {
        console.error("No se pudo refrescar la información:", error);
    }
}

/**
 * Dibuja las tarjetas de estado para cada dispositivo, usando Bootstrap Icons.
 * @param {object} device - El objeto del dispositivo.
 * @param {HTMLElement} container - El elemento contenedor para las tarjetas.
 */
function loadStatusCard(device, container) {
    const history = device.historial_estados || [];
    if (history.length > 0) {
        const lastStatus = [...history].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))[0];
        
        let systemStatusHtml = '';
        
        switch(lastStatus.estado_sistema) {
            case 'ARMADO': 
                systemStatusHtml = `
                    <div class="d-flex align-items-center gap-2">
                        <i class="bi bi-lock-fill fs-2 text-success status-armed"></i>
                        <span class="fw-bold text-success">ARMADO</span>
                    </div>`;
                break;
            case 'DESARMADO': 
                systemStatusHtml = `
                    <div class="d-flex align-items-center gap-2">
                        <i class="bi bi-unlock-fill fs-2 text-secondary"></i>
                        <span class="text-muted">DESARMADO</span>
                    </div>`; 
                break;
            case 'ALARMA_ACTIVADA': 
                 systemStatusHtml = `
                    <div class="d-flex align-items-center gap-2">
                        <i class="bi bi-exclamation-triangle-fill fs-2 text-danger siren-active"></i>
                        <span class="fw-bold text-danger">¡ALARMA!</span>
                    </div>`;
                break;
        }

        // Lógica para el icono de la sirena
        let sirenHtml = lastStatus.sirena_activa 
            ? ` <div class="d-flex align-items-center gap-2">
                    <i class="bi bi-volume-up-fill fs-2 text-warning siren-active"></i>
                    <span class="fw-bold text-warning">ACTIVADA</span>
                </div>`
            : ` <div class="d-flex align-items-center gap-2">
                    <i class="bi bi-volume-mute-fill fs-2 text-secondary"></i>
                    <span class="text-muted">Inactiva</span>
                </div>`;
        
        container.innerHTML += `
            <div class="col-md-4 mb-3">
                <div class="card">
                    <div class="card-header fw-bold">${device.nombre}</div>
                    <div class="card-body">
                        <div class="mb-3">
                            <h6 class="card-subtitle mb-2 text-body-secondary">Estado del Sistema</h6>
                            ${systemStatusHtml}
                        </div>
                        <div class="mb-3">
                            <h6 class="card-subtitle mb-2 text-body-secondary">Sirena</h6>
                            ${sirenHtml}
                        </div>
                        <hr>
                        <p class="mb-1 small"><strong>Últ. Reporte:</strong> ${new Date(lastStatus.timestamp).toLocaleString()}</p>
                        <p class="mb-1 small"><strong>Batería:</strong></p>
                        <div class="progress" style="height: 20px;">
                            <div class="progress-bar" role="progressbar" style="width: ${lastStatus.bateria_nivel}%" aria-valuenow="${lastStatus.bateria_nivel}">${lastStatus.bateria_nivel}%</div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
}

/**
 * Carga la tabla de historial y actualiza el mapa para un dispositivo específico.
 * @param {string} deviceId - El ID del dispositivo a mostrar.
 */
function loadHistory(deviceId) {
    if (!deviceId) return;
    const tableBody = document.getElementById('historyTableBody');
    tableBody.innerHTML = '';
    
    const device = allDevicesData.find(d => d.id === deviceId);
    if (!device || !device.historial_estados) return;

    const recentHistory = [...device.historial_estados]
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
        .slice(0, 10);

    recentHistory.forEach(report => {
        const sirenStatus = report.sirena_activa 
            ? '<span class="badge bg-warning text-dark">Activada</span>' 
            : '<span class="text-muted">Inactiva</span>';

        tableBody.innerHTML += `
            <tr>
                <td>${new Date(report.timestamp).toLocaleString()}</td>
                <td>${report.estado_sistema}</td>
                <td>${sirenStatus}</td>
                <td>${report.bateria_nivel}%</td>
                <td>${report.latitud}, ${report.longitud}</td>
            </tr>
        `;
    });

    // Lógica para actualizar el mapa
    if (recentHistory.length > 0) {
        const latestReport = recentHistory[0];
        const lat = latestReport.latitud;
        const lon = latestReport.longitud;

        if (typeof lat === 'number' && typeof lon === 'number') {
            const coordinates = [lat, lon];
            map.setView(coordinates, 16); 
            
            if (!marker) {
                marker = L.marker(coordinates).addTo(map);
            } else {
                marker.setLatLng(coordinates);
            }
            marker.bindPopup(`<b>${device.nombre}</b><br>Estado: ${latestReport.estado_sistema}`).openPopup();
        }
    }
}

/**
 * Inicializa el objeto del mapa y lo dibuja en la página.
 */
function initMap() {
    const initialCoords = [19.4326, -99.1332]; // Zócalo de la Ciudad de México
    map = L.map('map').setView(initialCoords, 13);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);
}

/**
 * Punto de entrada principal al cargar la página.
 */
window.onload = () => {
    initMap();

    document.getElementById('deviceSelector').addEventListener('change', (event) => loadHistory(event.target.value));
    
    refreshData();
    
    setInterval(refreshData, 2000);
};