const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const https = require('https');

const app = express();
const PORT = process.env.PORT || 3000;
const DB_FILE = path.join(__dirname, 'data', 'database.json');

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Ensure uploads folder exists
const uploadsDir = path.join(__dirname, 'public', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Global active token for session (simple, robust for template sites)
let activeToken = null;

// Read Database Helper
function readDB() {
  try {
    const data = fs.readFileSync(DB_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error("Error reading database.json:", error);
    return {};
  }
}

// Write Database Helper
function writeDB(data) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf8');
    return true;
  } catch (error) {
    console.error("Error writing database.json:", error);
    return false;
  }
}

// Filename Sanitizer to prevent Directory/Path Traversal
function sanitizeFilename(filename) {
  const ext = path.extname(filename);
  const base = path.basename(filename, ext);
  // Keep only alphanumeric, dash, and underscore
  const safeBase = base.replace(/[^a-zA-Z0-9_\-]/g, '_');
  return `${safeBase}${ext}`;
}

// Multer Config for Safe Uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    const safeName = sanitizeFilename(file.originalname);
    cb(null, `${Date.now()}_${safeName}`);
  }
});

const upload = multer({
  storage: storage,
  fileFilter: function (req, file, cb) {
    const allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.pdf', '.doc', '.docx', '.xls', '.xlsx'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedExtensions.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('ประเภทไฟล์ไม่ได้รับอนุญาต (ให้เฉพาะรูปภาพและเอกสารทั่วไป)'));
    }
  },
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// Middleware: Check Admin Authentication
function checkAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, error: 'ยังไม่ได้เข้าสู่ระบบ หรือเซสชันหมดอายุ' });
  }
  const token = authHeader.split(' ')[1];
  if (!activeToken || token !== activeToken) {
    return res.status(401).json({ success: false, error: 'สิทธิ์ไม่ถูกต้อง หรือเซสชันหมดอายุ' });
  }
  next();
}

// --- PUBLIC API ENDPOINTS ---

// Fetch public settings & data (excludes admin login info)
app.get('/api/config', (req, res) => {
  const db = readDB();
  const { admin, ...publicData } = db;
  res.json(publicData);
});

// Google Drive Newsletter Scraper Proxy Endpoint
app.get('/api/newsletters/drive/:folderId', (req, res) => {
  const folderId = req.params.folderId;
  if (!folderId || !/^[a-zA-Z0-9-_]{25,45}$/.test(folderId)) {
    return res.json([]); // Return empty list on invalid ID so frontend falls back
  }

  const url = `https://drive.google.com/embeddedfolderview?id=${folderId}`;
  
  const options = {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36'
    },
    timeout: 10000 // 10 seconds timeout
  };

  const reqDrive = https.get(url, options, (apiRes) => {
    if (apiRes.statusCode !== 200) {
      apiRes.resume();
      return res.json([]); // Return empty list on non-200 so frontend falls back
    }

    let rawHtml = '';
    apiRes.on('data', (chunk) => { rawHtml += chunk; });
    apiRes.on('end', () => {
      try {
        const entries = [];
        const entryStartRegex = /class="flip-entry" id="entry-([a-zA-Z0-9-_]+)"/g;
        let match;
        const entryStarts = [];

        while ((match = entryStartRegex.exec(rawHtml)) !== null) {
          entryStarts.push({ id: match[1], index: match.index });
        }

        for (let i = 0; i < entryStarts.length; i++) {
          const fileId = entryStarts[i].id;
          const startPos = entryStarts[i].index;
          const endPos = (i + 1 < entryStarts.length) ? entryStarts[i + 1].index : rawHtml.length;
          const subHtml = rawHtml.substring(startPos, endPos);

          const titleMatch = subHtml.match(/class="flip-entry-title">([^<]+)<\/div>/);
          const title = titleMatch ? titleMatch[1].trim() : '';

          const dateMatch = subHtml.match(/class="flip-entry-last-modified"><div>([^<]+)<\/div>/);
          const dateStr = dateMatch ? dateMatch[1].trim() : '';

          const imageUrl = `https://lh3.googleusercontent.com/d/${fileId}=w800`;

          entries.push({
            id: fileId,
            title: title,
            image: imageUrl,
            date: dateStr
          });
        }

        // Sort Helper
        function parseGDriveDate(dStr) {
          const parts = dStr.split('/');
          if (parts.length === 3) {
            const m = parseInt(parts[0], 10) - 1;
            const d = parseInt(parts[1], 10);
            let y = parseInt(parts[2], 10);
            if (y < 100) y += 2000;
            return new Date(y, m, d).getTime();
          }
          const parsed = Date.parse(dStr);
          return isNaN(parsed) ? 0 : parsed;
        }

        entries.sort((a, b) => {
          const dateA = parseGDriveDate(a.date);
          const dateB = parseGDriveDate(b.date);
          if (dateB !== dateA) {
            return dateB - dateA;
          }
          return b.title.localeCompare(a.title, undefined, { numeric: true, sensitivity: 'base' });
        });

        res.json(entries.slice(0, 10));
      } catch (err) {
        res.json([]);
      }
    });
  });

  reqDrive.on('timeout', () => {
    reqDrive.destroy();
    if (!res.headersSent) {
      res.json([]); // Return empty list on timeout
    }
  });

  reqDrive.on('error', (err) => {
    if (!res.headersSent) {
      res.json([]); // Return empty list on network error
    }
  });
});

// Fetch announcements with pagination & category filter
app.get('/api/news', (req, res) => {
  const db = readDB();
  let list = db.announcements || [];
  
  // Sort by date descending
  list = list.sort((a, b) => new Date(b.date) - new Date(a.date));

  const category = req.query.category;
  if (category) {
    list = list.filter(item => item.category === category);
  }

  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 5;
  const startIndex = (page - 1) * limit;
  const endIndex = page * limit;

  const results = {};
  results.total = list.length;
  results.totalPages = Math.ceil(list.length / limit);
  results.page = page;
  results.limit = limit;
  results.data = list.slice(startIndex, endIndex);

  res.json(results);
});

// Fetch single news detail
app.get('/api/news/:id', (req, res) => {
  const db = readDB();
  const item = (db.announcements || []).find(n => n.id === req.params.id);
  if (!item) {
    return res.status(404).json({ error: 'ไม่พบประกาศดังกล่าว' });
  }
  res.json(item);
});

// Fetch single custom page content (history, goal, sign)
app.get('/api/page/:id', (req, res) => {
  const db = readDB();
  const pageContent = db.pages ? db.pages[req.params.id] : null;
  if (!pageContent) {
    return res.status(404).json({ error: 'ไม่พบเนื้อหาของหน้านี้' });
  }
  res.json(pageContent);
});

// Login Endpoint
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  const db = readDB();
  
  if (db.admin && db.admin.username === username && db.admin.password === password) {
    activeToken = require('crypto').randomBytes(16).toString('hex');
    res.json({ success: true, token: activeToken });
  } else {
    res.status(401).json({ success: false, error: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง' });
  }
});

// --- ADMIN API ENDPOINTS (PROTECTED) ---

// Update General Configurations
app.post('/api/admin/config', checkAuth, (req, res) => {
  const db = readDB();
  db.config = { ...db.config, ...req.body };
  if (writeDB(db)) {
    res.json({ success: true, message: 'บันทึกการตั้งค่าทั่วไปเรียบร้อยแล้ว' });
  } else {
    res.status(500).json({ success: false, error: 'ไม่สามารถบันทึกข้อมูลได้' });
  }
});

// Update Left Menus
app.post('/api/admin/menus', checkAuth, (req, res) => {
  const db = readDB();
  db.menus = req.body.menus;
  if (writeDB(db)) {
    res.json({ success: true, message: 'บันทึกรายการเมนูเรียบร้อยแล้ว' });
  } else {
    res.status(500).json({ success: false, error: 'ไม่สามารถบันทึกข้อมูลได้' });
  }
});

// Update Side Banners
app.post('/api/admin/banners', checkAuth, (req, res) => {
  const db = readDB();
  db.banners = req.body.banners;
  if (writeDB(db)) {
    res.json({ success: true, message: 'บันทึกแบนเนอร์เรียบร้อยแล้ว' });
  } else {
    res.status(500).json({ success: false, error: 'ไม่สามารถบันทึกข้อมูลได้' });
  }
});

// Update Home Slider
app.post('/api/admin/slider', checkAuth, (req, res) => {
  const db = readDB();
  db.slider = req.body.slider;
  if (writeDB(db)) {
    res.json({ success: true, message: 'อัปเดตรูปภาพสไลด์หน้าแรกเรียบร้อยแล้ว' });
  } else {
    res.status(500).json({ success: false, error: 'ไม่สามารถบันทึกข้อมูลได้' });
  }
});

// Save or Update News
app.post('/api/admin/news', checkAuth, (req, res) => {
  const db = readDB();
  const item = req.body;
  if (!db.announcements) db.announcements = [];

  if (item.id) {
    // Update
    const idx = db.announcements.findIndex(n => n.id === item.id);
    if (idx !== -1) {
      db.announcements[idx] = { ...db.announcements[idx], ...item };
    } else {
      db.announcements.push(item);
    }
  } else {
    // New
    item.id = 'news_' + Date.now();
    db.announcements.push(item);
  }

  if (writeDB(db)) {
    res.json({ success: true, message: 'บันทึกข่าวเรียบร้อยแล้ว', id: item.id });
  } else {
    res.status(500).json({ success: false, error: 'ไม่สามารถบันทึกข้อมูลได้' });
  }
});

// Delete News
app.delete('/api/admin/news/:id', checkAuth, (req, res) => {
  const db = readDB();
  const id = req.params.id;
  const initialLen = db.announcements ? db.announcements.length : 0;
  
  if (db.announcements) {
    db.announcements = db.announcements.filter(n => n.id !== id);
  }

  if (db.announcements.length < initialLen) {
    if (writeDB(db)) {
      res.json({ success: true, message: 'ลบประกาศเรียบร้อยแล้ว' });
    } else {
      res.status(500).json({ success: false, error: 'ไม่สามารถบันทึกฐานข้อมูลได้' });
    }
  } else {
    res.status(404).json({ success: false, error: 'ไม่พบประกาศที่ระบุ' });
  }
});

// Update Management Board Portraits
app.post('/api/admin/board', checkAuth, (req, res) => {
  const db = readDB();
  db.board = req.body.board;
  if (writeDB(db)) {
    res.json({ success: true, message: 'อัปเดตรายชื่อผู้บริหารเรียบร้อยแล้ว' });
  } else {
    res.status(500).json({ success: false, error: 'ไม่สามารถบันทึกข้อมูลได้' });
  }
});

// Update Activity Gallery
app.post('/api/admin/activities', checkAuth, (req, res) => {
  const db = readDB();
  db.activities = req.body.activities;
  if (writeDB(db)) {
    res.json({ success: true, message: 'อัปเดตกิจกรรมโรงเรียนเรียบร้อยแล้ว' });
  } else {
    res.status(500).json({ success: false, error: 'ไม่สามารถบันทึกข้อมูลได้' });
  }
});

// Update Videos
app.post('/api/admin/videos', checkAuth, (req, res) => {
  const db = readDB();
  db.videos = req.body.videos;
  if (writeDB(db)) {
    res.json({ success: true, message: 'อัปเดตวิดีโอแนะนำเรียบร้อยแล้ว' });
  } else {
    res.status(500).json({ success: false, error: 'ไม่สามารถบันทึกข้อมูลได้' });
  }
});

// Update Partners
app.post('/api/admin/partners', checkAuth, (req, res) => {
  const db = readDB();
  db.partners = req.body.partners;
  if (writeDB(db)) {
    res.json({ success: true, message: 'อัปเดตภาคีเครือข่ายพันธมิตรเรียบร้อยแล้ว' });
  } else {
    res.status(500).json({ success: false, error: 'ไม่สามารถบันทึกข้อมูลได้' });
  }
});

// Update Newsletters
app.post('/api/admin/newsletters', checkAuth, (req, res) => {
  const db = readDB();
  db.newsletters = req.body.newsletters;
  if (writeDB(db)) {
    res.json({ success: true, message: 'อัปเดตจดหมายข่าวประชาสัมพันธ์เรียบร้อยแล้ว' });
  } else {
    res.status(500).json({ success: false, error: 'ไม่สามารถบันทึกข้อมูลได้' });
  }
});

// Update Custom Page Content
app.post('/api/admin/pages/:id', checkAuth, (req, res) => {
  const db = readDB();
  const pageId = req.params.id;
  if (!db.pages) db.pages = {};
  
  db.pages[pageId] = {
    title: req.body.title,
    content: req.body.content
  };

  if (writeDB(db)) {
    res.json({ success: true, message: `บันทึกข้อมูลหน้า ${pageId} สำเร็จ` });
  } else {
    res.status(500).json({ success: false, error: 'ไม่สามารถบันทึกข้อมูลได้' });
  }
});

// Change Password
app.post('/api/admin/change-password', checkAuth, (req, res) => {
  const db = readDB();
  const { newPassword } = req.body;
  if (!newPassword || newPassword.trim().length < 4) {
    return res.status(400).json({ success: false, error: 'รหัสผ่านใหม่ต้องมีความยาวอย่างน้อย 4 ตัวอักษร' });
  }
  db.admin.password = newPassword;
  if (writeDB(db)) {
    res.json({ success: true, message: 'เปลี่ยนรหัสผ่านเรียบร้อยแล้ว' });
  } else {
    res.status(500).json({ success: false, error: 'ไม่สามารถบันทึกข้อมูลได้' });
  }
});

// File Upload Handler with Security Checks
app.post('/api/admin/upload', checkAuth, upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, error: 'กรุณาเลือกไฟล์สำหรับอัปโหลด' });
  }
  
  // Return relative path to access the file from frontend
  const relativePath = `/uploads/${req.file.filename}`;
  res.json({
    success: true,
    fileUrl: relativePath,
    filename: req.file.filename
  });
});

// --- DYNAMIC PLACEHOLDER GENERATOR API ---
app.get('/api/placeholder/:width/:height', (req, res) => {
  const width = parseInt(req.params.width) || 300;
  const height = parseInt(req.params.height) || 200;
  const text = req.query.text || `${width}x${height}`;
  const bg = req.query.bg || '#e2e8f0';
  const color = req.query.color || '#475569';

  const svgContent = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
      <rect width="100%" height="100%" fill="${bg}"/>
      <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-family="'Sarabun', sans-serif, system-ui" font-size="${Math.max(11, height / 8)}px" fill="${color}" font-weight="bold">
        ${text}
      </text>
    </svg>
  `;
  res.setHeader('Content-Type', 'image/svg+xml');
  res.send(svgContent);
});

// --- CUSTOM FALLBACK FOR MISSING IMAGES (PLACEHOLDER GENERATOR) ---
// If an uploaded image is requested but doesn't exist on disk, we serve an on-the-fly generated SVG block.
app.get('/uploads/:filename', (req, res, next) => {
  const filename = req.params.filename;
  const safeFilename = sanitizeFilename(filename);
  const filePath = path.join(uploadsDir, safeFilename);

  if (fs.existsSync(filePath)) {
    return res.sendFile(filePath);
  }

  // Generate an SVG image placeholder dynamically
  let width = 600;
  let height = 400;
  let text = safeFilename;
  let bg = '#e5e7eb';
  let color = '#4b5563';

  if (safeFilename.includes('logo')) {
    width = 150;
    height = 150;
    text = 'โลโก้โรงเรียน';
    bg = '#8b0000';
    color = '#ffd700';
  } else if (safeFilename.includes('boss')) {
    width = 240;
    height = 320;
    text = 'ผู้อำนวยการโรงเรียน';
    bg = '#8b0000';
    color = '#ffffff';
  } else if (safeFilename.match(/^b\d/)) {
    width = 240;
    height = 320;
    text = 'รองผู้อำนวยการ';
    bg = '#4b5563';
    color = '#ffffff';
  } else if (safeFilename.includes('slide')) {
    width = 1200;
    height = 500;
    text = 'ภาพสไลด์กิจกรรม';
    bg = '#1e3a8a';
    color = '#ffffff';
  } else if (safeFilename.includes('banner')) {
    width = 200;
    height = 65;
    text = safeFilename.replace('banner_', '').replace(/\.[^/.]+$/, '').toUpperCase();
    bg = '#10b981';
    color = '#ffffff';
  } else if (safeFilename.includes('activity')) {
    width = 600;
    height = 400;
    text = 'ภาพกิจกรรมเด่น';
    bg = '#d97706';
    color = '#ffffff';
  } else if (safeFilename.includes('news')) {
    width = 600;
    height = 350;
    text = 'รูปหน้าปกข่าว';
    bg = '#4b5563';
    color = '#ffffff';
  }

  const svgContent = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
      <rect width="100%" height="100%" fill="${bg}"/>
      <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-family="'Sarabun', sans-serif, system-ui" font-size="${Math.max(12, height / 10)}px" fill="${color}" font-weight="bold">
        ${text}
      </text>
    </svg>
  `;
  res.setHeader('Content-Type', 'image/svg+xml');
  res.send(svgContent);
});

// Admin panel redirects to prevent wildcard routing hijack
app.get('/admin', (req, res) => {
  res.redirect('/admin/index.html');
});
app.get('/admin/', (req, res) => {
  res.redirect('/admin/index.html');
});

// Serve frontend static files
app.use(express.static(path.join(__dirname, 'public')));

// Fallback route: Redirect index.html for undefined requests
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ success: false, error: err.message || 'เกิดข้อผิดพลาดในการทำงานของเซิร์ฟเวอร์' });
});

app.listen(PORT, () => {
  console.log(`===================================================`);
  console.log(` School Website Template running at http://localhost:${PORT}`);
  console.log(`===================================================`);
});
