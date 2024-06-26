const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const archiver = require('archiver');
const app = express();
const port = process.env.PORT || 3000;

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

const upload = multer({ storage: storage });

app.use(express.static('public'));

app.post('/upload', upload.array('files[]', 100), (req, res) => {
  const accessCode = Date.now().toString();
  const filePaths = req.files.map(file => file.path);

  fs.writeFileSync(`./uploads/${accessCode}.json`, JSON.stringify(filePaths));

  res.status(200).send({ accessCode });
});

app.get('/download', (req, res) => {
  const accessCode = req.query.code;
  const filePaths = JSON.parse(fs.readFileSync(`./uploads/${accessCode}.json`));

  res.setHeader('Content-Disposition', 'attachment; filename=files.zip');
  res.setHeader('Content-Type', 'application/zip');

  const archive = archiver('zip', { zlib: { level: 9 } });
  archive.pipe(res);

  filePaths.forEach(filePath => {
    archive.file(filePath, { name: path.basename(filePath) });
  });

  archive.finalize();
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
