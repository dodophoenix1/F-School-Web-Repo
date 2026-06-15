const fs = require('fs');

function patchFile(filePath, replacements) {
  if (!fs.existsSync(filePath)) {
    console.log(`⚠️ File not found: ${filePath}`);
    return;
  }
  let s = fs.readFileSync(filePath, 'utf8');
  let original = s;
  for (const [target, replacement] of replacements) {
    s = s.replace(target, replacement);
  }
  if (s !== original) {
    fs.writeFileSync(filePath, s, 'utf8');
    console.log(`✅ Patched: ${filePath}`);
  } else {
    console.log(`ℹ️ No changes needed or targets not found for: ${filePath}`);
  }
}

// Replacements for static-version/js/app.js
const staticReplacements = [
  [
    `if (logoEl && config.logo) logoEl.src = resolveImageUrl(config.logo);`,
    `if (logoEl && config.logo) { logoEl.referrerPolicy = 'no-referrer'; logoEl.src = resolveImageUrl(config.logo); }`
  ],
  [
    `img.src = resolveImageUrl(item.image);`,
    `img.referrerPolicy = 'no-referrer';\n          img.src = resolveImageUrl(item.image);`
  ],
  [
    `img.src = resolveImageUrl(nl.image);`,
    `img.referrerPolicy = 'no-referrer';\n    img.src = resolveImageUrl(nl.image);`
  ],
  [
    `img.src = resolveImageUrl(slide.image);`,
    `img.referrerPolicy = 'no-referrer';\n          img.src = resolveImageUrl(slide.image);`
  ],
  [
    `img.src = resolveImageUrl(member.image);`,
    `img.referrerPolicy = 'no-referrer';\n          img.src = resolveImageUrl(member.image);`
  ],
  [
    `img.src = resolveImageUrl(item.image);`,
    `img.referrerPolicy = 'no-referrer';\n          img.src = resolveImageUrl(item.image);`
  ],
  [
    `img.src = resolveImageUrl(partner.image);`,
    `img.referrerPolicy = 'no-referrer';\n          img.src = resolveImageUrl(partner.image);`
  ],
  [
    `document.getElementById('news-image').src = resolveImageUrl(item.imageUrl);`,
    `const newsImgEl = document.getElementById('news-image');\n      if (newsImgEl) {\n        newsImgEl.referrerPolicy = 'no-referrer';\n        newsImgEl.src = resolveImageUrl(item.imageUrl);\n      }`
  ],
  [
    `modalImg.src = imgSrc;`,
    `modalImg.referrerPolicy = 'no-referrer';\n    modalImg.src = imgSrc;`
  ]
];

// Replacements for server-version/public/js/app.js
const serverReplacements = [
  [
    `logoEl.src = config.logo || '/uploads/logo_default.png';`,
    `logoEl.referrerPolicy = 'no-referrer';\n      logoEl.src = config.logo || '/uploads/logo_default.png';`
  ],
  [
    `img.src = item.image;`,
    `img.referrerPolicy = 'no-referrer';\n          img.src = item.image;`
  ],
  [
    `img.src = nl.image;`,
    `img.referrerPolicy = 'no-referrer';\n    img.src = nl.image;`
  ],
  [
    `img.src = slide.image;`,
    `img.referrerPolicy = 'no-referrer';\n          img.src = slide.image;`
  ],
  [
    `img.src = member.image;`,
    `img.referrerPolicy = 'no-referrer';\n          img.src = member.image;`
  ],
  [
    `img.src = item.image;`,
    `img.referrerPolicy = 'no-referrer';\n          img.src = item.image;`
  ],
  [
    `img.src = partner.image;`,
    `img.referrerPolicy = 'no-referrer';\n          img.src = partner.image;`
  ],
  [
    `document.getElementById('news-image').src = item.imageUrl;`,
    `const newsImgEl = document.getElementById('news-image');\n      if (newsImgEl) {\n        newsImgEl.referrerPolicy = 'no-referrer';\n        newsImgEl.src = item.imageUrl;\n      }`
  ]
];

patchFile('./static-version/js/app.js', staticReplacements);
patchFile('./server-version/public/js/app.js', serverReplacements);
