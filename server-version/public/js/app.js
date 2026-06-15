// Common frontend functions for School Website Template

document.addEventListener('DOMContentLoaded', () => {
  // Load configuration and general data
  loadConfig();

  // Route-specific loading
  const path = window.location.pathname;
  if (path.endsWith('index.html') || path.endsWith('/') || path === '') {
    loadHomepage();
  } else if (path.endsWith('news-detail.html')) {
    loadNewsDetail();
  } else if (path.endsWith('page.html')) {
    loadPageContent();
  }
});

// 1. Fetch & Apply Config
async function loadConfig() {
  try {
    const res = await fetch('/api/config');
    const data = await res.json();
    
    const { config, menus, banners } = data;

    // Apply colors to :root CSS variables
    if (config) {
      document.documentElement.style.setProperty('--primary', config.primaryColor || '#8b0000');
      document.documentElement.style.setProperty('--secondary', config.secondaryColor || '#ffd700');
      document.documentElement.style.setProperty('--bg', config.bgColor || '#f3f4f6');
      document.documentElement.style.setProperty('--text', config.textColor || '#1f2937');
      
      // Parse RGB values for premium gradients
      const primaryRgb = hexToRgb(config.primaryColor || '#8b0000');
      const secondaryRgb = hexToRgb(config.secondaryColor || '#ffd700');
      if (primaryRgb) document.documentElement.style.setProperty('--primary-rgb', primaryRgb);
      if (secondaryRgb) document.documentElement.style.setProperty('--secondary-rgb', secondaryRgb);

      // Set header gradient opacities
      document.documentElement.style.setProperty('--header-op1', config.headerOp1 !== undefined ? config.headerOp1 : '0.88');
      document.documentElement.style.setProperty('--header-op2', config.headerOp2 !== undefined ? config.headerOp2 : '0.55');
      document.documentElement.style.setProperty('--header-op3', config.headerOp3 !== undefined ? config.headerOp3 : '0.20');

      // Set header banner background image, position, padding and text colors
      const headerBannerEl = document.querySelector('.header-banner');
      if (headerBannerEl) {
        const bgUrl = config.headerBg || '/uploads/header_bg.jpg';
        headerBannerEl.style.backgroundImage = `url('${bgUrl}')`;
        
        // Background vertical position
        const posY = config.headerBgPosY !== undefined ? config.headerBgPosY : '50';
        document.documentElement.style.setProperty('--header-bg-position-y', `${posY}%`);
      }

      // Set header content padding
      const padY = config.headerPaddingY !== undefined ? config.headerPaddingY : '24';
      document.documentElement.style.setProperty('--header-padding-y', `${padY}px`);

      // Set header text colors
      document.documentElement.style.setProperty('--header-title-color', config.headerTitleColor || config.secondaryColor || '#ffd700');
      document.documentElement.style.setProperty('--header-subtitle-color', config.headerSubtitleColor || '#ffffff');

      // Set header custom element sizes
      const logoSz = config.headerLogoSize !== undefined ? config.headerLogoSize : '115';
      document.documentElement.style.setProperty('--header-logo-size', `${logoSz}px`);

      const titleSz = config.headerTitleSize !== undefined ? config.headerTitleSize : '2.4';
      document.documentElement.style.setProperty('--header-title-size', `${titleSz}rem`);

      const subtitleSz = config.headerSubtitleSize !== undefined ? config.headerSubtitleSize : '1.3';
      document.documentElement.style.setProperty('--header-subtitle-size', `${subtitleSz}rem`);

      // Update darker hover variants automatically
      document.documentElement.style.setProperty('--primary-hover', adjustBrightness(config.primaryColor || '#8b0000', -15));
      document.documentElement.style.setProperty('--secondary-hover', adjustBrightness(config.secondaryColor || '#ffd700', -15));

      // Update basic school texts
      const nameElements = document.querySelectorAll('.school-name');
      nameElements.forEach(el => el.textContent = config.schoolName);
      
      const nameEnElements = document.querySelectorAll('.school-name-en');
      nameEnElements.forEach(el => el.textContent = config.schoolNameEn);

      const sloganEl = document.querySelector('.school-slogan');
      if (sloganEl) sloganEl.textContent = config.slogan;

      const footerEl = document.querySelector('.footer-text');
      if (footerEl) footerEl.textContent = config.footerText;

      const logoEl = document.querySelector('.logo-img');
      if (logoEl && config.logo) logoEl.src = config.logo;

      const watermarkEl = document.querySelector('.watermark-bg');
      if (watermarkEl && config.logo) watermarkEl.style.backgroundImage = `url('${config.logo}')`;

      // Hot-Info scrolling text
      const hotInfoEl = document.getElementById('hot-info-marquee');
      if (hotInfoEl && config.hotInfo) {
        hotInfoEl.textContent = config.hotInfo;
      }

      // Contact details
      if (config.contact) {
        const phoneEl = document.getElementById('contact-phone');
        if (phoneEl) phoneEl.textContent = `โทรศัพท์: ${config.contact.phone}`;
        const emailEl = document.getElementById('contact-email');
        if (emailEl) emailEl.textContent = `อีเมล: ${config.contact.email}`;
        const addressEl = document.getElementById('contact-address');
        if (addressEl) addressEl.textContent = config.contact.address;
        
        const fbEl = document.getElementById('contact-fb');
        if (fbEl && config.contact.facebook) fbEl.href = config.contact.facebook;
        const ytEl = document.getElementById('contact-yt');
        if (ytEl && config.contact.youtube) ytEl.href = config.contact.youtube;
      }
    }

    // Render menus
    if (menus) {
      const menuContainer = document.getElementById('main-menu-container');
      if (menuContainer) {
        menuContainer.innerHTML = '';
        menus.forEach(item => {
          const li = document.createElement('li');
          li.className = 'menu-item';
          
          // Detect active menu item based on current page
          const curUrl = window.location.href;
          if (curUrl.includes(item.url)) {
            li.classList.add('active');
          }

          const a = document.createElement('a');
          a.href = item.url;
          a.textContent = item.label;
          if (item.isExternal) {
            a.target = '_blank';
            a.rel = 'noopener noreferrer';
          }
          li.appendChild(a);
          menuContainer.appendChild(li);
        });
      }
    }

    // Render side banners
    if (banners) {
      const bannerContainer = document.getElementById('side-banners-container');
      if (bannerContainer) {
        bannerContainer.innerHTML = '';
        
        // If Google Drive banners folder is configured, attempt to override images dynamically
        if (config && config.googleDriveBannersFolder && config.googleDriveBannersFolder.trim()) {
          const folderId = extractFolderId(config.googleDriveBannersFolder);
          if (folderId) {
            try {
              const driveRes = await fetch(`/api/newsletters/drive/${folderId}`);
              const driveFiles = await driveRes.json();
              if (Array.isArray(driveFiles) && driveFiles.length > 0) {
                driveFiles.forEach(file => {
                  const baseName = file.title.split('.')[0].trim().toLowerCase();
                  const matchedBanner = banners.find(b => b.id.toLowerCase() === baseName);
                  if (matchedBanner) {
                    matchedBanner.image = file.image; // Override with Drive image URL
                  }
                });
              }
            } catch (err) {
              console.error("Error loading banner images from Google Drive:", err);
            }
          }
        }

        banners.forEach(item => {
          const a = document.createElement('a');
          a.href = item.url;
          a.className = 'banner-item';
          a.title = item.title;
          if (item.isExternal) {
            a.target = '_blank';
            a.rel = 'noopener noreferrer';
          }
          
          const img = document.createElement('img');
          img.referrerPolicy = 'no-referrer';
          img.referrerPolicy = 'no-referrer';
          img.src = item.image;
          img.alt = item.title;
          a.appendChild(img);
          bannerContainer.appendChild(a);
        });
      }
    }

    // Render newsletters
    if (config && config.googleDriveFolder && config.googleDriveFolder.trim()) {
      const folderId = extractFolderId(config.googleDriveFolder);
      if (folderId) {
        try {
          const driveRes = await fetch(`/api/newsletters/drive/${folderId}`);
          const driveFiles = await driveRes.json();
          if (Array.isArray(driveFiles) && driveFiles.length > 0) {
            renderNewsletters({ newsletters: driveFiles });
          } else {
            renderNewsletters(data);
          }
        } catch (err) {
          console.error("Error loading newsletters from Google Drive:", err);
          renderNewsletters(data);
        }
      } else {
        renderNewsletters(data);
      }
    } else {
      renderNewsletters(data);
    }

  } catch (error) {
    console.error('Error loading config:', error);
  }
}

// Render Newsletter Slideshow Section
function renderNewsletters(data) {
  const container = document.getElementById('newsletter-slider-container');
  if (!container) return;

  const list = data.newsletters || [];
  if (list.length === 0) {
    container.innerHTML = '<div style="text-align: center; padding: 20px; color: var(--text-muted); font-size: 0.9rem;">ยังไม่มีจดหมายข่าวประชาสัมพันธ์</div>';
    return;
  }

  const sortedList = list.sort((a, b) => (a.order || 0) - (b.order || 0));
  container.innerHTML = '';
  
  sortedList.forEach((nl, idx) => {
    const slide = document.createElement('div');
    slide.className = `newsletter-slide${idx === 0 ? ' active' : ''}`;
    slide.dataset.index = idx;

    const img = document.createElement('img');
    img.referrerPolicy = 'no-referrer';
    img.src = nl.image;
    img.alt = nl.title || 'จดหมายข่าว';
    img.addEventListener('click', () => {
      if (typeof openImageModal === 'function') {
        openImageModal(nl.image);
      }
    });

    slide.appendChild(img);
    container.appendChild(slide);
  });

  if (sortedList.length > 1) {
    const controls = document.createElement('div');
    controls.className = 'newsletter-controls';

    const prevBtn = document.createElement('button');
    prevBtn.className = 'newsletter-btn';
    prevBtn.innerHTML = '&lsaquo;';
    prevBtn.title = 'ก่อนหน้า';

    const indicator = document.createElement('div');
    indicator.className = 'newsletter-indicator';
    indicator.textContent = `1 / ${sortedList.length}`;

    const nextBtn = document.createElement('button');
    nextBtn.className = 'newsletter-btn';
    nextBtn.innerHTML = '&rsaquo;';
    nextBtn.title = 'ถัดไป';

    controls.appendChild(prevBtn);
    controls.appendChild(indicator);
    controls.appendChild(nextBtn);
    container.appendChild(controls);

    let currentSlide = 0;
    const slides = container.querySelectorAll('.newsletter-slide');

    function showSlide(idx) {
      slides[currentSlide].classList.remove('active');
      currentSlide = (idx + sortedList.length) % sortedList.length;
      slides[currentSlide].classList.add('active');
      indicator.textContent = `${currentSlide + 1} / ${sortedList.length}`;
    }

    prevBtn.addEventListener('click', () => showSlide(currentSlide - 1));
    nextBtn.addEventListener('click', () => showSlide(currentSlide + 1));
    
    let sliderInterval = setInterval(() => showSlide(currentSlide + 1), 7000);
    container.addEventListener('mouseenter', () => clearInterval(sliderInterval));
    container.addEventListener('mouseleave', () => {
      sliderInterval = setInterval(() => showSlide(currentSlide + 1), 7000);
    });
  }
}

// 2. Load Homepage Portal Details
async function loadHomepage() {
  try {
    const res = await fetch('/api/config');
    const data = await res.json();
    
    const { slider, board, activities } = data;

    // Render Slides
    if (slider && slider.length > 0) {
      const sliderContainer = document.getElementById('carousel-inner-container');
      if (sliderContainer) {
        sliderContainer.innerHTML = '';
        slider.forEach((slide, idx) => {
          const div = document.createElement('div');
          div.className = `carousel-item${idx === 0 ? ' active' : ''}`;
          
          const img = document.createElement('img');
          img.referrerPolicy = 'no-referrer';
          img.src = slide.image;
          img.alt = slide.caption;
          
          const caption = document.createElement('div');
          caption.className = 'carousel-caption';
          const p = document.createElement('p');
          p.textContent = slide.caption;
          caption.appendChild(p);

          // If there is a link, wrap it
          if (slide.link && slide.link !== '#') {
            const a = document.createElement('a');
            a.href = slide.link;
            a.appendChild(img);
            a.appendChild(caption);
            div.appendChild(a);
          } else {
            div.appendChild(img);
            div.appendChild(caption);
          }
          sliderContainer.appendChild(div);
        });
        
        // Init Carousel Slide Logic
        initCarousel();
      }
    }

    // Render Board Members
    if (board && board.length > 0) {
      const boardContainer = document.getElementById('board-container');
      if (boardContainer) {
        boardContainer.innerHTML = '';
        // Sort board by order
        const sortedBoard = board.sort((a, b) => a.order - b.order);
        sortedBoard.forEach(member => {
          const div = document.createElement('div');
          div.className = 'board-card';
          
          const img = document.createElement('img');
          img.referrerPolicy = 'no-referrer';
          img.src = member.image;
          img.alt = member.name;
          img.className = 'board-photo';
          
          const info = document.createElement('div');
          info.className = 'board-info';
          const name = document.createElement('h4');
          name.className = 'board-name';
          name.textContent = member.name;
          const pos = document.createElement('p');
          pos.className = 'board-pos';
          pos.textContent = member.position;
          
          info.appendChild(name);
          info.appendChild(pos);
          div.appendChild(img);
          div.appendChild(info);
          boardContainer.appendChild(div);
        });
      }
    }

    // Render Activities Gallery
    if (activities && activities.length > 0) {
      const actContainer = document.getElementById('activity-grid-container');
      if (actContainer) {
        actContainer.innerHTML = '';
        activities.forEach(item => {
          const card = document.createElement('div');
          card.className = 'activity-card';
          
          const img = document.createElement('img');
          img.src = item.image;
          img.alt = item.title;
          img.className = 'activity-img';
          img.style.cursor = 'pointer';
          img.addEventListener('click', () => openImageModal(item.image));
          
          const info = document.createElement('div');
          info.className = 'activity-info';
          
          const date = document.createElement('span');
          date.className = 'activity-date';
          date.textContent = formatDate(item.date);
          
          const title = document.createElement('h3');
          title.textContent = item.title;
          
          const desc = document.createElement('p');
          desc.textContent = item.description;

          info.appendChild(date);
          info.appendChild(title);
          info.appendChild(desc);
          
          if (item.link && item.link !== '#') {
            const a = document.createElement('a');
            a.href = item.link;
            a.className = 'read-more-btn';
            a.innerHTML = `อ่านต่อ <span>&rarr;</span>`;
            info.appendChild(a);
          }
          
          card.appendChild(img);
          card.appendChild(info);
          actContainer.appendChild(card);
        });
      }
    }

    // Load Announcements (with pagination)
    loadAnnouncements(1);

    // Render Introduce Videos
    if (data.videos && data.videos.length > 0) {
      const videosContainer = document.getElementById('videos-grid-container');
      if (videosContainer) {
        videosContainer.innerHTML = '';
        data.videos.forEach(video => {
          const card = document.createElement('div');
          card.className = 'video-card';
          
          const wrapper = document.createElement('div');
          wrapper.className = 'video-wrapper';
          const iframe = document.createElement('iframe');
          iframe.src = `https://www.youtube.com/embed/${video.youtubeId}`;
          iframe.title = video.title;
          iframe.allow = "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture";
          iframe.allowFullscreen = true;
          wrapper.appendChild(iframe);
          
          const info = document.createElement('div');
          info.className = 'video-info';
          const title = document.createElement('h4');
          title.textContent = video.title;
          const desc = document.createElement('p');
          desc.textContent = video.desc;
          
          info.appendChild(title);
          info.appendChild(desc);
          card.appendChild(wrapper);
          card.appendChild(info);
          videosContainer.appendChild(card);
        });
      }
    }

    // Render Educational Partners
    if (data.partners && data.partners.length > 0) {
      const partnersContainer = document.getElementById('partners-grid-container');
      if (partnersContainer) {
        partnersContainer.innerHTML = '';
        data.partners.forEach(partner => {
          const card = document.createElement('div');
          card.className = 'partner-card';
          
          const imgWrapper = document.createElement('div');
          imgWrapper.className = 'partner-img-wrapper';
          const img = document.createElement('img');
          img.referrerPolicy = 'no-referrer';
          img.src = partner.image;
          img.alt = partner.title;
          imgWrapper.appendChild(img);
          
          const info = document.createElement('div');
          info.className = 'partner-info';
          const title = document.createElement('h4');
          title.textContent = partner.title;
          const desc = document.createElement('p');
          desc.textContent = partner.description;
          
          info.appendChild(title);
          info.appendChild(desc);
          
          card.appendChild(imgWrapper);
          card.appendChild(info);
          
          if (partner.url && partner.url !== '#') {
            card.style.cursor = 'pointer';
            card.addEventListener('click', () => {
              window.open(partner.url, '_blank');
            });
          }
          
          partnersContainer.appendChild(card);
        });
      }
    }

  } catch (error) {
    console.error('Error loading homepage:', error);
  }
}

// 3. Fetch & Render Announcements with Pagination
let currentCategoryFilter = '';
async function loadAnnouncements(page = 1) {
  try {
    const tableBody = document.getElementById('news-table-body');
    if (!tableBody) return;
    
    tableBody.innerHTML = '<tr><td colspan="2" style="text-align:center;">กำลังโหลดข้อมูล...</td></tr>';
    
    let url = `/api/news?page=${page}&limit=5`;
    if (currentCategoryFilter) {
      url += `&category=${encodeURIComponent(currentCategoryFilter)}`;
    }
    
    const res = await fetch(url);
    const result = await res.json();
    
    tableBody.innerHTML = '';
    
    if (!result.data || result.data.length === 0) {
      tableBody.innerHTML = '<tr><td colspan="2" style="text-align:center;">ไม่มีข้อมูลประกาศในขณะนี้</td></tr>';
      document.getElementById('pagination-container').innerHTML = '';
      return;
    }

    result.data.forEach(item => {
      const tr = document.createElement('tr');
      
      const td = document.createElement('td');
      
      const dateSpan = document.createElement('span');
      dateSpan.className = 'news-date';
      dateSpan.textContent = formatDate(item.date) + ' - ';
      td.appendChild(dateSpan);
      
      const tagSpan = document.createElement('span');
      tagSpan.className = `news-category-tag ${getCategoryClass(item.category)}`;
      tagSpan.textContent = item.category;
      td.appendChild(tagSpan);
      
      const a = document.createElement('a');
      a.href = `news-detail.html?id=${item.id}`;
      a.className = 'news-title-link';
      a.textContent = item.title;
      td.appendChild(a);
      
      tr.appendChild(td);
      tableBody.appendChild(tr);
    });

    // Render pagination buttons
    renderPagination(result.page, result.totalPages);
  } catch (error) {
    console.error('Error loading announcements:', error);
  }
}

// Render Pagination Buttons
function renderPagination(currentPage, totalPages) {
  const container = document.getElementById('pagination-container');
  if (!container) return;
  
  container.innerHTML = '';
  
  if (totalPages <= 1) return;

  // Previous
  const prevBtn = document.createElement('button');
  prevBtn.className = 'page-btn';
  prevBtn.textContent = 'ก่อนหน้า';
  prevBtn.disabled = currentPage === 1;
  prevBtn.addEventListener('click', () => loadAnnouncements(currentPage - 1));
  container.appendChild(prevBtn);

  // Pages
  for (let i = 1; i <= totalPages; i++) {
    const btn = document.createElement('button');
    btn.className = `page-btn${i === currentPage ? ' active' : ''}`;
    btn.textContent = i;
    btn.addEventListener('click', () => loadAnnouncements(i));
    container.appendChild(btn);
  }

  // Next
  const nextBtn = document.createElement('button');
  nextBtn.className = 'page-btn';
  nextBtn.textContent = 'ถัดไป';
  nextBtn.disabled = currentPage === totalPages;
  nextBtn.addEventListener('click', () => loadAnnouncements(currentPage + 1));
  container.appendChild(nextBtn);
}

// 4. Load Single News Detail Page
async function loadNewsDetail() {
  const params = new URLSearchParams(window.location.search);
  const id = params.get('id');
  if (!id) {
    window.location.href = 'index.html';
    return;
  }

  try {
    const res = await fetch(`/api/news/${id}`);
    if (!res.ok) {
      document.getElementById('detail-page-content').innerHTML = `
        <div class="glass-card text-center">
          <h2>ไม่พบรายการข่าวประชาสัมพันธ์นี้</h2>
          <br>
          <a href="index.html" class="back-btn">ย้อนกลับไปหน้าแรก</a>
        </div>
      `;
      return;
    }
    
    const item = await res.json();
    
    document.getElementById('news-title').textContent = item.title;
    document.title = `${item.title} - ${document.title}`;
    document.getElementById('news-date-meta').textContent = `เผยแพร่เมื่อ: ${formatDate(item.date)}`;
    document.getElementById('news-category-meta').textContent = `หมวดหมู่: ${item.category}`;
    document.getElementById('news-body').textContent = item.content;

    // Cover Image
    const imgWrapper = document.getElementById('news-image-wrapper');
    if (item.imageUrl) {
      imgWrapper.style.display = 'block';
      const newsImgEl = document.getElementById('news-image');
      if (newsImgEl) {
        newsImgEl.referrerPolicy = 'no-referrer';
        newsImgEl.src = item.imageUrl;
      }
      document.getElementById('news-image').alt = item.title;
    } else {
      imgWrapper.style.display = 'none';
    }

    // Attachment
    const attachmentBox = document.getElementById('news-attachment');
    if (item.fileUrl) {
      attachmentBox.style.display = 'flex';
      const downloadBtn = document.getElementById('news-file-download');
      downloadBtn.href = item.fileUrl;
      
      const fileTitle = document.getElementById('news-file-title');
      const filename = item.fileUrl.split('/').pop().substring(14); // Remove timestamp prefix
      fileTitle.textContent = `ดาวน์โหลดเอกสารแนบ: ${filename}`;
    } else {
      attachmentBox.style.display = 'none';
    }
  } catch (error) {
    console.error('Error loading news details:', error);
  }
}

// 5. Load Custom Static Pages (history, goal, sign)
async function loadPageContent() {
  const params = new URLSearchParams(window.location.search);
  const id = params.get('id');
  if (!id) {
    window.location.href = 'index.html';
    return;
  }

  try {
    const res = await fetch(`/api/page/${id}`);
    if (!res.ok) {
      document.getElementById('page-content-area').innerHTML = `
        <div class="glass-card text-center">
          <h2>ไม่พบข้อมูลของหน้านี้</h2>
          <br>
          <a href="index.html" class="back-btn">ย้อนกลับไปหน้าแรก</a>
        </div>
      `;
      return;
    }
    
    const page = await res.json();
    document.getElementById('page-title').textContent = page.title;
    document.title = `${page.title} - ${document.title}`;
    document.getElementById('page-body').innerHTML = page.content;
  } catch (error) {
    console.error('Error loading page content:', error);
  }
}

// --- UTILITIES ---

// Init Carousel Logic
function initCarousel() {
  const items = document.querySelectorAll('.carousel-item');
  if (items.length === 0) return;
  
  let currentIdx = 0;
  let intervalId = null;

  function showSlide(index) {
    items[currentIdx].classList.remove('active');
    currentIdx = (index + items.length) % items.length;
    items[currentIdx].classList.add('active');
  }

  function nextSlide() {
    showSlide(currentIdx + 1);
  }

  function prevSlide() {
    showSlide(currentIdx - 1);
  }

  // Bind controls
  const nextBtn = document.querySelector('.carousel-control.next');
  const prevBtn = document.querySelector('.carousel-control.prev');

  if (nextBtn) {
    nextBtn.addEventListener('click', () => {
      nextSlide();
      resetInterval();
    });
  }
  
  if (prevBtn) {
    prevBtn.addEventListener('click', () => {
      prevSlide();
      resetInterval();
    });
  }

  function startInterval() {
    intervalId = setInterval(nextSlide, 5000); // auto slide every 5 seconds
  }

  function resetInterval() {
    clearInterval(intervalId);
    startInterval();
  }

  startInterval();
}

// Modal Gallery View Functions
function openImageModal(imgSrc) {
  const modal = document.getElementById('image-modal');
  const modalImg = document.getElementById('modal-img-content');
  if (modal && modalImg) {
    modal.classList.add('show');
    modalImg.src = imgSrc;
    
    // Close on click close button or background
    const closeBtn = document.querySelector('.modal-close');
    const closeHandler = () => {
      modal.classList.remove('show');
      closeBtn.removeEventListener('click', closeHandler);
      modal.removeEventListener('click', bgCloseHandler);
    };
    
    const bgCloseHandler = (e) => {
      if (e.target === modal) {
        closeHandler();
      }
    };
    
    closeBtn.addEventListener('click', closeHandler);
    modal.addEventListener('click', bgCloseHandler);
  }
}

// Date formatter in Thai Style
function formatDate(dateStr) {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return dateStr;
  
  const months = [
    'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
    'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'
  ];
  const day = date.getDate();
  const month = months[date.getMonth()];
  const year = date.getFullYear() + 543; // convert to Buddhist Era
  
  return `${day} ${month} ${year}`;
}

// Helper to determine tag color class
function getCategoryClass(cat) {
  if (cat === 'ประกาศ/คำสั่ง') return 'tag-announcement';
  if (cat === 'ประกาศรับสมัคร/ผลสอบ') return 'tag-admission';
  return 'tag-general';
}

// Adjust Hex Color Brightness for Hovers (helper)
function adjustBrightness(hex, percent) {
  let R = parseInt(hex.substring(1, 3), 16);
  let G = parseInt(hex.substring(3, 5), 16);
  let B = parseInt(hex.substring(5, 7), 16);

  R = parseInt(R * (100 + percent) / 100);
  G = parseInt(G * (100 + percent) / 100);
  B = parseInt(B * (100 + percent) / 100);

  R = (R < 255) ? R : 255;
  G = (G < 255) ? G : 255;
  B = (B < 255) ? B : 255;

  R = (R > 0) ? R : 0;
  G = (G > 0) ? G : 0;
  B = (B > 0) ? B : 0;

  const rHex = R.toString(16).padStart(2, '0');
  const gHex = G.toString(16).padStart(2, '0');
  const bHex = B.toString(16).padStart(2, '0');

  return `#${rHex}${gHex}${bHex}`;
}

// Filter announcements by category (called from frontend filters)
function filterNews(category, activeBtn) {
  currentCategoryFilter = category;
  
  // Highlight active filter tab
  const tabs = document.querySelectorAll('.filter-tab');
  tabs.forEach(tab => tab.classList.remove('active'));
  if (activeBtn) activeBtn.classList.add('active');
  
  loadAnnouncements(1);
}
window.filterNews = filterNews;

// Helper: Convert Hex to RGB
function hexToRgb(hex) {
  const shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
  const fullHex = hex.replace(shorthandRegex, (m, r, g, b) => r + r + g + g + b + b);
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(fullHex);
  return result ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}` : null;
}

// Helper to extract Google Drive Folder ID from URL or return it directly if it's already an ID
function extractFolderId(urlOrId) {
  if (!urlOrId) return '';
  urlOrId = urlOrId.trim();
  
  // Try folders/ID pattern
  const foldersMatch = urlOrId.match(/\/folders\/([a-zA-Z0-9-_]+)/);
  if (foldersMatch) return foldersMatch[1];
  
  // Try id=ID pattern
  const idMatch = urlOrId.match(/[?&]id=([a-zA-Z0-9-_]+)/);
  if (idMatch) return idMatch[1];
  
  // If it's just the ID (alphanumeric, dash, underscore, typical length 28-33 chars)
  if (/^[a-zA-Z0-9-_]{25,45}$/.test(urlOrId)) {
    return urlOrId;
  }
  
  return '';
}

