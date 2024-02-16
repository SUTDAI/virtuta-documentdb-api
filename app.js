require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const port = 3000;

const app = express();
const uri =
  "mongodb+srv://virtuTest1:YGV4DecXxhFdyMdu@virtuta.884jcds.mongodb.net?retryWrites=true&w=majority";

mongoose
  .connect(uri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    dbName: "virtuTA",
  })
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.error(err));

app.use(express.json());

app.use("/query", require("./controllers/query-controller.js"));
app.use("/documents", require("./controllers/document-controller.js"));

app.listen(port, () => console.log(`Server listening on port ${port}`));
