// Admin Dashboard Core Logic for School Website Template (Netlify Serverless version)

// Resolve placeholder images client-side for serverless deployment
function resolveImageUrl(url) {
  if (!url) return '';
  if (url.startsWith('/api/placeholder/') || url.includes('/api/placeholder/')) {
    try {
      const idx = url.indexOf('/api/placeholder/');
      const subUrl = url.substring(idx + '/api/placeholder/'.length);
      const parts = subUrl.split('?');
      const pathParts = parts[0].split('/');
      const width = parseInt(pathParts[0]) || 300;
      const height = parseInt(pathParts[1]) || 200;
      const params = new URLSearchParams(parts[1] || '');
      const text = params.get('text') || `${width}x${height}`;
      const bg = params.get('bg') || '#e2e8f0';
      const color = params.get('color') || '#475569';
      
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><rect width="100%" height="100%" fill="${bg}"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-family="'Sarabun', sans-serif, system-ui" font-size="${Math.max(11, height / 8)}px" fill="${color}" font-weight="bold">${text}</text></svg>`;
      
      // Use Base64 encoding for compatibility with iOS Safari / Chrome
      const base64Svg = btoa(unescape(encodeURIComponent(svg)));
      return `data:image/svg+xml;base64,${base64Svg}`;
    } catch (e) {
      console.error("Failed to parse placeholder URL:", url, e);
    }
  }
  if (url.startsWith('/uploads/')) {
    return '..' + url;
  }
  return url;
}

// State storage
let schoolData = {};
let uploadedLogoUrl = '';
let uploadedHeaderLogoUrl = '';
let uploadedHeaderBgUrl = '';
let tempUploads = {
  banner: '',
  slider: '',
  board: '',
  activity: '',
  newsImg: '',
  newsPdf: '',
  newsletter: ''
};

// Check Token on Load
document.addEventListener('DOMContentLoaded', () => {
  const token = sessionStorage.getItem('admin_token');
  if (!token) {
    window.location.href = 'login.html';
    return;
  }

  // Load all data
  loadAllData();
});

// Serverless LocalStorage Database Helper
async function getDatabase() {
  const localData = localStorage.getItem('school_database');
  if (localData) {
    return JSON.parse(localData);
  }
  try {
    const res = await fetch('../data/database.json');
    const data = await res.json();
    localStorage.setItem('school_database', JSON.stringify(data));
    return data;
  } catch (error) {
    console.error("Failed to fetch database.json:", error);
    return {};
  }
}

// Write to LocalStorage Database Helper
function saveDatabase(db) {
  localStorage.setItem('school_database', JSON.stringify(db));
  schoolData = db;
}

// Helper to convert File to Base64 String
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = error => reject(error);
    reader.readAsDataURL(file);
  });
}

// Local File Upload Mock (converts to Base64 data url)
async function mockUploadFile(fileInput) {
  if (!fileInput.files || fileInput.files.length === 0) return null;
  const file = fileInput.files[0];
  try {
    const base64Url = await fileToBase64(file);
    showToast('อัปโหลดไฟล์จำลองสำเร็จ (แปลงเป็น Base64)');
    return base64Url;
  } catch (error) {
    console.error("FileReader error:", error);
    showToast('ไม่สามารถจำลองอัปโหลดไฟล์รูปภาพได้', true);
    return null;
  }
}

// Logout
function logoutAdmin() {
  sessionStorage.removeItem('admin_token');
  window.location.href = 'login.html';
}

// Fetch all database config on startup
async function loadAllData() {
  try {
    schoolData = await getDatabase();
    
    // Bind UI elements
    populateGeneralInfo();
    populateHeaderInfo();
    renderMenusTable();
    renderBannersGrid();
    renderSlidersList();
    renderNewsTable();
    renderBoardList();
    renderActivitiesGrid();
    renderVideosList();
    renderPartnersList();
    renderNewslettersList();
    populateGDriveFolderInfo();
    populateGDriveBannersInfo();
    
    // Setup initial colors for admin UI preview if needed
    if (schoolData.config) {
      document.documentElement.style.setProperty('--primary', schoolData.config.primaryColor || '#8b0000');
      document.documentElement.style.setProperty('--secondary', schoolData.config.secondaryColor || '#ffd700');
    }
  } catch (error) {
    console.error('Error fetching data:', error);
    showToast('ไม่สามารถดึงข้อมูลการตั้งค่าเริ่มต้นได้', true);
  }
}

// Show Toast Alert
function showToast(message, isError = false) {
  const toast = document.getElementById('toast-notification');
  if (!toast) return;
  
  toast.textContent = message;
  toast.className = isError ? 'show error' : 'show';
  
  setTimeout(() => {
    toast.className = '';
  }, 3000);
}

// Tab Switcher
function switchTab(tabId, btn) {
  // Hide all sections
  const sections = document.querySelectorAll('.admin-section');
  sections.forEach(sec => sec.classList.remove('active'));
  
  // Show target
  const target = document.getElementById(tabId);
  if (target) target.classList.add('active');
  
  // Update active button style
  const tabBtns = document.querySelectorAll('.admin-tab-btn');
  tabBtns.forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');

  // Trigger page editor refresh if pages tab is loaded
  if (tabId === 'tab-pages') {
    // Hide editor box by default until page selected
    document.getElementById('page-editor-container').style.display = 'none';
  }
}

// --- GENERAL CONFIG SETTINGS ---
function populateGeneralInfo() {
  const cfg = schoolData.config;
  if (!cfg) return;
  
  document.getElementById('schoolName').value = cfg.schoolName || '';
  document.getElementById('schoolNameEn').value = cfg.schoolNameEn || '';
  document.getElementById('slogan').value = cfg.slogan || '';
  document.getElementById('hotInfo').value = cfg.hotInfo || '';
  document.getElementById('primaryColor').value = cfg.primaryColor || '#8b0000';
  document.getElementById('secondaryColor').value = cfg.secondaryColor || '#ffd700';
  document.getElementById('bgColor').value = cfg.bgColor || '#f3f4f6';
  
  document.getElementById('contactAddress').value = cfg.contact?.address || '';
  document.getElementById('contactPhone').value = cfg.contact?.phone || '';
  document.getElementById('contactEmail').value = cfg.contact?.email || '';
  document.getElementById('contactFB').value = cfg.contact?.facebook || '';
  document.getElementById('contactYT').value = cfg.contact?.youtube || '';
  document.getElementById('footerText').value = cfg.footerText || '';
  
  uploadedLogoUrl = cfg.logo || '';
  document.getElementById('logo-preview').src = resolveImageUrl(uploadedLogoUrl) || '../uploads/logo_default.png';
}

async function handleLogoUpload(event) {
  const url = await mockUploadFile(event.target);
  if (url) {
    uploadedLogoUrl = url;
    document.getElementById('logo-preview').src = url;
  }
}

async function saveGeneralConfig() {
  const db = await getDatabase();
  db.config = {
    ...db.config,
    schoolName: document.getElementById('schoolName').value,
    schoolNameEn: document.getElementById('schoolNameEn').value,
    slogan: document.getElementById('slogan').value,
    hotInfo: document.getElementById('hotInfo').value,
    primaryColor: document.getElementById('primaryColor').value,
    secondaryColor: document.getElementById('secondaryColor').value,
    bgColor: document.getElementById('bgColor').value,
    logo: uploadedLogoUrl,
    footerText: document.getElementById('footerText').value,
    contact: {
      address: document.getElementById('contactAddress').value,
      phone: document.getElementById('contactPhone').value,
      email: document.getElementById('contactEmail').value,
      facebook: document.getElementById('contactFB').value,
      youtube: document.getElementById('contactYT').value
    }
  };

  saveDatabase(db);
  showToast('บันทึกการตั้งค่าทั่วไป (เดโม) สำเร็จ');
  loadAllData();
}

// --- HEADER CONFIG SETTINGS ---
function populateHeaderInfo() {
  const cfg = schoolData.config;
  if (!cfg) return;
  
  document.getElementById('headerSchoolName').value = cfg.schoolName || '';
  document.getElementById('headerSchoolNameEn').value = cfg.schoolNameEn || '';
  document.getElementById('headerSlogan').value = cfg.slogan || '';
  
  // Load text colors
  document.getElementById('headerTitleColor').value = cfg.headerTitleColor || cfg.secondaryColor || '#ffd700';
  document.getElementById('headerSubtitleColor').value = cfg.headerSubtitleColor || '#ffffff';

  // Load height (padding)
  const paddingY = cfg.headerPaddingY !== undefined ? cfg.headerPaddingY : 24;
  document.getElementById('headerPaddingY').value = paddingY;
  document.getElementById('headerPaddingY-val').textContent = paddingY;

  // Load element sizes
  const logoSize = cfg.headerLogoSize !== undefined ? cfg.headerLogoSize : 115;
  document.getElementById('headerLogoSize').value = logoSize;
  document.getElementById('headerLogoSize-val').textContent = logoSize;

  const titleSize = cfg.headerTitleSize !== undefined ? cfg.headerTitleSize : 2.4;
  document.getElementById('headerTitleSize').value = titleSize;
  document.getElementById('headerTitleSize-val').textContent = titleSize;

  const subtitleSize = cfg.headerSubtitleSize !== undefined ? cfg.headerSubtitleSize : 1.3;
  document.getElementById('headerSubtitleSize').value = subtitleSize;
  document.getElementById('headerSubtitleSize-val').textContent = subtitleSize;

  uploadedHeaderLogoUrl = cfg.logo || '';
  document.getElementById('header-logo-preview').src = resolveImageUrl(uploadedHeaderLogoUrl) || '../uploads/logo_default.png';

  uploadedHeaderBgUrl = cfg.headerBg || '';
  document.getElementById('header-bg-preview').src = resolveImageUrl(uploadedHeaderBgUrl) || '../uploads/header_bg.jpg';

  // Load image vertical position
  const posY = cfg.headerBgPosY !== undefined ? cfg.headerBgPosY : 50;
  document.getElementById('headerBgPosY').value = posY;
  document.getElementById('headerBgPosY-val').textContent = posY;
  document.getElementById('header-bg-preview').style.objectPosition = `center ${posY}%`;

  // Load overlay opacities
  const op1 = cfg.headerOp1 !== undefined ? Math.round(parseFloat(cfg.headerOp1) * 100) : 88;
  const op2 = cfg.headerOp2 !== undefined ? Math.round(parseFloat(cfg.headerOp2) * 100) : 55;
  const op3 = cfg.headerOp3 !== undefined ? Math.round(parseFloat(cfg.headerOp3) * 100) : 20;

  document.getElementById('headerOp1').value = op1;
  document.getElementById('headerOp1-val').textContent = op1;
  document.getElementById('headerOp2').value = op2;
  document.getElementById('headerOp2-val').textContent = op2;
  document.getElementById('headerOp3').value = op3;
  document.getElementById('headerOp3-val').textContent = op3;
}

async function handleHeaderLogoUpload(event) {
  const url = await mockUploadFile(event.target);
  if (url) {
    uploadedHeaderLogoUrl = url;
    document.getElementById('header-logo-preview').src = url;
  }
}

async function handleHeaderBgUpload(event) {
  const url = await mockUploadFile(event.target);
  if (url) {
    uploadedHeaderBgUrl = url;
    document.getElementById('header-bg-preview').src = url;
    const posY = document.getElementById('headerBgPosY').value;
    document.getElementById('header-bg-preview').style.objectPosition = `center ${posY}%`;
  }
}

async function saveHeaderConfig() {
  const db = await getDatabase();
  const op1 = parseFloat(document.getElementById('headerOp1').value) / 100;
  const op2 = parseFloat(document.getElementById('headerOp2').value) / 100;
  const op3 = parseFloat(document.getElementById('headerOp3').value) / 100;

  db.config = {
    ...db.config,
    schoolName: document.getElementById('headerSchoolName').value,
    schoolNameEn: document.getElementById('headerSchoolNameEn').value,
    slogan: document.getElementById('headerSlogan').value,
    logo: uploadedHeaderLogoUrl,
    headerBg: uploadedHeaderBgUrl,
    headerTitleColor: document.getElementById('headerTitleColor').value,
    headerSubtitleColor: document.getElementById('headerSubtitleColor').value,
    headerPaddingY: parseInt(document.getElementById('headerPaddingY').value),
    headerBgPosY: parseInt(document.getElementById('headerBgPosY').value),
    headerLogoSize: parseInt(document.getElementById('headerLogoSize').value),
    headerTitleSize: parseFloat(document.getElementById('headerTitleSize').value),
    headerSubtitleSize: parseFloat(document.getElementById('headerSubtitleSize').value),
    headerOp1: op1,
    headerOp2: op2,
    headerOp3: op3
  };

  saveDatabase(db);
  showToast('บันทึกข้อมูล Header (เดโม) สำเร็จแล้ว');
  loadAllData();
}

// --- MENUS MANAGEMENT ---
function renderMenusTable() {
  const container = document.getElementById('menus-list-container');
  if (!container) return;
  
  container.innerHTML = '';
  const list = schoolData.menus || [];
  
  if (list.length === 0) {
    container.innerHTML = '<p style="text-align:center; padding: 20px; color: var(--admin-text-muted);">ยังไม่มีเมนูใดๆ</p>';
    return;
  }

  list.forEach((menu) => {
    const div = document.createElement('div');
    div.className = 'admin-list-item';
    
    div.innerHTML = `
      <div class="admin-list-info">
        <div class="admin-list-text">
          <h4>${menu.label}</h4>
          <p>ลิงก์: ${menu.url} ${menu.isExternal ? ' <span style="color:var(--admin-accent);">(เปิดในหน้าใหม่)</span>' : ''}</p>
        </div>
      </div>
      <div class="admin-list-actions">
        <button class="admin-btn primary" onclick="openMenuModal('${menu.id}')">แก้ไข</button>
        <button class="admin-btn danger" onclick="deleteMenu('${menu.id}')">ลบ</button>
      </div>
    `;
    container.appendChild(div);
  });
}

function openMenuModal(id = '') {
  const modal = document.getElementById('modal-menu');
  const title = document.getElementById('modal-menu-title');
  
  document.getElementById('menu-id').value = id;
  
  if (id) {
    title.textContent = 'แก้ไขลิงก์เมนู';
    const item = schoolData.menus.find(m => m.id === id);
    document.getElementById('menu-label').value = item.label;
    document.getElementById('menu-url').value = item.url;
    document.getElementById('menu-external').checked = item.isExternal;
  } else {
    title.textContent = 'เพิ่มลิงก์เมนูหลักใหม่';
    document.getElementById('menu-label').value = '';
    document.getElementById('menu-url').value = '';
    document.getElementById('menu-external').checked = false;
  }
  
  modal.classList.add('show');
}

async function submitMenuForm() {
  const db = await getDatabase();
  const id = document.getElementById('menu-id').value;
  const label = document.getElementById('menu-label').value;
  const url = document.getElementById('menu-url').value;
  const isExternal = document.getElementById('menu-external').checked;
  
  if (!label || !url) {
    showToast('กรุณากรอกข้อมูลให้ครบถ้วน', true);
    return;
  }
  
  if (!db.menus) db.menus = [];
  
  if (id) {
    const idx = db.menus.findIndex(m => m.id === id);
    if (idx !== -1) {
      db.menus[idx] = { id, label, url, isExternal };
    }
  } else {
    const newId = 'menu_' + Date.now();
    db.menus.push({ id: newId, label, url, isExternal });
  }
  
  saveDatabase(db);
  closeModal('modal-menu');
  showToast('บันทึกเมนูสำเร็จ');
  loadAllData();
}

async function deleteMenu(id) {
  if (!confirm('ยืนยันที่จะลบเมนูนี้หรือไม่?')) return;
  const db = await getDatabase();
  db.menus = (db.menus || []).filter(m => m.id !== id);
  saveDatabase(db);
  showToast('ลบรายการเมนูสำเร็จ');
  loadAllData();
}

// --- BANNERS MANAGEMENT ---
function renderBannersGrid() {
  const container = document.getElementById('banners-list-container');
  if (!container) return;
  
  container.innerHTML = '';
  const list = schoolData.banners || [];
  
  if (list.length === 0) {
    container.innerHTML = '<p style="text-align:center; padding: 20px; color: var(--admin-text-muted); grid-column: 1/-1;">ยังไม่มีแบนเนอร์บริการใดๆ</p>';
    return;
  }

  list.forEach((item) => {
    const div = document.createElement('div');
    div.className = 'admin-list-item';
    div.style.flexDirection = 'column';
    div.style.alignItems = 'stretch';
    
    div.innerHTML = `
      <div style="display:flex; gap:15px; align-items:center; margin-bottom:12px;">
        <img class="admin-list-thumb" src="${resolveImageUrl(item.image)}" alt="thumb" style="width:120px; height:45px; object-fit:contain; background:#f1f5f9;">
        <div class="admin-list-text" style="flex-grow:1;">
          <h4 style="margin:0;">${item.title}</h4>
          <p style="margin:2px 0 0 0; word-break:break-all; font-size:0.75rem;">ลิงก์: ${item.url}</p>
        </div>
      </div>
      <div class="admin-list-actions" style="justify-content: flex-end;">
        <button class="admin-btn primary" onclick="openBannerModal('${item.id}')">แก้ไข</button>
        <button class="admin-btn danger" onclick="deleteBanner('${item.id}')">ลบ</button>
      </div>
    `;
    container.appendChild(div);
  });
}

function openBannerModal(id = '') {
  const modal = document.getElementById('modal-banner');
  const title = document.getElementById('modal-banner-title');
  const gdriveInput = document.getElementById('banner-gdrive-url');
  
  document.getElementById('banner-id').value = id;
  tempUploads.banner = '';
  
  if (id) {
    title.textContent = 'แก้ไขแบนเนอร์บริการ';
    const item = schoolData.banners.find(b => b.id === id);
    document.getElementById('banner-title').value = item.title;
    document.getElementById('banner-url').value = item.url;
    document.getElementById('banner-external').checked = item.isExternal;
    tempUploads.banner = item.image;
    document.getElementById('banner-preview').src = resolveImageUrl(item.image);
    
    if (gdriveInput) {
      if (item.image && (item.image.includes('lh3.googleusercontent.com') || item.image.includes('drive.google.com'))) {
        gdriveInput.value = item.image;
      } else {
        gdriveInput.value = '';
      }
    }
  } else {
    title.textContent = 'เพิ่มแบนเนอร์บริการใหม่';
    document.getElementById('banner-title').value = '';
    document.getElementById('banner-url').value = '';
    document.getElementById('banner-external').checked = true;
    document.getElementById('banner-preview').src = 'https://placehold.co/250x60/3b82f6/ffffff?text=Service+Banner';
    if (gdriveInput) gdriveInput.value = '';
  }
  
  modal.classList.add('show');
}

async function submitBannerForm() {
  const db = await getDatabase();
  const id = document.getElementById('banner-id').value;
  const title = document.getElementById('banner-title').value;
  const url = document.getElementById('banner-url').value;
  const isExternal = document.getElementById('banner-external').checked;
  const image = tempUploads.banner || 'https://placehold.co/250x60/3b82f6/ffffff?text=Banner';
  
  if (!title || !url) {
    showToast('กรุณากรอกข้อมูลให้ครบถ้วน', true);
    return;
  }
  
  if (!db.banners) db.banners = [];
  
  if (id) {
    const idx = db.banners.findIndex(b => b.id === id);
    if (idx !== -1) {
      db.banners[idx] = { id, title, url, image, isExternal };
    }
  } else {
    const newId = 'banner_' + Date.now();
    db.banners.push({ id: newId, title, url, image, isExternal });
  }
  
  saveDatabase(db);
  closeModal('modal-banner');
  showToast('บันทึกแบนเนอร์สำเร็จ');
  loadAllData();
}

async function deleteBanner(id) {
  if (!confirm('ยืนยันที่จะลบแบนเนอร์นี้หรือไม่?')) return;
  const db = await getDatabase();
  db.banners = (db.banners || []).filter(b => b.id !== id);
  saveDatabase(db);
  showToast('ลบแบนเนอร์สำเร็จ');
  loadAllData();
}

// --- SLIDER MANAGEMENT ---
function renderSlidersList() {
  const container = document.getElementById('slider-list-container');
  if (!container) return;
  
  container.innerHTML = '';
  const list = schoolData.slider || [];
  
  if (list.length === 0) {
    container.innerHTML = '<p style="text-align:center; padding: 20px; color: var(--admin-text-muted);">ยังไม่มีรูปภาพสไลด์ประชาสัมพันธ์ใดๆ</p>';
    return;
  }

  list.forEach((slide) => {
    const div = document.createElement('div');
    div.className = 'admin-list-item';
    
    div.innerHTML = `
      <div class="admin-list-info">
        <img class="admin-list-thumb" src="${resolveImageUrl(slide.image)}" alt="slide" style="width:120px; height:70px; object-fit:cover;">
        <div class="admin-list-text">
          <h4>${slide.caption}</h4>
          <p>ลิงก์เชื่อมโยง: ${slide.link}</p>
        </div>
      </div>
      <div class="admin-list-actions">
        <button class="admin-btn primary" onclick="openSliderModal('${slide.id}')">แก้ไข</button>
        <button class="admin-btn danger" onclick="deleteSlider('${slide.id}')">ลบ</button>
      </div>
    `;
    container.appendChild(div);
  });
}

function openSliderModal(id = '') {
  const modal = document.getElementById('modal-slider');
  const title = document.getElementById('modal-slider-title');
  
  document.getElementById('slider-id').value = id;
  tempUploads.slider = '';
  
  if (id) {
    title.textContent = 'แก้ไขรูปภาพสไลด์';
    const item = schoolData.slider.find(s => s.id === id);
    document.getElementById('slider-caption').value = item.caption;
    document.getElementById('slider-link').value = item.link;
    tempUploads.slider = item.image;
    document.getElementById('slider-preview').src = resolveImageUrl(item.image);
  } else {
    title.textContent = 'เพิ่มสไลด์ประชาสัมพันธ์ใหม่';
    document.getElementById('slider-caption').value = '';
    document.getElementById('slider-link').value = '#';
    document.getElementById('slider-preview').src = 'https://placehold.co/1200x450/1e293b/ffffff?text=Slider+Preview';
  }
  
  modal.classList.add('show');
}

async function submitSliderForm() {
  const db = await getDatabase();
  const id = document.getElementById('slider-id').value;
  const caption = document.getElementById('slider-caption').value;
  const link = document.getElementById('slider-link').value;
  const image = tempUploads.slider || 'https://placehold.co/1200x450/1e293b/ffffff?text=Slider';
  
  if (!caption) {
    showToast('กรุณากรอกคำอธิบายภาพสไลด์', true);
    return;
  }
  
  if (!db.slider) db.slider = [];
  
  if (id) {
    const idx = db.slider.findIndex(s => s.id === id);
    if (idx !== -1) {
      db.slider[idx] = { id, caption, link, image };
    }
  } else {
    const newId = 'slide_' + Date.now();
    db.slider.push({ id: newId, caption, link, image });
  }
  
  saveDatabase(db);
  closeModal('modal-slider');
  showToast('บันทึกรูปภาพสไลด์สำเร็จ');
  loadAllData();
}

async function deleteSlider(id) {
  if (!confirm('ยืนยันที่จะลบรูปสไลด์นี้หรือไม่?')) return;
  const db = await getDatabase();
  db.slider = (db.slider || []).filter(s => s.id !== id);
  saveDatabase(db);
  showToast('ลบรูปภาพสไลด์สำเร็จ');
  loadAllData();
}

// --- NEWS MANAGEMENT ---
function renderNewsTable() {
  const tableBody = document.getElementById('news-admin-table-body');
  if (!tableBody) return;
  
  tableBody.innerHTML = '';
  // Sort by date desc
  const list = (schoolData.announcements || []).sort((a, b) => new Date(b.date) - new Date(a.date));
  
  if (list.length === 0) {
    tableBody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:20px; color:var(--admin-text-muted);">ยังไม่มีข้อมูลข่าวประชาสัมพันธ์</td></tr>';
    return;
  }

  list.forEach(item => {
    const tr = document.createElement('tr');
    
    tr.innerHTML = `
      <td>${formatDate(item.date)}</td>
      <td><span class="news-category-tag" style="background:#e2e8f0; color:#334155; padding:2px 8px; border-radius:4px; font-size:0.75rem;">${item.category}</span></td>
      <td><strong>${item.title}</strong></td>
      <td>${item.fileUrl ? '<span style="color:var(--admin-success)">มีไฟล์แนบ</span>' : '<span style="color:var(--admin-text-muted)">ไม่มี</span>'}</td>
      <td style="text-align:center;">
        <div class="admin-list-actions" style="justify-content:center;">
          <button class="admin-btn primary" onclick="openNewsModal('${item.id}')" style="padding:6px 10px; font-size:0.8rem;">แก้ไข</button>
          <button class="admin-btn danger" onclick="deleteNews('${item.id}')" style="padding:6px 10px; font-size:0.8rem;">ลบ</button>
        </div>
      </td>
    `;
    tableBody.appendChild(tr);
  });
}

function openNewsModal(id = '') {
  const modal = document.getElementById('modal-news');
  const title = document.getElementById('modal-news-title');
  
  document.getElementById('news-id').value = id;
  tempUploads.newsImg = '';
  tempUploads.newsPdf = '';
  
  if (id) {
    title.textContent = 'แก้ไขประกาศ/ข่าวประชาสัมพันธ์';
    const item = schoolData.announcements.find(n => n.id === id);
    document.getElementById('news-title-input').value = item.title;
    document.getElementById('news-date').value = item.date;
    document.getElementById('news-category').value = item.category;
    document.getElementById('news-content').value = item.content;
    
    tempUploads.newsImg = item.imageUrl || '';
    tempUploads.newsPdf = item.fileUrl || '';
    
    document.getElementById('news-preview').style.display = item.imageUrl ? 'block' : 'none';
    document.getElementById('news-preview').src = resolveImageUrl(item.imageUrl) || '';
  } else {
    title.textContent = 'สร้างประกาศ / ข่าวประชาสัมพันธ์ใหม่';
    document.getElementById('news-title-input').value = '';
    document.getElementById('news-date').value = new Date().toISOString().substring(0, 10);
    document.getElementById('news-category').value = 'ข่าวประชาสัมพันธ์';
    document.getElementById('news-content').value = '';
    
    document.getElementById('news-preview').style.display = 'none';
    document.getElementById('news-preview').src = '';
  }
  
  modal.classList.add('show');
}

async function submitNewsForm() {
  const db = await getDatabase();
  const id = document.getElementById('news-id').value;
  const title = document.getElementById('news-title-input').value;
  const date = document.getElementById('news-date').value;
  const category = document.getElementById('news-category').value;
  const content = document.getElementById('news-content').value;
  const imageUrl = tempUploads.newsImg || '';
  const fileUrl = tempUploads.newsPdf || '';
  
  if (!title || !content) {
    showToast('กรุณากรอกหัวข้อและรายละเอียดข่าว', true);
    return;
  }
  
  if (!db.announcements) db.announcements = [];
  
  const newsItem = {
    id: id || 'news_' + Date.now(),
    title,
    date,
    category,
    content,
    imageUrl,
    fileUrl
  };
  
  if (id) {
    const idx = db.announcements.findIndex(n => n.id === id);
    if (idx !== -1) {
      db.announcements[idx] = newsItem;
    }
  } else {
    db.announcements.push(newsItem);
  }
  
  saveDatabase(db);
  closeModal('modal-news');
  showToast('บันทึกข่าวสารสำเร็จ');
  loadAllData();
}

async function deleteNews(id) {
  if (!confirm('ยืนยันที่จะลบประกาศข่าวนี้หรือไม่?')) return;
  const db = await getDatabase();
  db.announcements = (db.announcements || []).filter(n => n.id !== id);
  saveDatabase(db);
  showToast('ลบข่าวสารเรียบร้อยแล้ว');
  loadAllData();
}

// --- BOARD MEMBERS MANAGEMENT ---
function renderBoardList() {
  const container = document.getElementById('board-list-container');
  if (!container) return;
  
  container.innerHTML = '';
  const list = (schoolData.board || []).sort((a,b) => a.order - b.order);
  
  if (list.length === 0) {
    container.innerHTML = '<p style="text-align:center; padding: 20px; color: var(--admin-text-muted);">ยังไม่มีผู้บริหารในระบบ</p>';
    return;
  }

  list.forEach((member) => {
    const div = document.createElement('div');
    div.className = 'admin-list-item';
    
    div.innerHTML = `
      <div class="admin-list-info">
        <img class="admin-list-thumb" src="${resolveImageUrl(member.image)}" alt="member" style="width:70px; height:85px; object-fit:cover; border-radius:4px;">
        <div class="admin-list-text">
          <h4>${member.name}</h4>
          <p>ตำแหน่ง: ${member.position} (ลำดับแสดงผล: ${member.order})</p>
        </div>
      </div>
      <div class="admin-list-actions">
        <button class="admin-btn primary" onclick="openBoardModal('${member.id}')">แก้ไข</button>
        <button class="admin-btn danger" onclick="deleteBoardMember('${member.id}')">ลบ</button>
      </div>
    `;
    container.appendChild(div);
  });
}

function openBoardModal(id = '') {
  const modal = document.getElementById('modal-board');
  const title = document.getElementById('modal-board-title');
  
  document.getElementById('board-id').value = id;
  tempUploads.board = '';
  
  if (id) {
    title.textContent = 'แก้ไขคณะผู้บริหาร';
    const item = schoolData.board.find(b => b.id === id);
    document.getElementById('board-name').value = item.name;
    document.getElementById('board-pos').value = item.position;
    document.getElementById('board-order').value = item.order;
    tempUploads.board = item.image;
    document.getElementById('board-preview').src = resolveImageUrl(item.image);
  } else {
    title.textContent = 'เพิ่มคณะผู้บริหารใหม่';
    document.getElementById('board-name').value = '';
    document.getElementById('board-pos').value = '';
    document.getElementById('board-order').value = (schoolData.board || []).length + 1;
    document.getElementById('board-preview').src = 'https://placehold.co/150x200/475569/ffffff?text=Director+Photo';
  }
  
  modal.classList.add('show');
}

async function submitBoardForm() {
  const db = await getDatabase();
  const id = document.getElementById('board-id').value;
  const name = document.getElementById('board-name').value;
  const position = document.getElementById('board-pos').value;
  const order = parseInt(document.getElementById('board-order').value) || 10;
  const image = tempUploads.board || 'https://placehold.co/150x200/475569/ffffff?text=Boss';
  
  if (!name || !position) {
    showToast('กรุณากรอกข้อมูลชื่อและตำแหน่งให้ครบถ้วน', true);
    return;
  }
  
  if (!db.board) db.board = [];
  
  if (id) {
    const idx = db.board.findIndex(b => b.id === id);
    if (idx !== -1) {
      db.board[idx] = { id, name, position, order, image };
    }
  } else {
    const newId = 'boss_' + Date.now();
    db.board.push({ id: newId, name, position, order, image });
  }
  
  saveDatabase(db);
  closeModal('modal-board');
  showToast('บันทึกทำเนียบผู้บริหารสำเร็จ');
  loadAllData();
}

async function deleteBoardMember(id) {
  if (!confirm('ยืนยันลบรายชื่อผู้บริหารนี้?')) return;
  const db = await getDatabase();
  db.board = (db.board || []).filter(b => b.id !== id);
  saveDatabase(db);
  showToast('ลบข้อมูลผู้บริหารสำเร็จ');
  loadAllData();
}

// --- ACTIVITIES GALLERY MANAGEMENT ---
function renderActivitiesGrid() {
  const container = document.getElementById('activities-list-container');
  if (!container) return;
  
  container.innerHTML = '';
  const list = schoolData.activities || [];
  
  if (list.length === 0) {
    container.innerHTML = '<p style="text-align:center; padding: 20px; color: var(--admin-text-muted); grid-column:1/-1;">ยังไม่มีภาพกิจกรรมเด่นใดๆ</p>';
    return;
  }

  list.forEach((item) => {
    const div = document.createElement('div');
    div.className = 'admin-list-item';
    div.style.flexDirection = 'column';
    div.style.alignItems = 'stretch';
    
    div.innerHTML = `
      <div style="display:flex; gap:15px; align-items:center; margin-bottom:12px;">
        <img class="admin-list-thumb" src="${resolveImageUrl(item.image)}" alt="thumb" style="width:100px; height:65px;">
        <div class="admin-list-text" style="flex-grow:1;">
          <h4 style="margin:0;">${item.title}</h4>
          <p style="margin:2px 0 0 0; font-size:0.75rem;">วันที่: ${item.date}</p>
        </div>
      </div>
      <div class="admin-list-actions" style="justify-content: flex-end;">
        <button class="admin-btn primary" onclick="openActivityModal('${item.id}')">แก้ไข</button>
        <button class="admin-btn danger" onclick="deleteActivity('${item.id}')">ลบ</button>
      </div>
    `;
    container.appendChild(div);
  });
}

function openActivityModal(id = '') {
  const modal = document.getElementById('modal-activity');
  const title = document.getElementById('modal-activity-title');
  
  document.getElementById('activity-id').value = id;
  tempUploads.activity = '';
  
  if (id) {
    title.textContent = 'แก้ไขกิจกรรมประชาสัมพันธ์';
    const item = schoolData.activities.find(a => a.id === id);
    document.getElementById('activity-title').value = item.title;
    document.getElementById('activity-date').value = item.date;
    document.getElementById('activity-desc').value = item.description;
    document.getElementById('activity-link').value = item.link || '#';
    tempUploads.activity = item.image;
    document.getElementById('activity-preview').src = resolveImageUrl(item.image);
  } else {
    title.textContent = 'เพิ่มกิจกรรมใหม่';
    document.getElementById('activity-title').value = '';
    document.getElementById('activity-date').value = new Date().toISOString().substring(0, 10);
    document.getElementById('activity-desc').value = '';
    document.getElementById('activity-link').value = '#';
    document.getElementById('activity-preview').src = 'https://placehold.co/400x250/1e293b/ffffff?text=Upload+Photo';
  }
  
  modal.classList.add('show');
}

async function submitActivityForm() {
  const db = await getDatabase();
  const id = document.getElementById('activity-id').value;
  const title = document.getElementById('activity-title').value;
  const date = document.getElementById('activity-date').value;
  const description = document.getElementById('activity-desc').value;
  const link = document.getElementById('activity-link').value;
  const image = tempUploads.activity || 'https://placehold.co/400x250/1e293b/ffffff?text=Gallery';
  
  if (!title || !description) {
    showToast('กรุณากรอกหัวข้อข่าวและรายละเอียดกิจกรรม', true);
    return;
  }
  
  if (!db.activities) db.activities = [];
  
  const actItem = { id: id || 'act_' + Date.now(), title, date, description, link, image };
  
  if (id) {
    const idx = db.activities.findIndex(a => a.id === id);
    if (idx !== -1) {
      db.activities[idx] = actItem;
    }
  } else {
    db.activities.push(actItem);
  }
  
  saveDatabase(db);
  closeModal('modal-activity');
  showToast('บันทึกภาพกิจกรรมสำเร็จ');
  loadAllData();
}

async function deleteActivity(id) {
  if (!confirm('ยืนยันลบกิจกรรมเด่นชิ้นนี้?')) return;
  const db = await getDatabase();
  db.activities = (db.activities || []).filter(a => a.id !== id);
  saveDatabase(db);
  showToast('ลบภาพกิจกรรมสำเร็จ');
  loadAllData();
}

// --- VIDEO INTRODUCTIONS MANAGEMENT ---
function renderVideosList() {
  const container = document.getElementById('videos-list-container');
  if (!container) return;
  
  container.innerHTML = '';
  const list = schoolData.videos || [];
  
  if (list.length === 0) {
    container.innerHTML = '<p style="text-align:center; padding: 20px; color: var(--admin-text-muted); grid-column:1/-1;">ยังไม่มีวิดีโอแนะนำในขณะนี้</p>';
    return;
  }

  list.forEach(video => {
    const div = document.createElement('div');
    div.className = 'admin-list-item';
    div.style.flexDirection = 'column';
    div.style.alignItems = 'stretch';
    
    div.innerHTML = `
      <div style="display:flex; gap:15px; align-items:center; margin-bottom:12px;">
        <img class="admin-list-thumb" src="https://img.youtube.com/vi/${video.youtubeId}/hqdefault.jpg" alt="yt-thumb" style="width:100px; height:60px; object-fit:cover;">
        <div class="admin-list-text" style="flex-grow:1;">
          <h4 style="margin:0;">${video.title}</h4>
          <p style="margin:2px 0 0 0; font-size:0.75rem; color:var(--admin-accent);">ID: ${video.youtubeId}</p>
        </div>
      </div>
      <div class="admin-list-actions" style="justify-content: flex-end;">
        <button class="admin-btn primary" onclick="openVideoModal('${video.id}')">แก้ไข</button>
        <button class="admin-btn danger" onclick="deleteVideo('${video.id}')">ลบ</button>
      </div>
    `;
    container.appendChild(div);
  });
}

function openVideoModal(id = '') {
  const modal = document.getElementById('modal-video');
  const title = document.getElementById('modal-video-title');
  
  document.getElementById('video-id').value = id;
  
  if (id) {
    title.textContent = 'แก้ไขข้อมูลวิดีโอแนะนำ';
    const item = schoolData.videos.find(v => v.id === id);
    document.getElementById('video-title').value = item.title;
    document.getElementById('video-youtube-id').value = item.youtubeId;
    document.getElementById('video-desc').value = item.desc;
  } else {
    title.textContent = 'เพิ่มวิดีโอใหม่';
    document.getElementById('video-title').value = '';
    document.getElementById('video-youtube-id').value = '';
    document.getElementById('video-desc').value = '';
  }
  modal.classList.add('show');
}

async function submitVideoForm() {
  const db = await getDatabase();
  const id = document.getElementById('video-id').value;
  const title = document.getElementById('video-title').value;
  const youtubeId = document.getElementById('video-youtube-id').value;
  const desc = document.getElementById('video-desc').value;
  
  if (!title || !youtubeId) {
    showToast('กรุณากรอกหัวข้อและ YouTube Video ID', true);
    return;
  }
  
  if (!db.videos) db.videos = [];
  
  const videoItem = { id: id || 'v_' + Date.now(), title, youtubeId, desc };
  
  if (id) {
    const idx = db.videos.findIndex(v => v.id === id);
    if (idx !== -1) {
      db.videos[idx] = videoItem;
    }
  } else {
    db.videos.push(videoItem);
  }
  
  saveDatabase(db);
  closeModal('modal-video');
  showToast('บันทึกข้อมูลวิดีโอสำเร็จ');
  loadAllData();
}

async function deleteVideo(id) {
  if (!confirm('ยืนยันลบวิดีโอนี้?')) return;
  const db = await getDatabase();
  db.videos = (db.videos || []).filter(v => v.id !== id);
  saveDatabase(db);
  showToast('ลบวิดีโอสำเร็จ');
  loadAllData();
}

// --- PARTNER NETWORKS MANAGEMENT ---
function renderPartnersList() {
  const container = document.getElementById('partners-list-container');
  if (!container) return;
  
  container.innerHTML = '';
  const list = schoolData.partners || [];
  
  if (list.length === 0) {
    container.innerHTML = '<p style="text-align:center; padding: 20px; color: var(--admin-text-muted); grid-column:1/-1;">ยังไม่มีเครือข่ายภาคีในระบบ</p>';
    return;
  }

  list.forEach(partner => {
    const div = document.createElement('div');
    div.className = 'admin-list-item';
    div.style.flexDirection = 'column';
    div.style.alignItems = 'stretch';
    
    div.innerHTML = `
      <div style="display:flex; gap:15px; align-items:center; margin-bottom:12px;">
        <img class="admin-list-thumb" src="${resolveImageUrl(partner.image)}" alt="partner-thumb" style="width:80px; height:80px; object-fit:contain; background:#fff; border:1px solid #e2e8f0;">
        <div class="admin-list-text" style="flex-grow:1;">
          <h4 style="margin:0;">${partner.title}</h4>
          <p style="margin:2px 0 0 0; font-size:0.75rem; text-overflow:ellipsis; overflow:hidden; white-space:nowrap;">${partner.description}</p>
        </div>
      </div>
      <div class="admin-list-actions" style="justify-content: flex-end;">
        <button class="admin-btn primary" onclick="openPartnerModal('${partner.id}')">แก้ไข</button>
        <button class="admin-btn danger" onclick="deletePartner('${partner.id}')">ลบ</button>
      </div>
    `;
    container.appendChild(div);
  });
}

function openPartnerModal(id = '') {
  const modal = document.getElementById('modal-partner');
  const title = document.getElementById('modal-partner-title');
  
  document.getElementById('partner-id').value = id;
  tempUploads.partner = '';
  
  if (id) {
    title.textContent = 'แก้ไขข้อมูลภาคีพันธมิตร';
    const item = schoolData.partners.find(p => p.id === id);
    document.getElementById('partner-title').value = item.title;
    document.getElementById('partner-desc').value = item.description;
    document.getElementById('partner-url').value = item.url || '#';
    tempUploads.partner = item.image;
    document.getElementById('partner-preview').src = resolveImageUrl(item.image);
  } else {
    title.textContent = 'เพิ่มภาคีพันธมิตรใหม่';
    document.getElementById('partner-title').value = '';
    document.getElementById('partner-desc').value = '';
    document.getElementById('partner-url').value = '#';
    document.getElementById('partner-preview').src = 'https://placehold.co/300x200/f1f5f9/475569?text=Logo+Partner';
  }
  modal.classList.add('show');
}

async function submitPartnerForm() {
  const db = await getDatabase();
  const id = document.getElementById('partner-id').value;
  const title = document.getElementById('partner-title').value;
  const description = document.getElementById('partner-desc').value;
  const url = document.getElementById('partner-url').value;
  const image = tempUploads.partner || 'https://placehold.co/300x200/f1f5f9/475569?text=Logo';
  
  if (!title || !description) {
    showToast('กรุณากรอกชื่อภาคีและรายละเอียดคำอธิบาย', true);
    return;
  }
  
  if (!db.partners) db.partners = [];
  
  const partnerItem = { id: id || 'p_' + Date.now(), title, description, image, url };
  
  if (id) {
    const idx = db.partners.findIndex(p => p.id === id);
    if (idx !== -1) {
      db.partners[idx] = partnerItem;
    }
  } else {
    db.partners.push(partnerItem);
  }
  
  saveDatabase(db);
  closeModal('modal-partner');
  showToast('บันทึกข้อมูลเครือข่ายพันธมิตรสำเร็จ');
  loadAllData();
}

async function deletePartner(id) {
  if (!confirm('ยืนยันลบภาคีเครือข่ายนี้?')) return;
  const db = await getDatabase();
  db.partners = (db.partners || []).filter(p => p.id !== id);
  saveDatabase(db);
  showToast('ลบข้อมูลภาคีเครือข่ายสำเร็จ');
  loadAllData();
}

// --- NEWSLETTERS MANAGEMENT ---
function renderNewslettersList() {
  const container = document.getElementById('newsletters-list-container');
  if (!container) return;
  
  container.innerHTML = '';
  const list = schoolData.newsletters || [];
  
  if (list.length === 0) {
    container.innerHTML = '<p style="text-align:center; padding: 20px; color: var(--admin-text-muted); grid-column:1/-1;">ยังไม่มีจดหมายข่าวในระบบ</p>';
    return;
  }

  const sortedList = list.sort((a,b) => (a.order || 0) - (b.order || 0));

  sortedList.forEach(nl => {
    const div = document.createElement('div');
    div.className = 'admin-list-item';
    div.style.flexDirection = 'column';
    div.style.alignItems = 'stretch';
    
    div.innerHTML = `
      <div style="display:flex; gap:15px; align-items:center; margin-bottom:12px;">
        <img class="admin-list-thumb" src="${resolveImageUrl(nl.image)}" alt="newsletter-thumb" style="width:75px; height:100px; object-fit:cover; background:#fff; border:1px solid #e2e8f0; border-radius:4px;">
        <div class="admin-list-text" style="flex-grow:1;">
          <h4 style="margin:0;">${nl.title}</h4>
          <p style="margin:2px 0 0 0; font-size:0.75rem;">ลำดับการแสดงผล: ${nl.order}</p>
        </div>
      </div>
      <div class="admin-list-actions" style="justify-content: flex-end;">
        <button class="admin-btn primary" onclick="openNewsletterModal('${nl.id}')">แก้ไข</button>
        <button class="admin-btn danger" onclick="deleteNewsletter('${nl.id}')">ลบ</button>
      </div>
    `;
    container.appendChild(div);
  });
}

function openNewsletterModal(id = '') {
  const modal = document.getElementById('modal-newsletter');
  const title = document.getElementById('modal-newsletter-title');
  
  document.getElementById('newsletter-id').value = id;
  tempUploads.newsletter = '';
  
  if (id) {
    title.textContent = 'แก้ไขจดหมายข่าว';
    const item = schoolData.newsletters.find(n => n.id === id);
    document.getElementById('newsletter-title-input').value = item.title;
    document.getElementById('newsletter-order').value = item.order || 1;
    tempUploads.newsletter = item.image;
    document.getElementById('newsletter-preview').src = resolveImageUrl(item.image);
  } else {
    title.textContent = 'เพิ่มจดหมายข่าวประชาสัมพันธ์ใหม่';
    document.getElementById('newsletter-title-input').value = '';
    document.getElementById('newsletter-order').value = (schoolData.newsletters || []).length + 1;
    document.getElementById('newsletter-preview').src = 'https://placehold.co/300x400/f1f5f9/475569?text=A4+Newsletter';
  }
  modal.classList.add('show');
}

async function submitNewsletterForm() {
  const db = await getDatabase();
  const id = document.getElementById('newsletter-id').value;
  const title = document.getElementById('newsletter-title-input').value;
  const order = parseInt(document.getElementById('newsletter-order').value) || 1;
  const image = tempUploads.newsletter || 'https://placehold.co/300x400/f1f5f9/475569?text=A4+Newsletter';
  
  if (!title) {
    showToast('กรุณากรอกหัวข้อจดหมายข่าว', true);
    return;
  }
  
  if (!db.newsletters) db.newsletters = [];
  
  const nlItem = { id: id || 'nl_' + Date.now(), title, order, image };
  
  if (id) {
    const idx = db.newsletters.findIndex(n => n.id === id);
    if (idx !== -1) {
      db.newsletters[idx] = nlItem;
    }
  } else {
    db.newsletters.push(nlItem);
  }
  
  saveDatabase(db);
  closeModal('modal-newsletter');
  showToast('บันทึกข้อมูลจดหมายข่าวสำเร็จ');
  loadAllData();
}

async function deleteNewsletter(id) {
  if (!confirm('ยืนยันลบจดหมายข่าวประชาสัมพันธ์นี้?')) return;
  const db = await getDatabase();
  db.newsletters = (db.newsletters || []).filter(n => n.id !== id);
  saveDatabase(db);
  showToast('ลบจดหมายข่าวสำเร็จ');
  loadAllData();
}

// --- SUB PAGES CONTENT EDITOR ---
let selectedPageId = '';
async function loadPageEditor(pageId) {
  selectedPageId = pageId;
  document.getElementById('edit-page-id').value = pageId;
  
  // Highlight sub tabs
  const subTabs = document.querySelectorAll('#tab-pages .admin-tab-btn');
  subTabs.forEach(tab => tab.classList.remove('active'));
  
  // Find matching tab
  const activeBtn = Array.from(subTabs).find(btn => btn.getAttribute('onclick').includes(pageId));
  if (activeBtn) activeBtn.classList.add('active');

  const db = await getDatabase();
  const page = db.pages ? db.pages[pageId] : null;
  
  if (page) {
    document.getElementById('edit-page-title').value = page.title || '';
    document.getElementById('edit-page-content').value = page.content || '';
    document.getElementById('page-editor-container').style.display = 'block';
  } else {
    document.getElementById('edit-page-title').value = '';
    document.getElementById('edit-page-content').value = '';
    document.getElementById('page-editor-container').style.display = 'block';
  }
}

async function savePageContent() {
  if (!selectedPageId) return;
  
  const db = await getDatabase();
  const title = document.getElementById('edit-page-title').value;
  const content = document.getElementById('edit-page-content').value;
  
  if (!db.pages) db.pages = {};
  db.pages[selectedPageId] = { title, content };
  
  saveDatabase(db);
  showToast('บันทึกเนื้อหาหน้าเว็บย่อยสำเร็จแล้ว');
  loadAllData();
}

// --- CHANGE PASSWORD ---
async function saveNewPassword() {
  const db = await getDatabase();
  const pass = document.getElementById('new-pass-val').value;
  const confirmPass = document.getElementById('confirm-pass-val').value;
  
  if (!pass || pass.length < 4) {
    showToast('รหัสผ่านสั้นเกินไป (ขั้นต่ำ 4 ตัวอักษร)', true);
    return;
  }

  if (pass !== confirmPass) {
    showToast('การยืนยันรหัสผ่านไม่ตรงกัน', true);
    return;
  }

  if (!db.admin) db.admin = {};
  db.admin.password = pass;
  
  saveDatabase(db);
  showToast('เปลี่ยนรหัสผ่านผู้ดูแลระบบสำเร็จแล้ว!');
  document.getElementById('new-pass-val').value = '';
  document.getElementById('confirm-pass-val').value = '';
}

// --- COMMON HELPERS ---
function closeModal(modalId) {
  document.getElementById(modalId).classList.remove('show');
}

// Global closeModal binding for esc / clicks
window.closeModal = closeModal;

// Multi-type Image Upload Router
async function handleImageUpload(event, type) {
  const url = await mockUploadFile(event.target);
  if (url) {
    tempUploads[type] = url;
    document.getElementById(`${type}-preview`).src = url;
  }
}

async function handleNewsUpload(event) {
  const url = await mockUploadFile(event.target);
  if (url) {
    tempUploads.newsImg = url;
    document.getElementById('news-preview').src = url;
  }
}

async function handlePdfUpload(event) {
  const url = await mockUploadFile(event.target);
  if (url) {
    tempUploads.newsPdf = url;
    // Show toast for document mock success
    showToast('จำลองอัปโหลดเอกสารสำเร็จ');
  }
}

function removeNewsImage() {
  tempUploads.newsImg = '';
  document.getElementById('news-preview').src = '';
  document.getElementById('news-preview').style.display = 'none';
}

function removeNewsPdf() {
  tempUploads.newsPdf = '';
  showToast('ถอนไฟล์ประกาศเรียบร้อย');
}

// Expose handlers to window scope
window.handleImageUpload = handleImageUpload;
window.handleLogoUpload = handleLogoUpload;
window.handlePdfUpload = handlePdfUpload;
window.removeNewsImage = removeNewsImage;
window.removeNewsPdf = removeNewsPdf;
window.handleHeaderLogoUpload = handleHeaderLogoUpload;
window.handleHeaderBgUpload = handleHeaderBgUpload;
window.saveHeaderConfig = saveHeaderConfig;
window.logoutAdmin = logoutAdmin;
window.switchTab = switchTab;
window.saveGeneralConfig = saveGeneralConfig;
window.openMenuModal = openMenuModal;
window.submitMenuForm = submitMenuForm;
window.deleteMenu = deleteMenu;
window.openBannerModal = openBannerModal;
window.submitBannerForm = submitBannerForm;
window.deleteBanner = deleteBanner;
window.openSliderModal = openSliderModal;
window.submitSliderForm = submitSliderForm;
window.deleteSlider = deleteSlider;
window.openNewsModal = openNewsModal;
window.submitNewsForm = submitNewsForm;
window.deleteNews = deleteNews;
window.openBoardModal = openBoardModal;
window.submitBoardForm = submitBoardForm;
window.deleteBoardMember = deleteBoardMember;
window.openActivityModal = openActivityModal;
window.submitActivityForm = submitActivityForm;
window.deleteActivity = deleteActivity;
window.openVideoModal = openVideoModal;
window.submitVideoForm = submitVideoForm;
window.deleteVideo = deleteVideo;
window.openPartnerModal = openPartnerModal;
window.submitPartnerForm = submitPartnerForm;
window.deletePartner = deletePartner;
// --- GOOGLE DRIVE INTEGRATION FOR NETLIFY ---
function populateGDriveFolderInfo() {
  const folderUrlInput = document.getElementById('gdrive-folder-url');
  const statusMsg = document.getElementById('gdrive-status-msg');
  if (folderUrlInput) {
    const folderUrl = (schoolData.config && schoolData.config.googleDriveFolder) || '';
    folderUrlInput.value = folderUrl;
    if (statusMsg) {
      statusMsg.style.display = folderUrl.trim() ? 'flex' : 'none';
    }
  }
}

async function saveGDriveFolderConfig() {
  const folderUrl = document.getElementById('gdrive-folder-url').value.trim();
  const db = await getDatabase();
  if (!db.config) db.config = {};
  db.config.googleDriveFolder = folderUrl;
  
  saveDatabase(db);
  showToast('บันทึกการตั้งค่า Google Drive Folder เรียบร้อยแล้ว');
  
  const statusMsg = document.getElementById('gdrive-status-msg');
  if (statusMsg) {
    statusMsg.style.display = folderUrl ? 'flex' : 'none';
  }
  loadAllData();
}

window.saveGDriveFolderConfig = saveGDriveFolderConfig;

// Google Drive Banners folder integration helpers
function populateGDriveBannersInfo() {
  const urlInput = document.getElementById('gdrive-banners-url');
  const statusMsg = document.getElementById('gdrive-banners-status-msg');
  if (urlInput) {
    const folderUrl = (schoolData.config && schoolData.config.googleDriveBannersFolder) || '';
    urlInput.value = folderUrl;
    if (statusMsg) {
      statusMsg.style.display = folderUrl.trim() ? 'flex' : 'none';
    }
  }
}

async function saveGDriveBannersConfig() {
  const folderUrl = document.getElementById('gdrive-banners-url').value.trim();
  const db = await getDatabase();
  if (!db.config) db.config = {};
  db.config.googleDriveBannersFolder = folderUrl;
  
  saveDatabase(db);
  showToast('บันทึกโฟลเดอร์รูปภาพแบนเนอร์ Google Drive สำเร็จ');
  
  const statusMsg = document.getElementById('gdrive-banners-status-msg');
  if (statusMsg) {
    statusMsg.style.display = folderUrl ? 'flex' : 'none';
  }
  loadAllData();
}

window.saveGDriveBannersConfig = saveGDriveBannersConfig;
window.populateGDriveBannersInfo = populateGDriveBannersInfo;
window.openNewsletterModal = openNewsletterModal;
window.submitNewsletterForm = submitNewsletterForm;
window.deleteNewsletter = deleteNewsletter;
window.loadPageEditor = loadPageEditor;
window.savePageContent = savePageContent;
window.saveNewPassword = saveNewPassword;
window.handleNewsUpload = handleNewsUpload;

// Helper to extract Google Drive file ID from sharing URL
function extractFileId(url) {
  if (!url) return '';
  url = url.trim();
  const dMatch = url.match(/\/d\/([a-zA-Z0-9_\-]+)/);
  if (dMatch) return dMatch[1];
  const idMatch = url.match(/[?&]id=([a-zA-Z0-9_\-]+)/);
  if (idMatch) return idMatch[1];
  return '';
}

// Handler for Google Drive image links in banner editor
function handleBannerGDriveLink(url) {
  if (!url) {
    tempUploads.banner = '';
    document.getElementById('banner-preview').src = 'https://placehold.co/250x60/3b82f6/ffffff?text=Service+Banner';
    return;
  }
  const fileId = extractFileId(url);
  if (fileId) {
    const directUrl = `https://lh3.googleusercontent.com/d/${fileId}=w800`;
    tempUploads.banner = directUrl;
    document.getElementById('banner-preview').src = directUrl;
    showToast('ดึงข้อมูลรูปภาพจาก Google Drive สำเร็จ');
  } else {
    // If it's already a direct Googleusercontent or uc link
    if (url.includes('lh3.googleusercontent.com') || url.includes('drive.google.com/uc')) {
      tempUploads.banner = url;
      document.getElementById('banner-preview').src = url;
    } else {
      showToast('ลิงก์ไม่ถูกต้อง หรือยังไม่ได้เปิดแชร์เป็นสาธารณะ', true);
    }
  }
}

// Function to prompt user for a Google Drive link and load the image immediately
function promptGDriveBannerLink() {
  const url = prompt("กรุณาวางลิงก์แชร์รูปภาพจาก Google Drive ของคุณ:\n(ตัวอย่าง: https://drive.google.com/file/d/.../view?usp=sharing)");
  if (url === null) return; // User cancelled
  
  const trimmed = url.trim();
  if (!trimmed) {
    tempUploads.banner = '';
    document.getElementById('banner-preview').src = 'https://placehold.co/250x60/3b82f6/ffffff?text=Service+Banner';
    const gdriveInput = document.getElementById('banner-gdrive-url');
    if (gdriveInput) gdriveInput.value = '';
    showToast('ล้างข้อมูลรูปภาพเรียบร้อย');
    return;
  }
  
  const fileId = extractFileId(trimmed);
  if (fileId) {
    const directUrl = `https://lh3.googleusercontent.com/d/${fileId}=w800`;
    tempUploads.banner = directUrl;
    document.getElementById('banner-preview').src = directUrl;
    
    const gdriveInput = document.getElementById('banner-gdrive-url');
    if (gdriveInput) {
      gdriveInput.value = trimmed;
    }
    showToast('ดึงข้อมูลรูปภาพจาก Google Drive สำเร็จ');
  } else {
    if (trimmed.includes('lh3.googleusercontent.com') || trimmed.includes('drive.google.com/uc')) {
      tempUploads.banner = trimmed;
      document.getElementById('banner-preview').src = trimmed;
      const gdriveInput = document.getElementById('banner-gdrive-url');
      if (gdriveInput) gdriveInput.value = trimmed;
      showToast('ดึงข้อมูลรูปภาพสำเร็จ');
    } else {
      alert('ลิงก์ไม่ถูกต้อง! กรุณาตรวจสอบให้แน่ใจว่าเป็นลิงก์แชร์รูปภาพจาก Google Drive และตั้งค่าสิทธิ์การแชร์เป็น "ทุกคนที่มีลิงก์มีสิทธิ์อ่าน"');
    }
  }
}

window.handleBannerGDriveLink = handleBannerGDriveLink;
window.promptGDriveBannerLink = promptGDriveBannerLink;

// Download config helper for Netlify serverless deployment
function downloadDatabaseJson() {
  const db = localStorage.getItem('school_database');
  if (!db) {
    showToast('ไม่พบข้อมูลใน LocalStorage', true);
    return;
  }
  try {
    const parsed = JSON.parse(db);
    // Format JSON with 2-spaces indent
    const formatted = JSON.stringify(parsed, null, 2);
    const blob = new Blob([formatted], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'database.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('ดาวน์โหลดสำเร็จ! นำไฟล์ database.json นี้ไปวางทับในโฟลเดอร์ data/ แล้ว Deploy ใหม่ครับ');
  } catch (err) {
    console.error("Download error:", err);
    showToast('ดาวน์โหลดไฟล์ล้มเหลว', true);
  }
}
window.downloadDatabaseJson = downloadDatabaseJson;

// Helper to format date in Thai
function formatDate(dateStr) {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return dateStr;
  
  const months = [
    'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
    'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'
  ];
  return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear() + 543}`;
}
