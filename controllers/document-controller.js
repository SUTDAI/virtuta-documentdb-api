const mongoose = require("mongoose");
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

//TODO remove zip from tmp after extraction
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
    return string_text;
  } catch (err) {
    console.log(err.errors);
  }
}

async function vector_embed(text_content) {
  try {
    const response = await fetch(vector_embed_endpoint, {
      method: "POST",
      body: JSON.stringify({
        doc_id: "2",
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
    // Handle the error here, such as logging or displaying a message to the user.
  }
}

const documentSchema = new mongoose.Schema({
  name: { type: String, required: true },
  size: { type: Number, required: true },
  data: { type: Buffer, required: true }, // BSON data field
  contentType: { type: String },
  metadata: { type: Object },
});

const Document = mongoose.model("Document", documentSchema);

const storage = multer.memoryStorage();

const upload = multer({
  storage: storage,
});

router.post("/", upload.single("file"), async (req, res) => {
  try {
    const document_data = {
      name: req.file.originalname,
      filepath: req.file.filepath,
      size: req.file.size,
      data: req.file.buffer,
      metadata: req.body.metadata,
    };

    const data = await parsetextPDF(document_data.name);
    await vector_embed(data).then(Document.create(document_data));

    res.json({
      message: "Documents uploaded successfully",
    });
  } catch (err) {
    console.log(err.errors);
    res.status(500).send("Error uploading documents");
  }
});

router.get("/:id", async (req, res) => {
  try {
    const document = await Document.findById(req.params.id);
    if (!document) {
      return res.status(404).send("Document not found");
    }

    const pdfBuffer = document.data;

    if (!pdfBuffer) {
      return res.status(404).send("PDF data not found in document");
    }

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=${document.originalname}`
    );

    res.send(pdfBuffer); // Directly send buffer data
  } catch (err) {
    console.error(err);
    res.status(500).send("Error retrieving or downloading document");
  }
});

router.get("/:id/data", async (req, res) => {
  try {
    const document = await Document.findById(req.params.id);
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

router.delete("/:id", async (req, res) => {
  try {
    const document = await Document.findById(req.params.id);
    if (!document) {
      return res.status(404).send("Document not found");
    }

    await Document.findByIdAndDelete(req.params.id);
    res.json({ message: `${document.name} deleted successfully` });
  } catch (err) {
    console.error(err);
    res.status(500).send("Error deleting document");
  }
});
module.exports = router;
