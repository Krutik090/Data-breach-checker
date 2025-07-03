const express = require('express');
const fetch = require('node-fetch');
const path = require('path');
const cors = require('cors');
const app = express();
const XLSX = require('xlsx');
const CONTACT_FILE = path.join(__dirname, 'contacts.xlsx');
const SEARCH_LOG_FILE = path.join(__dirname, 'search_logs.xlsx');

const fs = require('fs');
require('dotenv').config();
const RECAPTCHA_SECRET = process.env.RECAPTCHA_SECRET;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public'))); // serve frontend files

app.post('/api/search', async (req, res) => {
  const { email, token } = req.body;

  if (!email || !token) {
    return res.status(400).json({ success: false, message: 'Missing email or captcha token' });
  }

  try {
    // ✅ Verify reCAPTCHA
    const verifyURL = `https://www.google.com/recaptcha/api/siteverify?secret=${RECAPTCHA_SECRET}&response=${token}`;
    const captchaRes = await fetch(verifyURL, { method: 'POST' });
    const captchaData = await captchaRes.json();

    if (!captchaData.success) {
      return res.status(403).json({ success: false, message: 'Captcha verification failed' });
    }

    try {
      // ✅ Log the email + timestamp
      let logData = [];
      let searchWorkbook;

      if (fs.existsSync(SEARCH_LOG_FILE)) {
        searchWorkbook = XLSX.readFile(SEARCH_LOG_FILE);
        const searchSheet = searchWorkbook.Sheets[searchWorkbook.SheetNames[0]];
        logData = XLSX.utils.sheet_to_json(searchSheet);
      } else {
        searchWorkbook = XLSX.utils.book_new();
      }

      const now = new Date();
      logData.push({
        Timestamp: now.toISOString(),
        Date: now.toLocaleDateString(),
        Time: now.toLocaleTimeString(),
        Email: email
      });

      const updatedSheet = XLSX.utils.json_to_sheet(logData);
      XLSX.utils.book_append_sheet(searchWorkbook, updatedSheet, 'SearchLogs', true);
      XLSX.writeFile(searchWorkbook, SEARCH_LOG_FILE);
    } catch (err) {
      console.error("Error writing search log:", err);
    }

    // ✅ Use the actual public LeakCheck API
    const leakcheckUrl = `https://leakcheck.io/api/public?check=${encodeURIComponent(email)}`;

    const apiRes = await fetch(leakcheckUrl);
    const data = await apiRes.json();

    res.json(data);
  } catch (err) {
    console.error('❌ Error during CAPTCHA or search:', err);
    res.status(500).json({ success: false, message: 'Server error', details: err.message });
  }
});

app.post('/api/contact', async (req, res) => {
  const { name, email, phone, message } = req.body;

  if (!name || !email || !phone || !message) {
    return res.status(400).json({ success: false, message: 'Missing fields' });
  }

  try {
    let workbook, worksheet, data = [];

    if (fs.existsSync(CONTACT_FILE)) {
      workbook = XLSX.readFile(CONTACT_FILE);
      worksheet = workbook.Sheets[workbook.SheetNames[0]];
      data = XLSX.utils.sheet_to_json(worksheet);
    } else {
      workbook = XLSX.utils.book_new();
    }

    const now = new Date();
    data.push({
      Timestamp: now.toISOString(),
      Date: now.toLocaleDateString(),
      Time: now.toLocaleTimeString(),
      Name: name,
      Email: email,
      Phone: phone,
      Message: message
    });

    const newSheet = XLSX.utils.json_to_sheet(data);
    XLSX.utils.book_append_sheet(workbook, newSheet, "Contacts", true);
    XLSX.writeFile(workbook, CONTACT_FILE);

    res.json({ success: true });
  } catch (err) {
    console.error("Excel write error:", err);
    res.status(500).json({ success: false, message: "Internal error" });
  }
});

app.get('/api/admin/logs', (req, res) => {
  try {
    let searchLogs = [], contactLogs = [];

    // Load Search Logs
    if (fs.existsSync(SEARCH_LOG_FILE)) {
      const wb1 = XLSX.readFile(SEARCH_LOG_FILE);
      const ws1 = wb1.Sheets[wb1.SheetNames[0]];
      searchLogs = XLSX.utils.sheet_to_json(ws1);
    }

    // Load Contact Logs
    if (fs.existsSync(CONTACT_FILE)) {
      const wb2 = XLSX.readFile(CONTACT_FILE);
      const ws2 = wb2.Sheets[wb2.SheetNames[0]];
      contactLogs = XLSX.utils.sheet_to_json(ws2);
    }

    res.json({ searchLogs, contactLogs });
  } catch (err) {
    console.error("Error reading logs:", err);
    res.status(500).json({ error: "Failed to read logs" });
  }
});

const PORT = process.env.PORT || 5555;
app.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
});
