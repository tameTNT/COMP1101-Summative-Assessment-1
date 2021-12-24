// const { DateTime } = require('luxon');

const fs = require('fs');
const express = require('express');
const app = express();
const helpers = require('./helperFunctions.js');

app.use(express.static('client'));
app.use(express.json());

app.route('/cards(/:id(\\d+))?')
  .get((req, res) => {
    const reqParamId = req.params.id;
    const reqQueryIds = req.query.ids;
    const cards = require('./serverdb.json').cards;
    res.send(helpers.handleIdUrl(cards, reqParamId, reqQueryIds));
  })
  .post((req, res) => {
    fs.readFile('./serverdb.json', 'utf8', (err, data) => {
      if (err) {
        console.log(err);
      } else {
        const jsonData = JSON.parse(data);
        const newCard = req.body;
        jsonData.cards.push(newCard);
        const jsonString = JSON.stringify(jsonData, null, 2);
        fs.writeFile('./serverdb.json', jsonString, 'utf-8', () => {
          res.status(201);
          res.send();
        });
      }
    });
  });

app.route('/comments(/:id(\\d+))?')
  .get((req, res) => {
    const reqParamId = req.params.id;
    const reqQueryIds = req.query.ids;
    const comments = require('./serverdb.json').comments;
    res.send(helpers.handleIdUrl(comments, reqParamId, reqQueryIds));
  })
  .post((req, res) => {
    res.send('Comment POST');
  });

// console.log(JSON.stringify(DateTime.now().toUTC()));
// console.log(DateTime.fromISO(JSON.parse(JSON.stringify('2021-12-13T22:16:28.278Z'))));

module.exports = app;
