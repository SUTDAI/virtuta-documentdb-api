const express = require("express");

const router = express.Router();

router.post("/", async (req, res) => {
  try {
    const query_data = {
      query: req.query,
    };

    //TODO

    res.status(201).send("Query received");
  } catch (err) {
    console.log(err.errors);
    res.status(500).send("Error uploading query");
  }
});

module.exports = router;
