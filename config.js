/**
 * ============================================================
 *  School Website — Configuration File
 *  แก้ไขไฟล์นี้เพื่อเชื่อมต่อกับ Google Apps Script ของคุณ
 * ============================================================
 *
 *  วิธีตั้งค่า:
 *  1. ไปที่ Google Apps Script ของคุณ
 *  2. Deploy → Manage Deployments → Copy URL
 *  3. วาง URL ใน APPS_SCRIPT_URL ด้านล่าง
 *  4. บันทึกไฟล์ → push ขึ้น GitHub → Vercel จะ deploy อัตโนมัติ
 * ============================================================
 */

const SCHOOL_CONFIG = {
  // ─── Google Apps Script Web App URL ────────────────────────
  // วาง URL ที่ได้จากการ Deploy Apps Script ตรงนี้
  APPS_SCRIPT_URL: 'https://script.google.com/macros/s/AKfycbzxJYtmFToXtN0ByDcyZRbtSvI5cQVpIQ1hjnIHfGNZwS7RQlGS725QT8sfi_OScsIjhg/exec',

  // ─── Fallback ────────────────────────────────────────────────
  // ถ้า Apps Script ใช้ไม่ได้ ให้ดึงจาก database.json แทน (สำรอง)
  USE_FALLBACK_JSON: false,
};

// Export สำหรับใช้ใน Node.js (server-version)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = SCHOOL_CONFIG;
}
