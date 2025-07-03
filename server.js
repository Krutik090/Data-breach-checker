const express = require('express');
const fetch = require('node-fetch');
const path = require('path');
const cors = require('cors');
const fs = require('fs');
const app = express();
require('dotenv').config();

const RECAPTCHA_SECRET = process.env.RECAPTCHA_SECRET;
const SEARCH_LOG_FILE = path.join(__dirname, 'search_logs.csv');
const CONTACT_FILE = path.join(__dirname, 'contacts.csv');

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

function appendToCSV(filePath, headers, data) {
  const exists = fs.existsSync(filePath);
  const line = data.map(value => `"${value.replace(/"/g, '""')}"`).join(',') + '\n';
  if (!exists) {
    fs.writeFileSync(filePath, headers.join(',') + '\n', 'utf8');
  }
  fs.appendFileSync(filePath, line, 'utf8');
}

function parseCSV(filePath) {
  if (!fs.existsSync(filePath)) return [];
  const lines = fs.readFileSync(filePath, 'utf8').trim().split('\n');
  const headers = lines[0].split(',');
  return lines.slice(1).map(line => {
    const values = line.match(/\"(.*?)\"(?=,|$)/g)?.map(v => v.replace(/\"/g, '').replace(/^"|"$/g, '')) || [];
    const obj = {};
    headers.forEach((h, i) => obj[h] = values[i] || '');
    return obj;
  });
}

app.post('/api/search', async (req, res) => {
  const { email, token } = req.body;

  if (!email || !token) {
    return res.status(400).json({ success: false, message: 'Missing email or captcha token' });
  }

  try {
    const verifyURL = `https://www.google.com/recaptcha/api/siteverify?secret=${RECAPTCHA_SECRET}&response=${token}`;
    const captchaRes = await fetch(verifyURL, { method: 'POST' });
    const captchaData = await captchaRes.json();

    if (!captchaData.success) {
      return res.status(403).json({ success: false, message: 'Captcha verification failed' });
    }

    const now = new Date();
    appendToCSV(
      SEARCH_LOG_FILE,
      ['Timestamp', 'Date', 'Time', 'Email'],
      [now.toISOString(), now.toLocaleDateString(), now.toLocaleTimeString(), email]
    );

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
    const now = new Date();
    appendToCSV(
      CONTACT_FILE,
      ['Timestamp', 'Date', 'Time', 'Name', 'Email', 'Phone', 'Message'],
      [now.toISOString(), now.toLocaleDateString(), now.toLocaleTimeString(), name, email, phone, message]
    );

    res.json({ success: true });
  } catch (err) {
    console.error("CSV write error:", err);
    res.status(500).json({ success: false, message: "Internal error" });
  }
});

app.get('/api/admin/logs', (req, res) => {
  try {
    const searchLogs = parseCSV(SEARCH_LOG_FILE);
    const contactLogs = parseCSV(CONTACT_FILE);
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