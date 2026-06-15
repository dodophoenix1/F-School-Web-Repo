const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const https = require('https');
const http = require('http');

const app = express();
const PORT = process.env.PORT || 3000;
const DB_FILE = path.join(__dirname, 'data', 'database.json');

// ============================================================
//  ⚙️ ตั้งค่า Apps Script URL ตรงนี้
//  วาง URL ที่ได้จากการ Deploy Apps Script แล้วกด Run "npm start"
// ============================================================
const APPS_SCRIPT_URL = process.env.APPS_SCRIPT_URL || 'https://script.google.com/macros/s/AKfycbxNKaf6Jp30wXv_rboVdoYwzZBt3b3GnFzvZHnGRR38WbIFmogYcPJy_nX9FvwWePdVAw/exec';
const USE_SHEETS_DB = (APPS_SCRIPT_URL !== 'YOUR_APPS_SCRIPT_WEB_APP_URL_HERE' && APPS_SCRIPT_URL.startsWith('https://'));


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

// ============================================================
//  Apps Script API Helper
// ============================================================
// ============================================================
//  Apps Script API Helper
// ============================================================
function apiFetch(url, options = {}) {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);
    const lib = parsedUrl.protocol === 'https:' ? https : http;
    
    // Clean headers for request
    const reqHeaders = options.headers ? { ...options.headers } : {};
    
    const reqOptions = {
      hostname: parsedUrl.hostname,
      path: parsedUrl.pathname + parsedUrl.search,
      method: options.method || 'GET',
      headers: reqHeaders,
      timeout: 30000
    };
    
    const req = lib.request(reqOptions, (res) => {
      res.setEncoding('utf8'); // Correctly handle UTF-8 multi-byte chunk splits!
      
      // Handle redirects (Apps Script returns 302)
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        // Clean options for redirect (convert to GET, remove body and content headers)
        const redirectHeaders = { ...reqHeaders };
        delete redirectHeaders['content-length'];
        delete redirectHeaders['Content-Length'];
        delete redirectHeaders['content-type'];
        delete redirectHeaders['Content-Type'];
        
        const redirectOptions = {
          method: 'GET',
          headers: redirectHeaders,
          body: null
        };
        return apiFetch(res.headers.location, redirectOptions).then(resolve).catch(reject);
      }
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch(e) { reject(new Error('Invalid JSON response: ' + data.substring(0, 200))); }
      });
    });
    req.on('timeout', () => { req.destroy(); reject(new Error('Request timeout')); });
    req.on('error', reject);
    if (options.body) req.write(options.body);
    req.end();
  });
}

// ============================================================
//  Database Schema Mappers & Helpers
// ============================================================

// Helper to parse Google Apps Script map string to JS object (e.g. for config.contact)
function parseAppsScriptMap(str) {
  if (typeof str !== 'string') return str;
  if (!str.startsWith('{') || !str.endsWith('}')) {
    try {
      return JSON.parse(str);
    } catch {
      return str;
    }
  }
  const content = str.substring(1, str.length - 1);
  const obj = {};
  const matches = content.match(/([a-zA-Z0-9_]+)=([^,]*)/g);
  if (matches) {
    matches.forEach(m => {
      const parts = m.split('=');
      const k = parts[0].trim();
      const v = parts.slice(1).join('=').trim();
      obj[k] = v;
    });
  }
  return obj;
}

// Map Google Sheets data to Frontend schema
// Map Google Sheets data to Frontend schema (handles BOTH old and new sheet schemas dynamically!)
function mapFromSheetsAll(sheetsData) {
  const localData = readLocalDB();
  const result = {
    config: sheetsData.config ? { ...sheetsData.config } : { ...localData.config },
    admin: localData.admin || { username: 'admin', password: 'admin' },
    menus: [],
    banners: [],
    slider: [],
    announcements: [],
    board: [],
    activities: [],
    partners: [],
    videos: [],
    newsletters: [],
    pages: sheetsData.pages || localData.pages || {}
  };

  // Ensure config contact is parsed
  if (result.config && result.config.contact) {
    result.config.contact = parseAppsScriptMap(result.config.contact);
  }

  // Fallback config values if sheets config has empty strings for crucial fields
  const configKeys = ['schoolName', 'schoolNameEn', 'slogan', 'logo', 'headerBg', 'primaryColor', 'secondaryColor', 'textColor', 'bgColor', 'footerText', 'hotInfo'];
  configKeys.forEach(k => {
    if (result.config[k] === '' || result.config[k] === undefined) {
      result.config[k] = localData.config?.[k] || '';
    }
  });

  // 1. Navigation / Menus
  const rawMenus = sheetsData.navigation || sheetsData.menus;
  if (Array.isArray(rawMenus) && rawMenus.length > 0) {
    result.menus = rawMenus.map((item, idx) => {
      const localItem = (localData.menus || []).find(m => String(m.id) === String(item.id)) || {};
      return {
        id: String(item.id || 'menu_' + idx),
        label: item.label || item.title || localItem.label || '',
        url: item.url || localItem.url || '',
        isExternal: item.isExternal !== undefined ? (String(item.isExternal).toLowerCase() === 'true') : (item.url || localItem.url || '').startsWith('http')
      };
    });
  } else {
    result.menus = localData.menus || [];
  }

  // 2. Banners
  const rawBanners = sheetsData.banners;
  if (Array.isArray(rawBanners) && rawBanners.length > 0) {
    result.banners = rawBanners.map((item, idx) => {
      const localItem = (localData.banners || []).find(b => String(b.id) === String(item.id)) || {};
      return {
        id: String(item.id || 'banner_' + idx),
        title: item.title || localItem.title || '',
        url: item.linkUrl || item.url || localItem.url || '',
        image: item.imageUrl || item.image || localItem.image || '',
        isExternal: item.isExternal !== undefined ? (String(item.isExternal).toLowerCase() === 'true') : (item.linkUrl || item.url || localItem.url || '').startsWith('http')
      };
    });
  } else {
    result.banners = localData.banners || [];
  }

  // 3. Slider
  const rawSlider = sheetsData.slider;
  if (Array.isArray(rawSlider) && rawSlider.length > 0) {
    result.slider = rawSlider.map((item, idx) => {
      const localItem = (localData.slider || []).find(s => String(s.id) === String(item.id)) || {};
      return {
        id: String(item.id || 'slider_' + idx),
        image: item.imageUrl || item.image || localItem.image || '',
        caption: item.caption || item.title || localItem.caption || '',
        link: item.linkUrl || item.link || localItem.link || '#'
      };
    });
  } else {
    result.slider = localData.slider || [];
  }

  // 4. Announcements
  const rawAnnouncements = sheetsData.announcements;
  if (Array.isArray(rawAnnouncements) && rawAnnouncements.length > 0) {
    result.announcements = rawAnnouncements.map((item, idx) => {
      const localItem = (localData.announcements || []).find(a => String(a.id) === String(item.id)) || {};
      return {
        id: String(item.id || 'news_' + idx),
        title: item.title || localItem.title || '',
        content: item.content || localItem.content || '',
        date: item.date || localItem.date || '',
        category: item.category || localItem.category || 'ข่าวประชาสัมพันธ์',
        fileUrl: item.fileUrl || localItem.fileUrl || '',
        imageUrl: item.imageUrl || item.image || localItem.imageUrl || ''
      };
    });
  } else {
    result.announcements = localData.announcements || [];
  }

  // 5. Board
  const rawBoard = sheetsData.board;
  if (Array.isArray(rawBoard) && rawBoard.length > 0) {
    result.board = rawBoard.map((item, idx) => {
      const localItem = (localData.board || []).find(b => String(b.id) === String(item.id)) || {};
      return {
        id: String(item.id || 'board_' + idx),
        name: item.name || localItem.name || '',
        position: item.position || localItem.position || '',
        image: item.imageUrl || item.image || localItem.image || '',
        order: parseInt(item.order) || localItem.order || (idx + 1)
      };
    });
  } else {
    result.board = localData.board || [];
  }

  // 6. Activities
  const rawActivities = sheetsData.activities;
  if (Array.isArray(rawActivities) && rawActivities.length > 0) {
    result.activities = rawActivities.map((item, idx) => {
      const localItem = (localData.activities || []).find(a => String(a.id) === String(item.id)) || {};
      return {
        id: String(item.id || 'act_' + idx),
        title: item.title || localItem.title || '',
        image: item.imageUrl || item.image || localItem.image || (item.youtubeId ? `https://img.youtube.com/vi/${item.youtubeId}/0.jpg` : ''),
        date: item.date || localItem.date || new Date().toISOString().split('T')[0],
        description: item.description || localItem.description || item.title || '',
        link: item.link || localItem.link || (item.youtubeId ? `https://www.youtube.com/watch?v=${item.youtubeId}` : '#')
      };
    });
  } else {
    result.activities = localData.activities || [];
  }

  // 7. Partners
  const rawPartners = sheetsData.partners;
  if (Array.isArray(rawPartners) && rawPartners.length > 0) {
    result.partners = rawPartners.map((item, idx) => {
      const localItem = (localData.partners || []).find(p => String(p.id) === String(item.id)) || {};
      return {
        id: String(item.id || 'partner_' + idx),
        title: item.title || item.name || localItem.title || '',
        description: item.description || localItem.description || '',
        url: item.linkUrl || item.url || localItem.url || '',
        image: item.imageUrl || item.image || localItem.image || ''
      };
    });
  } else {
    result.partners = localData.partners || [];
  }

  // 8. Videos
  const rawVideos = sheetsData.videos;
  if (Array.isArray(rawVideos) && rawVideos.length > 0) {
    result.videos = rawVideos.map((item, idx) => {
      const localItem = (localData.videos || []).find(v => String(v.id) === String(item.id)) || {};
      return {
        id: String(item.id || 'video_' + idx),
        title: item.title || localItem.title || '',
        youtubeId: item.youtubeId || localItem.youtubeId || '',
        desc: item.desc || item.title || localItem.desc || ''
      };
    });
  } else {
    result.videos = localData.videos || [];
  }

  // 9. Newsletters
  const rawNewsletters = sheetsData.newsletters;
  if (Array.isArray(rawNewsletters) && rawNewsletters.length > 0) {
    result.newsletters = rawNewsletters.map((item, idx) => {
      const localItem = (localData.newsletters || []).find(n => String(n.id) === String(item.id)) || {};
      return {
        id: String(item.id || 'nl_' + idx),
        title: item.title || localItem.title || '',
        image: item.imageUrl || item.image || localItem.image || '',
        order: parseInt(item.order) || localItem.order || (idx + 1)
      };
    });
  } else if (rawNewsletters && rawNewsletters.folderId) {
    result.config.googleDriveFolder = rawNewsletters.folderId;
    result.newsletters = localData.newsletters || [];
  } else {
    result.newsletters = localData.newsletters || [];
  }

  return result;
}

// Convert Frontend format to Google Sheets format (sends BOTH old and new keys for automatic matching!)
function mapToSheets(section, data) {
  if (section === 'config') {
    const mapped = { ...data };
    if (mapped.contact && typeof mapped.contact === 'object') {
      mapped.contact = JSON.stringify(mapped.contact);
    }
    return mapped;
  }

  if (!Array.isArray(data)) return data;

  if (section === 'navigation' || section === 'menus') {
    return data.map((item, idx) => ({
      id: String(item.id),
      title: item.label || item.title || '',
      label: item.label || item.title || '',
      url: item.url || '',
      order: idx + 1,
      active: 'true',
      isExternal: item.isExternal ? 'true' : 'false'
    }));
  }

  if (section === 'banners') {
    return data.map((item, idx) => ({
      id: String(item.id),
      title: item.title || '',
      imageUrl: item.image || item.imageUrl || '',
      image: item.image || item.imageUrl || '',
      linkUrl: item.url || item.linkUrl || '',
      url: item.url || item.linkUrl || '',
      order: idx + 1,
      active: 'true',
      isExternal: item.isExternal ? 'true' : 'false'
    }));
  }

  if (section === 'slider') {
    return data.map((item, idx) => ({
      id: String(item.id),
      title: item.caption || item.title || '',
      imageUrl: item.image || item.imageUrl || '',
      image: item.image || item.imageUrl || '',
      caption: item.caption || item.title || '',
      link: item.link || '',
      linkUrl: item.link || '',
      order: idx + 1,
      active: 'true'
    }));
  }

  if (section === 'announcements') {
    return data.map(item => ({
      id: String(item.id),
      title: item.title || '',
      date: item.date || new Date().toISOString().split('T')[0],
      category: item.category || 'ข่าวประชาสัมพันธ์',
      content: item.content || '',
      imageUrl: item.imageUrl || item.image || '',
      image: item.imageUrl || item.image || '',
      fileUrl: item.fileUrl || '',
      fileName: item.fileUrl ? item.fileUrl.split('/').pop().substring(14) : '',
      active: 'true'
    }));
  }

  if (section === 'board') {
    return data.map((item, idx) => ({
      id: String(item.id),
      name: item.name || '',
      position: item.position || '',
      imageUrl: item.image || item.imageUrl || '',
      image: item.image || item.imageUrl || '',
      order: item.order || (idx + 1),
      active: 'true'
    }));
  }

  if (section === 'activities') {
    return data.map((item, idx) => {
      let youtubeId = '';
      if (item.link && item.link.includes('youtube.com')) {
        try {
          const urlParams = new URLSearchParams(new URL(item.link).search);
          youtubeId = urlParams.get('v') || '';
        } catch {}
      } else if (item.link && item.link.includes('youtu.be')) {
        youtubeId = item.link.split('/').pop() || '';
      }
      return {
        id: String(item.id),
        title: item.title || '',
        imageUrl: item.image || item.imageUrl || '',
        image: item.image || item.imageUrl || '',
        date: item.date || new Date().toISOString().split('T')[0],
        description: item.description || item.title || '',
        link: item.link || '',
        linkUrl: item.link || '',
        type: 'activity',
        youtubeId: youtubeId,
        order: idx + 1,
        active: 'true'
      };
    });
  }

  if (section === 'partners') {
    return data.map((item, idx) => ({
      id: String(item.id),
      name: item.title || item.name || '',
      title: item.title || item.name || '',
      description: item.description || '',
      imageUrl: item.image || item.imageUrl || '',
      image: item.image || item.imageUrl || '',
      linkUrl: item.url || item.linkUrl || '',
      url: item.url || item.linkUrl || '',
      order: idx + 1,
      active: 'true'
    }));
  }

  if (section === 'videos') {
    return data.map((item, idx) => ({
      id: String(item.id),
      title: item.title || '',
      youtubeId: item.youtubeId || '',
      desc: item.desc || item.title || '',
      order: idx + 1,
      active: 'true'
    }));
  }

  if (section === 'newsletters') {
    if (data.length > 0 && (data[0].image || data[0].title)) {
      return data.map((item, idx) => ({
        id: String(item.id),
        title: item.title || '',
        imageUrl: item.image || item.imageUrl || '',
        image: item.image || item.imageUrl || '',
        order: item.order || (idx + 1),
        active: 'true'
      }));
    }
    const localData = readLocalDB();
    const folderId = localData.config?.googleDriveFolder || '';
    return [
      {
        id: 'nl_folder',
        folderId: folderId,
        active: 'true'
      }
    ];
  }

  return data;
}

// Get Sheets Token (Pre-shared key matching current admin password)
function getSheetsToken() {
  try {
    const localData = readLocalDB();
    const admin = localData.admin || { password: 'admin' };
    return admin.password || 'admin';
  } catch {
    return 'admin';
  }
}

// Read Database
async function readDB() {
  if (USE_SHEETS_DB) {
    try {
      const data = await apiFetch(APPS_SCRIPT_URL + '?action=getData');
      if (data && !data.error) {
        // Map Google Sheets data to Frontend schema
        const mappedData = mapFromSheetsAll(data);
        return mappedData;
      }
    } catch (err) {
      console.error('[readDB] Apps Script error, falling back to local JSON:', err.message);
    }
  }
  return readLocalDB();
}

// Write Database — ส่งไปที่ Apps Script
async function writeDB(data, dummyToken) {
  if (USE_SHEETS_DB) {
    try {
      const token = getSheetsToken();
      
      // บันทึก admin credentials ไว้ใน local เท่านั้น (ไม่ส่งขึ้น Sheets)
      const localData = readLocalDB();
      localData.admin = data.admin || localData.admin;
      writeLocalDB(localData);

      // ส่งข้อมูลทั้งหมดไป Apps Script แต่ละ section
      const sections = ['config', 'marquee', 'navigation', 'banners', 'slider',
                        'announcements', 'board', 'activities', 'partners', 'videos'];

      for (const section of sections) {
        const frontendSectionName = section === 'navigation' ? 'menus' : section;
        const sectionData = data[frontendSectionName] !== undefined ? data[frontendSectionName] : data[section];
        
        if (sectionData !== undefined) {
          const action = section === 'config' ? 'saveConfig' : 'saveSheet';
          const mappedData = mapToSheets(section, sectionData);
          const body = section === 'config'
            ? JSON.stringify({ action, token, data: mappedData })
            : JSON.stringify({ action, token, sheet: section, data: mappedData });

          await apiFetch(APPS_SCRIPT_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) },
            body
          });
        }
      }

      // บันทึก pages แยก
      if (data.pages) {
        const pagesArray = Object.entries(data.pages).map(([pageId, v]) => ({
          pageId, title: v.title, content: v.content
        }));
        const body = JSON.stringify({ action: 'saveSheet', token, sheet: 'pages', data: pagesArray });
        await apiFetch(APPS_SCRIPT_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) },
          body
        });
      }

      return true;
    } catch (err) {
      console.error('[writeDB] Apps Script error:', err.message);
      return false;
    }
  }
  return writeLocalDB(data);
}

// Write แบบ section เดียว (เร็วกว่า — ใช้ตอน save section เฉพาะส่วน)
async function writeSection(section, data, dummyToken) {
  // Always update local database first (keeps a complete backup)
  const db = readLocalDB();
  const frontendSectionName = section === 'navigation' ? 'menus' : section;
  db[frontendSectionName] = data;
  writeLocalDB(db);

  if (USE_SHEETS_DB) {
    try {
      const token = getSheetsToken();
      const action = section === 'config' ? 'saveConfig' : 'saveSheet';
      const mappedData = mapToSheets(section, data);
      
      const payload = section === 'config'
        ? { action, token, data: mappedData }
        : { action, token, sheet: section, data: mappedData };
      const body = JSON.stringify(payload);
      
      const result = await apiFetch(APPS_SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) },
        body
      });
      return result.success !== false;
    } catch (err) {
      console.error('[writeSection] Error:', err.message);
      return false;
    }
  }
  return true;
}

// อ่านจาก Local JSON (fallback)
function readLocalDB() {
  try {
    return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
  } catch { return {}; }
}

// เขียนไป Local JSON (fallback + เก็บ admin credentials)
function writeLocalDB(data) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf8');
    const staticDbFile = path.join(__dirname, '..', 'static-version', 'data', 'database.json');
    if (fs.existsSync(path.dirname(staticDbFile))) {
      fs.writeFileSync(staticDbFile, JSON.stringify(data, null, 2), 'utf8');
    }
    return true;
  } catch (err) {
    console.error('Error writing local DB:', err);
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
app.get('/api/config', async (req, res) => {
  const db = await readDB();
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
app.get('/api/news', async (req, res) => {
  const db = await readDB();
  let list = db.announcements || [];
  list = list.sort((a, b) => new Date(b.date) - new Date(a.date));
  const category = req.query.category;
  if (category) list = list.filter(item => item.category === category);
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 5;
  const startIndex = (page - 1) * limit;
  res.json({
    total: list.length,
    totalPages: Math.ceil(list.length / limit),
    page, limit,
    data: list.slice(startIndex, startIndex + limit)
  });
});

// Fetch single news detail
app.get('/api/news/:id', async (req, res) => {
  const db = await readDB();
  const item = (db.announcements || []).find(n => n.id === req.params.id);
  if (!item) return res.status(404).json({ error: 'ไม่พบประกาศดังกล่าว' });
  res.json(item);
});

// Fetch single custom page content
app.get('/api/page/:id', async (req, res) => {
  const db = await readDB();
  const pageContent = db.pages ? db.pages[req.params.id] : null;
  if (!pageContent) return res.status(404).json({ error: 'ไม่พบเนื้อหาของหน้านี้' });
  res.json(pageContent);
});

// Login Endpoint — ใช้ local credentials เท่านั้น (ปลอดภัย)
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  const localData = readLocalDB();
  const admin = localData.admin || { username: 'admin', password: 'admin' };
  if (admin.username === username && admin.password === password) {
    activeToken = require('crypto').randomBytes(16).toString('hex');
    res.json({ success: true, token: activeToken });
  } else {
    res.status(401).json({ success: false, error: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง' });
  }
});

// --- ADMIN API ENDPOINTS (PROTECTED) ---

// Update General Configurations
app.post('/api/admin/config', checkAuth, async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  const ok = await writeSection('config', req.body, token);
  if (ok) res.json({ success: true, message: 'บันทึกการตั้งค่าทั่วไปเรียบร้อยแล้ว' });
  else res.status(500).json({ success: false, error: 'ไม่สามารถบันทึกข้อมูลได้' });
});

// Update Left Menus
app.post('/api/admin/menus', checkAuth, async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  const ok = await writeSection('navigation', req.body.menus, token);
  if (ok) res.json({ success: true, message: 'บันทึกรายการเมนูเรียบร้อยแล้ว' });
  else res.status(500).json({ success: false, error: 'ไม่สามารถบันทึกข้อมูลได้' });
});

// Update Side Banners
app.post('/api/admin/banners', checkAuth, async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  const ok = await writeSection('banners', req.body.banners, token);
  if (ok) res.json({ success: true, message: 'บันทึกแบนเนอร์เรียบร้อยแล้ว' });
  else res.status(500).json({ success: false, error: 'ไม่สามารถบันทึกข้อมูลได้' });
});

// Update Home Slider
app.post('/api/admin/slider', checkAuth, async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  const ok = await writeSection('slider', req.body.slider, token);
  if (ok) res.json({ success: true, message: 'อัปเดตรูปภาพสไลด์หน้าแรกเรียบร้อยแล้ว' });
  else res.status(500).json({ success: false, error: 'ไม่สามารถบันทึกข้อมูลได้' });
});

// Save or Update News (upsert)
app.post('/api/admin/news', checkAuth, async (req, res) => {
  const item = req.body;
  if (!item.id) item.id = 'news_' + Date.now();

  if (USE_SHEETS_DB) {
    // upsert ตรงใน Sheets ได้เลย ไม่ต้อง read ทั้ง DB
    try {
      const token = getSheetsToken();
      const body = JSON.stringify({ action: 'saveNews', token, data: item });
      const result = await apiFetch(APPS_SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) },
        body
      });
      if (result.success) return res.json({ success: true, message: 'บันทึกข่าวเรียบร้อยแล้ว', id: item.id });
      return res.status(500).json({ success: false, error: result.error || 'ไม่สามารถบันทึกข้อมูลได้' });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }
  // Fallback local
  const db = readLocalDB();
  if (!db.announcements) db.announcements = [];
  const idx = db.announcements.findIndex(n => n.id === item.id);
  if (idx !== -1) db.announcements[idx] = { ...db.announcements[idx], ...item };
  else db.announcements.push(item);
  if (writeLocalDB(db)) res.json({ success: true, message: 'บันทึกข่าวเรียบร้อยแล้ว', id: item.id });
  else res.status(500).json({ success: false, error: 'ไม่สามารถบันทึกข้อมูลได้' });
});

// Delete News
app.delete('/api/admin/news/:id', checkAuth, async (req, res) => {
  const id = req.params.id;
  if (USE_SHEETS_DB) {
    try {
      const token = getSheetsToken();
      const body = JSON.stringify({ action: 'deleteRow', token, sheet: 'announcements', idColumn: 'id', idValue: id });
      const result = await apiFetch(APPS_SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) },
        body
      });
      if (result.success) return res.json({ success: true, message: 'ลบประกาศเรียบร้อยแล้ว' });
      return res.status(404).json({ success: false, error: result.error || 'ไม่พบประกาศที่ระบุ' });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }
  // Fallback local
  const db = readLocalDB();
  const before = (db.announcements || []).length;
  db.announcements = (db.announcements || []).filter(n => n.id !== id);
  if (db.announcements.length < before) {
    if (writeLocalDB(db)) res.json({ success: true, message: 'ลบประกาศเรียบร้อยแล้ว' });
    else res.status(500).json({ success: false, error: 'ไม่สามารถบันทึกฐานข้อมูลได้' });
  } else {
    res.status(404).json({ success: false, error: 'ไม่พบประกาศที่ระบุ' });
  }
});



// Update Management Board Portraits
app.post('/api/admin/board', checkAuth, async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  const ok = await writeSection('board', req.body.board, token);
  if (ok) res.json({ success: true, message: 'อัปเดตรายชื่อผู้บริหารเรียบร้อยแล้ว' });
  else res.status(500).json({ success: false, error: 'ไม่สามารถบันทึกข้อมูลได้' });
});

// Update Activity Gallery
app.post('/api/admin/activities', checkAuth, async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  const ok = await writeSection('activities', req.body.activities, token);
  if (ok) res.json({ success: true, message: 'อัปเดตกิจกรรมโรงเรียนเรียบร้อยแล้ว' });
  else res.status(500).json({ success: false, error: 'ไม่สามารถบันทึกข้อมูลได้' });
});

// Update Videos
app.post('/api/admin/videos', checkAuth, async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  const ok = await writeSection('videos', req.body.videos, token);
  if (ok) res.json({ success: true, message: 'อัปเดตวิดีโอแนะนำเรียบร้อยแล้ว' });
  else res.status(500).json({ success: false, error: 'ไม่สามารถบันทึกข้อมูลได้' });
});

// Update Partners
app.post('/api/admin/partners', checkAuth, async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  const ok = await writeSection('partners', req.body.partners, token);
  if (ok) res.json({ success: true, message: 'อัปเดตภาคีเครือข่ายพันธมิตรเรียบร้อยแล้ว' });
  else res.status(500).json({ success: false, error: 'ไม่สามารถบันทึกข้อมูลได้' });
});

// Update Newsletters
app.post('/api/admin/newsletters', checkAuth, async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  const ok = await writeSection('newsletters', req.body.newsletters, token);
  if (ok) res.json({ success: true, message: 'อัปเดตจดหมายข่าวประชาสัมพันธ์เรียบร้อยแล้ว' });
  else res.status(500).json({ success: false, error: 'ไม่สามารถบันทึกข้อมูลได้' });
});

// Update Custom Page Content
app.post('/api/admin/pages/:id', checkAuth, async (req, res) => {
  const pageId = req.params.id;
  const pageData = { title: req.body.title, content: req.body.content };

  if (USE_SHEETS_DB) {
    try {
      const token = getSheetsToken();
      // Read all existing pages first to merge
      const existingRaw = await apiFetch(APPS_SCRIPT_URL + '?action=getSheet&sheet=pages');
      const existing = Array.isArray(existingRaw) ? existingRaw : [];
      const idx = existing.findIndex(p => p.pageId === pageId);
      if (idx !== -1) existing[idx] = { pageId, ...pageData };
      else existing.push({ pageId, ...pageData });
      const finalBody = JSON.stringify({ action: 'saveSheet', token, sheet: 'pages', data: existing });
      await apiFetch(APPS_SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(finalBody) },
        body: finalBody
      });
      return res.json({ success: true, message: `บันทึกข้อมูลหน้า ${pageId} สำเร็จ` });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }
  // Fallback local
  const db = readLocalDB();
  if (!db.pages) db.pages = {};
  db.pages[pageId] = pageData;
  if (writeLocalDB(db)) res.json({ success: true, message: `บันทึกข้อมูลหน้า ${pageId} สำเร็จ` });
  else res.status(500).json({ success: false, error: 'ไม่สามารถบันทึกข้อมูลได้' });
});

// Change Password — บันทึกใน local เท่านั้น (ไม่ส่งขึ้น Sheets)
app.post('/api/admin/change-password', checkAuth, (req, res) => {
  const { newPassword } = req.body;
  if (!newPassword || newPassword.trim().length < 4) {
    return res.status(400).json({ success: false, error: 'รหัสผ่านใหม่ต้องมีความยาวอย่างน้อย 4 ตัวอักษร' });
  }
  const db = readLocalDB();
  if (!db.admin) db.admin = { username: 'admin', password: 'admin' };
  db.admin.password = newPassword;
  if (writeLocalDB(db)) res.json({ success: true, message: 'เปลี่ยนรหัสผ่านเรียบร้อยแล้ว' });
  else res.status(500).json({ success: false, error: 'ไม่สามารถบันทึกข้อมูลได้' });
});

// File Upload Handler — ทั้งสองทาง: local และ Google Drive
app.post('/api/admin/upload', checkAuth, upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, error: 'กรุณาเลือกไฟล์สำหรับอัปโหลด' });
  }
  
  // Copy to static-version uploads
  try {
    const staticUploadsDir = path.join(__dirname, '..', 'static-version', 'uploads');
    if (fs.existsSync(staticUploadsDir)) {
      fs.copyFileSync(req.file.path, path.join(staticUploadsDir, req.file.filename));
    }
  } catch (err) {
    console.error('Failed to copy file to static-version uploads:', err);
  }
  
  const relativePath = `/uploads/${req.file.filename}`;

  // If Sheets DB is active, auto-upload to Google Drive
  if (USE_SHEETS_DB) {
    try {
      const fileBuffer = fs.readFileSync(req.file.path);
      const base64 = fileBuffer.toString('base64');
      const token = getSheetsToken();
      const body = JSON.stringify({
        action: 'uploadImage',
        token,
        base64,
        filename: req.file.filename,
        mimeType: req.file.mimetype
      });
      const result = await apiFetch(APPS_SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) },
        body
      });
      if (result && result.success) {
        const fileUrl = req.file.mimetype === 'application/pdf' ? result.driveUrl : result.imageUrl;
        return res.json({
          success: true,
          fileUrl,
          filename: req.file.filename,
          driveUrl: result.driveUrl,
          googleDrive: true
        });
      } else {
        console.error('[Upload to Drive failed]', result ? result.error : 'Unknown error');
        // Fallback local URL
        return res.json({ success: true, fileUrl: relativePath, filename: req.file.filename, fallback: true });
      }
    } catch (err) {
      console.error('[Upload to Drive Error]', err.message);
      // Fallback local URL
      return res.json({ success: true, fileUrl: relativePath, filename: req.file.filename, fallback: true });
    }
  }

  res.json({ success: true, fileUrl: relativePath, filename: req.file.filename });
});

// อัปโหลดรูปไป Google Drive โดยตรง (ผ่าน Apps Script)
app.post('/api/admin/upload-to-drive', checkAuth, async (req, res) => {
  if (!USE_SHEETS_DB) {
    return res.status(400).json({ success: false, error: 'ยังไม่ได้ตั้งค่า APPS_SCRIPT_URL' });
  }
  const { base64, filename, mimeType } = req.body;
  if (!base64 || !filename) {
    return res.status(400).json({ success: false, error: 'กรุณาส่ง base64 และ filename' });
  }
  try {
    const token = getSheetsToken();
    const body = JSON.stringify({ action: 'uploadImage', token, base64, filename, mimeType: mimeType || 'image/jpeg' });
    const result = await apiFetch(APPS_SCRIPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) },
      body
    });
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
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
