const API_URL = 'https://68bb0df284055bce63f10639.mockapi.io/api/v1/bicicletas';

// Cargar todos los dispositivos al iniciar
window.onload = loadDevices;

async function loadDevices() {
    const response = await fetch(API_URL);
    const devices = await response.json();
    const tableBody = document.getElementById('devicesTableBody');
    tableBody.innerHTML = '';
    devices.forEach(device => {
        tableBody.innerHTML += `
            <tr>
                <td>${device.id}</td>
                <td>${device.nombre}</td>
                <td>${device.propietario}</td>
                <td>
                    <button class="btn btn-sm btn-info" onclick="location.href='control.html?id=${device.id}'">Controlar</button>
                    <button class="btn btn-sm btn-warning" data-bs-toggle="modal" data-bs-target="#deviceModal" onclick="editDevice('${device.id}')">Editar</button>
                    <button class="btn btn-sm btn-danger" onclick="deleteDevice('${device.id}')">Eliminar</button>
                </td>
            </tr>
        `;
    });
}

function prepareNewDevice() {
    document.getElementById('modalTitle').innerText = 'Agregar Dispositivo';
    document.getElementById('deviceForm').reset();
    document.getElementById('deviceId').value = '';
}

async function saveDevice() {
    const id = document.getElementById('deviceId').value;
    const nombre = document.getElementById('deviceName').value;
    const propietario = document.getElementById('deviceOwner').value;
    const isNew = id === '';

    const url = isNew ? API_URL : `${API_URL}/${id}`;
    const method = isNew ? 'POST' : 'PUT';

    let body = { nombre, propietario };
    
    if (isNew) {
        body.historial_estados = [];
    } else {
        const response = await fetch(`${API_URL}/${id}`);
        const existingDevice = await response.json();
        body.historial_estados = existingDevice.historial_estados;
    }

    await fetch(url, {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
    });

    const modal = bootstrap.Modal.getInstance(document.getElementById('deviceModal'));
    if(modal) modal.hide();
    
    loadDevices();
}

async function editDevice(id) {
    const response = await fetch(`${API_URL}/${id}`);
    const device = await response.json();
    
    document.getElementById('modalTitle').innerText = 'Editar Dispositivo';
    document.getElementById('deviceId').value = device.id;
    document.getElementById('deviceName').value = device.nombre;
    document.getElementById('deviceOwner').value = device.propietario;
}

async function deleteDevice(id) {
    if (confirm('¿Estás seguro de que quieres eliminar este dispositivo?')) {
        await fetch(`${API_URL}/${id}`, { method: 'DELETE' });
        loadDevices();
    }
}