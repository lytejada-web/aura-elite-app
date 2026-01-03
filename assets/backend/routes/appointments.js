const express = require('express');
const router = express.Router();

// Base de datos en memoria (se reinicia al apagar el servidor)
let appointmentsDB = [];

// --- FUNCIONES SIMULADAS ---
function getGoogleCalendarEvents(authClient) {
    const today = new Date();
    // Una cita de prueba de Google para mañana
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    
    return [{ 
        id: 'gc-sim-1', 
        title: '📅 Google: Revisión General', 
        start: tomorrow.toISOString(), 
        end: new Date(tomorrow.getTime() + 3600000).toISOString(), 
        backgroundColor: '#2980b9' // Azul
    }];
}

// --- RUTAS API ---

// 1. GET (Leer)
router.get('/', (req, res) => {
    const userId = req.query.userId;
    try {
        const googleEvents = getGoogleCalendarEvents({});
        const localEvents = appointmentsDB.filter(a => a.userId === userId);
        res.json([...googleEvents, ...localEvents]);
    } catch (error) {
        res.status(500).json([]);
    }
});

// 2. POST (Crear)
router.post('/', (req, res) => {
    const { userId, pacienteId, title, start, end } = req.body;
    const newAppointment = {
        id: `local-${Date.now()}`, // ID único
        userId, pacienteId, title, start, end,
        backgroundColor: '#27ae60' // Verde
    };
    appointmentsDB.push(newAppointment);
    res.status(201).json(newAppointment);
});

// 3. DELETE (Borrar Cita) - ¡NUEVO!
router.delete('/:id', (req, res) => {
    const { id } = req.params;
    console.log(`🗑️ Solicitud de eliminar cita ID: ${id}`);
    
    // Filtramos la lista para quitar la cita con ese ID
    const initialLength = appointmentsDB.length;
    appointmentsDB = appointmentsDB.filter(appt => appt.id !== id);

    if (appointmentsDB.length < initialLength) {
        res.json({ success: true, message: 'Cita eliminada' });
    } else {
        // Si no bajó la cantidad, es que no encontró el ID (o es de Google)
        res.status(404).json({ error: 'Cita no encontrada o es externa' });
    }
});

// 4. PUT (Modificar Cita) - ¡NUEVO!
router.put('/:id', (req, res) => {
    const { id } = req.params;
    const { title, start, end, pacienteId } = req.body;
    console.log(`✏️ Editando cita ID: ${id}`);

    const index = appointmentsDB.findIndex(appt => appt.id === id);
    
    if (index !== -1) {
        // Actualizamos solo los campos que nos envían
        appointmentsDB[index] = { ...appointmentsDB[index], title, start, end, pacienteId };
        res.json({ success: true, appointment: appointmentsDB[index] });
    } else {
        res.status(404).json({ error: 'No se pudo editar la cita' });
    }
});

module.exports = router;