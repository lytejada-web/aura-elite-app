/**
 * assets/js/auth.js - VERSIÓN FINAL CORREGIDA (Conexión Render + Freno de Formularios)
 */

// 1. CONFIGURACIÓN: CONEXIÓN CON LA NUBE (RENDER)
const API_URL = 'https://aura-elite-app.onrender.com/api'; 

const AUTH_KEYS = {
    TOKEN: 'aura_elite_token',      
    USER: 'aura_elite_user' 
};

// ==========================================
// FUNCIONES DE CONEXIÓN (HABLAN CON EL SERVIDOR)
// ==========================================

// A. REGISTRAR USUARIO
async function registerUser(nombre, email, password, profesion) {
    const btn = document.querySelector('button[type="submit"]');
    if(btn) { btn.disabled = true; btn.innerText = "Registrando..."; }

    try {
        console.log("Enviando datos a Render:", { nombre, email, profesion }); // Para depurar

        const res = await fetch(`${API_URL}/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: nombre, email, password, profession: profesion })
        });
        
        const data = await res.json();
        
        if (data.success) {
            alert("✅ ¡Cuenta creada con éxito! Ahora inicia sesión.");
            window.location.href = 'login.html';
        } else {
            alert("⚠️ Error: " + (data.message || "No se pudo registrar"));
            if(btn) { btn.disabled = false; btn.innerText = "Crear Cuenta"; }
        }
    } catch (error) {
        console.error(error);
        alert("❌ Error de conexión con el servidor (Render).");
        if(btn) { btn.disabled = false; btn.innerText = "Crear Cuenta"; }
    }
}

// B. INICIAR SESIÓN (LOGIN)
async function loginUser(email, password) {
    const btn = document.querySelector('button[type="submit"]');
    if(btn) { btn.disabled = true; btn.innerText = "Entrando..."; }

    try {
        const res = await fetch(`${API_URL}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        const data = await res.json();

        if (data.success) {
            // GUARDAR LLAVES DE ACCESO
            localStorage.setItem(AUTH_KEYS.TOKEN, data.token);
            localStorage.setItem(AUTH_KEYS.USER, JSON.stringify(data.user));
            
            // REDIRIGIR AL DASHBOARD
            window.location.href = 'dashboard.html';
        } else {
            alert("❌ " + (data.message || "Email o contraseña incorrectos"));
            if(btn) { btn.disabled = false; btn.innerText = "Iniciar Sesión"; }
        }
    } catch (error) {
        console.error(error);
        alert("❌ Error al conectar con el servidor.");
        if(btn) { btn.disabled = false; btn.innerText = "Iniciar Sesión"; }
    }
}

// C. CERRAR SESIÓN
function logout() {
    localStorage.removeItem(AUTH_KEYS.TOKEN);
    localStorage.removeItem(AUTH_KEYS.USER);
    window.location.href = 'login.html';
}

// D. VERIFICAR SEGURIDAD (CANDADO)
function checkAuth() {
    const path = window.location.pathname;
    // Páginas públicas que no requieren llave
    const isPublic = path.includes('login') || path.includes('registro') || path.endsWith('index.html') || path === '/' || path.includes('recuperar');
    
    const token = localStorage.getItem(AUTH_KEYS.TOKEN);

    // Si estoy en zona privada sin llave -> FUERA
    if (!isPublic && !token) {
        window.location.href = 'login.html';
    }
    
    // Si ya tengo llave y voy al login -> AL DASHBOARD
    if (isPublic && token && (path.includes('login') || path.includes('registro'))) {
        window.location.href = 'dashboard.html';
    }
}

// ==========================================
// INICIALIZACIÓN Y DETECCIÓN DE FORMULARIOS
// ==========================================

document.addEventListener('DOMContentLoaded', () => {
    // 1. Ejecutar seguridad al cargar
    checkAuth();

    // 2. DETECTAR SI ESTAMOS EN REGISTRO
    // Buscamos si hay un formulario en la página y si la URL dice 'registro'
    const registerForm = document.querySelector('form');
    const isRegisterPage = window.location.href.includes('registro') || document.getElementById('nombre');

    if (registerForm && isRegisterPage) {
        console.log("✅ Formulario de Registro detectado");
        
        registerForm.onsubmit = function(e) {
            // 🛑 ¡EL FRENO DE MANO! (Evita que la página se recargue)
            e.preventDefault(); 
            
            // Buscamos las casillas por ID (asegúrate que en tu HTML sean estos)
            const nombreInput = document.getElementById('nombre') || document.getElementById('name');
            const emailInput = document.getElementById('email');
            const passInput = document.getElementById('password');
            const profInput = document.getElementById('profesion') || document.getElementById('profession');

            if (nombreInput && emailInput && passInput) {
                const profVal = profInput ? profInput.value : 'otro';
                registerUser(nombreInput.value, emailInput.value, passInput.value, profVal);
            } else {
                alert("⚠️ Error: No encuentro las casillas (IDs) en el HTML.");
                console.error("Faltan IDs: Revisa si tienes id='nombre', id='email', id='password'");
            }
        };
    }

    // 3. DETECTAR SI ESTAMOS EN LOGIN
    const isLoginPage = window.location.href.includes('login');
    
    if (registerForm && isLoginPage) { // Reutilizamos la variable registerForm porque es querySelector('form')
        console.log("✅ Formulario de Login detectado");

        registerForm.onsubmit = function(e) {
            e.preventDefault(); // 🛑 FRENO DE MANO

            const emailInput = document.getElementById('email');
            const passInput = document.getElementById('password');

            if (emailInput && passInput) {
                loginUser(emailInput.value, passInput.value);
            } else {
                alert("⚠️ Error: No encuentro las casillas id='email' o id='password'");
            }
        };
    }
    
    // 4. BOTÓN CERRAR SESIÓN (Si existe)
    const btnLogout = document.getElementById('btn-logout');
    if(btnLogout) {
        btnLogout.onclick = (e) => { e.preventDefault(); logout(); };
    }
});