/**
 * assets/js/config.js
 * Configuración global y Datos del Usuario Activo
 */

// Intentamos leer el usuario de la sesión (creado en auth.js)
const sessionRaw = localStorage.getItem('eliteDental_session');
const currentUser = sessionRaw ? JSON.parse(sessionRaw) : null;

// Si no hay usuario y NO estamos en login/registro, auth.js nos echará.
// Pero para que app.js no falle, definimos un usuario por defecto O usamos el real.

const MOCK_USER = currentUser || {
    user_id: 'guest',
    name: 'Invitado',
    email: 'guest@elitedental.com',
    plan_type: 'Basic'
};

// Configuración de Google (Opcional si usas el método simulado)
const GOOGLE_CONFIG = {
    CLIENT_ID: 'TU_CLIENT_ID_DE_GOOGLE',
    API_KEY: 'TU_API_KEY_DE_GOOGLE',
    SCOPES: "https://www.googleapis.com/auth/calendar.events"
};

// Exportar globalmente (para que otros scripts lo vean)
window.MOCK_USER = MOCK_USER;
window.GOOGLE_CONFIG = GOOGLE_CONFIG;