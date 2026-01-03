const express = require('express'); 
const cors = require('cors');
const bodyParser = require('body-parser');

// 1. IMPORTAR LAS RUTAS
const appointmentsRouter = require('./routes/appointments');
const authRouter = require('./routes/auth');

// 2. CREAR LA APLICACIÓN (Esto debe ir ANTES de cualquier app.use)
const app = express();

// 3. MIDDLEWARES
app.use(cors());
app.use(bodyParser.json());

// 4. CONECTAR LAS RUTAS (Ahora sí podemos usar 'app')
app.use('/api/appointments', appointmentsRouter);
app.use('/api/calendar', authRouter); 

// 5. INICIAR EL SERVIDOR
const PORT = 3000;
app.listen(PORT, () => {
    console.log(`🚀 Servidor Express escuchando en http://localhost:${PORT}`);
});