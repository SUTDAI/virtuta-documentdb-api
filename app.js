require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const port = 3000;

const app = express()
const uri = ""

mongoose.connect(uri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    dbName: 'virtuTA'
})
.then(() => console.log('MongoDB connected'))
.catch(err => console.error(err));

app.use(express.json());

app.use('/users', require('./model/user.js'));
app.use('/documents', require('./model/document.js'));

app.listen(port, () => console.log(`Server listening on port ${port}`));