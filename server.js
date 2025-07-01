const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch'); // make sure v2
const path = require('path');
const app = express();
app.use(cors());
app.use(express.static(path.join(__dirname, 'public'))); // serve your HTML file
app.get('/api/search', async (req, res) => {
  const { email, username, phone } = req.query;
  let query = "";

  if (email) query = `email=${email}`;
  else return res.status(400).json({ error: "Missing email, username or phone query param." });

  const url = `https://leakcheck.io/api/public?check=${email}`;

  try {
    const response = await fetch(url);
    const data = await response.json();
    res.json(data);
    console.log(data);
  } catch (err) {
    res.status(500).json({ error: "Proxy error", details: err.message });
  }
});

app.listen(3000, () => console.log('✅ Proxy running at http://localhost:3000'));
