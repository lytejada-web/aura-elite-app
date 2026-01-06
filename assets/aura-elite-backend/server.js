/**
 * server.js - EL CEREBRO DE AURA ELITE (VERSIÓN 2.0 - FULL DATA)
 * Actualizado para guardar RIF, Direcciones y Perfil de Negocio en la Nube.
 */
require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();

// --- CONFIGURACIÓN ---
app.use(cors());
app.use(express.json({ limit: '10mb' })); // Aumentamos el límite para permitir subir Logos (imágenes)

// --- CONEXIÓN A BASE DE DATOS ---
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/aura_elite_db';

mongoose.connect(MONGO_URI)
    .then(() => console.log('✅ Base de Datos Conectada'))
    .catch(err => console.error('❌ Error de conexión:', err));

// ==========================================
// 1. MODELOS DE DATOS (ACTUALIZADOS)
// ==========================================

const UserSchema = new mongoose.Schema({
    name: String,
    email: { type: String, unique: true, required: true },
    password: { type: String, required: true },
    profession: String,
    plan_type: { type: String, default: 'Free' },
    // --- NUEVO: PERFIL DE NEGOCIO ---
    businessProfile: {
        name: String,    // Razón Social
        rif: String,     // RIF Personal/Empresa
        address: String, // Dirección Fiscal
        phone: String,
        logo: String     // El Logo en Base64
    },
    created_at: { type: Date, default: Date.now }
});
const User = mongoose.model('User', UserSchema);

const PatientSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    nombre: String,
    telefono: String,
    // --- NUEVO: DATOS FISCALES CLIENTE ---
    rif: String,
    address: String,
    driveLink: String,
    created_at: { type: Date, default: Date.now }
});
const Patient = mongoose.model('Patient', PatientSchema);

const InvoiceSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    number: String,
    type: String, 
    patientId: String,
    date: String,
    items: Array, 
    amount: Number,
    status: String,
    created_at: { type: Date, default: Date.now }
});
const Invoice = mongoose.model('Invoice', InvoiceSchema);

const AppointmentSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    title: String,
    start: String,
    end: String,
    pacienteId: String,
    created_at: { type: Date, default: Date.now }
});
const Appointment = mongoose.model('Appointment', AppointmentSchema);

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

// ==========================================
// 2. MIDDLEWARE DE SEGURIDAD
// ==========================================
const verifyToken = (req, res, next) => {
    const token = req.headers['authorization'];
    if (!token) return res.status(403).json({ message: "No token provided" });
    
    jwt.verify(token, 'TU_SECRETO_SUPER_SEGURO', (err, decoded) => {
        if (err) return res.status(401).json({ message: "Unauthorized" });
        req.userId = decoded.id;
        next();
    });
};

// ==========================================
// 3. RUTAS DE LA API
// ==========================================

// --- AUTH ---
app.post('/api/register', async (req, res) => {
    try {
        const { name, email, password, profession } = req.body;
        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = new User({ name, email, password: hashedPassword, profession });
        await newUser.save();
        res.json({ success: true, message: "Usuario creado" });
    } catch (error) { res.status(500).json({ success: false, message: "Error registro" }); }
});

app.post('/api/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email });
        if (!user) return res.status(400).json({ success: false, message: "Usuario no encontrado" });
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).json({ success: false, message: "Contraseña incorrecta" });

        const token = jwt.sign({ id: user._id }, 'TU_SECRETO_SUPER_SEGURO', { expiresIn: '7d' });

        res.json({ 
            success: true, 
            token, 
            user: { 
                id: user._id, 
                name: user.name, 
                email: user.email, 
                profession: user.profession,
                plan_type: user.plan_type,
                // Enviamos también el perfil de negocio al hacer login
                businessProfile: user.businessProfile || {} 
            } 
        });
    } catch (error) { res.status(500).json({ error: error.message }); }
});

// --- USUARIO Y CONFIGURACIÓN (NUEVO) ---
// Obtener mis datos completos
app.get('/api/user/me', verifyToken, async (req, res) => {
    try {
        const user = await User.findById(req.userId).select('-password');
        res.json(user);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// Guardar mi perfil de negocio (Logo, RIF, etc.)
app.put('/api/user/me', verifyToken, async (req, res) => {
    try {
        // Actualizamos businessProfile con lo que venga
        const updates = {};
        if (req.body.businessProfile) updates.businessProfile = req.body.businessProfile;
        
        const user = await User.findByIdAndUpdate(req.userId, { $set: updates }, { new: true }).select('-password');
        res.json({ success: true, user });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// --- PACIENTES (Actualizado para guardar RIF/Address) ---
app.get('/api/patients', verifyToken, async (req, res) => {
    const data = await Patient.find({ userId: req.userId });
    res.json(data);
});
app.post('/api/patients', verifyToken, async (req, res) => {
    // req.body ya trae nombre, telefono, rif, address... Mongoose lo mapea solo.
    const newItem = new Patient({ ...req.body, userId: req.userId });
    await newItem.save();
    res.json(newItem);
});
app.put('/api/patients/:id', verifyToken, async (req, res) => {
    await Patient.findOneAndUpdate({ _id: req.params.id, userId: req.userId }, req.body);
    res.json({ success: true });
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
    await Invoice.findOneAndUpdate({ _id: req.params.id, userId: req.userId }, req.body);
    res.json({ success: true });
});

// --- CITAS & RECORDS (Igual que antes) ---
app.get('/api/appointments', verifyToken, async (req, res) => { const d = await Appointment.find({ userId: req.userId }); res.json(d); });
app.post('/api/appointments', verifyToken, async (req, res) => { const n = new Appointment({ ...req.body, userId: req.userId }); await n.save(); res.json(n); });
app.delete('/api/appointments/:id', verifyToken, async (req, res) => { await Appointment.findOneAndDelete({ _id: req.params.id, userId: req.userId }); res.json({ success: true }); });

app.get('/api/records', verifyToken, async (req, res) => { const d = await Record.find({ userId: req.userId }); res.json(d); });
app.post('/api/records', verifyToken, async (req, res) => { const n = new Record({ ...req.body, userId: req.userId }); await n.save(); res.json(n); });
app.delete('/api/records/:id', verifyToken, async (req, res) => { await Record.findOneAndDelete({ _id: req.params.id, userId: req.userId }); res.json({ success: true }); });

// --- INICIAR ---
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Servidor Aura Elite 2.0 (Full Data) corriendo en puerto ${PORT}`));