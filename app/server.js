'use strict';

require('dotenv').config();
const express = require('express');
const mysql2 = require('mysql2/promise');
const path = require('path');
const methodOverride = require('method-override');
const client = require('prom-client');
const winston = require('winston');

// ============================================================
// LOGGER SETUP (Structured JSON logging for Promtail)
// ============================================================
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: '/app/logs/app.log', maxsize: 10485760, maxFiles: 5 })
  ]
});

// ============================================================
// PROMETHEUS METRICS SETUP
// ============================================================
const register = new client.Registry();
client.collectDefaultMetrics({ register });

const httpRequestDuration = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5]
});

const httpRequestTotal = new client.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code']
});

const dbQueryDuration = new client.Histogram({
  name: 'db_query_duration_seconds',
  help: 'Duration of database queries in seconds',
  labelNames: ['operation', 'table'],
  buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1]
});

const activeConnections = new client.Gauge({
  name: 'http_active_connections',
  help: 'Number of active HTTP connections'
});

register.registerMetric(httpRequestDuration);
register.registerMetric(httpRequestTotal);
register.registerMetric(dbQueryDuration);
register.registerMetric(activeConnections);

// ============================================================
// DATABASE CONNECTION POOL
// ============================================================
let pool;

async function initDatabase() {
  const maxRetries = 10;
  let retries = 0;
  while (retries < maxRetries) {
    try {
      pool = mysql2.createPool({
        host: process.env.DB_HOST || 'mysql',
        port: parseInt(process.env.DB_PORT) || 3306,
        user: process.env.DB_USER || 'student_user',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'student_db',
        charset: 'utf8mb4',
        timezone: '+07:00',
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0,
        enableKeepAlive: true,
        // Đảm bảo mỗi kết nối đều dùng utf8mb4
        connectAttributes: { program_name: 'sms-webapp' }
      });
      const conn = await pool.getConnection();
      conn.release();
      logger.info({ message: 'Database connected successfully', level: 'info', service: 'database' });
      return;
    } catch (err) {
      retries++;
      logger.warn({ message: `Database connection failed, retry ${retries}/${maxRetries}`, error: err.message, level: 'warn' });
      await new Promise(r => setTimeout(r, 5000));
    }
  }
  logger.error({ message: 'Could not connect to database after max retries', level: 'error' });
  process.exit(1);
}

// Helper: timed DB query
async function timedQuery(operation, table, queryFn) {
  const end = dbQueryDuration.startTimer({ operation, table });
  try {
    const result = await queryFn();
    end();
    return result;
  } catch (err) {
    end();
    throw err;
  }
}

// ============================================================
// EXPRESS APP SETUP
// ============================================================
const app = express();
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(methodOverride('_method'));
app.use(express.static(path.join(__dirname, 'public')));

// ============================================================
// MIDDLEWARE: Metrics + Structured Logging
// ============================================================
app.use((req, res, next) => {
  const start = Date.now();
  activeConnections.inc();

  res.on('finish', () => {
    const duration = (Date.now() - start) / 1000;
    const route = req.route ? req.route.path : req.path;

    httpRequestDuration.observe({ method: req.method, route, status_code: res.statusCode }, duration);
    httpRequestTotal.inc({ method: req.method, route, status_code: res.statusCode });
    activeConnections.dec();

    logger.info({
      timestamp: new Date().toISOString(),
      level: 'info',
      message: `${req.method} ${req.originalUrl}`,
      http_status: res.statusCode,
      path: req.originalUrl,
      method: req.method,
      duration_ms: Date.now() - start,
      ip: req.ip || req.connection.remoteAddress,
      user_agent: req.get('User-Agent')
    });
  });

  next();
});

// ============================================================
// METRICS ENDPOINT
// ============================================================
app.get('/metrics', async (req, res) => {
  try {
    res.set('Content-Type', register.contentType);
    res.end(await register.metrics());
  } catch (err) {
    res.status(500).end(err.message);
  }
});

// ============================================================
// HEALTH CHECK
// ============================================================
app.get('/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'healthy', database: 'connected', timestamp: new Date().toISOString() });
  } catch (err) {
    res.status(503).json({ status: 'unhealthy', database: 'disconnected', error: err.message });
  }
});

// ============================================================
// HOME
// ============================================================
app.get('/', (req, res) => {
  res.render('index', { title: 'Hệ thống Quản lý Sinh viên' });
});

// ============================================================
// ROUTES: SINH VIÊN (Students)
// ============================================================
app.get('/sinh-vien', async (req, res) => {
  try {
    const search = req.query.search || '';
    let query = `SELECT sv.*, l.ten_lop FROM sinh_vien sv LEFT JOIN lop l ON sv.ma_lop = l.ma_lop`;
    let params = [];
    if (search) {
      query += ` WHERE sv.ho_ten LIKE ? OR sv.ma_sv LIKE ? OR sv.email LIKE ?`;
      params = [`%${search}%`, `%${search}%`, `%${search}%`];
    }
    query += ` ORDER BY sv.ma_sv`;
    const [rows] = await timedQuery('SELECT', 'sinh_vien', () => pool.query(query, params));
    const [lops] = await timedQuery('SELECT', 'lop', () => pool.query('SELECT * FROM lop ORDER BY ma_lop'));
    logger.info({ message: 'CRUD:LIST sinh_vien', count: rows.length, level: 'info' });
    res.render('sinh-vien/index', { title: 'Quản lý Sinh viên', students: rows, lops, search });
  } catch (err) {
    logger.error({ message: 'Error listing sinh_vien', error: err.message, level: 'error' });
    res.status(500).render('error', { message: err.message });
  }
});

app.get('/sinh-vien/create', async (req, res) => {
  const [lops] = await pool.query('SELECT * FROM lop ORDER BY ma_lop');
  res.render('sinh-vien/form', { title: 'Thêm Sinh viên', student: null, lops, action: '/sinh-vien', method: 'POST' });
});

app.post('/sinh-vien', async (req, res) => {
  const { ma_sv, ho_ten, ngay_sinh, gioi_tinh, email, sdt, dia_chi, ma_lop } = req.body;
  try {
    await timedQuery('INSERT', 'sinh_vien', () =>
      pool.query('INSERT INTO sinh_vien (ma_sv, ho_ten, ngay_sinh, gioi_tinh, email, sdt, dia_chi, ma_lop) VALUES (?,?,?,?,?,?,?,?)',
        [ma_sv, ho_ten, ngay_sinh, gioi_tinh, email, sdt, dia_chi, ma_lop || null])
    );
    logger.info({ message: 'CRUD:CREATE sinh_vien', ma_sv, ho_ten, level: 'info' });
    res.redirect('/sinh-vien');
  } catch (err) {
    logger.error({ message: 'CRUD:CREATE sinh_vien FAILED', error: err.message, level: 'error' });
    res.status(500).render('error', { message: err.message });
  }
});

app.get('/sinh-vien/:id/edit', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM sinh_vien WHERE ma_sv = ?', [req.params.id]);
    const [lops] = await pool.query('SELECT * FROM lop ORDER BY ma_lop');
    if (!rows.length) return res.status(404).render('error', { message: 'Không tìm thấy sinh viên' });
    res.render('sinh-vien/form', { title: 'Sửa Sinh viên', student: rows[0], lops, action: `/sinh-vien/${req.params.id}?_method=PUT`, method: 'POST' });
  } catch (err) {
    res.status(500).render('error', { message: err.message });
  }
});

app.put('/sinh-vien/:id', async (req, res) => {
  const { ho_ten, ngay_sinh, gioi_tinh, email, sdt, dia_chi, ma_lop } = req.body;
  try {
    await timedQuery('UPDATE', 'sinh_vien', () =>
      pool.query('UPDATE sinh_vien SET ho_ten=?, ngay_sinh=?, gioi_tinh=?, email=?, sdt=?, dia_chi=?, ma_lop=? WHERE ma_sv=?',
        [ho_ten, ngay_sinh, gioi_tinh, email, sdt, dia_chi, ma_lop || null, req.params.id])
    );
    logger.info({ message: 'CRUD:UPDATE sinh_vien', ma_sv: req.params.id, level: 'info' });
    res.redirect('/sinh-vien');
  } catch (err) {
    logger.error({ message: 'CRUD:UPDATE sinh_vien FAILED', error: err.message, level: 'error' });
    res.status(500).render('error', { message: err.message });
  }
});

app.delete('/sinh-vien/:id', async (req, res) => {
  try {
    await timedQuery('DELETE', 'sinh_vien', () =>
      pool.query('DELETE FROM sinh_vien WHERE ma_sv = ?', [req.params.id])
    );
    logger.info({ message: 'CRUD:DELETE sinh_vien', ma_sv: req.params.id, level: 'info' });
    res.redirect('/sinh-vien');
  } catch (err) {
    logger.error({ message: 'CRUD:DELETE sinh_vien FAILED', error: err.message, level: 'error' });
    res.status(500).render('error', { message: err.message });
  }
});

// ============================================================
// ROUTES: LỚP HỌC (Classes)
// ============================================================
app.get('/lop', async (req, res) => {
  try {
    const [rows] = await timedQuery('SELECT', 'lop', () =>
      pool.query(`SELECT l.*, COUNT(sv.ma_sv) as so_sv FROM lop l LEFT JOIN sinh_vien sv ON l.ma_lop = sv.ma_lop GROUP BY l.ma_lop ORDER BY l.ma_lop`)
    );
    logger.info({ message: 'CRUD:LIST lop', count: rows.length, level: 'info' });
    res.render('lop/index', { title: 'Quản lý Lớp học', classes: rows });
  } catch (err) {
    logger.error({ message: 'Error listing lop', error: err.message, level: 'error' });
    res.status(500).render('error', { message: err.message });
  }
});

app.get('/lop/create', (req, res) => {
  res.render('lop/form', { title: 'Thêm Lớp học', cls: null, action: '/lop', method: 'POST' });
});

app.post('/lop', async (req, res) => {
  const { ma_lop, ten_lop, khoa, he_dao_tao, nien_khoa, giao_vien_chu_nhiem } = req.body;
  try {
    await timedQuery('INSERT', 'lop', () =>
      pool.query('INSERT INTO lop (ma_lop, ten_lop, khoa, he_dao_tao, nien_khoa, giao_vien_chu_nhiem) VALUES (?,?,?,?,?,?)',
        [ma_lop, ten_lop, khoa, he_dao_tao, nien_khoa, giao_vien_chu_nhiem])
    );
    logger.info({ message: 'CRUD:CREATE lop', ma_lop, ten_lop, level: 'info' });
    res.redirect('/lop');
  } catch (err) {
    logger.error({ message: 'CRUD:CREATE lop FAILED', error: err.message, level: 'error' });
    res.status(500).render('error', { message: err.message });
  }
});

app.get('/lop/:id/edit', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM lop WHERE ma_lop = ?', [req.params.id]);
    if (!rows.length) return res.status(404).render('error', { message: 'Không tìm thấy lớp' });
    res.render('lop/form', { title: 'Sửa Lớp học', cls: rows[0], action: `/lop/${req.params.id}?_method=PUT`, method: 'POST' });
  } catch (err) {
    res.status(500).render('error', { message: err.message });
  }
});

app.put('/lop/:id', async (req, res) => {
  const { ten_lop, khoa, he_dao_tao, nien_khoa, giao_vien_chu_nhiem } = req.body;
  try {
    await timedQuery('UPDATE', 'lop', () =>
      pool.query('UPDATE lop SET ten_lop=?, khoa=?, he_dao_tao=?, nien_khoa=?, giao_vien_chu_nhiem=? WHERE ma_lop=?',
        [ten_lop, khoa, he_dao_tao, nien_khoa, giao_vien_chu_nhiem, req.params.id])
    );
    logger.info({ message: 'CRUD:UPDATE lop', ma_lop: req.params.id, level: 'info' });
    res.redirect('/lop');
  } catch (err) {
    logger.error({ message: 'CRUD:UPDATE lop FAILED', error: err.message, level: 'error' });
    res.status(500).render('error', { message: err.message });
  }
});

app.delete('/lop/:id', async (req, res) => {
  try {
    await timedQuery('DELETE', 'lop', () =>
      pool.query('DELETE FROM lop WHERE ma_lop = ?', [req.params.id])
    );
    logger.info({ message: 'CRUD:DELETE lop', ma_lop: req.params.id, level: 'info' });
    res.redirect('/lop');
  } catch (err) {
    logger.error({ message: 'CRUD:DELETE lop FAILED', error: err.message, level: 'error' });
    res.status(500).render('error', { message: err.message });
  }
});

// ============================================================
// ROUTES: ĐIỂM SỐ (Grades)
// ============================================================
app.get('/diem', async (req, res) => {
  try {
    const [rows] = await timedQuery('SELECT', 'diem', () =>
      pool.query(`SELECT d.*, sv.ho_ten, sv.ma_lop, l.ten_lop FROM diem d
        JOIN sinh_vien sv ON d.ma_sv = sv.ma_sv
        LEFT JOIN lop l ON sv.ma_lop = l.ma_lop
        ORDER BY sv.ma_sv, d.mon_hoc`)
    );
    const [students] = await pool.query('SELECT ma_sv, ho_ten FROM sinh_vien ORDER BY ma_sv');
    logger.info({ message: 'CRUD:LIST diem', count: rows.length, level: 'info' });
    res.render('diem/index', { title: 'Quản lý Điểm số', grades: rows, students });
  } catch (err) {
    logger.error({ message: 'Error listing diem', error: err.message, level: 'error' });
    res.status(500).render('error', { message: err.message });
  }
});

app.get('/diem/create', async (req, res) => {
  const [students] = await pool.query('SELECT ma_sv, ho_ten FROM sinh_vien ORDER BY ma_sv');
  res.render('diem/form', { title: 'Thêm Điểm số', grade: null, students, action: '/diem', method: 'POST' });
});

app.post('/diem', async (req, res) => {
  const { ma_sv, mon_hoc, diem_giua_ky, diem_cuoi_ky, diem_thi_lai, hoc_ky, nam_hoc } = req.body;
  const diem_tk = ((parseFloat(diem_giua_ky) * 0.4) + (parseFloat(diem_cuoi_ky) * 0.6)).toFixed(2);
  try {
    await timedQuery('INSERT', 'diem', () =>
      pool.query('INSERT INTO diem (ma_sv, mon_hoc, diem_giua_ky, diem_cuoi_ky, diem_thi_lai, diem_tong_ket, hoc_ky, nam_hoc) VALUES (?,?,?,?,?,?,?,?)',
        [ma_sv, mon_hoc, diem_giua_ky, diem_cuoi_ky, diem_thi_lai || null, diem_tk, hoc_ky, nam_hoc])
    );
    logger.info({ message: 'CRUD:CREATE diem', ma_sv, mon_hoc, level: 'info' });
    res.redirect('/diem');
  } catch (err) {
    logger.error({ message: 'CRUD:CREATE diem FAILED', error: err.message, level: 'error' });
    res.status(500).render('error', { message: err.message });
  }
});

app.get('/diem/:id/edit', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM diem WHERE id = ?', [req.params.id]);
    const [students] = await pool.query('SELECT ma_sv, ho_ten FROM sinh_vien ORDER BY ma_sv');
    if (!rows.length) return res.status(404).render('error', { message: 'Không tìm thấy điểm' });
    res.render('diem/form', { title: 'Sửa Điểm số', grade: rows[0], students, action: `/diem/${req.params.id}?_method=PUT`, method: 'POST' });
  } catch (err) {
    res.status(500).render('error', { message: err.message });
  }
});

app.put('/diem/:id', async (req, res) => {
  const { ma_sv, mon_hoc, diem_giua_ky, diem_cuoi_ky, diem_thi_lai, hoc_ky, nam_hoc } = req.body;
  const diem_tk = ((parseFloat(diem_giua_ky) * 0.4) + (parseFloat(diem_cuoi_ky) * 0.6)).toFixed(2);
  try {
    await timedQuery('UPDATE', 'diem', () =>
      pool.query('UPDATE diem SET ma_sv=?, mon_hoc=?, diem_giua_ky=?, diem_cuoi_ky=?, diem_thi_lai=?, diem_tong_ket=?, hoc_ky=?, nam_hoc=? WHERE id=?',
        [ma_sv, mon_hoc, diem_giua_ky, diem_cuoi_ky, diem_thi_lai || null, diem_tk, hoc_ky, nam_hoc, req.params.id])
    );
    logger.info({ message: 'CRUD:UPDATE diem', id: req.params.id, level: 'info' });
    res.redirect('/diem');
  } catch (err) {
    logger.error({ message: 'CRUD:UPDATE diem FAILED', error: err.message, level: 'error' });
    res.status(500).render('error', { message: err.message });
  }
});

app.delete('/diem/:id', async (req, res) => {
  try {
    await timedQuery('DELETE', 'diem', () =>
      pool.query('DELETE FROM diem WHERE id = ?', [req.params.id])
    );
    logger.info({ message: 'CRUD:DELETE diem', id: req.params.id, level: 'info' });
    res.redirect('/diem');
  } catch (err) {
    logger.error({ message: 'CRUD:DELETE diem FAILED', error: err.message, level: 'error' });
    res.status(500).render('error', { message: err.message });
  }
});

// ============================================================
// ERROR HANDLER
// ============================================================
app.use((req, res) => {
  logger.warn({ message: `404 Not Found: ${req.originalUrl}`, http_status: 404, path: req.originalUrl, level: 'warn' });
  res.status(404).render('error', { message: `Trang không tồn tại: ${req.originalUrl}` });
});

app.use((err, req, res, next) => {
  logger.error({ message: 'Unhandled error', error: err.message, stack: err.stack, http_status: 500, level: 'error' });
  res.status(500).render('error', { message: 'Lỗi server nội bộ' });
});

// ============================================================
// START SERVER
// ============================================================
const PORT = process.env.APP_PORT || 3000;

initDatabase().then(() => {
  app.listen(PORT, '0.0.0.0', () => {
    logger.info({ message: `Server started on port ${PORT}`, level: 'info', service: 'app', env: process.env.NODE_ENV });
  });
});
