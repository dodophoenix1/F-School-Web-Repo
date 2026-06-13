// Admin Dashboard Core Logic for School Website Template

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

// Logout
function logoutAdmin() {
  sessionStorage.removeItem('admin_token');
  window.location.href = 'login.html';
}

// Fetch all database config on startup
async function loadAllData() {
  try {
    const res = await fetch('/api/config');
    schoolData = await res.json();
    
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

// Get Auth Headers Helper
function getAuthHeaders() {
  const token = sessionStorage.getItem('admin_token');
  return {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };
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

// File Upload Helper
async function uploadFile(fileInput, type) {
  if (!fileInput.files || fileInput.files.length === 0) return null;
  
  const file = fileInput.files[0];
  const formData = new FormData();
  formData.append('file', file);
  
  const token = sessionStorage.getItem('admin_token');
  try {
    const res = await fetch('/api/admin/upload', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      body: formData
    });
    
    const data = await res.json();
    if (data.success) {
      showToast('อัปโหลดไฟล์สำเร็จ');
      return data.fileUrl;
    } else {
      showToast(data.error || 'อัปโหลดไฟล์ล้มเหลว', true);
      return null;
    }
  } catch (error) {
    console.error(error);
    showToast('เกิดข้อผิดพลาดในการส่งข้อมูลไฟล์', true);
    return null;
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
  document.getElementById('logo-preview').src = uploadedLogoUrl || '/uploads/logo_default.png';
}

async function handleLogoUpload(event) {
  const url = await uploadFile(event.target, 'logo');
  if (url) {
    uploadedLogoUrl = url;
    document.getElementById('logo-preview').src = url;
  }
}

async function saveGeneralConfig() {
  const payload = {
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

  try {
    const res = await fetch('/api/admin/config', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (data.success) {
      showToast(data.message || 'บันทึกสำเร็จ');
      loadAllData();
    } else {
      showToast(data.error || 'เกิดข้อผิดพลาด', true);
    }
  } catch (error) {
    showToast('ไม่สามารถอัปเดตข้อมูลการตั้งค่าได้', true);
  }
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
  document.getElementById('header-logo-preview').src = uploadedHeaderLogoUrl || '/uploads/logo_default.png';

  uploadedHeaderBgUrl = cfg.headerBg || '';
  document.getElementById('header-bg-preview').src = uploadedHeaderBgUrl || '/uploads/header_bg.jpg';

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
  const url = await uploadFile(event.target, 'header-logo');
  if (url) {
    uploadedHeaderLogoUrl = url;
    document.getElementById('header-logo-preview').src = url;
  }
}

async function handleHeaderBgUpload(event) {
  const url = await uploadFile(event.target, 'header-bg');
  if (url) {
    uploadedHeaderBgUrl = url;
    document.getElementById('header-bg-preview').src = url;
    // Reset preview alignment to match the slider value
    const posY = document.getElementById('headerBgPosY').value;
    document.getElementById('header-bg-preview').style.objectPosition = `center ${posY}%`;
  }
}

async function saveHeaderConfig() {
  const op1 = parseFloat(document.getElementById('headerOp1').value) / 100;
  const op2 = parseFloat(document.getElementById('headerOp2').value) / 100;
  const op3 = parseFloat(document.getElementById('headerOp3').value) / 100;

  const payload = {
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

  try {
    const res = await fetch('/api/admin/config', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (data.success) {
      showToast(data.message || 'บันทึกข้อมูล Header สำเร็จ');
      loadAllData();
    } else {
      showToast(data.error || 'เกิดข้อผิดพลาด', true);
    }
  } catch (error) {
    showToast('ไม่สามารถอัปเดตข้อมูลการตั้งค่า Header ได้', true);
  }
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
    document.getElementById('menu-external').checked = item.isExternal || false;
  } else {
    title.textContent = 'เพิ่มลิงก์เมนูใหม่';
    document.getElementById('menu-label').value = '';
    document.getElementById('menu-url').value = '';
    document.getElementById('menu-external').checked = false;
  }
  
  modal.classList.add('show');
}

async function submitMenuForm() {
  const id = document.getElementById('menu-id').value;
  const label = document.getElementById('menu-label').value;
  const url = document.getElementById('menu-url').value;
  const isExternal = document.getElementById('menu-external').checked;

  if (!label || !url) {
    showToast('กรุณากรอกข้อมูลให้ครบถ้วน', true);
    return;
  }

  let menus = [...(schoolData.menus || [])];
  
  if (id) {
    // Update
    menus = menus.map(m => m.id === id ? { ...m, label, url, isExternal } : m);
  } else {
    // Insert new
    menus.push({ id: 'menu_' + Date.now(), label, url, isExternal });
  }

  try {
    const res = await fetch('/api/admin/menus', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ menus })
    });
    const data = await res.json();
    if (data.success) {
      closeModal('modal-menu');
      showToast(data.message || 'บันทึกสำเร็จ');
      loadAllData();
    } else {
      showToast(data.error, true);
    }
  } catch (error) {
    showToast('บันทึกผิดพลาด', true);
  }
}

async function deleteMenu(id) {
  if (!confirm('คุณต้องการลบลิงก์เมนูนี้ใช่หรือไม่?')) return;
  
  const menus = (schoolData.menus || []).filter(m => m.id !== id);

  try {
    const res = await fetch('/api/admin/menus', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ menus })
    });
    const data = await res.json();
    if (data.success) {
      showToast('ลบรายการเมนูเรียบร้อยแล้ว');
      loadAllData();
    } else {
      showToast(data.error, true);
    }
  } catch (error) {
    showToast('ลบข้อมูลผิดพลาด', true);
  }
}

// --- BANNERS MANAGEMENT ---
function renderBannersGrid() {
  const container = document.getElementById('banners-list-container');
  if (!container) return;
  
  container.innerHTML = '';
  const list = schoolData.banners || [];
  
  if (list.length === 0) {
    container.innerHTML = '<p style="grid-column: span 12; text-align:center; padding: 20px; color: var(--admin-text-muted);">ยังไม่มีแบนเนอร์ใดๆ</p>';
    return;
  }

  list.forEach((item) => {
    const div = document.createElement('div');
    div.className = 'admin-list-item';
    div.style.flexDirection = 'column';
    div.style.alignItems = 'flex-start';
    
    div.innerHTML = `
      <img src="${item.image}" alt="${item.title}" style="width: 100%; height: 65px; object-fit: cover; border-radius: 6px; margin-bottom: 10px;">
      <h4 style="margin-bottom: 5px;">${item.title}</h4>
      <p style="font-size:0.8rem; color:var(--admin-text-muted); margin-bottom:15px; word-break:break-all;">ลิงก์: ${item.url}</p>
      <div style="display:flex; gap: 8px; width:100%; justify-content:flex-end;">
        <button class="admin-btn primary" onclick="openBannerModal('${item.id}')">แก้ไข</button>
        <button class="admin-btn danger" onclick="deleteBanner('${item.id}')">ลบ</button>
      </div>
    `;
    container.appendChild(div);
  });
}

function openBannerModal(id = '') {
  const gdriveInput = document.getElementById('banner-gdrive-url');
  document.getElementById('banner-id').value = id;
  
  if (id) {
    const item = schoolData.banners.find(b => b.id === id);
    document.getElementById('modal-banner-title').textContent = 'แก้ไขแบนเนอร์บริการ';
    document.getElementById('banner-title').value = item.title;
    document.getElementById('banner-url').value = item.url;
    tempUploads.banner = item.image;
    document.getElementById('banner-preview').src = item.image;
    
    if (gdriveInput) {
      if (item.image && (item.image.includes('lh3.googleusercontent.com') || item.image.includes('drive.google.com'))) {
        gdriveInput.value = item.image;
      } else {
        gdriveInput.value = '';
      }
    }
  } else {
    document.getElementById('modal-banner-title').textContent = 'เพิ่มแบนเนอร์ใหม่';
    document.getElementById('banner-title').value = '';
    document.getElementById('banner-url').value = '';
    tempUploads.banner = '';
    document.getElementById('banner-preview').src = '';
    if (gdriveInput) gdriveInput.value = '';
  }
  
  document.getElementById('modal-banner').classList.add('show');
}

async function submitBannerForm() {
  const id = document.getElementById('banner-id').value;
  const title = document.getElementById('banner-title').value;
  const url = document.getElementById('banner-url').value;
  const image = tempUploads.banner;

  if (!title || !url || !image) {
    showToast('กรุณากรอกข้อมูลให้ครบถ้วนรวมถึงรูปแบนเนอร์', true);
    return;
  }

  let banners = [...(schoolData.banners || [])];
  
  if (id) {
    banners = banners.map(b => b.id === id ? { ...b, title, url, image } : b);
  } else {
    banners.push({ id: 'banner_' + Date.now(), title, url, image, isExternal: true });
  }

  try {
    const res = await fetch('/api/admin/banners', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ banners })
    });
    const data = await res.json();
    if (data.success) {
      closeModal('modal-banner');
      showToast('บันทึกแบนเนอร์สำเร็จ');
      loadAllData();
    } else {
      showToast(data.error, true);
    }
  } catch (error) {
    showToast('บันทึกไม่สำเร็จ', true);
  }
}

async function deleteBanner(id) {
  if (!confirm('คุณแน่ใจว่าต้องการลบแบนเนอร์นี้ใช่หรือไม่?')) return;
  const banners = (schoolData.banners || []).filter(b => b.id !== id);
  try {
    const res = await fetch('/api/admin/banners', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ banners })
    });
    const data = await res.json();
    if (data.success) {
      showToast('ลบแบนเนอร์สำเร็จ');
      loadAllData();
    } else {
      showToast(data.error, true);
    }
  } catch (error) {
    showToast('เกิดข้อผิดพลาดในการเชื่อมต่อ', true);
  }
}

// --- SLIDER IMAGES ---
function renderSlidersList() {
  const container = document.getElementById('slider-list-container');
  if (!container) return;
  
  container.innerHTML = '';
  const list = schoolData.slider || [];
  
  if (list.length === 0) {
    container.innerHTML = '<p style="text-align:center; padding: 20px; color: var(--admin-text-muted);">ยังไม่มีภาพสไลด์ใดๆ</p>';
    return;
  }

  list.forEach((slide) => {
    const div = document.createElement('div');
    div.className = 'admin-list-item';
    
    div.innerHTML = `
      <div class="admin-list-info">
        <img src="${slide.image}" alt="Slide Preview" class="admin-list-thumb" style="width: 100px; height: 50px;">
        <div class="admin-list-text">
          <h4>${slide.caption || 'ไม่มีคำอธิบาย'}</h4>
          <p>ลิงก์เชื่อมโยง: ${slide.link || 'ไม่มี'}</p>
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
  document.getElementById('slider-id').value = id;
  
  if (id) {
    const item = schoolData.slider.find(s => s.id === id);
    document.getElementById('modal-slider-title').textContent = 'แก้ไขภาพสไลด์ประชาสัมพันธ์';
    document.getElementById('slider-caption').value = item.caption;
    document.getElementById('slider-link').value = item.link;
    tempUploads.slider = item.image;
    document.getElementById('slider-preview').src = item.image;
  } else {
    document.getElementById('modal-slider-title').textContent = 'เพิ่มภาพสไลด์ประชาสัมพันธ์ใหม่';
    document.getElementById('slider-caption').value = '';
    document.getElementById('slider-link').value = '';
    tempUploads.slider = '';
    document.getElementById('slider-preview').src = '';
  }
  
  document.getElementById('modal-slider').classList.add('show');
}

async function submitSliderForm() {
  const id = document.getElementById('slider-id').value;
  const caption = document.getElementById('slider-caption').value;
  const link = document.getElementById('slider-link').value;
  const image = tempUploads.slider;

  if (!image) {
    showToast('กรุณาเลือกอัปโหลดรูปภาพสไลด์', true);
    return;
  }

  let slider = [...(schoolData.slider || [])];
  
  if (id) {
    slider = slider.map(s => s.id === id ? { ...s, caption, link, image } : s);
  } else {
    slider.push({ id: 'slide_' + Date.now(), caption, link, image });
  }

  try {
    const res = await fetch('/api/admin/slider', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ slider })
    });
    const data = await res.json();
    if (data.success) {
      closeModal('modal-slider');
      showToast('บันทึกรูปภาพสไลด์สำเร็จแล้ว');
      loadAllData();
    } else {
      showToast(data.error, true);
    }
  } catch (error) {
    showToast('บันทึกไม่สำเร็จ', true);
  }
}

async function deleteSlider(id) {
  if (!confirm('คุณแน่ใจว่าต้องการลบสไลด์ภาพนี้ใช่หรือไม่?')) return;
  const slider = (schoolData.slider || []).filter(s => s.id !== id);
  try {
    const res = await fetch('/api/admin/slider', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ slider })
    });
    const data = await res.json();
    if (data.success) {
      showToast('ลบสไลด์ภาพสำเร็จ');
      loadAllData();
    } else {
      showToast(data.error, true);
    }
  } catch (error) {
    showToast('เกิดข้อผิดพลาดในการสื่อสาร', true);
  }
}

// --- ANNOUNCEMENTS / NEWS ---
function renderNewsTable() {
  const tbody = document.getElementById('news-admin-table-body');
  if (!tbody) return;
  
  tbody.innerHTML = '';
  
  let list = schoolData.announcements || [];
  // Sort descending by date
  list = list.sort((a, b) => new Date(b.date) - new Date(a.date));
  
  if (list.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:20px; color: var(--admin-text-muted);">ยังไม่มีการสร้างข่าวสารใดๆ</td></tr>';
    return;
  }

  list.forEach(item => {
    const tr = document.createElement('tr');
    
    const hasPdf = item.fileUrl ? `<span style="color:var(--admin-success); font-weight:bold;">มีไฟล์แนบ</span>` : `<span style="color:var(--admin-text-muted);">ไม่มี</span>`;
    
    tr.innerHTML = `
      <td>${formatDate(item.date)}</td>
      <td><span class="news-category-tag" style="background-color: #334155; color: #f8fafc; font-size:0.75rem;">${item.category}</span></td>
      <td style="font-weight: 500;">${item.title}</td>
      <td>${hasPdf}</td>
      <td style="text-align: center;">
        <button class="admin-btn primary" onclick="openNewsModal('${item.id}')" style="padding: 5px 10px; font-size:0.8rem;">แก้ไข</button>
        <button class="admin-btn danger" onclick="deleteNews('${item.id}')" style="padding: 5px 10px; font-size:0.8rem;">ลบ</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function openNewsModal(id = '') {
  document.getElementById('news-id').value = id;
  
  if (id) {
    const item = schoolData.announcements.find(n => n.id === id);
    document.getElementById('modal-news-title').textContent = 'แก้ไขข่าวสาร/ประกาศ';
    document.getElementById('news-title').value = item.title;
    document.getElementById('news-date').value = item.date;
    document.getElementById('news-category').value = item.category;
    document.getElementById('news-content').value = item.content || '';
    
    tempUploads.newsImg = item.imageUrl || '';
    document.getElementById('news-preview').src = item.imageUrl || '';
    
    tempUploads.newsPdf = item.fileUrl || '';
    document.getElementById('pdf-upload-info').textContent = item.fileUrl ? `ไฟล์ปัจจุบัน: ${item.fileUrl.split('/').pop().substring(14)}` : 'ยังไม่มีไฟล์เอกสารแนบ';
  } else {
    document.getElementById('modal-news-title').textContent = 'สร้างข่าวสาร/ประกาศใหม่';
    document.getElementById('news-title').value = '';
    // Set default date to today
    document.getElementById('news-date').value = new Date().toISOString().substring(0, 10);
    document.getElementById('news-category').value = 'ทั่วไป';
    document.getElementById('news-content').value = '';
    
    tempUploads.newsImg = '';
    document.getElementById('news-preview').src = '';
    
    tempUploads.newsPdf = '';
    document.getElementById('pdf-upload-info').textContent = 'ยังไม่มีไฟล์เอกสารแนบ';
  }
  
  document.getElementById('modal-news').classList.add('show');
}

function removeNewsImage() {
  tempUploads.newsImg = '';
  document.getElementById('news-preview').src = '';
}

function removeNewsPdf() {
  tempUploads.newsPdf = '';
  document.getElementById('pdf-upload-info').textContent = 'ยังไม่มีไฟล์เอกสารแนบ';
}

async function handlePdfUpload(event) {
  const url = await uploadFile(event.target, 'pdf');
  if (url) {
    tempUploads.newsPdf = url;
    document.getElementById('pdf-upload-info').textContent = `ไฟล์ปัจจุบัน: ${url.split('/').pop().substring(14)}`;
  }
}

async function submitNewsForm() {
  const id = document.getElementById('news-id').value;
  const title = document.getElementById('news-title').value;
  const date = document.getElementById('news-date').value;
  const category = document.getElementById('news-category').value;
  const content = document.getElementById('news-content').value;
  
  if (!title || !date) {
    showToast('กรุณากรอกหัวข้อประกาศและวันที่', true);
    return;
  }

  const payload = {
    id: id || undefined,
    title,
    date,
    category,
    content,
    imageUrl: tempUploads.newsImg || '',
    fileUrl: tempUploads.newsPdf || ''
  };

  try {
    const res = await fetch('/api/admin/news', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (data.success) {
      closeModal('modal-news');
      showToast('บันทึกข่าวสารเรียบร้อยแล้ว');
      loadAllData();
    } else {
      showToast(data.error, true);
    }
  } catch (error) {
    showToast('บันทึกข่าวสารไม่สำเร็จ', true);
  }
}

async function deleteNews(id) {
  if (!confirm('คุณต้องการลบข่าวสาร/ประกาศนี้อย่างถาวรใช่หรือไม่?')) return;
  
  try {
    const token = sessionStorage.getItem('admin_token');
    const res = await fetch(`/api/admin/news/${id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    const data = await res.json();
    if (data.success) {
      showToast('ลบข่าวสารสำเร็จ');
      loadAllData();
    } else {
      showToast(data.error, true);
    }
  } catch (error) {
    showToast('ไม่สามารถส่งคำขอลบข่าวสารได้', true);
  }
}

// --- SCHOOL BOARD MANAGEMENT ---
function renderBoardList() {
  const container = document.getElementById('board-list-container');
  if (!container) return;
  
  container.innerHTML = '';
  const list = schoolData.board || [];
  
  if (list.length === 0) {
    container.innerHTML = '<p style="text-align:center; padding: 20px; color: var(--admin-text-muted);">ยังไม่มีบอร์ดผู้บริหาร</p>';
    return;
  }

  const sortedList = list.sort((a, b) => a.order - b.order);

  sortedList.forEach((member) => {
    const div = document.createElement('div');
    div.className = 'admin-list-item';
    
    div.innerHTML = `
      <div class="admin-list-info">
        <img src="${member.image}" alt="Board Photo" class="admin-list-thumb" style="width: 50px; height: 65px; object-fit: cover;">
        <div class="admin-list-text">
          <h4>${member.name}</h4>
          <p>ตำแหน่ง: ${member.position} (ลำดับการแสดงผล: ${member.order})</p>
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
  document.getElementById('board-id').value = id;
  
  if (id) {
    const item = schoolData.board.find(b => b.id === id);
    document.getElementById('modal-board-title').textContent = 'แก้ไขข้อมูลผู้บริหาร';
    document.getElementById('board-name').value = item.name;
    document.getElementById('board-position').value = item.position;
    document.getElementById('board-order').value = item.order;
    tempUploads.board = item.image;
    document.getElementById('board-preview').src = item.image;
  } else {
    document.getElementById('modal-board-title').textContent = 'เพิ่มผู้บริหารคนใหม่';
    document.getElementById('board-name').value = '';
    document.getElementById('board-position').value = '';
    document.getElementById('board-order').value = (schoolData.board || []).length + 1;
    tempUploads.board = '';
    document.getElementById('board-preview').src = '';
  }
  
  document.getElementById('modal-board').classList.add('show');
}

async function submitBoardForm() {
  const id = document.getElementById('board-id').value;
  const name = document.getElementById('board-name').value;
  const position = document.getElementById('board-position').value;
  const order = parseInt(document.getElementById('board-order').value) || 1;
  const image = tempUploads.board;

  if (!name || !position || !image) {
    showToast('กรุณากรอกข้อมูลให้ครบถ้วนและอัปโหลดรูปภาพผู้บริหาร', true);
    return;
  }

  let board = [...(schoolData.board || [])];
  
  if (id) {
    board = board.map(b => b.id === id ? { ...b, name, position, order, image } : b);
  } else {
    board.push({ id: 'board_' + Date.now(), name, position, order, image });
  }

  try {
    const res = await fetch('/api/admin/board', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ board })
    });
    const data = await res.json();
    if (data.success) {
      closeModal('modal-board');
      showToast('บันทึกรายชื่อผู้บริหารเรียบร้อยแล้ว');
      loadAllData();
    } else {
      showToast(data.error, true);
    }
  } catch (error) {
    showToast('บันทึกผิดพลาด', true);
  }
}

async function deleteBoardMember(id) {
  if (!confirm('คุณแน่ใจว่าต้องการลบชื่อผู้บริหารท่านนี้ออกจากระบบใช่หรือไม่?')) return;
  const board = (schoolData.board || []).filter(b => b.id !== id);
  try {
    const res = await fetch('/api/admin/board', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ board })
    });
    const data = await res.json();
    if (data.success) {
      showToast('ลบข้อมูลเรียบร้อยแล้ว');
      loadAllData();
    } else {
      showToast(data.error, true);
    }
  } catch (error) {
    showToast('เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์', true);
  }
}

// --- ACTIVITIES GALLERY ---
function renderActivitiesGrid() {
  const container = document.getElementById('activities-list-container');
  if (!container) return;
  
  container.innerHTML = '';
  const list = schoolData.activities || [];
  
  if (list.length === 0) {
    container.innerHTML = '<p style="grid-column: span 12; text-align:center; padding: 20px; color: var(--admin-text-muted);">ยังไม่มีบันทึกภาพกิจกรรม</p>';
    return;
  }

  list.forEach((item) => {
    const div = document.createElement('div');
    div.className = 'admin-list-item';
    div.style.flexDirection = 'column';
    div.style.alignItems = 'flex-start';
    
    div.innerHTML = `
      <img src="${item.image}" alt="${item.title}" style="width: 100%; height: 120px; object-fit: cover; border-radius: 6px; margin-bottom: 10px;">
      <h4 style="margin-bottom: 5px;">${item.title}</h4>
      <p style="font-size:0.8rem; color:var(--admin-text-muted); margin-bottom:15px; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden;">${item.description}</p>
      <div style="display:flex; gap: 8px; width:100%; justify-content:flex-end;">
        <button class="admin-btn primary" onclick="openActivityModal('${item.id}')">แก้ไข</button>
        <button class="admin-btn danger" onclick="deleteActivity('${item.id}')">ลบ</button>
      </div>
    `;
    container.appendChild(div);
  });
}

function openActivityModal(id = '') {
  document.getElementById('activity-id').value = id;
  
  if (id) {
    const item = schoolData.activities.find(a => a.id === id);
    document.getElementById('modal-activity-title').textContent = 'แก้ไขกิจกรรมโรงเรียน';
    document.getElementById('activity-title').value = item.title;
    document.getElementById('activity-date').value = item.date;
    document.getElementById('activity-desc').value = item.description;
    document.getElementById('activity-link').value = item.link || '';
    tempUploads.activity = item.image;
    document.getElementById('activity-preview').src = item.image;
  } else {
    document.getElementById('modal-activity-title').textContent = 'เพิ่มกิจกรรมโรงเรียนใหม่';
    document.getElementById('activity-title').value = '';
    document.getElementById('activity-date').value = new Date().toISOString().substring(0, 10);
    document.getElementById('activity-desc').value = '';
    document.getElementById('activity-link').value = '';
    tempUploads.activity = '';
    document.getElementById('activity-preview').src = '';
  }
  
  document.getElementById('modal-activity').classList.add('show');
}

async function submitActivityForm() {
  const id = document.getElementById('activity-id').value;
  const title = document.getElementById('activity-title').value;
  const date = document.getElementById('activity-date').value;
  const description = document.getElementById('activity-desc').value;
  const link = document.getElementById('activity-link').value;
  const image = tempUploads.activity;

  if (!title || !image) {
    showToast('กรุณากรอกหัวข้อภาพกิจกรรมและอัปโหลดภาพประกอบ', true);
    return;
  }

  let activities = [...(schoolData.activities || [])];
  
  if (id) {
    activities = activities.map(a => a.id === id ? { ...a, title, date, description, link, image } : a);
  } else {
    activities.push({ id: 'act_' + Date.now(), title, date, description, link, image });
  }

  try {
    const res = await fetch('/api/admin/activities', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ activities })
    });
    const data = await res.json();
    if (data.success) {
      closeModal('modal-activity');
      showToast('บันทึกภาพกิจกรรมสำเร็จแล้ว');
      loadAllData();
    } else {
      showToast(data.error, true);
    }
  } catch (error) {
    showToast('บันทึกข้อมูลล้มเหลว', true);
  }
}

async function deleteActivity(id) {
  if (!confirm('คุณต้องการลบภาพกิจกรรมนี้ใช่หรือไม่?')) return;
  const activities = (schoolData.activities || []).filter(a => a.id !== id);
  try {
    const res = await fetch('/api/admin/activities', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ activities })
    });
    const data = await res.json();
    if (data.success) {
      showToast('ลบภาพกิจกรรมสำเร็จแล้ว');
      loadAllData();
    } else {
      showToast(data.error, true);
    }
  } catch (error) {
    showToast('การส่งข้อมูลล้มเหลว', true);
  }
}

// --- SUB-PAGES EDITOR ---
async function loadPageEditor(pageId) {
  try {
    const res = await fetch(`/api/page/${pageId}`);
    if (!res.ok) {
      showToast('ไม่สามารถดึงข้อมูลหน้านี้ได้', true);
      return;
    }
    const page = await res.json();
    
    document.getElementById('edit-page-id').value = pageId;
    document.getElementById('edit-page-title').value = page.title;
    document.getElementById('edit-page-content').value = page.content;
    
    // Show container
    document.getElementById('page-editor-container').style.display = 'block';
  } catch (error) {
    console.error(error);
    showToast('เกิดข้อผิดพลาดในการโหลดข้อมูลหน้า', true);
  }
}

async function savePageContent() {
  const pageId = document.getElementById('edit-page-id').value;
  const title = document.getElementById('edit-page-title').value;
  const content = document.getElementById('edit-page-content').value;

  if (!title) {
    showToast('กรุณากรอกหัวข้อหน้าเว็บย่อย', true);
    return;
  }

  try {
    const res = await fetch(`/api/admin/pages/${pageId}`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ title, content })
    });
    const data = await res.json();
    if (data.success) {
      showToast(data.message || 'บันทึกข้อมูลหน้าเว็บสำเร็จ');
      loadAllData();
    } else {
      showToast(data.error, true);
    }
  } catch (error) {
    showToast('เกิดข้อผิดพลาดในการเชื่อมต่อ', true);
  }
}

// --- VIDEO INTRODUCTIONS ---
function renderVideosList() {
  const videos = schoolData.videos || [];
  const container = document.getElementById('videos-list-container');
  if (!container) return;

  container.innerHTML = '';
  if (videos.length === 0) {
    container.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: var(--admin-text-muted);">ยังไม่มีวิดีโอแนะนำโรงเรียน</p>';
    return;
  }

  videos.forEach(video => {
    const card = document.createElement('div');
    card.className = 'glass-card';
    card.style.background = 'rgba(30, 41, 59, 0.4)';
    card.style.borderColor = 'var(--admin-border)';
    
    card.innerHTML = `
      <div style="position: relative; padding-bottom: 56.25%; height: 0; overflow: hidden; border-radius: 6px; margin-bottom: 15px;">
        <iframe src="https://www.youtube.com/embed/${video.youtubeId}" style="position: absolute; top:0; left:0; width:100%; height:100%; border:none;"></iframe>
      </div>
      <h3 style="font-size: 1rem; margin-bottom: 8px; color: var(--admin-accent);">${video.title}</h3>
      <p style="font-size: 0.85rem; color: var(--admin-text-muted); margin-bottom: 15px; height: 35px; overflow: hidden; text-overflow: ellipsis;">${video.desc || 'ไม่มีคำอธิบาย'}</p>
      <div style="display: flex; gap: 10px; justify-content: flex-end;">
        <button class="admin-btn primary btn-sm" onclick="openVideoModal('${video.id}')">แก้ไข</button>
        <button class="admin-btn danger btn-sm" onclick="deleteVideo('${video.id}')">ลบ</button>
      </div>
    `;
    container.appendChild(card);
  });
}

function openVideoModal(id = '') {
  const modal = document.getElementById('modal-video');
  if (!modal) return;
  
  if (id) {
    const video = (schoolData.videos || []).find(v => v.id === id);
    if (video) {
      document.getElementById('modal-video-title').textContent = 'แก้ไขวิดีโอแนะนำ';
      document.getElementById('video-id').value = video.id;
      document.getElementById('video-title').value = video.title;
      document.getElementById('video-youtube-id').value = video.youtubeId;
      document.getElementById('video-desc').value = video.desc || '';
    }
  } else {
    document.getElementById('modal-video-title').textContent = 'เพิ่มวิดีโอแนะนำใหม่';
    document.getElementById('video-id').value = '';
    document.getElementById('video-title').value = '';
    document.getElementById('video-youtube-id').value = '';
    document.getElementById('video-desc').value = '';
  }
  modal.classList.add('show');
}

async function submitVideoForm() {
  const id = document.getElementById('video-id').value;
  const title = document.getElementById('video-title').value.trim();
  const youtubeId = document.getElementById('video-youtube-id').value.trim();
  const desc = document.getElementById('video-desc').value.trim();

  if (!title || !youtubeId) {
    showToast('กรุณากรอกข้อมูลหัวข้อ และ Youtube Video ID', true);
    return;
  }

  let videos = [...(schoolData.videos || [])];
  const item = { id, title, youtubeId, desc };

  if (id) {
    // Edit
    const idx = videos.findIndex(v => v.id === id);
    if (idx !== -1) videos[idx] = item;
  } else {
    // Add new
    item.id = 'vid_' + Date.now();
    videos.push(item);
  }

  try {
    const res = await fetch('/api/admin/videos', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ videos })
    });
    const data = await res.json();
    if (data.success) {
      closeModal('modal-video');
      showToast('บันทึกข้อมูลวิดีโอแนะนำสำเร็จ');
      loadAllData();
    } else {
      showToast(data.error, true);
    }
  } catch (error) {
    showToast('บันทึกข้อมูลล้มเหลว', true);
  }
}

async function deleteVideo(id) {
  if (!confirm('คุณแน่ใจว่าต้องการลบวิดีโอนี้?')) return;
  const videos = (schoolData.videos || []).filter(v => v.id !== id);
  try {
    const res = await fetch('/api/admin/videos', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ videos })
    });
    const data = await res.json();
    if (data.success) {
      showToast('ลบวิดีโอแนะนำเรียบร้อยแล้ว');
      loadAllData();
    } else {
      showToast(data.error, true);
    }
  } catch (error) {
    showToast('การส่งข้อมูลล้มเหลว', true);
  }
}

// --- PARTNER NETWORKS ---
function renderPartnersList() {
  const partners = schoolData.partners || [];
  const container = document.getElementById('partners-list-container');
  if (!container) return;

  container.innerHTML = '';
  if (partners.length === 0) {
    container.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: var(--admin-text-muted);">ยังไม่มีภาคีเครือข่ายพันธมิตร</p>';
    return;
  }

  partners.forEach(partner => {
    const card = document.createElement('div');
    card.className = 'glass-card';
    card.style.background = 'rgba(30, 41, 59, 0.4)';
    card.style.borderColor = 'var(--admin-border)';
    
    card.innerHTML = `
      <div style="width: 100%; height: 120px; overflow: hidden; border-radius: 6px; margin-bottom: 12px; background-color: #0f172a; display: flex; align-items: center; justify-content: center;">
        <img src="${partner.image || '/api/placeholder/300/200?text=Logo'}" style="width:100%; height:100%; object-fit:cover;">
      </div>
      <h3 style="font-size: 0.95rem; margin-bottom: 6px; color: var(--admin-accent);">${partner.title}</h3>
      <p style="font-size: 0.8rem; color: var(--admin-text-muted); margin-bottom: 15px; height: 35px; overflow: hidden; text-overflow: ellipsis;">${partner.description || 'ไม่มีคำอธิบาย'}</p>
      <div style="display: flex; gap: 10px; justify-content: flex-end;">
        <button class="admin-btn primary btn-sm" onclick="openPartnerModal('${partner.id}')">แก้ไข</button>
        <button class="admin-btn danger btn-sm" onclick="deletePartner('${partner.id}')">ลบ</button>
      </div>
    `;
    container.appendChild(card);
  });
}

function openPartnerModal(id = '') {
  const modal = document.getElementById('modal-partner');
  if (!modal) return;
  
  tempUploads.partner = '';
  if (id) {
    const partner = (schoolData.partners || []).find(p => p.id === id);
    if (partner) {
      document.getElementById('modal-partner-title').textContent = 'แก้ไขภาคีเครือข่าย';
      document.getElementById('partner-id').value = partner.id;
      document.getElementById('partner-title').value = partner.title;
      document.getElementById('partner-description').value = partner.description;
      document.getElementById('partner-url').value = partner.url || '#';
      document.getElementById('partner-preview').src = partner.image || '';
    }
  } else {
    document.getElementById('modal-partner-title').textContent = 'เพิ่มภาคีเครือข่ายใหม่';
    document.getElementById('partner-id').value = '';
    document.getElementById('partner-title').value = '';
    document.getElementById('partner-description').value = '';
    document.getElementById('partner-url').value = '#';
    document.getElementById('partner-preview').src = '';
  }
  modal.classList.add('show');
}

async function submitPartnerForm() {
  const id = document.getElementById('partner-id').value;
  const title = document.getElementById('partner-title').value.trim();
  const description = document.getElementById('partner-description').value.trim();
  const url = document.getElementById('partner-url').value.trim();
  
  if (!title || !description) {
    showToast('กรุณากรอกชื่อหน่วยงานและรายละเอียดการสนับสนุน', true);
    return;
  }

  let partners = [...(schoolData.partners || [])];
  
  // Choose preview or newly uploaded image url
  const existingPartner = partners.find(p => p.id === id);
  const image = tempUploads.partner || (existingPartner ? existingPartner.image : '') || '/api/placeholder/300/200?text=Partner';

  const item = { id, title, description, url, image };

  if (id) {
    // Edit
    const idx = partners.findIndex(p => p.id === id);
    if (idx !== -1) partners[idx] = item;
  } else {
    // Add new
    item.id = 'part_' + Date.now();
    partners.push(item);
  }

  try {
    const res = await fetch('/api/admin/partners', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ partners })
    });
    const data = await res.json();
    if (data.success) {
      closeModal('modal-partner');
      showToast('บันทึกข้อมูลภาคีเครือข่ายสำเร็จ');
      loadAllData();
    } else {
      showToast(data.error, true);
    }
  } catch (error) {
    showToast('บันทึกข้อมูลล้มเหลว', true);
  }
}

async function deletePartner(id) {
  if (!confirm('คุณแน่ใจว่าต้องการลบหน่วยงานภาคีนี้?')) return;
  const partners = (schoolData.partners || []).filter(p => p.id !== id);
  try {
    const res = await fetch('/api/admin/partners', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ partners })
    });
    const data = await res.json();
    if (data.success) {
      showToast('ลบภาคีเครือข่ายเรียบร้อยแล้ว');
      loadAllData();
    } else {
      showToast(data.error, true);
    }
  } catch (error) {
    showToast('การส่งข้อมูลล้มเหลว', true);
  }
}

// --- CHANGE PASSWORD ---
async function saveNewPassword() {
  const pass = document.getElementById('new-pass-val').value;
  const confirmPass = document.getElementById('confirm-pass-val').value;

  if (!pass || pass.trim().length < 4) {
    showToast('รหัสผ่านต้องมีความยาวอย่างน้อย 4 ตัวอักษร', true);
    return;
  }

  if (pass !== confirmPass) {
    showToast('การยืนยันรหัสผ่านไม่ตรงกัน', true);
    return;
  }

  try {
    const res = await fetch('/api/admin/change-password', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ newPassword: pass })
    });
    const data = await res.json();
    if (data.success) {
      showToast('เปลี่ยนรหัสผ่านสำเร็จแล้ว!');
      document.getElementById('new-pass-val').value = '';
      document.getElementById('confirm-pass-val').value = '';
    } else {
      showToast(data.error, true);
    }
  } catch (error) {
    showToast('เปลี่ยนรหัสผ่านล้มเหลว', true);
  }
}

// --- COMMON HELPERS ---
function closeModal(modalId) {
  document.getElementById(modalId).classList.remove('show');
}

// Global closeModal binding for esc / clicks
window.closeModal = closeModal;

// Multi-type Image Upload Router
async function handleImageUpload(event, type) {
  const url = await uploadFile(event.target, type);
  if (url) {
    tempUploads[type] = url;
    document.getElementById(`${type}-preview`).src = url;
  }
}

async function handleNewsUpload(event) {
  const url = await uploadFile(event.target, 'newsImg');
  if (url) {
    tempUploads.newsImg = url;
    document.getElementById('news-preview').src = url;
  }
}

// Bind news handler to window for inline HTML invocation
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
// --- GOOGLE DRIVE & NEWSLETTER CRUD IMPLEMENTATION ---
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
  try {
    const res = await fetch('/api/admin/config', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ googleDriveFolder: folderUrl })
    });
    const data = await res.json();
    if (data.success) {
      showToast('บันทึกการตั้งค่า Google Drive Folder เรียบร้อยแล้ว');
      if (!schoolData.config) schoolData.config = {};
      schoolData.config.googleDriveFolder = folderUrl;
      const statusMsg = document.getElementById('gdrive-status-msg');
      if (statusMsg) {
        statusMsg.style.display = folderUrl ? 'flex' : 'none';
      }
    } else {
      showToast(data.error, true);
    }
  } catch (error) {
    showToast('การบันทึกข้อมูลล้มเหลว', true);
  }
}

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
        <img class="admin-list-thumb" src="${nl.image}" alt="newsletter-thumb" style="width:75px; height:100px; object-fit:cover; background:#fff; border:1px solid #e2e8f0; border-radius:4px;">
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
    document.getElementById('newsletter-preview').src = item.image;
  } else {
    title.textContent = 'เพิ่มจดหมายข่าวประชาสัมพันธ์ใหม่';
    document.getElementById('newsletter-title-input').value = '';
    document.getElementById('newsletter-order').value = (schoolData.newsletters || []).length + 1;
    document.getElementById('newsletter-preview').src = '/api/placeholder/300/400?text=A4+Newsletter';
  }
  modal.classList.add('show');
}

async function submitNewsletterForm() {
  const id = document.getElementById('newsletter-id').value;
  const title = document.getElementById('newsletter-title-input').value;
  const order = parseInt(document.getElementById('newsletter-order').value) || 1;
  const image = tempUploads.newsletter || '/api/placeholder/300/400?text=A4+Newsletter';
  
  if (!title) {
    showToast('กรุณากรอกหัวข้อจดหมายข่าว', true);
    return;
  }
  
  const newsletters = [...(schoolData.newsletters || [])];
  const nlItem = { id: id || 'nl_' + Date.now(), title, order, image };
  
  if (id) {
    const idx = newsletters.findIndex(n => n.id === id);
    if (idx !== -1) {
      newsletters[idx] = nlItem;
    }
  } else {
    newsletters.push(nlItem);
  }
  
  try {
    const res = await fetch('/api/admin/newsletters', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ newsletters })
    });
    const data = await res.json();
    if (data.success) {
      closeModal('modal-newsletter');
      showToast('บันทึกข้อมูลจดหมายข่าวสำเร็จ');
      loadAllData();
    } else {
      showToast(data.error, true);
    }
  } catch (error) {
    showToast('บันทึกข้อมูลล้มเหลว', true);
  }
}

async function deleteNewsletter(id) {
  if (!confirm('ยืนยันลบจดหมายข่าวประชาสัมพันธ์นี้?')) return;
  const newsletters = (schoolData.newsletters || []).filter(n => n.id !== id);
  try {
    const res = await fetch('/api/admin/newsletters', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ newsletters })
    });
    const data = await res.json();
    if (data.success) {
      showToast('ลบจดหมายข่าวเรียบร้อยแล้ว');
      loadAllData();
    } else {
      showToast(data.error, true);
    }
  } catch (error) {
    showToast('การส่งข้อมูลล้มเหลว', true);
  }
}

window.saveGDriveFolderConfig = saveGDriveFolderConfig;

// Google Drive Banners folder integration helpers (Template)
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
  try {
    const res = await fetch('/api/admin/config', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ googleDriveBannersFolder: folderUrl })
    });
    const data = await res.json();
    if (data.success) {
      showToast('บันทึกโฟลเดอร์รูปภาพแบนเนอร์ Google Drive สำเร็จ');
      if (!schoolData.config) schoolData.config = {};
      schoolData.config.googleDriveBannersFolder = folderUrl;
      const statusMsg = document.getElementById('gdrive-banners-status-msg');
      if (statusMsg) {
        statusMsg.style.display = folderUrl ? 'flex' : 'none';
      }
      loadAllData();
    } else {
      showToast(data.error, true);
    }
  } catch (error) {
    showToast('การบันทึกข้อมูลล้มเหลว', true);
  }
}

window.saveGDriveBannersConfig = saveGDriveBannersConfig;
window.populateGDriveBannersInfo = populateGDriveBannersInfo;
window.openNewsletterModal = openNewsletterModal;
window.submitNewsletterForm = submitNewsletterForm;
window.deleteNewsletter = deleteNewsletter;
window.loadPageEditor = loadPageEditor;
window.savePageContent = savePageContent;
window.saveNewPassword = saveNewPassword;

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
