/**
 * server.js - EL CEREBRO DE AURA ELITE
 */
require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();

// --- CONFIGURACIÓN ---
app.use(cors()); // Permite conexiones desde cualquier lugar
app.use(express.json()); // Permite recibir datos JSON

// --- CONEXIÓN A BASE DE DATOS (MONGODB) ---
// Nota: Cambiaremos esto por tu URL real de MongoDB Atlas en el siguiente paso
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/aura_elite_db';

mongoose.connect(MONGO_URI)
    .then(() => console.log('✅ Base de Datos Conectada'))
    .catch(err => console.error('❌ Error de conexión:', err));

// --- MODELOS DE DATOS (ESQUEMAS) ---
const UserSchema = new mongoose.Schema({
    name: String,
    email: { type: String, unique: true, required: true },
    password: { type: String, required: true },
    profession: String,
    plan_type: { type: String, default: 'Free' }, // Aquí es donde cambias a Premium
    created_at: { type: Date, default: Date.now }
});
const User = mongoose.model('User', UserSchema);
// --- MODELOS DE DATOS (AÑADIR A server.js) ---

// 1. ESQUEMA DE PACIENTES
const PatientSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, // VINCULA AL DUEÑO
    nombre: String,
    telefono: String,
    driveLink: String,
    created_at: { type: Date, default: Date.now }
});
const Patient = mongoose.model('Patient', PatientSchema);

// 2. ESQUEMA DE FACTURAS / PRESUPUESTOS
const InvoiceSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    number: String,
    type: String, // 'Factura' o 'Presupuesto'
    patientId: String, // Guardamos el ID del paciente
    date: String,
    items: Array, // Lista de servicios [{desc, price}, {desc, price}]
    amount: Number,
    status: String, // 'Pendiente', 'Pagado'
    hasLogo: Boolean,
    logoData: String, // Base64 de la imagen (Opcional: en producción real se usaría S3 o Cloudinary, pero para empezar vale)
    created_at: { type: Date, default: Date.now }
});
const Invoice = mongoose.model('Invoice', InvoiceSchema);

// 3. ESQUEMA DE CITAS (CALENDARIO)
const AppointmentSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    title: String,
    start: String, // Fecha ISO
    end: String,
    pacienteId: String,
    created_at: { type: Date, default: Date.now }
});
const Appointment = mongoose.model('Appointment', AppointmentSchema);

// 4. ESQUEMA DE HISTORIAL (RECORDS)
const RecordSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    patientId: String,
    date: String,
    title: String,
    type: String,
    fileName: String,
    created_at: { type: Date, default: Date.now }
});
const Record = mongoose.model('Record', RecordSchema);
// --- RUTAS DE LA API (AÑADIR DESPUÉS DEL LOGIN) ---

// MIDDLEWARE: Una función portero que verifica si tienes Token
const verifyToken = (req, res, next) => {
    const token = req.headers['authorization'];
    if (!token) return res.status(403).json({ message: "No token provided" });
    
    jwt.verify(token, 'TU_SECRETO_SUPER_SEGURO', (err, decoded) => {
        if (err) return res.status(401).json({ message: "Unauthorized" });
        req.userId = decoded.id; // Guardamos el ID del usuario para saber quién es
        next();
    });
};

// RUTAS CRUD (CREATE, READ, DELETE) - PROTEGIDAS

// --- PACIENTES ---
app.get('/api/patients', verifyToken, async (req, res) => {
    // Solo devuelve LOS MÍOS (req.userId)
    const data = await Patient.find({ userId: req.userId });
    res.json(data);
});
app.post('/api/patients', verifyToken, async (req, res) => {
    const newItem = new Patient({ ...req.body, userId: req.userId });
    await newItem.save();
    res.json(newItem);
});
app.delete('/api/patients/:id', verifyToken, async (req, res) => {
    await Patient.findOneAndDelete({ _id: req.params.id, userId: req.userId });
    res.json({ success: true });
});

// --- FACTURAS ---
app.get('/api/invoices', verifyToken, async (req, res) => {
    const data = await Invoice.find({ userId: req.userId });
    res.json(data);
});
app.post('/api/invoices', verifyToken, async (req, res) => {
    const newItem = new Invoice({ ...req.body, userId: req.userId });
    await newItem.save();
    res.json(newItem);
});
app.put('/api/invoices/:id', verifyToken, async (req, res) => {
    // Para actualizar estado (Pagado/Pendiente)
    await Invoice.findOneAndUpdate({ _id: req.params.id, userId: req.userId }, req.body);
    res.json({ success: true });
});

// --- CITAS ---
app.get('/api/appointments', verifyToken, async (req, res) => {
    const data = await Appointment.find({ userId: req.userId });
    res.json(data);
});
app.post('/api/appointments', verifyToken, async (req, res) => {
    const newItem = new Appointment({ ...req.body, userId: req.userId });
    await newItem.save();
    res.json(newItem);
});
app.delete('/api/appointments/:id', verifyToken, async (req, res) => {
    await Appointment.findOneAndDelete({ _id: req.params.id, userId: req.userId });
    res.json({ success: true });
});
// Aquí añadiremos los modelos de Facturas y Pacientes más adelante...

// --- RUTAS DE LA API ---

// 1. REGISTRO
app.post('/api/register', async (req, res) => {
    try {
        const { name, email, password, profession } = req.body;
        
        // Encriptar contraseña
        const hashedPassword = await bcrypt.hash(password, 10);
        
        const newUser = new User({ 
            name, 
            email, 
            password: hashedPassword, 
            profession 
        });
        
        await newUser.save();
        res.json({ success: true, message: "Usuario creado" });
    } catch (error) {
        res.status(500).json({ success: false, message: "Error al registrar o el email ya existe." });
    }
});

// 2. LOGIN
app.post('/api/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email });
        
        if (!user) return res.status(400).json({ success: false, message: "Usuario no encontrado" });

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).json({ success: false, message: "Contraseña incorrecta" });

        // Crear Token de Sesión (Tu "pase VIP" para entrar)
        const token = jwt.sign({ id: user._id }, 'TU_SECRETO_SUPER_SEGURO', { expiresIn: '7d' });

        res.json({ 
            success: true, 
            token, 
            user: { 
                id: user._id, 
                name: user.name, 
                email: user.email, 
                profession: user.profession,
                plan_type: user.plan_type // Importante para saber si es Premium
            } 
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 3. RUTA SECRETA DE ADMIN: DAR PREMIUM A UN AMIGO
// Se usa así: POST /api/admin/grant-premium { "email": "amigo@gmail.com" }
app.post('/api/admin/grant-premium', async (req, res) => {
    const { email, secretKey } = req.body;
    
    // Una clave simple para que nadie más pueda hacerlo
    if(secretKey !== "CLAVE_MAESTRA_DEL_JEFE") {
        return res.status(403).json({ message: "No eres el jefe." });
    }

    try {
        const user = await User.findOneAndUpdate({ email }, { plan_type: 'Premium' }, { new: true });
        if(!user) return res.status(404).json({ message: "Usuario no encontrado" });
        
        res.json({ success: true, message: `👑 ¡Hecho! ${user.name} ahora es Premium.` });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// --- RUTAS NUEVAS NECESARIAS ---

// EDITAR PACIENTE (Para cambiar teléfono o poner Link de Drive)
app.put('/api/patients/:id', verifyToken, async (req, res) => {
    try {
        await Patient.findOneAndUpdate({ _id: req.params.id, userId: req.userId }, req.body);
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// HISTORIAL CLÍNICO (RECORDS)
app.get('/api/records', verifyToken, async (req, res) => {
    const data = await Record.find({ userId: req.userId });
    res.json(data);
});
app.post('/api/records', verifyToken, async (req, res) => {
    const newItem = new Record({ ...req.body, userId: req.userId });
    await newItem.save();
    res.json(newItem);
});
app.delete('/api/records/:id', verifyToken, async (req, res) => {
    await Record.findOneAndDelete({ _id: req.params.id, userId: req.userId });
    res.json({ success: true });
});

// --- INICIAR SERVIDOR ---
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Servidor Aura Elite corriendo en puerto ${PORT}`));