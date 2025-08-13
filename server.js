const express = require('express');
const bodyParser = require('body-parser');
const xml2js = require('xml2js');

const mysql = require('mysql2');

const db = mysql.createConnection({
  host: 'localhost',      // Your DB host
  user: 'root',           // Your DB username
  password: 'asd123!@#$.~;-',   // Your DB password
  database: 'digisign' // Your DB name
});

db.connect(err => {
  if (err) {
    console.error('❌ MySQL connection failed:', err);
  } else {
    console.log('✅ Connected to MySQL database');
  }
});





const app = express();
const PORT = 8000;

// Middleware for parsing body
app.use(bodyParser.text({ type: ['application/xml', 'text/xml', 'text/plain'] }));
app.use(bodyParser.json());

// Temp in-memory response store
let latestResponse = {
  contentType: null,
  raw: null,
  parsed: null,
};

// 1️⃣ POST endpoint to receive response (JSON / XML / Text)
app.post('/response-handler-verify', async (req, res) => {
  try {
    const contentType = req.headers['content-type'] || 'text/plain';
    latestResponse.contentType = contentType;
    latestResponse.raw = req.body;
    latestResponse.parsed = null;

    if (contentType.includes('application/json')) {
      latestResponse.parsed = req.body;
    } else if (contentType.includes('application/xml') || contentType.includes('text/xml')) {
      const parser = new xml2js.Parser({ explicitArray: false });
      latestResponse.parsed = await parser.parseStringPromise(req.body);
    } else if (contentType.includes('text/plain')) {
      latestResponse.parsed = req.body;
    }

    console.log('✅ Received server response:', latestResponse);
    res.status(200).send('✅ Response received and parsed successfully');
  } catch (err) {
    console.error('❌ Error parsing response:', err);
    res.status(500).send('❌ Failed to parse server response');
  }
});


app.post('/response-handler', async (req, res) => {
  try {
    const contentType = req.headers['content-type'] || 'application/xml';
    latestResponse.contentType = contentType;
    latestResponse.raw = req.body;
    latestResponse.parsed = null;

    if (contentType.includes('application/xml') || contentType.includes('text/xml')) {
      const parser = new xml2js.Parser({ explicitArray: false });
      latestResponse.parsed = await parser.parseStringPromise(req.body);
    }

    console.log('✅ Received server response:', latestResponse);

    // Store into MySQL
    const sql = `INSERT INTO responses (content_type, raw_content, parsed_content) VALUES (?, ?, ?)`;
    db.query(
      sql,
      [
        latestResponse.contentType,
        latestResponse.raw,
        JSON.stringify(latestResponse.parsed) // store parsed JSON as string
      ],
      (err, result) => {
        if (err) {
          console.error('❌ Error inserting into MySQL:', err);
          return res.status(500).send('❌ Failed to save to database');
        }
        console.log('✅ Data inserted into MySQL, ID:', result.insertId);
        res.status(200).send('✅ Response received, parsed & stored successfully');
      }
    );

  } catch (err) {
    console.error('❌ Error parsing response:', err);
    res.status(500).send('❌ Failed to parse server response');
  }
});



// 2️⃣ GET endpoint to show parsed result

app.get('/response-handler/:txnref', (req, res) => {
  const txnref = req.params.txnref || null;
  let decodedTxnref = '';

  if (txnref) {
    try {
      decodedTxnref = Buffer.from(txnref, 'base64').toString('utf-8');
    } catch {
      decodedTxnref = '❌ Failed to decode txnref (invalid base64)';
    }
  }

  if (!latestResponse.raw) {
    return res.status(404).send('<h2>No response has been received yet.</h2>');
  }

  res.send(`
    <html>
      <head><title>Latest Server Response</title></head>
      <body style="font-family: monospace; padding: 20px;">
        <h2>📥 Latest Server Response</h2>
        ${txnref ? `<h4>🔐 Decoded txnref:</h4><pre>${decodedTxnref}</pre>` : ''}
        <h4>🧾 Content-Type:</h4><pre>${latestResponse.contentType}</pre>
        <h4>✅ Parsed Content:</h4><pre>${JSON.stringify(latestResponse.parsed, null, 2)}</pre>
        <h4>📦 Raw Content:</h4><pre>${latestResponse.raw}</pre>
      </body>
    </html>
  `);
});

// 3️⃣ Optional: Redirect to frontend
app.get('/redirect-user', (req, res) => {
  res.redirect('http://localhost:5173'); // Change to your app URL
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Backend running at: http://localhost:${PORT}`);
});
