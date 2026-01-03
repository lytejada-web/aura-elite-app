/**
 * assets/js/auth.js - VERSIÓN NUBE (CONECTADA A BACKEND)
 */

// CAMBIA ESTO CUANDO LO SUBAS A INTERNET (ej: https://mi-api-aura.herokuapp.com)
const API_URL = 'http://localhost:3000/api'; 

const AUTH_KEYS = {
    TOKEN: 'aura_elite_token',      
    USER: 'aura_elite_user' 
};

// 1. REGISTRO (Conecta con Server)
async function registerUser(nombre, email, password, profesion) {
    try {
        const res = await fetch(`${API_URL}/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: nombre, email, password, profession: profesion })
        });
        
        const data = await res.json();
        
        if (data.success) {
            alert("✅ Cuenta creada correctamente. Por favor, inicia sesión.");
            window.location.href = 'login.html';
        } else {
            alert("⚠️ Error: " + data.message);
        }
    } catch (error) {
        alert("❌ Error de conexión con el servidor.");
        console.error(error);
    }
}

// 2. LOGIN (Conecta con Server)
async function loginUser(email, password) {
    try {
        const res = await fetch(`${API_URL}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        const data = await res.json();

        if (data.success) {
            // GUARDAMOS EL TOKEN (LA LLAVE) Y LOS DATOS BÁSICOS
            localStorage.setItem(AUTH_KEYS.TOKEN, data.token);
            localStorage.setItem(AUTH_KEYS.USER, JSON.stringify(data.user));
            
            // Redirección inteligente
            if (data.user.plan_type === 'Premium') {
                window.location.href = 'dashboard.html';
            } else {
                // Si quieres obligar a pagar, descomenta esto:
                // window.location.href = 'suscripcion.html';
                window.location.href = 'dashboard.html'; // De momento dejamos pasar a los Free
            }
        } else {
            alert("❌ " + data.message);
        }
    } catch (error) {
        alert("❌ Error al conectar con el servidor.");
    }
}

// 3. LOGOUT
function logout() {
    localStorage.removeItem(AUTH_KEYS.TOKEN);
    localStorage.removeItem(AUTH_KEYS.USER);
    window.location.href = 'login.html';
}

// 4. VERIFICAR SESIÓN
function checkAuth() {
    const path = window.location.pathname;
    const isPublic = path.includes('login.html') || path.includes('registro.html') || path.endsWith('index.html') || path === '/';
    
    const token = localStorage.getItem(AUTH_KEYS.TOKEN);

    if (!isPublic && !token) {
        window.location.href = 'login.html';
    }
    
    // Si ya estoy logueado y voy al login, mándame al dashboard
    if (isPublic && token && (path.includes('login') || path.includes('registro'))) {
        window.location.href = 'dashboard.html';
    }
}

// Ejecutar verificación al cargar
document.addEventListener('DOMContentLoaded', checkAuth);

// Exportar globalmente para que otros scripts sepan quién es el usuario
const SESSION_USER = JSON.parse(localStorage.getItem(AUTH_KEYS.USER));
window.MOCK_USER = SESSION_USER ? { ...SESSION_USER, user_id: SESSION_USER.id } : null;