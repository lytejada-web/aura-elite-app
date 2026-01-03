// backend/config/google.js

// NOTA: Reemplaza estos valores con tus credenciales reales de Google Cloud Console
const GOOGLE_CLIENT_ID = '19101469659-ef2bl0hkvv7peosjuhackmvoipuh9ukf.apps.googleusercontent.com'; 
const GOOGLE_CLIENT_SECRET = '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'; 
const GOOGLE_REDIRECT_URI = 'http://localhost:3000/api/calendar/callback'; // <-- URL de retorno

// Scopes (Permisos que solicitamos a Google)
const GOOGLE_SCOPES = [
    'https://www.googleapis.com/auth/calendar.events', // Crear y modificar eventos
    'https://www.googleapis.com/auth/userinfo.email'
];

module.exports = {
    GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET,
    GOOGLE_REDIRECT_URI,
    GOOGLE_SCOPES
};