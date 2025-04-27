const express = require('express');
const multer = require('multer');
const { google } = require('googleapis');
const { GoogleSpreadsheet } = require('google-spreadsheet');
const fs = require('fs');
const credentials = require('./credentials.json');

const app = express();
const upload = multer({ dest: 'uploads/' });

// Google Auth Setup
const auth = new google.auth.GoogleAuth({
  credentials,
  scopes: [
    'https://www.googleapis.com/auth/drive',
    'https://www.googleapis.com/auth/spreadsheets'
  ],
});
const drive = google.drive({ version: 'v3', auth });

// Replace with your actual IDs
const folderId = '1pajSmFYSjnMlvtRLur2M14WHjBOLv9Jt';
const spreadsheetId = '1FvJ81y3-k9KLP4-QJUNgOVKUdD-RcNUAMW9us7zv9-E';

app.use(express.urlencoded({ extended: true }));

// File Upload Endpoint
app.post('/upload', upload.single('file'), async (req, res) => {
  try {
    // Upload to Google Drive
    const fileResponse = await drive.files.create({
      resource: {
        name: req.file.originalname,
        parents: [folderId]
      },
      media: {
        mimeType: req.file.mimetype,
        body: fs.createReadStream(req.file.path)
      },
      fields: 'id'
    });

    // Add to Google Sheet
    const doc = new GoogleSpreadsheet(spreadsheetId);
    const authClient = await auth.getClient();
    doc.auth = authClient;
    
    await doc.loadInfo();
    const sheet = doc.sheetsByIndex[0];
    
    await sheet.addRow({
      'Faculty Name': req.body.facultyName,
      'ID': req.body.facultyId,
      'Title': req.body.title,
      'Issue Date': req.body.issueDate,
      'File ID (Drive)': fileResponse.data.id,
    });

    // Cleanup
    fs.unlinkSync(req.file.path);
    
    res.send(`
      <h2 style="text-align: center; color: green;">✅ Upload Successful!</h2>
      <div style="text-align: center; margin-top: 20px;">
        <a href="/" style="padding: 10px 20px; background: #007bff; color: white; text-decoration: none; border-radius: 5px;">Upload Another File</a>
      </div>
    `);
    
  } catch (error) {
    console.error('Error:', error);
    res.status(500).send(`
      <div style="text-align: center; padding: 20px; color: red;">
        <h2>❌ Upload Failed</h2>
        <p>${error.message}</p>
        <a href="/" style="color: #007bff;">Try Again</a>
      </div>
    `);
  }
});

// Form Page
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>IT Department Upload</title>
      <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
      <style>
        body { 
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          min-height: 100vh;
          padding: 20px;
        }
        .form-container {
          background: rgba(255, 255, 255, 0.95);
          border-radius: 15px;
          padding: 30px;
          box-shadow: 0 0 20px rgba(0,0,0,0.2);
          max-width: 500px;
          margin: 0 auto;
        }
        h1 {
          color: #2c3e50;
          margin-bottom: 30px;
          text-align: center;
        }
      </style>
    </head>
    <body>
      <div class="form-container">
        <h1>IT Department File Upload</h1>
        <form action="/upload" method="POST" enctype="multipart/form-data">
          <div class="mb-3">
            <label class="form-label">Faculty Name:</label>
            <select class="form-select" name="facultyName" required>
              <option value="">Select Faculty</option>
              <option value="Dr. Smith">Dr. Smith</option>
              <option value="Prof. Johnson">Prof. Johnson</option>
              <option value="Dr. Williams">Dr. Williams</option>
              <option value="Other">Other</option>
            </select>
          </div>
          
          <div class="mb-3">
            <label class="form-label">Faculty ID:</label>
            <input type="number" class="form-control" name="facultyId" required>
          </div>
          
          <div class="mb-3">
            <label class="form-label">Document Title:</label>
            <input type="text" class="form-control" name="title" required>
          </div>
          
          <div class="mb-3">
            <label class="form-label">Issue Date:</label>
            <input type="date" class="form-control" name="issueDate" required>
          </div>
          
          <div class="mb-3">
            <label class="form-label">Select File:</label>
            <input class="form-control" type="file" name="file" required>
          </div>
          
          <div class="d-grid gap-2">
            <button type="submit" class="btn btn-primary btn-lg">Upload</button>
          </div>
        </form>
      </div>
    </body>
    </html>
  `);
});

// Start Server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));