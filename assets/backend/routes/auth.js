// backend/routes/auth.js - GESTIÓN DE GOOGLE (SERVIDOR)

const express = require('express');
const router = express.Router();
const { google } = require('googleapis');
// Asegúrate de que la ruta a config sea correcta según tu estructura
const { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI, GOOGLE_SCOPES } = require('../config/google');

// 1. Crear el cliente OAuth 
const oauth2Client = new google.auth.OAuth2(
    GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET,
    GOOGLE_REDIRECT_URI
);

// GET /api/calendar/auth
router.get('/auth', (req, res) => {
    const authUrl = oauth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: GOOGLE_SCOPES,
        state: req.query.userId
    });
    res.redirect(authUrl);
});

// GET /api/calendar/callback
router.get('/callback', async (req, res) => {
    const { code, state: userId } = req.query;

    try {
        const { tokens } = await oauth2Client.getToken(code);
        console.log(`✅ Tokens obtenidos para el usuario ${userId}.`);
        
        // Aquí podrías guardar tokens en una BD real si quisieras
        
        res.send('<h1>✅ Sincronización Exitosa!</h1><p>Puedes cerrar esta ventana.</p>');

    } catch (error) {
        console.error('Error al obtener tokens:', error);
        res.status(500).send('<h1>❌ Error de Autenticación</h1>');
    }
});

module.exports = router;