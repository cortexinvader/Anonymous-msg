const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const cron = require('node-cron');
const TelegramBot = require('node-telegram-bot-api');
const multer = require('multer');
const { Expo } = require('expo-server-sdk');
const fs = require('fs');
const path = require('path');

const app = express();
const expo = new Expo();
const JWT_SECRET = process.env.JWT_SECRET || "change-me-in-production-2025";

const PORT = process.env.PORT || 3000;
const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN || "";
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID || "";

// Smart DB path
const DB_DIR = path.join(__dirname, '../db');
const DB_PATH = path.join(DB_DIR, 'database.sqlite');
if (!fs.existsSync(DB_DIR)) fs.mkdirSync(DB_DIR, { recursive: true });

const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) console.error("DB Error:", err);
  else console.log("Connected to DB ->", DB_PATH);
});

db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS users ( id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT UNIQUE NOT NULL, password TEXT NOT NULL, theme_id INTEGER DEFAULT 0, avatar_id INTEGER DEFAULT 0, push_token TEXT )`);
  db.run(`CREATE TABLE IF NOT EXISTS messages ( id INTEGER PRIMARY KEY AUTOINCREMENT, recipient_id INTEGER NOT NULL, type TEXT DEFAULT 'text', content TEXT NOT NULL, game_mode TEXT DEFAULT 'none', burn_after INTEGER DEFAULT 0, created_at DATETIME DEFAULT CURRENT_TIMESTAMP )`);
});

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Rate limiting
const sendLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 12,
  message: { error: "Too many messages, slow down!" },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/send', sendLimiter);

// Audio upload config
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) => cb(null, Date.now() + '.mp3')
});
const upload = multer({
  storage,
  limits: { fileSize: 15 * 1024 * 1024 },
  fileFilter: (req, file, cb) => file.mimetype.startsWith('audio/') || file.mimetype === 'application/octet-stream' ? cb(null, true) : cb(new Error('Audio only'))
});

// Auth Middleware
const auth = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: "No token" });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch { res.status(401).json({ error: "Invalid token" }); }
};

const sendPush = async (token, body) => {
  if (!Expo.isExpoPushToken(token)) return;
  try {
    await expo.sendPushNotificationsAsync([{
      to: token, sound: 'default', title: 'New Txtme!', body
    }]);
  } catch (e) { console.error(e); }
};

// Routes
app.post('/register', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: "Missing fields" });
  db.get(`SELECT 1 FROM users WHERE username=?`, [username], async (err, row) => {
    if (row) return res.status(400).json({ error: "Username taken" });
    const hash = await bcrypt.hash(password, 12);
    db.run(`INSERT INTO users (username,password) VALUES (?,?)`, [username, hash], function(err) {
      if (err) return res.status(500).json({ error: err.message });
      const token = jwt.sign({ id: this.lastID }, JWT_SECRET, { expiresIn: '30d' });
      res.json({ id: this.lastID, username, token });
    });
  });
});

app.post('/login', async (req, res) => {
  const { username, password, pushToken } = req.body;
  db.get(`SELECT * FROM users WHERE username=?`, [username], async (err, user) => {
    if (!user || !(await bcrypt.compare(password, user.password))) return res.status(401).json({ error: "Invalid credentials" });
    const token = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: '30d' });
    if (pushToken) db.run(`UPDATE users SET push_token=? WHERE id=?`, [pushToken, user.id]);
    res.json({ ...user, password: undefined, token });
  });
});

app.get('/u/:username', (req, res) => {
  db.get(`SELECT id,username,theme_id,avatar_id FROM users WHERE username=?`, [req.params.username], (err, row) => {
    row ? res.json(row) : res.status(404).json({ error: "User not found" });
  });
});

app.post('/send', upload.single('audio'), (req, res) => {
  const { recipientId, type = 'text', content = '', gameMode = 'none', burnAfter = 0 } = req.body;
  const finalContent = req.file ? req.file.filename : content;
  db.run(`INSERT INTO messages (recipient_id,type,content,game_mode,burn_after) VALUES (?,?,?,?,?)`,
    [recipientId, type, finalContent, gameMode, burnAfter], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    db.get(`SELECT push_token FROM users WHERE id=?`, [recipientId], (e, r) => {
      if (r?.push_token) sendPush(r.push_token, type==='audio' ? "Voice note" : "Secret message");
    });
    res.json({ success: true });
  });
});

app.get('/messages/:userId', auth, (req, res) => {
  if (parseInt(req.params.userId) !== req.user.id) return res.status(403).json({ error: "Forbidden" });
  db.all(`SELECT * FROM messages WHERE recipient_id=? ORDER BY id DESC`, [req.user.id], (err, rows) => res.json(rows));
});

app.post('/delete-message', auth, (req, res) => {
  const { messageId } = req.body;
  db.run(`DELETE FROM messages WHERE id=? AND recipient_id=?`, [messageId, req.user.id], () => res.json({ success: true }));
});

app.post('/update-profile', auth, (req, res) => {
  const { themeId, avatarId } = req.body;
  db.run(`UPDATE users SET theme_id=?, avatar_id=? WHERE id=?`, [themeId, avatarId, req.user.id], () => res.json({ success: true }));
});

app.get('/', (req, res) => res.send("Txtme API running"));

app.listen(PORT, () => console.log(`Txtme Server running on port ${PORT}`));
