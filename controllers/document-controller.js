//Declare required packages
const mongoose = require("mongoose");
const AutoIncrement = require('mongoose-sequence')(mongoose);
const express = require("express");
const multer = require("multer");
const PDFServicesSdk = require("@adobe/pdfservices-node-sdk");
const fs = require("fs");
const AdmZip = require("adm-zip");
const fetch = require("node-fetch");

const vector_embed_endpoint =
  "http://vta-rag.interpause.dev/api/v1/create_document";
const router = express.Router();

// async function parsetexttablewithstructurePDF(filepath) {
//   const PDFServicesSdk = require("@adobe/pdfservices-node-sdk");
//   try {
//     const credentials =
//       PDFServicesSdk.Credentials.servicePrincipalCredentialsBuilder()
//         .withClientId(process.env.PDF_SERVICES_CLIENT_ID)
//         .withClientSecret(process.env.PDF_SERVICES_CLIENT_SECRET)
//         .build();

//     // Create an ExecutionContext using credentials
//     const executionContext =
//       PDFServicesSdk.ExecutionContext.create(credentials);

//     // Build extractPDF options
//     const options =
//       new PDFServicesSdk.ExtractPDF.options.ExtractPdfOptions.Builder()
//         .addElementsToExtract(
//           PDFServicesSdk.ExtractPDF.options.ExtractElementType.TEXT,
//           PDFServicesSdk.ExtractPDF.options.ExtractElementType.TABLES
//         )
//         .addElementsToExtractRenditions(
//           PDFServicesSdk.ExtractPDF.options.ExtractRenditionsElementType.TABLES
//         )
//         .addTableStructureFormat(
//           PDFServicesSdk.ExtractPDF.options.TableStructureType.CSV
//         )
//         .build();

//     // Create a new operation instance.
//     const extractPDFOperation = PDFServicesSdk.ExtractPDF.Operation.createNew(),
//       input = PDFServicesSdk.FileRef.createFromLocalFile(
//         filepath,
//         PDFServicesSdk.ExtractPDF.SupportedSourceFormat.pdf
//       );

//     // Set operation input from a source file.
//     extractPDFOperation.setInput(input);

//     // Set options
//     extractPDFOperation.setOptions(options);

//     //Generating a file name
//     let outputFilePath = createOutputFilePath();

//     extractPDFOperation
//       .execute(executionContext)
//       .then((result) => result.saveAsFile(outputFilePath))
//       .catch((err) => {
//         if (
//           err instanceof PDFServicesSdk.Error.ServiceApiError ||
//           err instanceof PDFServicesSdk.Error.ServiceUsageError
//         ) {
//           console.log("Exception encountered while executing operation", err);
//         } else {
//           console.log("Exception encountered while executing operation", err);
//         }
//       });

//     //Generates a string containing a directory structure and file name for the output file.
//     function createOutputFilePath() {
//       let date = new Date();
//       let dateString =
//         date.getFullYear() +
//         "-" +
//         ("0" + (date.getMonth() + 1)).slice(-2) +
//         "-" +
//         ("0" + date.getDate()).slice(-2) +
//         "T" +
//         ("0" + date.getHours()).slice(-2) +
//         "-" +
//         ("0" + date.getMinutes()).slice(-2) +
//         "-" +
//         ("0" + date.getSeconds()).slice(-2);
//       return "text/" + dateString + ".zip";
//     }
//   } catch (err) {
//     console.log("Exception encountered while executing operation", err);
//   }
// }

async function parsetextPDF(filepath) {
  try {
    // Initial setup, create credentials instance.
    const credentials =
      PDFServicesSdk.Credentials.servicePrincipalCredentialsBuilder()
        .withClientId(process.env.PDF_SERVICES_CLIENT_ID)
        .withClientSecret(process.env.PDF_SERVICES_CLIENT_SECRET)
        .build();

    // Create an ExecutionContext using credentials
    const executionContext =
      PDFServicesSdk.ExecutionContext.create(credentials);

    // Build extractPDF options
    const options =
      new PDFServicesSdk.ExtractPDF.options.ExtractPdfOptions.Builder()
        .addElementsToExtract(
          PDFServicesSdk.ExtractPDF.options.ExtractElementType.TEXT
        )
        .build();

    // Create a new operation instance.
    const extractPDFOperation = PDFServicesSdk.ExtractPDF.Operation.createNew(),
      input = PDFServicesSdk.FileRef.createFromLocalFile(
        filepath,
        PDFServicesSdk.ExtractPDF.SupportedSourceFormat.pdf
      );

    // Set operation input from a source file.
    extractPDFOperation.setInput(input);

    // Set options
    extractPDFOperation.setOptions(options);

    //Generating a file name
    let outputFilePath = createOutputFilePath();

    //Extraction of data from PDF
    await extractPDFOperation
      .execute(executionContext)
      .then((result) => result.saveAsFile(outputFilePath));
    return extractAndParseJsonFromZip(outputFilePath);

    //Generates a string containing a directory structure and file name for the output file.
    function createOutputFilePath() {
      let date = new Date();
      let dateString =
        date.getFullYear() +
        "-" +
        ("0" + (date.getMonth() + 1)).slice(-2) +
        "-" +
        ("0" + date.getDate()).slice(-2) +
        "T" +
        ("0" + date.getHours()).slice(-2) +
        "-" +
        ("0" + date.getMinutes()).slice(-2) +
        "-" +
        ("0" + date.getSeconds()).slice(-2);
      return "tmp/" + dateString + ".zip";
    }
  } catch (err) {
    if (
      err instanceof PDFServicesSdk.Error.ServiceApiError ||
      err instanceof PDFServicesSdk.Error.ServiceUsageError
    ) {
      console.log("Exception encountered while executing operation", err);
    } else {
      console.log("Exception encountered while executing operation", err);
    }
    console.log("Exception encountered while executing operation", err);
  }
}

async function extractAndParseJsonFromZip(zipFilePath) {
  try {
    const zip = new AdmZip(zipFilePath);
    var zipEntries = zip.getEntries();
    let string_text = "";
    zipEntries.forEach(function (zipEntry) {
      if (zipEntry.entryName == "structuredData.json") {
        const json_data = JSON.parse(zipEntry.getData());
        json_data.elements.forEach((ele, index) => {
          string_text += ele.Text || "";
        });
      }
    });
    console.log("Extracted Data parsed into text");

    // Removal of temporary zip file after extraction
    try {
      await fs.promises.unlink(zipFilePath);
      console.log("Temporary zip file deleted successfully");
    } catch (err) {
      console.log("Error deleting temporary zip file", err);
    }

    return string_text;
  } catch (err) {
    console.log(err.errors);
  }
}

async function vector_embed(text_content, uploadedDocumentId) {
  const doc_id = String(uploadedDocumentId);
  try {
    const response = await fetch(vector_embed_endpoint, {
      method: "POST",
      body: JSON.stringify({
        doc_id: doc_id,
        ds_id: "00000000-0000-0000-0000-000000000000",
        content: text_content,
        override: true,
      }),
      headers: {
        "Content-Type": "application/json",
      },
    });
    if (!response.ok) {
      throw new Error("Failed to fetch. Status: " + response.status);
    } else {
      console.log("Document Chunked and Embedded");
    }
  } catch (error) {
    console.error("Error:", error);
  }
}

// Defining the schema
const documentSchema = new mongoose.Schema({
  name: { type: String, required: true },
  size: { type: Number, required: true},
  data: { type: Buffer, required: true }, // PDF Buffer data
  contentType: { type: String },
  metadata: { type: Object },
});

// Using mongoose-sequence library to implement auto id increment
documentSchema.plugin(AutoIncrement, { inc_field: 'id'});

// Creating 'Document' model using the schema
const Document = mongoose.model("Document", documentSchema);

// Setting up Multer storage using in-memory buffer for temp storage, will not be saved locally
const storage = multer.memoryStorage();

// Defining Multer middleware, using the memoryStorage to handle single file uploads
const upload = multer({
  storage: storage,
});


// Defining POST route for Document upload
router.post("/", upload.single("file"), async (req, res) => {
  try {

    // Validation check to see if there is a file uploaded
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    // File validation checks
    const errors = [];

    const metadata = req.body.metadata;
    const { originalname, size } = req.file;

    if (!originalname) errors.push("File name is required");

    if(metadata) {
      if (typeof metadata !== 'object') {
        errors.push('Metadata must be a valid JSON object');
      }
    } else{}

    if (size > 1024 * 1024 * 16){
      errors.push('File size exceeds 16MB limit')
    }
    if (!['application/pdf'].includes(req.file.mimetype)) {
      errors.push("Invalid file type, only PDFs allowed");
    }

    if (errors.length > 0) {
      throw new Error('Validation errors: ' + errors.join(', '));
    }

    // Creating object of document data
    const document_data = {
      name: originalname,
      size: size,
      data: req.file.buffer,
      metadata: metadata,
    };

    // Creating a new document in the database and getting the documentId
    const uploadedDocument = await Document.create(document_data);
    const uploadedDocumentId = uploadedDocument.id;

    console.log("Document created successfully.")

    // Calling the parsetextPDF function
    const data = await parsetextPDF(uploadedDocument.name);

    // Calling the vector_embed function
    await vector_embed(data, uploadedDocumentId);

    // Successful creation response with the documentId
    res.json({
      message: "Documents uploaded successfully",
      documentId: uploadedDocumentId
    });
  } catch (err) {
    console.error(err);

    // Returning any errors during the validation check
    if (err.name === 'ValidationError' || err.message.includes('Validation errors')) {
      res.status(400).json({ message: err.message});
    } else {
      res.status(500).json({ message: 'Internal server error'}) // Other errors
    }
  }
});

// Defining GET route for retrieval of PDF documents
router.get("/:id", async (req, res) => {
  try {
    // Find the document by its documentId
    const document = await Document.findOne({ id: req.params.id });
    if (!document) {
      return res.status(404).send("Document not found"); // Returns error if document is not found
    }

    // Stores the buffer data in a variable
    const pdfBuffer = document.data;

    if (!pdfBuffer) {
      return res.status(404).send("PDF data not found in document"); // Returns error if there is no buffer data in the document
    }

    res.setHeader("Content-Type", "application/pdf"); // Sets the ContentType header to "application/pdf"
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=${document.originalname}` // Prompting a download of the file with the original name as the filename
    );

    res.send(pdfBuffer); // Directly send buffer data
  } catch (err) {
    console.error(err);
    res.status(500).send("Error retrieving or downloading document");
  }
});

router.get("/:id/data", async (req, res) => {
  try {
    const document = await Document.findOne({ id: req.params.id });
    if (!document) {
      return res.status(404).send("Document not found");
    }

    const pdfBuffer = document.data;
    if (!pdfBuffer) {
      return res.status(404).send("PDF data not found in document");
    }

    const responseData = {
      metadata: document.metadata,
      data: pdfBuffer,
    };

    res.setHeader("Content-Type", "application/json");
    res.json(responseData);
  } catch (err) {
    console.error(err);
    res.status(500).send("Error retrieving or downloading document");
  }
});

// Defining a DELETE route for document deletion
router.delete('/:id', async (req, res) => {
  try {
    const document = await Document.findById(req.params.id);
    if (!document) {
      return res.status(404).send('Document not found'); // Returns error if document is not found
    }

    await Document.findByIdAndDelete(req.params.id);
    res.json({ message: `${document.name} deleted successfully` });
    console.log ("Document deleted succesfully");
  } catch (err) {
    console.error(err);
    res.status(500).send('Error deleting document');
  }
});

module.exports = router;