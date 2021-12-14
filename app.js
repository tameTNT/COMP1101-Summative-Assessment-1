// const { DateTime } = require('luxon');

const express = require('express');
const app = express();

app.use(express.static('client'));

// console.log(JSON.stringify(DateTime.now().toUTC()));
// console.log(DateTime.fromISO(JSON.parse(JSON.stringify('2021-12-13T22:16:28.278Z'))));

module.exports = app;
