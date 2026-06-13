# 🏫 School Website Template - Netlify Deployment Guide (รุ่น Serverless / Static)

โฟลเดอร์นี้ได้รับการปรับแต่งเป็นพิเศษให้เป็น **Static Web Application** 100% สำหรับนำไปขึ้นโฮสติ้งฟรีบน **Netlify** ได้ทันทีโดยไม่จำเป็นต้องพึ่งพาระบบ Backend หรือฐานข้อมูลเซิร์ฟเวอร์จริง

---

## 🚀 วิธีการ Deploy ขึ้น Netlify ทันที (ง่ายที่สุด)

คุณสามารถนำเว็บไซต์นี้ขึ้นออนไลน์ได้ภายใน 1 นาที โดยทำตามขั้นตอนดังนี้:

1. เปิดเบราว์เซอร์ไปที่หน้าระบบอัปโหลดด่วนของ Netlify:
   👉 **[https://app.netlify.com/drop](https://app.netlify.com/drop)**
2. ลากโฟลเดอร์ `School-Website-Netlify` นี้ทั้งโฟลเดอร์ไปวาง (Drag & Drop) ในพื้นที่อัปโหลดบนเว็บ
3. รอระบบประมวลผลประมาณ 10-15 วินาที Netlify จะสร้างลิงก์เว็บไซต์ใช้งานจริงให้คุณทันที! (เช่น `https://random-name.netlify.app`)

---

## 🛠️ จุดเด่นของรุ่น Serverless (Netlify Version)

* **ฐานข้อมูลจำลองในบราวเซอร์ (LocalStorage):** เมื่อคุณทำการบันทึกข้อมูล ปรับแต่งเฉดสี โทนสี อัปโหลดแบนเนอร์ หรือแก้ไขข้อมูลหลังบ้าน ข้อมูลทั้งหมดจะถูกเซฟเก็บไว้บน `localStorage` ของเบราว์เซอร์ ทำให้สามารถกดทดสอบฟังก์ชันการทำงานหลังบ้านได้อย่างสมบูรณ์แบบโดยไม่ต้องต่อเซิร์ฟเวอร์
* **การจำลองอัปโหลดไฟล์ (Base64 File Converter):** ระบบหลังบ้านใช้การอัปโหลดไฟล์จำลองโดยแปลงเป็น **Base64 Data URI** ทำให้ภาพพรีวิวโลโก้ ภาพพื้นหลัง และภาพสไลด์เปลี่ยนไปจริงในเบราว์เซอร์ขณะรันเดโม
* **โครงสร้างพร้อมใช้:** ไฟล์ `index.html` อยู่ด้านนอกสุด ทำให้บราวเซอร์และบอทของ Netlify เรียกใช้งานได้ทันทีโดยไม่ต้องตั้งค่า Build Command เพิ่มเติม

---

## 🔐 ข้อมูลเข้าสู่ระบบหลังบ้าน (Admin Login)

คุณสามารถเปิดเซิร์ฟเวอร์ทดสอบในเครื่องได้ด้วยการดับเบิ้ลคลิกไฟล์ `เปิดเดโมเว็บสำหรับNetlify.bat` บนหน้าจอของคุณ และเข้าจัดการระบบหลังบ้านได้ที่:
* **ลิงก์เข้าสู่ระบบ:** `http://localhost:8080/admin/` (หรือต่อท้ายลิงก์ Netlify ของคุณด้วย `/admin/`)
* **ชื่อผู้ใช้งาน (Username):** `admin`
* **รหัสผ่าน (Password):** `admin`

---

# 🇬🇧 English Quick Start

This folder is configured as a 100% serverless static website, optimized for deploying directly to **Netlify** with zero configuration.

### How to Deploy
1. Open **[https://app.netlify.com/drop](https://app.netlify.com/drop)**
2. Drag and drop this folder (`School-Website-Netlify`) onto the page.
3. Your site will be online instantly!

### Admin Credentials
* **URL:** `/admin/`
* **Username:** `admin`
* **Password:** `admin`
