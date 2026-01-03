/**
 * assets/js/app.js - VERSIÓN NUBE CORREGIDA (Funcionalidad Completa)
 */

const API_BASE_URL = 'http://localhost:3000/api';

// --- UTILIDAD: PETICIONES SEGURAS ---
async function authFetch(endpoint, options = {}) {
    if (typeof AUTH_KEYS === 'undefined') return null; // Seguridad
    const token = localStorage.getItem(AUTH_KEYS.TOKEN);
    if (!token) { window.location.href = 'login.html'; return; }

    const headers = { 'Content-Type': 'application/json', 'Authorization': token, ...options.headers };
    try {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, { ...options, headers });
        if (response.status === 401) {
            localStorage.removeItem(AUTH_KEYS.TOKEN);
            window.location.href = 'login.html';
            return null;
        }
        return response;
    } catch (error) { console.error("Error API:", error); return null; }
}

// --- CATALOGO ---
const SERVICE_CATALOG = {
    'dental': [ "Consulta General", "Limpieza Dental", "Extracción", "Empaste", "Ortodoncia", "Blanqueamiento" ],
    'belleza': [ "Corte Caballero", "Corte Dama", "Tinte / Color", "Mechas", "Manicura", "Pedicura", "Maquillaje" ],
    'tecnico': [ "Desplazamiento", "Diagnóstico Avería", "Instalación", "Mano de Obra (Hora)", "Revisión Mantenimiento" ],
    'salud': [ "Sesión Fisioterapia", "Masaje Deportivo", "Estudio Pisada", "Consulta", "Rehabilitación" ],
    'legal': [ "Consulta Legal", "Redacción Contrato", "Gestión Trámites", "Honorarios (Hora)", "Iguala Mensual" ],
    'otro': [ "Servicio Básico", "Servicio Premium", "Consultoría", "Mano de Obra" ]
};

let CURRENT_USER_PROFESSION = 'otro';

// =========================================
// INICIALIZACIÓN
// =========================================
function initializeApp() {
    if (typeof AUTH_KEYS === 'undefined') return;
    const userJson = localStorage.getItem(AUTH_KEYS.USER);
    if (userJson) {
        const user = JSON.parse(userJson);
        CURRENT_USER_PROFESSION = user.profession || 'otro';
        const nameElement = document.getElementById('user-display-name'); 
        if (nameElement) nameElement.innerText = user.name;
    }
}

// =========================================
// 1. PACIENTES
// =========================================
async function loadPatientsPage(searchTerm = "") {
    const tableBody = document.querySelector('.data-table tbody'); if (!tableBody) return;
    tableBody.innerHTML = '<tr><td colspan="5" style="text-align:center">Cargando...</td></tr>';

    const res = await authFetch('/patients');
    if (!res) return;
    let patients = await res.json();

    if (searchTerm.trim() !== "") {
        const term = searchTerm.toLowerCase();
        patients = patients.filter(p => p.nombre.toLowerCase().includes(term) || p.telefono.includes(term));
    }
    
    tableBody.innerHTML = ''; 
    if (patients.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="5" style="text-align:center">No hay clientes.</td></tr>';
        return;
    }

    patients.forEach(p => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${p.nombre}</td>
            <td>${p.telefono}</td>
            <td>N/A</td>
            <td><span class="status-badge complete">Activo</span></td>
            <td>
                <a href="ficha-paciente.html?id=${p._id}" class="btn-action">Ver Ficha</a>
                <a href="https://wa.me/${p.telefono.replace(/\D/g,'')}" target="_blank" class="btn-action">💬 WA</a>
            </td>`;
        tableBody.appendChild(row);
    });
}

function setupSearchListener() { 
    const input = document.getElementById('search-input'); 
    if(input) input.addEventListener('keyup', (e) => loadPatientsPage(e.target.value)); 
}

function setupPatientModalListeners() {
    const modal = document.getElementById('new-patient-modal'); 
    const btnOpen = document.getElementById('btn-new-patient'); 
    const form = document.getElementById('patient-form');
    
    if (!modal || !btnOpen) return;
    
    btnOpen.onclick = (e) => { e.preventDefault(); form.reset(); modal.style.display = "block"; };
    modal.querySelector('.close-button').onclick = () => modal.style.display = "none";
    window.onclick = (e) => { if (e.target == modal) modal.style.display = "none"; };
    
    if(form) form.onsubmit = async (e) => {
        e.preventDefault();
        const nombre = document.getElementById('patient-name').value; 
        const telefono = document.getElementById('patient-phone').value;
        const res = await authFetch('/patients', { method: 'POST', body: JSON.stringify({ nombre, telefono, driveLink: '' }) });
        if (res && res.ok) { modal.style.display = "none"; loadPatientsPage(); }
    };
}

// =========================================
// 2. FICHA PACIENTE Y HISTORIAL
// =========================================
async function loadPatientDetailsPage() {
    const params = new URLSearchParams(window.location.search); 
    const pid = params.get('id');
    if (!pid) { window.location.href = 'clientes.html'; return; }

    // 1. Cargar Paciente
    const res = await authFetch('/patients');
    if (!res) return;
    const patients = await res.json();
    const p = patients.find(pat => pat._id === pid);
    if (!p) return;

    // Rellenar datos
    document.getElementById('lbl-nombre-paciente-header').innerText = `Ficha de: ${p.nombre}`; 
    document.getElementById('lbl-nombre-paciente').innerText = p.nombre; 
    document.getElementById('lbl-telefono').innerText = p.telefono;
    
    // Botones
    const btnWa = document.getElementById('link-whatsapp-ficha'); 
    if(btnWa) btnWa.href = `https://wa.me/${p.telefono.replace(/\D/g,'')}`;
    
    const btnDel = document.getElementById('btn-eliminar-paciente'); 
    if(btnDel) btnDel.onclick = () => deleteCurrentPatient(pid);
    
    const btnEd = document.getElementById('btn-editar-paciente'); 
    if(btnEd) btnEd.onclick = () => editPatientPhone(pid, p.telefono);
    
    const btnDr = document.getElementById('btn-drive-folder'); 
    if(btnDr) btnDr.onclick = () => openPatientDrive(p);

    // 2. Cargar Historial
    loadPatientRecords(pid);
    setupRecordModal(pid);
}

window.editPatientPhone = async function(id, oldPhone) {
    const newPhone = prompt("Nuevo teléfono:", oldPhone);
    if (newPhone && newPhone !== oldPhone) {
        await authFetch(`/patients/${id}`, { method: 'PUT', body: JSON.stringify({ telefono: newPhone }) });
        location.reload();
    }
}

window.deleteCurrentPatient = async function(id) {
    if(!confirm("⚠️ ¿Eliminar cliente y sus datos?")) return;
    await authFetch(`/patients/${id}`, { method: 'DELETE' });
    window.location.href = 'clientes.html';
};

function openPatientDrive(p) {
    if (p.driveLink && p.driveLink.startsWith('http')) window.open(p.driveLink, '_blank');
    else {
        const l = prompt(`Pegue el link de Drive de ${p.nombre}:`);
        if (l) {
            authFetch(`/patients/${p._id}`, { method: 'PUT', body: JSON.stringify({ driveLink: l }) })
            .then(() => window.open(l, '_blank'));
        }
    }
}

// --- HISTORIAL (RECORDS) ---
async function loadPatientRecords(pid) {
    const tbody = document.getElementById('records-table-body'); if(!tbody) return;
    tbody.innerHTML = '<tr><td colspan="4">Cargando...</td></tr>';
    
    const res = await authFetch('/records');
    if(!res) return;
    const allRecords = await res.json();
    const recs = allRecords.filter(r => r.patientId === pid).sort((a,b) => new Date(b.date) - new Date(a.date));

    tbody.innerHTML = '';
    recs.forEach(r => {
        const row = document.createElement('tr');
        row.innerHTML = `<td>${r.date}</td><td><strong>${r.title}</strong><br><small>📎 ${r.fileName}</small></td><td>${r.type}</td><td><button onclick="deleteRecord('${r._id}', '${pid}')" style="color:red;border:none;background:none;cursor:pointer;">🗑️</button></td>`;
        tbody.appendChild(row);
    });
    document.getElementById('no-records-msg').style.display = recs.length ? 'none' : 'block';
}

function setupRecordModal(pid) {
    const modal = document.getElementById('new-record-modal'); 
    const btn = document.getElementById('btn-nuevo-registro'); 
    const form = document.getElementById('record-form');
    if (!modal || !btn) return;
    
    btn.onclick = () => { form.reset(); document.getElementById('record-date').value = new Date().toISOString().split('T')[0]; modal.style.display = 'block'; };
    modal.querySelector('.close-button').onclick = () => modal.style.display = 'none';
    
    if(form) form.onsubmit = async (e) => {
        e.preventDefault(); 
        const fInput = document.getElementById('record-file');
        const rec = { 
            patientId: pid, 
            date: document.getElementById('record-date').value, 
            title: document.getElementById('record-title').value, 
            type: document.getElementById('record-type').value, 
            fileName: fInput.files.length > 0 ? fInput.files[0].name : "Sin archivo" 
        };
        await authFetch('/records', { method: 'POST', body: JSON.stringify(rec) });
        modal.style.display = 'none'; 
        loadPatientRecords(pid);
    };
}

window.deleteRecord = async function(rid, pid) {
    if(!confirm("¿Borrar registro?")) return;
    await authFetch(`/records/${rid}`, { method: 'DELETE' });
    loadPatientRecords(pid);
}

// =========================================
// 4. CALENDARIO
// =========================================
async function loadCalendarPage() {
    const calendarEl = document.getElementById('full-calendar-display'); 
    if (!calendarEl || typeof FullCalendar === 'undefined') return;

    const res = await authFetch('/appointments');
    if (!res) return;
    const events = await res.json();
    const mapped = events.map(e => ({ id: e._id, title: e.title, start: e.start, end: e.end, extendedProps: { pacienteId: e.pacienteId } }));

    const calendar = new FullCalendar.Calendar(calendarEl, { 
        initialView: 'dayGridMonth', locale: 'es', 
        headerToolbar: { left: 'prev,next today', center: 'title', right: 'dayGridMonth,timeGridWeek' }, 
        events: mapped, editable: true,
        eventClick: (info) => { if(confirm(`¿Borrar cita?`)) authFetch(`/appointments/${info.event.id}`, { method: 'DELETE' }).then(() => info.event.remove()); }
    });
    calendar.render();
}

function setupModalListeners() {
    const btnOpen = document.getElementById('btn-new-appointment');
    const modal = document.getElementById('new-appointment-modal');
    const form = document.getElementById('appointment-form');
    const selPac = document.getElementById('paciente-id');

    if(btnOpen && modal) {
        btnOpen.onclick = async (e) => { 
            if(e) e.preventDefault(); 
            // 1. CARGAR PACIENTES EN EL SELECT (LA CLAVE QUE FALTABA)
            selPac.innerHTML = '<option>Cargando...</option>';
            const res = await authFetch('/patients');
            const pts = await res.json();
            selPac.innerHTML = '<option value="">-- Seleccione Cliente --</option>';
            pts.forEach(p => selPac.innerHTML += `<option value="${p._id}">${p.nombre}</option>`);
            
            modal.style.display = 'block'; 
        };
        modal.querySelector('.close-button').onclick = () => modal.style.display = "none";
    }

    if(form) {
        form.onsubmit = async (e) => {
            e.preventDefault();
            const title = document.getElementById('cita-titulo').value;
            const start = document.getElementById('fecha-inicio').value;
            const end = document.getElementById('fecha-fin').value;
            const pid = selPac.value;
            
            await authFetch('/appointments', { method: 'POST', body: JSON.stringify({ title, start, end, pacienteId: pid }) });
            modal.style.display = 'none';
            if(window.location.pathname.includes('calendario')) window.location.reload(); else alert("Cita guardada");
        }
    }
}

// =========================================
// 5. FACTURACIÓN
// =========================================
let CACHED_INVOICES = [];
async function loadInvoicesPage() { 
    const tbody = document.getElementById('invoices-table-body'); if(!tbody) return; 
    tbody.innerHTML = '<tr><td colspan="7">Cargando...</td></tr>';
    
    const resInv = await authFetch('/invoices');
    const resPat = await authFetch('/patients');
    if(!resInv || !resPat) return;
    
    CACHED_INVOICES = await resInv.json();
    const patients = await resPat.json();

    tbody.innerHTML = ''; 
    let totalBilled = 0;
    
    CACHED_INVOICES.sort((a,b) => new Date(b.date) - new Date(a.date));

    CACHED_INVOICES.forEach(doc => { 
        const p = patients.find(x => x._id === doc.patientId); 
        const pName = p ? p.nombre : "Eliminado"; 
        const pPhone = p ? p.telefono.replace(/\D/g,'') : "";
        
        if (doc.type === 'Factura') totalBilled += doc.amount;

        // Botón WhatsApp (RECUPERADO)
        let waBtn = '';
        if (pPhone) {
            let msg = `Hola ${pName}, adjunto documento ${doc.number} por valor de $${doc.amount}.`;
            waBtn = `<a href="https://wa.me/${pPhone}?text=${encodeURIComponent(msg)}" target="_blank" class="btn-action">📱</a>`;
        }

        let actionBtn = "";
        if (doc.type === 'Presupuesto') {
            actionBtn = `<button onclick="convertBudgetToInvoice('${doc._id}')" style="border:1px solid orange; color:orange; background:#fff;">⚡</button>`;
        } else {
            actionBtn = doc.status === 'Pagado' 
                ? `<button onclick="toggleInvoiceStatus('${doc._id}', 'Pendiente')">↩️</button>`
                : `<button onclick="toggleInvoiceStatus('${doc._id}', 'Pagado')" style="color:green;">✅</button>`;
        }

        const row = document.createElement('tr'); 
        row.innerHTML = `
            <td><strong>${doc.number}</strong></td>
            <td>${pName}</td>
            <td>${doc.date}</td>
            <td>${doc.items[0]?.description || 'Servicio'}</td>
            <td>$${doc.amount}</td>
            <td><span class="status-badge ${doc.status === 'Pagado'?'complete':'pending'}">${doc.type === 'Presupuesto' ? 'PRE' : doc.status}</span> ${actionBtn}</td>
            <td><button class="btn-action">🖨️</button> ${waBtn}</td>`; 
        tbody.appendChild(row); 
    }); 
    document.getElementById('lbl-total-billed').innerText = `$${totalBilled}`;
}

function setupInvoiceModal() {
    const modal = document.getElementById('new-invoice-modal');
    const btnOpen = document.getElementById('btn-new-invoice');
    const form = document.getElementById('invoice-form');
    const btnAdd = document.getElementById('btn-add-item');
    
    if (!modal || !btnOpen) return;

    btnOpen.onclick = async () => {
        form.reset(); modal.style.display = "block";
        document.getElementById('inv-date').value = new Date().toISOString().split('T')[0];
        document.getElementById('invoice-items-body').innerHTML = '';
        
        const sel = document.getElementById('inv-patient');
        sel.innerHTML = '<option>Cargando...</option>';
        const res = await authFetch('/patients');
        const pts = await res.json();
        sel.innerHTML = '<option value="">-- Seleccione --</option>';
        pts.forEach(p => sel.innerHTML += `<option value="${p._id}">${p.nombre}</option>`);

        addInvoiceRow(); updateInvoiceTotal();
    };
    
    if (btnAdd) btnAdd.onclick = () => addInvoiceRow();
    modal.querySelector('.close-button').onclick = () => modal.style.display = "none"; 

    form.onsubmit = async (e) => { 
        e.preventDefault(); 
        const rows = document.querySelectorAll('.invoice-item-row');
        const itemsToSave = [];
        let grandTotal = 0;
        rows.forEach(row => {
            const desc = row.querySelector('.item-desc').value;
            const price = parseFloat(row.querySelector('.item-price').value) || 0;
            if(desc) { itemsToSave.push({ description: desc, price }); grandTotal += price; }
        });
        if(itemsToSave.length === 0) return alert("Añade items");

        const type = document.getElementById('inv-type').value;
        const newDoc = { 
            number: (type==="Factura"?"FAC-":"PRE-") + Date.now().toString().slice(-5),
            type, patientId: document.getElementById('inv-patient').value, 
            date: document.getElementById('inv-date').value, amount: grandTotal, status: 'Pendiente', items: itemsToSave 
        }; 

        const res = await authFetch('/invoices', { method: 'POST', body: JSON.stringify(newDoc) });
        if(res && res.ok) { modal.style.display = "none"; loadInvoicesPage(); }
    };
}

function addInvoiceRow() {
    const tbody = document.getElementById('invoice-items-body');
    const row = document.createElement('tr');
    row.className = 'invoice-item-row';
    let options = '';
    (SERVICE_CATALOG[CURRENT_USER_PROFESSION] || SERVICE_CATALOG['otro']).forEach(s => options += `<option value="${s}">${s}</option>`);
    const listId = `list-${Math.random()}`;
    row.innerHTML = `<td style="padding:5px"><input list="${listId}" class="item-desc" style="width:100%"><datalist id="${listId}">${options}</datalist></td><td style="padding:5px"><input type="number" class="item-price" oninput="updateInvoiceTotal()" style="width:100%"></td><td style="text-align:center"><button type="button" onclick="this.closest('tr').remove();updateInvoiceTotal()">❌</button></td>`;
    tbody.appendChild(row);
}
window.updateInvoiceTotal = function() {
    let total = 0; document.querySelectorAll('.item-price').forEach(i => total += parseFloat(i.value)||0);
    document.getElementById('lbl-grand-total').innerText = `$${total.toFixed(2)}`;
}
window.toggleInvoiceStatus = async (id, st) => { if(confirm("¿Cambiar estado?")) { await authFetch(`/invoices/${id}`, { method: 'PUT', body: JSON.stringify({status:st}) }); loadInvoicesPage(); }};
window.convertBudgetToInvoice = async (id) => { 
    if(confirm("¿Convertir?")) { 
        const doc = CACHED_INVOICES.find(d=>d._id===id);
        await authFetch(`/invoices/${id}`, { method: 'PUT', body: JSON.stringify({ type:'Factura', number: doc.number.replace('PRE','FAC') }) }); 
        loadInvoicesPage(); 
    }
};

// =========================================
// 6. FICHEROS (DRIVE)
// =========================================
async function loadDrivePage() {
    const tbody = document.getElementById('files-table-body'); if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="4">Cargando...</td></tr>';
    
    const res = await authFetch('/patients');
    if(!res) return;
    const patients = await res.json();
    
    tbody.innerHTML = '';
    patients.forEach(p => {
        const hasLink = p.driveLink && p.driveLink.startsWith('http');
        const linkDisplay = hasLink ? `<a href="${p.driveLink}" target="_blank" style="color:#3498db;">Abrir Carpeta</a>` : `<span style="color:#999;">Sin vincular</span>`;
        const actionBtns = hasLink 
            ? `<button onclick="window.open('${p.driveLink}')" class="btn-action">📂</button> <button onclick="unlinkDriveFolder('${p._id}')" style="color:red;">❌</button>` 
            : `<button onclick="linkDriveFolder('${p._id}', '${p.nombre}')" class="btn-action" style="color:green;">➕ Vincular</button>`;
        
        const row = document.createElement('tr');
        row.innerHTML = `<td><strong>${p.nombre}</strong></td><td>${hasLink ? '✅' : '⏳'}</td><td>${linkDisplay}</td><td>${actionBtns}</td>`;
        tbody.appendChild(row);
    });
}
function setupDrivePage() { /* Solo visual */ }

window.linkDriveFolder = async function(id, nombre) {
    const l = prompt(`📂 Pega el link de Google Drive para ${nombre}:`);
    if (l) {
        await authFetch(`/patients/${id}`, { method: 'PUT', body: JSON.stringify({ driveLink: l }) });
        loadDrivePage();
    }
};
window.unlinkDriveFolder = async function(id) {
    if(confirm("¿Desvincular?")) {
        await authFetch(`/patients/${id}`, { method: 'PUT', body: JSON.stringify({ driveLink: '' }) });
        loadDrivePage();
    }
};

// =========================================
// MÓDULO 7: PREMIUM (MODAL)
// =========================================
function setupPremiumModal() {
    const modal = document.getElementById('premium-modal');
    const btnOpen = document.getElementById('btn-go-premium');
    const btnApply = document.getElementById('btn-apply-coupon');
    const form = document.getElementById('payment-form');
    
    if (!modal || !btnOpen) return;

    btnOpen.onclick = (e) => { e.preventDefault(); modal.style.display = "block"; };
    
    const closeBtn = modal.querySelector('.close-button');
    if(closeBtn) closeBtn.onclick = () => modal.style.display = "none";

    if (btnApply) {
        btnApply.onclick = () => {
            const code = document.getElementById('coupon-code').value.trim().toUpperCase();
            if (code === "DENTAL2025") {
                document.getElementById('discount-row').style.display = 'flex';
                document.getElementById('price-total').innerText = `$23.99`;
                alert("🎉 Cupón aplicado!");
            } else { alert("❌ Cupón no válido."); }
        };
    }
    if (form) {
        form.onsubmit = (e) => {
            e.preventDefault(); 
            const btn = form.querySelector('button[type="submit"]');
            btn.innerText = "Procesando...";
            setTimeout(() => {
                alert("¡Bienvenido a Premium! (Simulación)");
                modal.style.display = "none";
                btnOpen.style.display = "none";
            }, 2000);
        };
    }
}

// =========================================
// 8. DASHBOARD & ROUTER
// =========================================
async function loadDashboardPage() {
    document.getElementById('current-date-display').innerText = new Date().toLocaleDateString();
    const resInv = await authFetch('/invoices');
    const resPat = await authFetch('/patients');
    if(!resInv || !resPat) return;
    const inv = await resInv.json();
    const pat = await resPat.json();
    
    const total = inv.filter(i => i.type==='Factura' && i.date.startsWith(new Date().toISOString().slice(0,7))).reduce((s,i)=>s+i.amount,0);
    document.getElementById('dash-ingresos-mes').innerText = `$${total}`;
    document.getElementById('dash-total-pacientes').innerText = pat.length;
}

function router() {
    initializeApp();
    const path = window.location.pathname;
    if (path.includes('dashboard') || path.endsWith('index.html') || path === '/') { loadDashboardPage(); setupModalListeners(); }
    else if (path.includes('clientes')) { loadPatientsPage(); setupSearchListener(); setupPatientModalListeners(); } 
    else if (path.includes('ficha')) { loadPatientDetailsPage(); }
    else if (path.includes('calendario')) { loadCalendarPage(); setupModalListeners(); }
    else if (path.includes('facturas')) { loadInvoicesPage(); setupInvoiceModal(); }
    else if (path.includes('ficheros')) { setupDrivePage(); loadDrivePage(); }
}
document.addEventListener('DOMContentLoaded', router);