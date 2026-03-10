const express = require('express');
const session = require('express-session');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const multer = require('multer');

// Multer config: save uploads to public/uploads/
const uploadsDir = path.join(__dirname, 'public', 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, uuidv4() + ext);
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Solo se permiten imágenes'));
  }
});

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({
  secret: 'proventasmagic-secret-2024',
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false }
}));

// In-memory data store
let db = {
  productos: [
    { id: uuidv4(), nombre: 'Laptop Pro 15"', precio: 1299.99, stock: 25, categoria: 'Electrónica' },
    { id: uuidv4(), nombre: 'Mouse Inalámbrico', precio: 29.99, stock: 100, categoria: 'Accesorios' },
    { id: uuidv4(), nombre: 'Teclado Mecánico', precio: 89.99, stock: 50, categoria: 'Accesorios' },
    { id: uuidv4(), nombre: 'Monitor 27"', precio: 399.99, stock: 15, categoria: 'Electrónica' },
    { id: uuidv4(), nombre: 'Auriculares BT', precio: 149.99, stock: 40, categoria: 'Audio' },
  ],
  clientes: [
    { id: uuidv4(), nombre: 'María García', email: 'maria@email.com', telefono: '+56 9 1234 5678', totalCompras: 2450.00 },
    { id: uuidv4(), nombre: 'Carlos López', email: 'carlos@email.com', telefono: '+56 9 8765 4321', totalCompras: 890.50 },
    { id: uuidv4(), nombre: 'Ana Martínez', email: 'ana@email.com', telefono: '+56 9 5555 1234', totalCompras: 3200.00 },
  ],
  pedidos: [],
  servicios: [
    { id: uuidv4(), nombre: 'Instalación y Configuración', precio: 59.99, descripcion: 'Configuración completa de equipos' },
    { id: uuidv4(), nombre: 'Soporte Técnico', precio: 39.99, descripcion: 'Soporte técnico por hora' },
    { id: uuidv4(), nombre: 'Capacitación', precio: 99.99, descripcion: 'Capacitación en uso de software' },
  ],
  ingresos: [],
  gastos: []
};

// ==================== API ROUTES ====================

// Dashboard stats
app.get('/api/stats', (req, res) => {
  const totalIngresos = db.ingresos.reduce((sum, i) => sum + i.monto, 0);
  const totalGastos = db.gastos.reduce((sum, g) => sum + g.monto, 0);
  res.json({
    totalPedidos: db.pedidos.length,
    totalClientes: db.clientes.length,
    totalProductos: db.productos.length,
    totalIngresos,
    totalGastos,
    ganancia: totalIngresos - totalGastos,
    pedidosRecientes: db.pedidos.slice(-5).reverse()
  });
});

// Upload imagen
app.post('/api/upload', upload.single('imagen'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No se recibió imagen' });
  res.json({ url: '/uploads/' + req.file.filename });
});

// Productos
app.get('/api/productos', (req, res) => res.json(db.productos));
app.post('/api/productos', (req, res) => {
  const producto = { id: uuidv4(), ...req.body };
  db.productos.push(producto);
  res.json(producto);
});
app.put('/api/productos/:id', (req, res) => {
  const idx = db.productos.findIndex(p => p.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'No encontrado' });
  db.productos[idx] = { ...db.productos[idx], ...req.body };
  res.json(db.productos[idx]);
});
app.delete('/api/productos/all', (req, res) => {
  db.productos = [];
  res.json({ success: true });
});
app.delete('/api/productos/:id', (req, res) => {
  db.productos = db.productos.filter(p => p.id !== req.params.id);
  res.json({ success: true });
});

// Clientes
app.get('/api/clientes', (req, res) => res.json(db.clientes));
app.post('/api/clientes', (req, res) => {
  const cliente = { id: uuidv4(), totalCompras: 0, ...req.body };
  db.clientes.push(cliente);
  res.json(cliente);
});
app.put('/api/clientes/:id', (req, res) => {
  const idx = db.clientes.findIndex(c => c.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'No encontrado' });
  db.clientes[idx] = { ...db.clientes[idx], ...req.body };
  res.json(db.clientes[idx]);
});
app.delete('/api/clientes/all', (req, res) => {
  db.clientes = [];
  res.json({ success: true });
});
app.delete('/api/clientes/:id', (req, res) => {
  db.clientes = db.clientes.filter(c => c.id !== req.params.id);
  res.json({ success: true });
});

// Pedidos
app.get('/api/pedidos', (req, res) => res.json(db.pedidos));
app.post('/api/pedidos', (req, res) => {
  const pedido = {
    id: uuidv4(),
    numero: `PED-${String(db.pedidos.length + 1).padStart(4, '0')}`,
    fecha: new Date().toISOString().split('T')[0],
    estado: 'Pendiente',
    ...req.body
  };
  db.pedidos.push(pedido);
  // Agregar ingreso automáticamente
  db.ingresos.push({
    id: uuidv4(),
    descripcion: `Pedido ${pedido.numero}`,
    monto: pedido.total || 0,
    fecha: pedido.fecha,
    categoria: 'Ventas'
  });
  res.json(pedido);
});
app.put('/api/pedidos/:id', (req, res) => {
  const idx = db.pedidos.findIndex(p => p.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'No encontrado' });
  db.pedidos[idx] = { ...db.pedidos[idx], ...req.body };
  res.json(db.pedidos[idx]);
});
app.delete('/api/pedidos/all', (req, res) => {
  db.pedidos = [];
  res.json({ success: true });
});
app.delete('/api/pedidos/:id', (req, res) => {
  db.pedidos = db.pedidos.filter(p => p.id !== req.params.id);
  res.json({ success: true });
});

// Servicios
app.get('/api/servicios', (req, res) => res.json(db.servicios));
app.post('/api/servicios', (req, res) => {
  const servicio = { id: uuidv4(), ...req.body };
  db.servicios.push(servicio);
  res.json(servicio);
});
app.delete('/api/servicios/:id', (req, res) => {
  db.servicios = db.servicios.filter(s => s.id !== req.params.id);
  res.json({ success: true });
});

// Ingresos
app.get('/api/ingresos', (req, res) => res.json(db.ingresos));
app.post('/api/ingresos', (req, res) => {
  const ingreso = { id: uuidv4(), fecha: new Date().toISOString().split('T')[0], ...req.body };
  db.ingresos.push(ingreso);
  res.json(ingreso);
});
app.delete('/api/ingresos/:id', (req, res) => {
  db.ingresos = db.ingresos.filter(i => i.id !== req.params.id);
  res.json({ success: true });
});

// Gastos
app.get('/api/gastos', (req, res) => res.json(db.gastos));
app.post('/api/gastos', (req, res) => {
  const gasto = { id: uuidv4(), fecha: new Date().toISOString().split('T')[0], ...req.body };
  db.gastos.push(gasto);
  res.json(gasto);
});
app.delete('/api/gastos/:id', (req, res) => {
  db.gastos = db.gastos.filter(g => g.id !== req.params.id);
  res.json({ success: true });
});

// Serve frontend
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`\n🚀 Pro Ventas Magic corriendo en http://localhost:${PORT}\n`);
});
