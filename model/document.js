const mongoose = require('mongoose');
const express = require('express');
const multer = require('multer');

const router = express.Router();

const documentSchema = new mongoose.Schema({
  name: { type: String, required: true },
  size: { type: Number, required: true },
  data: { type: Buffer, required: true }, // BSON data field
  contentType: { type: String },
  metadata: { type: Object }
});

const Document = mongoose.model('Document', documentSchema);

const storage = multer.memoryStorage()

const upload = multer({
  storage: storage
});

router.post('/', upload.single('file'), async (req, res) => {
  try {
    await Document.create({
      name: req.file.originalname,
      size: req.file.size,
      data: req.file.buffer,
      metadata: req.body.metadata
    });
      res.json({ message: 'Documents uploaded successfully' });
  } catch (err) {
    console.log(err.errors);
    res.status(500).send('Error uploading documents');
  }
});

router.get('/:id', async (req, res) => {
  try {
    const document = await Document.findById(req.params.id);
    if (!document) {
      return res.status(404).send('Document not found');
    }

    const pdfBuffer = document.data;

    if (!pdfBuffer) {
      return res.status(404).send('PDF data not found in document');
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=${document.originalname}`);

    res.send(pdfBuffer); // Directly send buffer data
  } catch (err) {
    console.error(err);
    res.status(500).send('Error retrieving or downloading document');
  }
});

router.get('/:id/data', async (req, res) => {
  try {
    const document = await Document.findById(req.params.id);
    if (!document) {
      return res.status(404).send('Document not found');
    }

    const pdfBuffer = document.data;
    if (!pdfBuffer) {
      return res.status(404).send('PDF data not found in document');
    }

    const responseData = {
      metadata: document.metadata,
      data: pdfBuffer
    };

    res.setHeader('Content-Type', 'application/json');
    res.json(responseData);
  } catch (err) {
    console.error(err);
    res.status(500).send('Error retrieving or downloading document');
  }
});


router.delete('/:id', async (req, res) => {
  try {
    const document = await Document.findById(req.params.id);
    if (!document) {
      return res.status(404).send('Document not found');
    }

    await Document.findByIdAndDelete(req.params.id);
    res.json({ message: `${document.name} deleted successfully` });
  } catch (err) {
    console.error(err);
    res.status(500).send('Error deleting document');
  }
});

module.exports = router;
