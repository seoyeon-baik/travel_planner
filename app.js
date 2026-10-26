require('./server/env').loadEnv();
const express = require('express');
const {createApp} = require('./server/app');
const app = express();
app.use(createApp());
module.exports = app;
