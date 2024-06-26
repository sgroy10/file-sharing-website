const express = require('express');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');
const archiver = require('archiver');
const cors = require('cors');
const sequelize = require('./config');
const File = require('./models');
const app = express();
const PORT = process.env.PORT || 3000;

// Use CORS
app.use(cors());

// Sync the database
sequelize.sync().then(() => {
  console.log('Database & tables created!');
});

// Configure Multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = `uploads/${req.body.folderName}`;
    fs.mkdirSync(uploadPath, { recursive: true });
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    cb(null, file.originalname);
  }
});
const upload = multer({ storage }).array('files', 50);

// Routes
app.post('/upload', upload, async (req, res) => {
  const code = uuidv4();
  const folderPath = `uploads/${req.body.folderName}`;
  const files = req.files.map(file => ({
    filename: file.originalname,
    path: file.path,
    code: code
  }));

  console.log(`Uploading folder: ${folderPath} with code: ${code}`);
  console.log('Received files:', files);
  console.log('Received folderName:', req.body.folderName);

  try {
    await File.bulkCreate(files);
    console.log(`Files successfully saved with code: ${code}`);
    res.send({ code: code });
  } catch (error) {
    console.error('Error saving files to database:', error);
    res.status(500).send('Internal Server Error');
  }
});

app.get('/download/:code', async (req, res) => {
  const files = await File.findAll({ where: { code: req.params.code } });
  if (files.length) {
    const archiveName = `archive-${req.params.code}.zip`;
    const archivePath = path.join(__dirname, archiveName);

    const output = fs.createWriteStream(archivePath);
    const archive = archiver('zip');

    output.on('close', () => {
      res.download(archivePath, archiveName, err => {
        if (err) throw err;
        fs.unlinkSync(archivePath); // delete the archive after download
      });
    });

    archive.on('error', err => { throw err; });

    archive.pipe(output);
    files.forEach(file => {
      archive.file(file.path, { name: file.filename });
    });
    archive.finalize();
  } else {
    res.status(404).send('Files not found');
  }
});

// Serve Static Files (Frontend)
app.use(express.static(path.join(__dirname, 'public')));

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
