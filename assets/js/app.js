/**
 * assets/js/app.js - VERSIÓN MAESTRA FINAL
 * Incluye: Datos Fiscales (RIF/Dirección), IVA 16% en Facturas, Drive Inteligente y Persistencia.
 */

// const API_BASE_URL = 'http://localhost:3000/api'; 
const API_BASE_URL = 'https://aura-elite-app.onrender.com/api'; 

// --- CLAVES DE SISTEMA ---
const STORAGE_KEYS = {
    TOKEN: 'aura_elite_token',
    USER: 'aura_elite_user',
    MAIN_DRIVE: 'aura_main_drive_link',
    BIZ_PROFILE: 'aura_business_profile' // Clave para tus datos fiscales (Mi Perfil)
};

// --- UTILIDAD: PETICIONES SEGURAS ---
async function authFetch(endpoint, options = {}) {
    const token = localStorage.getItem(STORAGE_KEYS.TOKEN);
    if (!token) { 
        console.warn("No hay token, redirigiendo...");
        window.location.href = 'login.html'; 
        return; 
    }

    const headers = { 'Content-Type': 'application/json', 'Authorization': token, ...options.headers };
    try {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, { ...options, headers });
        if (response.status === 401) {
            secureLogout(); 
            return null;
        }
        return response;
    } catch (error) { console.error("Error API:", error); return null; }
}

// --- LOGOUT SEGURO ---
function secureLogout() {
    localStorage.removeItem(STORAGE_KEYS.TOKEN);
    localStorage.removeItem(STORAGE_KEYS.USER);
    // Mantenemos Drive y Perfil de Negocio guardados
    window.location.href = 'login.html';
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
    const userJson = localStorage.getItem(STORAGE_KEYS.USER);
    if (userJson) {
        const user = JSON.parse(userJson);
        CURRENT_USER_PROFESSION = user.profession || 'otro';
        const nameElement = document.getElementById('user-display-name'); 
        if (nameElement) nameElement.innerText = user.name;
    }

    const btnLogout = document.getElementById('btn-logout'); 
    if(btnLogout) {
        const newBtn = btnLogout.cloneNode(true);
        btnLogout.parentNode.replaceChild(newBtn, btnLogout);
        newBtn.onclick = (e) => {
            e.preventDefault();
            if(confirm("¿Cerrar sesión?")) secureLogout();
        };
    }
}

// =========================================
// 1. PACIENTES (LISTADO)
// =========================================
async function loadPatientsPage(searchTerm = "") {
    const tableBody = document.querySelector('.data-table tbody'); if (!tableBody) return;
    tableBody.innerHTML = '<tr><td colspan="5" style="text-align:center">Cargando...</td></tr>';

    const res = await authFetch('/patients');
    if (!res) return;
    let patients = await res.json();

    if (searchTerm.trim() !== "") {
        const term = searchTerm.toLowerCase();
        patients = patients.filter(p => p.nombre.toLowerCase().includes(term) || p.telefono.includes(term) || (p.rif && p.rif.toLowerCase().includes(term)));
    }
    
    tableBody.innerHTML = ''; 
    if (patients.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="5" style="text-align:center">No hay clientes.</td></tr>';
        return;
    }

    patients.forEach(p => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${p.nombre}<br><small style="color:#666;">${p.rif || ''}</small></td>
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
        // CAPTURA DE DATOS COMPLETOS (RIF Y DIRECCIÓN)
        const nombre = document.getElementById('patient-name').value; 
        const rif = document.getElementById('patient-rif').value;          
        const address = document.getElementById('patient-address').value;  
        const telefono = document.getElementById('patient-phone').value;
        
        const res = await authFetch('/patients', { 
            method: 'POST', 
            body: JSON.stringify({ nombre, rif, address, telefono, driveLink: '' }) 
        });
        
        if (res && res.ok) { 
            modal.style.display = "none"; 
            loadPatientsPage(); 
            alert("✅ Cliente registrado correctamente.");
        }
    };
}

// =========================================
// 2. FICHA PACIENTE Y HISTORIAL
// =========================================
async function loadPatientDetailsPage() {
    const params = new URLSearchParams(window.location.search); 
    const pid = params.get('id');
    if (!pid) { window.location.href = 'clientes.html'; return; }

    const res = await authFetch('/patients');
    if (!res) return;
    const patients = await res.json();
    const p = patients.find(pat => pat._id === pid);
    if (!p) return;

    // Rellenar Ficha
    const lblHeader = document.getElementById('lbl-nombre-paciente-header');
    if(lblHeader) lblHeader.innerText = `Ficha de: ${p.nombre}`; 
    
    const lblNombre = document.getElementById('lbl-nombre-paciente');
    if(lblNombre) lblNombre.innerText = p.nombre; 

    const lblRif = document.getElementById('lbl-rif-paciente');
    if(lblRif) lblRif.innerText = p.rif || "No registrado"; 

    const lblDir = document.getElementById('lbl-direccion-paciente');
    if(lblDir) lblDir.innerText = p.address || "Sin dirección fiscal";
    
    const lblTel = document.getElementById('lbl-telefono');
    if(lblTel) lblTel.innerText = p.telefono;
    
    // Botones
    const btnWa = document.getElementById('link-whatsapp-ficha'); 
    if(btnWa) btnWa.href = `https://wa.me/${p.telefono.replace(/\D/g,'')}`;
    
    const btnDel = document.getElementById('btn-eliminar-paciente'); 
    if(btnDel) btnDel.onclick = () => deleteCurrentPatient(pid);
    
    // Edición Completa
    const btnEd = document.getElementById('btn-editar-paciente'); 
    if(btnEd) btnEd.onclick = () => editPatientData(pid, p); 

    const btnDr = document.getElementById('btn-drive-folder'); 
    if(btnDr) btnDr.onclick = () => openPatientDrive(p);

    loadPatientRecords(pid);
    setupRecordModal(pid);
}

// --- FUNCIÓN DE EDICIÓN COMPLETA (CORREGIDA) ---
window.editPatientData = async function(id, currentData) {
    // Pedimos datos uno a uno (simple pero efectivo)
    const newPhone = prompt("📞 Nuevo Teléfono:", currentData.telefono);
    if (newPhone === null) return; // Si cancela, no hacemos nada

    const newRif = prompt("🆔 Nuevo RIF:", currentData.rif || "");
    if (newRif === null) return;

    const newAddress = prompt("📍 Nueva Dirección Fiscal:", currentData.address || "");
    if (newAddress === null) return;
    
    // Enviamos TODO al servidor
    await authFetch(`/patients/${id}`, { 
        method: 'PUT', 
        body: JSON.stringify({ 
            telefono: newPhone, 
            rif: newRif, 
            address: newAddress 
        }) 
    });
    
    location.reload(); // Recargamos para ver cambios
}

window.deleteCurrentPatient = async function(id) {
    if(!confirm("⚠️ ¿Estás seguro de eliminar este cliente y todo su historial?")) return;
    await authFetch(`/patients/${id}`, { method: 'DELETE' });
    window.location.href = 'clientes.html';
};

function openPatientDrive(p) {
    if (p.driveLink && p.driveLink.startsWith('http')) {
        window.open(p.driveLink, '_blank');
    } else {
        const l = prompt(`📂 Pega el link de la carpeta de Drive de ${p.nombre}:`);
        if (l) {
            authFetch(`/patients/${p._id}`, { method: 'PUT', body: JSON.stringify({ driveLink: l }) })
            .then(() => window.open(l, '_blank'));
        }
    }
}

// --- HISTORIAL ---
async function loadPatientRecords(pid) {
    const tbody = document.getElementById('records-table-body'); if(!tbody) return;
    tbody.innerHTML = '<tr><td colspan="4">Cargando...</td></tr>';
    
    const res = await authFetch('/records');
    if(!res) return;
    const allRecords = await res.json();
    const recs = allRecords.filter(r => r.patientId === pid).sort((a,b) => new Date(b.date) - new Date(a.date));

    tbody.innerHTML = '';
    recs.forEach(r => {
        const isLink = r.fileName && r.fileName.startsWith('http');
        const fileContent = isLink 
            ? `<a href="${r.fileName}" target="_blank" style="color:#2980b9; text-decoration:underline;">🔗 Abrir Archivo</a>` 
            : `<small style="color:#666;">${r.fileName}</small>`;

        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${r.date}</td>
            <td><strong>${r.title}</strong><br>${fileContent}</td>
            <td>${r.type}</td>
            <td><button onclick="deleteRecord('${r._id}', '${pid}')" style="color:red;border:none;background:none;cursor:pointer;">🗑️</button></td>`;
        tbody.appendChild(row);
    });
    
    const msg = document.getElementById('no-records-msg');
    if(msg) msg.style.display = recs.length ? 'none' : 'block';
}

function setupRecordModal(pid) {
    const modal = document.getElementById('new-record-modal'); 
    const btn = document.getElementById('btn-nuevo-registro'); 
    const form = document.getElementById('record-form');
    if (!modal || !btn) return;
    
    btn.onclick = () => { 
        form.reset(); 
        document.getElementById('record-date').value = new Date().toISOString().split('T')[0]; 
        modal.style.display = 'block'; 
    };
    
    const closeBtn = modal.querySelector('.close-button');
    if(closeBtn) closeBtn.onclick = () => modal.style.display = 'none';
    
    if(form) form.onsubmit = async (e) => {
        e.preventDefault(); 
        const linkInput = document.getElementById('record-link').value;
        const rec = { 
            patientId: pid, 
            date: document.getElementById('record-date').value, 
            title: document.getElementById('record-title').value, 
            type: document.getElementById('record-type').value, 
            fileName: linkInput || "Sin enlace" 
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
// 5. FACTURACIÓN Y PDF CON IVA
// =========================================
let CACHED_INVOICES = [];

async function loadInvoicesPage() { 
    const tbody = document.getElementById('invoices-table-body'); if(!tbody) return; 
    tbody.innerHTML = '<tr><td colspan="7" style="text-align:center">Cargando facturas...</td></tr>';
    
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
        const pName = p ? p.nombre : "Cliente Eliminado"; 
        const pPhone = p ? p.telefono.replace(/\D/g,'') : "";
        
        if (doc.type === 'Factura') totalBilled += (parseFloat(doc.amount) || 0);

        let waBtn = '';
        if (pPhone) {
            let msg = `Hola ${pName}, adjunto documento ${doc.number}.`;
            waBtn = `<a href="https://wa.me/${pPhone}?text=${encodeURIComponent(msg)}" target="_blank" class="btn-action">📱</a>`;
        }

        let actionBtn = "";
        if (doc.type === 'Presupuesto') {
            actionBtn = `<button onclick="convertBudgetToInvoice('${doc._id}')" style="border:1px solid orange; color:orange; background:#fff; cursor:pointer;" title="Convertir a Factura">⚡</button>`;
        } else {
            actionBtn = doc.status === 'Pagado' 
                ? `<button onclick="toggleInvoiceStatus('${doc._id}', 'Pendiente')">↩️</button>`
                : `<button onclick="toggleInvoiceStatus('${doc._id}', 'Pagado')" style="color:green; cursor:pointer;">✅</button>`;
        }

        const row = document.createElement('tr'); 
        row.innerHTML = `
            <td><strong>${doc.number}</strong></td>
            <td>${pName}</td>
            <td>${doc.date}</td>
            <td>${doc.items[0]?.description || 'Servicio'}</td>
            <td>$${parseFloat(doc.amount).toFixed(2)}</td>
            <td><span class="status-badge ${doc.status === 'Pagado'?'complete':'pending'}">${doc.type === 'Presupuesto' ? 'PRE' : doc.status}</span> ${actionBtn}</td>
            <td>
                <button class="btn-action" onclick="printInvoice('${doc._id}')" title="PDF Fiscal">🖨️</button> 
                ${waBtn}
            </td>`; 
        tbody.appendChild(row); 
    }); 
    
    const totalLabel = document.getElementById('lbl-total-billed');
    if(totalLabel) totalLabel.innerText = `$${totalBilled.toFixed(2)}`;
}

// --- GENERADOR PDF FISCAL (ESTILO VENEZUELA) ---
window.printInvoice = async function(id) {
    if (!window.jspdf) { alert("⚠️ Librería PDF no cargada."); return; }

    const docData = CACHED_INVOICES.find(d => d._id === id);
    if(!docData) return;

    // Obtener datos del Cliente
    let client = { nombre: "Cliente General", rif: "N/A", address: "N/A", telefono: "" };
    try {
        const res = await authFetch('/patients');
        const patients = await res.json();
        const p = patients.find(x => x._id === docData.patientId);
        if(p) client = { ...p };
    } catch(e) {}

    // Obtener TU Perfil de Negocio (guardado en LocalStorage)
    const myProfile = JSON.parse(localStorage.getItem(STORAGE_KEYS.BIZ_PROFILE) || '{}');
    const myName = myProfile.name || "AURA ELITE";
    const myRif = myProfile.rif || "J-00000000-0";
    const myAddress = myProfile.address || "Dirección no configurada";

    // Cálculos Matemáticos (IVA 16%)
    const baseImponible = parseFloat(docData.amount); // Asumimos que lo guardado es la base
    const rateIVA = 0.16; // 16%
    const montoIVA = baseImponible * rateIVA;
    const totalPagar = baseImponible + montoIVA;

    // Crear PDF
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    // 1. CABECERA (TUS DATOS)
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.text(myName, 14, 20); // Tu nombre empresa
    
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`RIF: ${myRif}`, 14, 26);
    // Dividir dirección larga en líneas
    const splitAddress = doc.splitTextToSize(myAddress, 100);
    doc.text(splitAddress, 14, 32);

    // 2. DATOS DE LA FACTURA (Derecha)
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(200, 0, 0); // Rojo para destacar
    doc.text(`${docData.type.toUpperCase()} N° ${docData.number}`, 120, 20);
    
    doc.setTextColor(0, 0, 0); // Negro
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`Fecha de Emisión: ${docData.date}`, 120, 28);
    doc.text(`N° Control: 00-${Math.floor(Math.random() * 999999)}`, 120, 34); // Simulado

    // 3. DATOS DEL CLIENTE (Caja)
    doc.setDrawColor(0);
    doc.rect(14, 50, 180, 25); // Caja borde
    
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text("DATOS DEL CLIENTE:", 16, 55);
    
    doc.setFont("helvetica", "normal");
    doc.text(`Razón Social: ${client.nombre}`, 16, 62);
    doc.text(`RIF/CI: ${client.rif || "No registrado"}`, 120, 62);
    doc.text(`Dirección: ${client.address || "No registrada"}`, 16, 68);
    doc.text(`Teléfono: ${client.telefono}`, 120, 68);

    // 4. TABLA DE ITEMS
    const tableBody = docData.items.map(item => [
        item.description, 
        `$${parseFloat(item.price).toFixed(2)}`
    ]);
    
    doc.autoTable({
        startY: 80,
        head: [['Concepto / Descripción', 'Monto Base']],
        body: tableBody,
        theme: 'plain', // Estilo limpio tipo factura
        styles: { fontSize: 10, cellPadding: 3 },
        headStyles: { fillColor: [240, 240, 240], textColor: 0, fontStyle: 'bold', lineColor: 200, lineWidth: 0.1 },
        bodyStyles: { lineColor: 200, lineWidth: 0.1 },
        columnStyles: { 1: { halign: 'right', cellWidth: 40 } }
    });

    // 5. TOTALES (Al final de la tabla)
    const finalY = doc.lastAutoTable.finalY + 5;
    
    // Cuadro de totales
    doc.rect(120, finalY, 74, 25);
    
    doc.setFontSize(10);
    doc.text("Base Imponible:", 122, finalY + 6);
    doc.text(`$${baseImponible.toFixed(2)}`, 190, finalY + 6, { align: "right" });
    
    doc.text("I.V.A. (16%):", 122, finalY + 12);
    doc.text(`$${montoIVA.toFixed(2)}`, 190, finalY + 12, { align: "right" });
    
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text("TOTAL A PAGAR:", 122, finalY + 20);
    doc.text(`$${totalPagar.toFixed(2)}`, 190, finalY + 20, { align: "right" });

    // Pie de página
    doc.setFontSize(8);
    doc.setFont("helvetica", "italic");
    doc.text("Sin tachaduras ni enmendaduras.", 14, 280);

    doc.save(`${docData.number}_${client.nombre}.pdf`);
};

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
window.convertBudgetToInvoice = async (id) => { if(confirm("¿Convertir?")) { const doc = CACHED_INVOICES.find(d=>d._id===id); await authFetch(`/invoices/${id}`, { method: 'PUT', body: JSON.stringify({ type:'Factura', number: doc.number.replace('PRE','FAC') }) }); loadInvoicesPage(); } };

// =========================================
// 6. FICHEROS (DRIVE)
// =========================================
async function loadDrivePage() {
    const tbody = document.getElementById('files-table-body'); 
    const statusBox = document.querySelector('.alert-info');
    const btnConnect = document.getElementById('btn-connect-drive-main');
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="4" style="text-align:center">Cargando carpetas...</td></tr>';
    
    const res = await authFetch('/patients');
    if(!res) return;
    const patients = await res.json();
    const mainDrive = localStorage.getItem(STORAGE_KEYS.MAIN_DRIVE);
    
    if (btnConnect) {
        if (mainDrive) {
            btnConnect.innerText = "📂 Ir a mi Drive Principal";
            btnConnect.className = "btn-primary";
            btnConnect.style.backgroundColor = "#27ae60"; 
            btnConnect.onclick = () => window.open(mainDrive, '_blank');
            if(statusBox) {
                statusBox.style.backgroundColor = "#d4edda"; statusBox.style.color = "#155724"; statusBox.style.borderColor = "#c3e6cb";
                statusBox.innerHTML = `<strong>✅ Estado: Sincronización Activa</strong><br>Drive conectado. <br><small><a href="#" onclick="changeMainDrive()" style="color:#155724;">(Cambiar cuenta)</a></small>`;
            }
        } else {
            btnConnect.innerText = "🔗 Conectar Google Drive";
            btnConnect.style.backgroundColor = "#f39c12"; 
            btnConnect.onclick = setupMainDrive;
            if(statusBox) statusBox.innerHTML = `<strong>ℹ️ Estado</strong><br>⚠️ No conectado.`;
        }
    }
    tbody.innerHTML = '';
    if(patients.length === 0) { tbody.innerHTML = '<tr><td colspan="4" style="text-align:center">No hay clientes.</td></tr>'; return; }

    patients.forEach(p => {
        const hasLink = p.driveLink && p.driveLink.startsWith('http');
        const linkDisplay = hasLink ? `<a href="${p.driveLink}" target="_blank" style="color:#3498db; font-weight:bold;">📂 ${p.nombre} (Drive)</a>` : `<span style="color:#999;">Sin carpeta</span>`;
        let actionBtns = hasLink 
            ? `<button onclick="window.open('${p.driveLink}', '_blank')" class="btn-action" style="background:#3498db; color:white; padding:5px;">⬆️ Subir</button> <button onclick="unlinkDriveFolder('${p._id}')" style="color:red; background:none; border:none;">❌</button>`
            : `<button onclick="linkDriveFolder('${p._id}', '${p.nombre}')" class="btn-action" style="color:green;">➕ Vincular</button>`;
        const row = document.createElement('tr');
        row.innerHTML = `<td><strong>${p.nombre}</strong></td><td>${hasLink ? '✅' : '⚪'}</td><td>${linkDisplay}</td><td style="text-align:center;">${actionBtns}</td>`;
        tbody.appendChild(row);
    });
}
function setupDrivePage() { loadDrivePage(); }
window.setupMainDrive = function() { const link = prompt("📂 Pega el enlace de tu carpeta RAÍZ de Drive:"); if (link && link.startsWith('http')) { localStorage.setItem(STORAGE_KEYS.MAIN_DRIVE, link); alert("✅ Conectado."); loadDrivePage(); } };
window.changeMainDrive = function() { if(confirm("¿Cambiar carpeta principal?")) setupMainDrive(); }
window.linkDriveFolder = async function(id, nombre) { const l = prompt(`📂 Pega el link de la carpeta de: ${nombre}`); if (l) { await authFetch(`/patients/${id}`, { method: 'PUT', body: JSON.stringify({ driveLink: l }) }); loadDrivePage(); } };
window.unlinkDriveFolder = async function(id) { if(confirm("¿Desvincular carpeta?")) { await authFetch(`/patients/${id}`, { method: 'PUT', body: JSON.stringify({ driveLink: '' }) }); loadDrivePage(); } };

// =========================================
// ESTADÍSTICAS
// =========================================
async function updateDashboardStats() {
    try {
        const resClients = await authFetch('/patients');
        if (resClients && resClients.ok) { const clients = await resClients.json(); const counter = document.getElementById('dash-total-pacientes'); if (counter) counter.innerText = clients.length || 0; }
        const resInvoices = await authFetch('/invoices');
        if (resInvoices && resInvoices.ok) { const invoices = await resInvoices.json(); const ahora = new Date(); const mesActual = ahora.getMonth(); const anioActual = ahora.getFullYear(); const totalMes = invoices.reduce((acc, inv) => { const f = new Date(inv.date); if (inv.type === 'Factura' && f.getMonth() === mesActual && f.getFullYear() === anioActual) { return acc + (parseFloat(inv.amount) || 0); } return acc; }, 0); const money = document.getElementById('dash-ingresos-mes'); if (money) money.innerText = totalMes.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' }); }
    } catch (error) { console.error("Error dashboard:", error); }
}

// =========================================
// MENÚ MÓVIL
// =========================================
function setupMobileMenu() {
    const btnMenu = document.getElementById('btn-menu-mobile');
    const sidebar = document.getElementById('sidebar');
    if (btnMenu && sidebar) {
        const newBtn = btnMenu.cloneNode(true); btnMenu.parentNode.replaceChild(newBtn, btnMenu);
        newBtn.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); sidebar.classList.toggle('active'); });
        document.addEventListener('click', (e) => { if (window.innerWidth < 768 && sidebar.classList.contains('active') && !sidebar.contains(e.target) && e.target !== newBtn) sidebar.classList.remove('active'); });
    }
}

// =========================================
// ROUTER
// =========================================
async function router() {
    if (typeof initializeApp === 'function') initializeApp();
    setupMobileMenu();
    const path = window.location.pathname;
    if (path.includes('dashboard') || path.endsWith('index.html') || path === '/' || path.endsWith('/')) { updateDashboardStats(); } 
    else if (path.includes('clientes')) { 
        if (typeof loadPatientsPage === 'function') loadPatientsPage();
        if (typeof setupSearchListener === 'function') setupSearchListener();
        if (typeof setupPatientModalListeners === 'function') setupPatientModalListeners();
    } 
    else if (path.includes('ficha') || path.includes('paciente')) { if (typeof loadPatientDetailsPage === 'function') loadPatientDetailsPage(); }
    else if (path.includes('calendario')) { if (typeof loadCalendarPage === 'function') loadCalendarPage(); if (typeof setupModalListeners === 'function') setupModalListeners(); }
    else if (path.includes('facturas')) { if (typeof loadInvoicesPage === 'function') loadInvoicesPage(); if (typeof setupInvoiceModal === 'function') setupInvoiceModal(); }
    else if (path.includes('ficheros')) { if (typeof setupDrivePage === 'function') setupDrivePage(); if (typeof loadDrivePage === 'function') loadDrivePage(); }
}
document.addEventListener('DOMContentLoaded', router);