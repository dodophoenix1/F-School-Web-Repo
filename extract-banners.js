const fs = require('fs');
const path = require('path');

const dbFile = './server-version/data/database.json';
if (!fs.existsSync(dbFile)) {
  console.error('❌ database.json not found!');
  process.exit(1);
}

const db = JSON.parse(fs.readFileSync(dbFile, 'utf8'));
const banners = db.banners || [];

const uploadsDirs = [
  './server-version/public/uploads',
  './static-version/uploads'
];

// Ensure uploads folders exist
for (const dir of uploadsDirs) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

let extractedCount = 0;
const updatedBanners = [];

for (const banner of banners) {
  const item = { ...banner };
  
  if (banner.image && banner.image.startsWith('data:image')) {
    try {
      const matches = banner.image.match(/^data:image\/([a-zA-Z+]+);base64,(.+)$/);
      if (matches) {
        const ext = matches[1] === 'jpeg' ? 'jpg' : 'png';
        const base64Data = matches[2];
        const filename = `${banner.id}.${ext}`;
        const buffer = Buffer.from(base64Data, 'base64');
        
        // Save to both uploads folders
        for (const dir of uploadsDirs) {
          fs.writeFileSync(path.join(dir, filename), buffer);
        }
        
        console.log(`✅ Extracted base64 image to ${filename}`);
        item.image = `/uploads/${filename}`;
        extractedCount++;
      }
    } catch (err) {
      console.error(`❌ Error extracting image for banner ${banner.id}:`, err.message);
    }
  } else if (banner.image) {
    // Keep existing path
    console.log(`ℹ️ Banner ${banner.id} already has a path: ${banner.image}`);
  }
  
  updatedBanners.push(item);
}

if (extractedCount > 0) {
  // Update local database.json with file paths instead of base64
  db.banners = updatedBanners;
  fs.writeFileSync(dbFile, JSON.stringify(db, null, 2), 'utf8');
  
  const staticDbFile = './static-version/data/database.json';
  if (fs.existsSync(path.dirname(staticDbFile))) {
    fs.writeFileSync(staticDbFile, JSON.stringify(db, null, 2), 'utf8');
  }
  
  console.log(`🎉 Successfully extracted ${extractedCount} banner images and updated database.json`);
  
  // Re-generate migrate-data.json
  const migrateDataFile = './migrate-data.json';
  const migrateData = JSON.parse(fs.readFileSync(migrateDataFile, 'utf8'));
  migrateData.banners = updatedBanners;
  
  // Rename navigation to menus if present
  if (migrateData.navigation) {
    migrateData.menus = migrateData.navigation;
    delete migrateData.navigation;
  }
  
  fs.writeFileSync(migrateDataFile, JSON.stringify(migrateData, null, 2), 'utf8');
  console.log(`✅ Updated migrate-data.json`);
} else {
  console.log('ℹ️ No base64 images found to extract.');
}
