const fs = require('fs');
const data = JSON.parse(fs.readFileSync('./migrate-data.json', 'utf8'));

// เปลี่ยนชื่อคีย์จาก navigation เป็น menus เพื่อให้ตรงกับโครงสร้าง database.json
if (data.navigation) {
  data.menus = data.navigation;
  delete data.navigation;
}

const dataJson = JSON.stringify(data);

const script = `// ==========================================================
// วางโค้ดนี้เพิ่มต่อท้ายใน Code.gs แล้วเลือก migrateFromExistingData แล้ว Run
// ==========================================================
function migrateFromExistingData() {
  const DATA = ${dataJson};
  
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  
  // Save config
  const configSheet = ss.getSheetByName('config');
  const existingConfig = configSheet.getDataRange().getValues();
  const keyRowMap = {};
  for (let i = 1; i < existingConfig.length; i++) {
    keyRowMap[existingConfig[i][0]] = i + 1;
  }
  for (const [key, value] of Object.entries(DATA.config)) {
    if (keyRowMap[key]) configSheet.getRange(keyRowMap[key], 2).setValue(value);
    else configSheet.appendRow([key, value]);
  }
  Logger.log('config saved');
  
  // Save array sheets
  const sheetNames = ['menus','banners','slider','announcements','board','activities','videos','partners','pages','newsletters'];
  for (const sheetName of sheetNames) {
    const sheet = ss.getSheetByName(sheetName);
    if (!sheet || !DATA[sheetName] || DATA[sheetName].length === 0) {
      Logger.log('skip: ' + sheetName + ' (empty)');
      continue;
    }
    const headers = sheet.getRange(1,1,1,sheet.getLastColumn()).getValues()[0];
    if (sheet.getLastRow() > 1) {
      sheet.getRange(2,1,sheet.getLastRow()-1,sheet.getLastColumn()).clearContent();
    }
    const rows = DATA[sheetName].map(function(item) {
      return headers.map(function(h) { return item[h] !== undefined ? item[h] : ''; });
    });
    sheet.getRange(2,1,rows.length,headers.length).setValues(rows);
    Logger.log(sheetName + ': ' + rows.length + ' rows saved');
  }
  
  Logger.log('Migration complete!');
  SpreadsheetApp.flush();
}`;

fs.writeFileSync('./migrate-function.gs', script, 'utf8');
console.log('✅ สร้างไฟล์ migrate-function.gs แล้ว');
console.log('   ขนาดไฟล์: ' + Math.round(Buffer.byteLength(script)/1024) + ' KB');
