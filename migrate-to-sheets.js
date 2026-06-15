/**
 * migrate-to-sheets.js
 * ย้ายข้อมูลจาก database.json → Google Sheets ผ่าน Apps Script API
 * รันด้วย: node migrate-to-sheets.js
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxNKaf6Jp30wXv_rboVdoYwzZBt3b3GnFzvZHnGRR38WbIFmogYcPJy_nX9FvwWePdVAw/exec';

const dbPath = path.join(__dirname, 'server-version', 'data', 'database.json');
const db = JSON.parse(fs.readFileSync(dbPath, 'utf8'));

// ─── HTTP POST ที่ handle redirect ของ Apps Script ────────────
function postToScript(url, payload, method = 'POST', redirectCount = 0) {
  return new Promise((resolve, reject) => {
    if (redirectCount > 5) return reject(new Error('Too many redirects'));

    const parsedUrl = new URL(url);
    const lib = parsedUrl.protocol === 'https:' ? https : http;

    const headers = {
      'User-Agent': 'Mozilla/5.0'
    };

    const body = method === 'POST' ? JSON.stringify(payload) : null;
    if (body) {
      headers['Content-Type'] = 'application/json';
      headers['Content-Length'] = Buffer.byteLength(body);
    }

    const options = {
      hostname: parsedUrl.hostname,
      path: parsedUrl.pathname + parsedUrl.search,
      method: method,
      headers: headers,
      timeout: 30000
    };

    const req = lib.request(options, (res) => {
      // Apps Script จะส่ง redirect 302 ไปยังหน้าที่แสดงผล JSON (ต้องใช้ GET ในการดึงผลลัพธ์)
      if ((res.statusCode === 301 || res.statusCode === 302 || res.statusCode === 307 || res.statusCode === 308)
          && res.headers.location) {
        const nextUrl = res.headers.location.startsWith('http')
          ? res.headers.location
          : `${parsedUrl.protocol}//${parsedUrl.host}${res.headers.location}`;
        res.resume();
        return postToScript(nextUrl, payload, 'GET', redirectCount + 1).then(resolve).catch(reject);
      }

      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve(json);
        } catch(e) {
          // ถ้าตอบกลับมาเป็น HTML (เช่น error page) ให้แสดงผล
          const preview = data.substring(0, 200).replace(/<[^>]+>/g, '').trim();
          reject(new Error('Non-JSON response: ' + preview));
        }
      });
    });

    req.on('timeout', () => { req.destroy(); reject(new Error('Request timeout (30s)')); });
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

// ─── ทำความสะอาด base64 ออก ──────────────────────────────────
function cleanItem(item) {
  if (!item || typeof item !== 'object') return item;
  const cleaned = {};
  for (const [k, v] of Object.entries(item)) {
    if (typeof v === 'string' && v.startsWith('data:image')) {
      cleaned[k] = ''; // ลบ base64 รูปออก
    } else if (typeof v === 'object' && v !== null && !Array.isArray(v)) {
      cleaned[k] = cleanItem(v);
    } else {
      cleaned[k] = v;
    }
  }
  return cleaned;
}

// ─── Main ─────────────────────────────────────────────────────
async function migrate() {
  console.log('🚀 เริ่มย้ายข้อมูลไป Google Sheets...\n');

  // ── Login ────────────────────────────────────────────────────
  process.stdout.write('🔐 กำลัง login... ');
  const loginRes = await postToScript(APPS_SCRIPT_URL, {
    action: 'login',
    username: 'admin',
    password: 'admin'
  });

  if (!loginRes.success || !loginRes.token) {
    console.log('❌');
    console.error('Login ล้มเหลว:', JSON.stringify(loginRes));
    process.exit(1);
  }
  const token = loginRes.token;
  console.log('✅\n');

  // ── Config ───────────────────────────────────────────────────
  process.stdout.write('⚙️  config... ');
  const cfgRes = await postToScript(APPS_SCRIPT_URL, {
    action: 'saveConfig', token,
    data: cleanItem(db.config || {})
  });
  console.log(cfgRes.success ? '✅' : '❌ ' + cfgRes.error);

  // ── Array Sections ───────────────────────────────────────────
  const sections = [
    { key: 'menus',         sheet: 'navigation' },
    { key: 'banners',       sheet: 'banners' },
    { key: 'slider',        sheet: 'slider' },
    { key: 'announcements', sheet: 'announcements' },
    { key: 'board',         sheet: 'board' },
    { key: 'activities',    sheet: 'activities' },
    { key: 'videos',        sheet: 'videos' },
    { key: 'partners',      sheet: 'partners' },
  ];

  for (const { key, sheet } of sections) {
    const rawData = db[key] || [];
    const cleaned = rawData.map(item => cleanItem(item));
    const mapped = mapToSheets(sheet, cleaned);
    process.stdout.write(`📋 ${key} (${mapped.length} รายการ)... `);
    const res = await postToScript(APPS_SCRIPT_URL, {
      action: 'saveSheet', token, sheet, data: mapped
    });
    console.log(res.success ? '✅' : '❌ ' + res.error);
  }

  // ── Pages ────────────────────────────────────────────────────
  const pagesArray = Object.entries(db.pages || {}).map(([pageId, v]) => ({
    pageId, title: v.title || '', content: v.content || ''
  }));
  process.stdout.write(`📄 pages (${pagesArray.length} หน้า)... `);
  const pagesRes = await postToScript(APPS_SCRIPT_URL, {
    action: 'saveSheet', token, sheet: 'pages', data: pagesArray
  });
  console.log(pagesRes.success ? '✅' : '❌ ' + pagesRes.error);

  // ── Newsletters ──────────────────────────────────────────────
  const nlRaw = Array.isArray(db.newsletters) ? db.newsletters
               : (db.newsletters ? [db.newsletters] : []);
  const nlClean = nlRaw.map(item => cleanItem(item));
  const nlMapped = mapToSheets('newsletters', nlClean);
  process.stdout.write(`📰 newsletters (${nlMapped.length} รายการ)... `);
  const nlRes = await postToScript(APPS_SCRIPT_URL, {
    action: 'saveSheet', token, sheet: 'newsletters', data: nlMapped
  });
  console.log(nlRes.success ? '✅' : '❌ ' + nlRes.error);

  console.log('\n🎉 Migration เสร็จสมบูรณ์!');
  console.log('⚠️  รูปภาพ base64 ถูกล้างออก — อัปโหลดใหม่ผ่าน Drive ได้ใน Admin Panel');
}

// Convert Frontend format to Google Sheets format
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
    const folderId = db.config?.googleDriveFolder || '';
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

migrate().catch(err => {
  console.error('\n❌ เกิดข้อผิดพลาด:', err.message);
  process.exit(1);
});
