const express = require('express');
const bodyParser = require('body-parser');
const xml2js = require('xml2js');
const app = express();
const PORT = 3000;

// Middleware to handle raw text for XML, JSON, or plain text
app.use(bodyParser.text({ type: ['application/xml', 'text/xml', 'text/plain'] }));
app.use(bodyParser.json());

// Store last response (you can replace this with DB later)
let latestResponse = {
  contentType: null,
  raw: null,
  parsed: null,
};

// 1. POST - Receive server response (any format)
app.post('/response-handler', async (req, res) => {
  try {
    const contentType = req.headers['content-type'];
    latestResponse.contentType = contentType;
    latestResponse.raw = req.body;
    latestResponse.parsed = null;

    if (contentType.includes('application/json')) {
      latestResponse.parsed = req.body;
    } else if (contentType.includes('application/xml') || contentType.includes('text/xml')) {
      // Parse XML to JS object
      const parser = new xml2js.Parser({ explicitArray: false });
      latestResponse.parsed = await parser.parseStringPromise(req.body);
    } else if (contentType.includes('text/plain')) {
      latestResponse.parsed = req.body;
    }

    console.log('✅ Server sent response:', latestResponse);
    res.status(200).send('✅ Response received and parsed successfully');
  } catch (error) {
    console.error('❌ Error processing response:', error);
    res.status(500).send('❌ Failed to parse response');
  }
});

// 2. GET - Display parsed response at responseUrl
app.get('/response-handler', (req, res) => {
  if (!latestResponse.raw) {
    return res.status(404).send('<h2>No response received yet.</h2>');
  }

  res.send(`
    <h2>📥 Latest Server Response</h2>
    <h4>Content-Type:</h4>
    <pre>${latestResponse.contentType}</pre>
    <h4>Parsed Content:</h4>
    <pre>${JSON.stringify(latestResponse.parsed, null, 2)}</pre>
    <h4>Raw Content:</h4>
    <pre>${latestResponse.raw}</pre>
  `);
});

// 3. GET - Redirect user to home
app.get('/redirect-user', (req, res) => {
  res.redirect('http://localhost:5173'); // Change to your frontend home URL
});

app.listen(PORT, () => {
  console.log(`🚀 Strong backend running at http://localhost:${PORT}`);
});
