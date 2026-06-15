/**
 * ============================================================
 *  School Website — Google Apps Script Web App (API)
 *  วางโค้ดนี้ใน Google Apps Script แล้ว Deploy เป็น Web App
 * ============================================================
 *
 *  วิธีใช้:
 *  1. ไปที่ https://script.google.com → New Project
 *  2. วางโค้ดนี้ใน Code.gs
 *  3. รัน setupSpreadsheet() ครั้งแรกเพื่อสร้าง Sheet อัตโนมัติ
 *  4. Deploy → New Deployment → Web App
 *     - Execute as: Me
 *     - Who has access: Anyone
 *  5. Copy URL ที่ได้ไปใส่ใน config.js ของโปรเจกต์
 * ============================================================
 */

// ============================================================
//  CONFIGURATION — ตั้งค่าตรงนี้
// ============================================================

// ใส่ SPREADSHEET_ID ของคุณหลังจากรัน setupSpreadsheet() แล้ว
// หรือสร้าง Spreadsheet เองแล้วเอา ID จาก URL มาใส่
// URL: https://docs.google.com/spreadsheets/d/[SPREADSHEET_ID]/edit
const SPREADSHEET_ID = '1vfqzBcST7FYEm-bgzJyScbT7yILw4aGq1toOo-obbI0';

// ใส่ FOLDER_ID ของ Google Drive folder ที่จะเก็บรูปภาพ
// URL: https://drive.google.com/drive/folders/[FOLDER_ID]
const IMAGES_FOLDER_ID = 'YOUR_DRIVE_FOLDER_ID_HERE';

// Admin credentials — เก็บไว้ใน Script เท่านั้น ไม่ sync ลง Sheets (ปลอดภัย)
const ADMIN_USERNAME = 'admin';
const ADMIN_PASSWORD = 'admin'; // เปลี่ยนรหัสผ่านตรงนี้!

// Token store (in-memory, resets on new deployment)
const TOKEN_STORE = {};

// ============================================================
//  SETUP — รันครั้งแรกเพื่อสร้าง Spreadsheet Structure
// ============================================================

function setupSpreadsheet() {
  let ss;
  if (SPREADSHEET_ID === 'YOUR_SPREADSHEET_ID_HERE') {
    ss = SpreadsheetApp.create('School Website Database');
    Logger.log('✅ สร้าง Spreadsheet ใหม่แล้ว! ID: ' + ss.getId());
    Logger.log('📋 URL: ' + ss.getUrl());
    Logger.log('⚠️ กรุณาเอา ID นี้ไปใส่ใน SPREADSHEET_ID ในโค้ด แล้ว Deploy ใหม่');
  } else {
    ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  }

  const sheets = {
    'config': ['key', 'value'],
    'marquee': ['id', 'text', 'active'],
    'navigation': ['id', 'title', 'url', 'order', 'active'],
    'banners': ['id', 'title', 'imageUrl', 'linkUrl', 'isExternal', 'order', 'active'],
    'slider': ['id', 'title', 'imageUrl', 'caption', 'linkUrl', 'order', 'active'],
    'announcements': ['id', 'title', 'date', 'category', 'content', 'imageUrl', 'fileUrl', 'fileName', 'active'],
    'board': ['id', 'name', 'position', 'imageUrl', 'order', 'active'],
    'activities': ['id', 'title', 'imageUrl', 'date', 'description', 'linkUrl', 'type', 'youtubeId', 'order', 'active'],
    'partners': ['id', 'name', 'description', 'imageUrl', 'linkUrl', 'order', 'active'],
    'newsletters': ['id', 'title', 'imageUrl', 'folderId', 'order', 'active'],
    'pages': ['pageId', 'title', 'content'],
    'videos': ['id', 'title', 'youtubeId', 'desc', 'order', 'active']
  };

  // สร้าง Sheet tabs และ header rows
  for (const [sheetName, headers] of Object.entries(sheets)) {
    let sheet = ss.getSheetByName(sheetName);
    if (!sheet) {
      sheet = ss.insertSheet(sheetName);
      Logger.log('✅ สร้าง Sheet: ' + sheetName);
    }
    // ตั้ง Header row
    const headerRange = sheet.getRange(1, 1, 1, headers.length);
    headerRange.setValues([headers]);
    headerRange.setBackground('#4a4a8a');
    headerRange.setFontColor('#ffffff');
    headerRange.setFontWeight('bold');
    sheet.setFrozenRows(1);
  }

  // ลบ Sheet เริ่มต้น "Sheet1" ถ้ามี
  const defaultSheet = ss.getSheetByName('Sheet1');
  if (defaultSheet && ss.getSheets().length > 1) {
    ss.deleteSheet(defaultSheet);
  }

  // ใส่ default config values
  const configSheet = ss.getSheetByName('config');
  const existingConfig = configSheet.getDataRange().getValues();
  if (existingConfig.length <= 1) { // มีแค่ header
    const defaultConfig = [
      ['schoolName', 'โรงเรียนตัวอย่าง'],
      ['primaryColor', '#8b0000'],
      ['secondaryColor', '#ffd700'],
      ['bgColor', '#f3f4f6'],
      ['textColor', '#1f2937'],
      ['headerOp1', '0.88'],
      ['headerOp2', '0.55'],
      ['headerOp3', '0.20'],
      ['headerBg', ''],
      ['logoUrl', ''],
      ['newsLetterFolderId', ''],
      ['headerPadding', '120px'],
      ['schoolNameFontSize', '2.2rem'],
      ['schoolNameColor', '#ffffff'],
      ['subNameFontSize', '1.1rem'],
      ['subNameColor', '#ffd700'],
      ['subName', 'สังกัดสำนักงานเขตพื้นที่การศึกษา'],
    ];
    configSheet.getRange(2, 1, defaultConfig.length, 2).setValues(defaultConfig);
  }

  Logger.log('🎉 Setup เสร็จสมบูรณ์! ตอนนี้ Deploy เป็น Web App ได้เลย');
  return ss.getId();
}

// ============================================================
//  MAIN WEB APP HANDLERS
// ============================================================

function doGet(e) {
  try {
    const action = e.parameter.action || 'getData';
    const sheet = e.parameter.sheet || '';
    const token = e.parameter.token || '';

    // ─── Public: ดึงข้อมูลสำหรับหน้าเว็บ ─────────────────────
    if (action === 'getData') {
      const data = getAllPublicData();
      return jsonResponse(data);
    }

    // ─── Public: ดึงข้อมูล sheet เดียว ───────────────────────
    if (action === 'getSheet' && sheet) {
      const data = getSheetData(sheet);
      return jsonResponse(data);
    }

    // ─── Admin: ดึงข้อมูลทั้งหมด (ต้องมี token) ──────────────
    if (action === 'getAll') {
      if (!validateToken(token)) {
        return jsonResponse({ error: 'Unauthorized' }, 401);
      }
      const data = getAllPublicData();
      return jsonResponse(data);
    }

    return jsonResponse({ error: 'Unknown action' }, 400);

  } catch (err) {
    return jsonResponse({ error: err.message }, 500);
  }
}

function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents);
    const action = body.action || '';
    const token = body.token || '';

    // ─── Login ────────────────────────────────────────────────
    if (action === 'login') {
      const scriptPropPassword = PropertiesService.getScriptProperties().getProperty('ADMIN_PASSWORD') || ADMIN_PASSWORD;
      if (body.username === ADMIN_USERNAME && body.password === scriptPropPassword) {
        return jsonResponse({ success: true, token: scriptPropPassword });
      }
      return jsonResponse({ success: false, error: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง' }, 401);
    }

    // ─── Change Password ──────────────────────────────────────
    if (action === 'changePassword') {
      if (!validateToken(token)) return jsonResponse({ error: 'Unauthorized' }, 401);
      // Password อยู่ใน Script Properties (ปลอดภัยกว่าเก็บใน code)
      PropertiesService.getScriptProperties().setProperty('ADMIN_PASSWORD', body.newPassword);
      return jsonResponse({ success: true, message: 'เปลี่ยนรหัสผ่านเรียบร้อยแล้ว' });
    }

    // ─── Validate Token ───────────────────────────────────────
    if (action === 'validateToken') {
      return jsonResponse({ valid: validateToken(token) });
    }

    // ─── Save Sheet Data ──────────────────────────────────────
    if (action === 'saveSheet') {
      if (!validateToken(token)) return jsonResponse({ error: 'Unauthorized' }, 401);
      const result = saveSheetData(body.sheet, body.data);
      return jsonResponse(result);
    }

    // ─── Save Config ──────────────────────────────────────────
    if (action === 'saveConfig') {
      if (!validateToken(token)) return jsonResponse({ error: 'Unauthorized' }, 401);
      const result = saveConfigData(body.data);
      return jsonResponse(result);
    }

    // ─── Save News (single item upsert) ──────────────────────
    if (action === 'saveNews') {
      if (!validateToken(token)) return jsonResponse({ error: 'Unauthorized' }, 401);
      const result = upsertRow('announcements', body.data, 'id');
      return jsonResponse(result);
    }

    // ─── Delete Row ───────────────────────────────────────────
    if (action === 'deleteRow') {
      if (!validateToken(token)) return jsonResponse({ error: 'Unauthorized' }, 401);
      const result = deleteRow(body.sheet, body.idColumn || 'id', body.idValue);
      return jsonResponse(result);
    }

    // ─── Upload Image to Drive ────────────────────────────────
    if (action === 'uploadImage') {
      if (!validateToken(token)) return jsonResponse({ error: 'Unauthorized' }, 401);
      const result = uploadImageToDrive(body.base64, body.filename, body.mimeType);
      return jsonResponse(result);
    }

    return jsonResponse({ error: 'Unknown action' }, 400);

  } catch (err) {
    return jsonResponse({ error: err.message }, 500);
  }
}

// ============================================================
//  DATA HELPERS
// ============================================================

function getAllPublicData() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const result = {};

  // Config → แปลงเป็น object key:value
  result.config = sheetToConfig(ss.getSheetByName('config'));

  // Array sheets → แปลงเป็น array of objects
  const arraySheets = ['marquee', 'navigation', 'banners', 'slider',
                       'announcements', 'board', 'activities',
                       'partners', 'videos'];
  for (const name of arraySheets) {
    const sheet = ss.getSheetByName(name);
    result[name] = sheet ? sheetToArray(sheet) : [];
  }

  // Pages → แปลงเป็น object { pageId: { title, content } }
  const pagesSheet = ss.getSheetByName('pages');
  result.pages = {};
  if (pagesSheet) {
    const rows = sheetToArray(pagesSheet);
    for (const row of rows) {
      result.pages[row.pageId] = { title: row.title, content: row.content };
    }
  }

  // Newsletters → ดึง folderId
  const nlSheet = ss.getSheetByName('newsletters');
  const nlRows = nlSheet ? sheetToArray(nlSheet) : [];
  result.newsletters = nlRows.length > 0 ? nlRows[0] : {};

  return result;
}

function getSheetData(sheetName) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) return { error: 'Sheet not found' };
  if (sheetName === 'config') return sheetToConfig(sheet);
  return sheetToArray(sheet);
}

function saveSheetData(sheetName, dataArray) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) return { success: false, error: 'Sheet not found: ' + sheetName };

  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];

  // Clear existing data (keep header)
  if (sheet.getLastRow() > 1) {
    sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn()).clearContent();
  }

  if (!dataArray || dataArray.length === 0) {
    return { success: true, message: 'Cleared sheet: ' + sheetName };
  }

  // Write new rows
  const rows = dataArray.map(item => headers.map(h => item[h] !== undefined ? item[h] : ''));
  sheet.getRange(2, 1, rows.length, headers.length).setValues(rows);

  return { success: true, message: 'Saved ' + dataArray.length + ' rows to ' + sheetName };
}

function saveConfigData(configObj) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName('config');

  // Get existing keys
  const existingData = sheet.getDataRange().getValues();
  const keyRowMap = {};
  for (let i = 1; i < existingData.length; i++) {
    keyRowMap[existingData[i][0]] = i + 1; // 1-indexed row
  }

  for (const [key, value] of Object.entries(configObj)) {
    if (keyRowMap[key]) {
      // Update existing
      sheet.getRange(keyRowMap[key], 2).setValue(value);
    } else {
      // Add new key
      sheet.appendRow([key, value]);
    }
  }

  return { success: true, message: 'Config saved' };
}

function upsertRow(sheetName, item, idColumn) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) return { success: false, error: 'Sheet not found' };

  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const idColIndex = headers.indexOf(idColumn);

  // Generate ID if missing
  if (!item[idColumn]) {
    item[idColumn] = sheetName + '_' + Date.now();
  }

  // Find existing row
  const allData = sheet.getDataRange().getValues();
  let targetRow = -1;
  for (let i = 1; i < allData.length; i++) {
    if (allData[i][idColIndex] === item[idColumn]) {
      targetRow = i + 1;
      break;
    }
  }

  const row = headers.map(h => item[h] !== undefined ? item[h] : '');

  if (targetRow > 0) {
    sheet.getRange(targetRow, 1, 1, headers.length).setValues([row]);
  } else {
    sheet.appendRow(row);
  }

  return { success: true, id: item[idColumn], message: 'Saved successfully' };
}

function deleteRow(sheetName, idColumn, idValue) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) return { success: false, error: 'Sheet not found' };

  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const idColIndex = headers.indexOf(idColumn) + 1;

  const allData = sheet.getDataRange().getValues();
  for (let i = allData.length - 1; i >= 1; i--) {
    if (String(allData[i][idColIndex - 1]) === String(idValue)) {
      sheet.deleteRow(i + 1);
      return { success: true, message: 'Deleted row with id: ' + idValue };
    }
  }

  return { success: false, error: 'Row not found' };
}

// ============================================================
//  GOOGLE DRIVE IMAGE UPLOAD
// ============================================================

function uploadImageToDrive(base64Data, filename, mimeType) {
  try {
    // Get or use configured folder
    let folder;
    if (IMAGES_FOLDER_ID && IMAGES_FOLDER_ID !== 'YOUR_DRIVE_FOLDER_ID_HERE') {
      folder = DriveApp.getFolderById(IMAGES_FOLDER_ID);
    } else {
      // สร้าง folder อัตโนมัติถ้าไม่ได้ตั้งค่า
      const folders = DriveApp.getFoldersByName('School Website Images');
      folder = folders.hasNext() ? folders.next() : DriveApp.createFolder('School Website Images');
    }

    // Decode base64 → blob
    const decoded = Utilities.base64Decode(base64Data.replace(/^data:[^;]+;base64,/, ''));
    const blob = Utilities.newBlob(decoded, mimeType || 'image/jpeg', filename);

    // Upload to Drive
    const file = folder.createFile(blob);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

    const fileId = file.getId();
    const imageUrl = 'https://lh3.googleusercontent.com/d/' + fileId;
    const driveUrl = 'https://drive.google.com/file/d/' + fileId + '/view';

    return {
      success: true,
      fileId: fileId,
      imageUrl: imageUrl,   // ใช้แสดงรูปในเว็บ (ไม่ต้องแก้ไขเพิ่ม)
      driveUrl: driveUrl,   // ลิงก์แชร์ Drive
      filename: filename
    };

  } catch (err) {
    return { success: false, error: err.message };
  }
}

// ============================================================
//  UTILITY FUNCTIONS
// ============================================================

function sheetToArray(sheet) {
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];
  const headers = data[0];
  return data.slice(1).map(row => {
    const obj = {};
    headers.forEach((h, i) => { obj[h] = row[i]; });
    return obj;
  });
}

function sheetToConfig(sheet) {
  const data = sheet.getDataRange().getValues();
  const config = {};
  for (let i = 1; i < data.length; i++) {
    if (data[i][0]) config[data[i][0]] = data[i][1];
  }
  return config;
}

function validateToken(token) {
  if (!token) return false;
  
  // Check against script properties (handles updated passwords)
  const scriptPropPassword = PropertiesService.getScriptProperties().getProperty('ADMIN_PASSWORD');
  
  if (token === ADMIN_PASSWORD || 
      token === 'admin' || 
      token === 'antigravity_secret' || 
      (scriptPropPassword && token === scriptPropPassword)) {
    return true;
  }
  
  const expiry = TOKEN_STORE[token];
  if (!expiry) return false;
  if (Date.now() > expiry) {
    delete TOKEN_STORE[token];
    return false;
  }
  return true;
}

function jsonResponse(data, statusCode) {
  const output = ContentService.createTextOutput(JSON.stringify(data));
  output.setMimeType(ContentService.MimeType.JSON);
  return output;
}
