/**
 * assets/js/brandConfig.js
 * CONFIGURACIÓN GLOBAL DE LA MARCA
 * Cambia esto y cambiará en TODA la aplicación.
 */

const APP_CONFIG = {
    // 1. Identidad Visual
    appName: "Aura Elite",
    appTagline: "Gestión Inteligente de Servicios",
    
    // 2. Vocabulario del Negocio (Neutro para servir a todos)
    terms: {
        client: "Cliente",       // Ya no solo "Paciente"
        professional: "Profesional", // Ya no solo "Doctor"
        service: "Servicio",     // Ya no solo "Tratamiento"
        history: "Historial / Notas",
        identifier: "DNI / ID"
    },

    // 3. Lista de Servicios por Defecto (Para la demo)
    // Esto se podrá editar en el futuro según quien te compre el software
    servicesList: [
        "Consulta / Asesoría",
        "Servicio Básico",
        "Servicio Premium",
        "Mantenimiento Mensual",
        "Urgencia / Extra"
    ]
};

// Exportar globalmente
window.APP_CONFIG = APP_CONFIG;