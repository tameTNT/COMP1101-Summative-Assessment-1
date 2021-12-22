// const { DateTime } = require('luxon');

const express = require('express');
const app = express();
const helpers = require('./helperFunctions.js');

app.use(express.static('client'));

app.route('/card')
  .get((req, res) => {
    console.log('Card');
    res.send('Card');
  })
  .post((req, res) => {
    res.send('Card post');
  });

app.route('/comments(/:id(\\d+))?')
  .get((req, res) => {
    let reqParamId = req.params.id;
    let reqQueryIds = req.query.ids;
    const comments = require('./serverdb.json').comments;
    if (reqParamId !== undefined) {
      reqParamId = Number(reqParamId);
      res.send(helpers.search(comments, [reqParamId]));
    } else if (reqQueryIds) {
      const commaSplitRegex = /, */;
      reqQueryIds = reqQueryIds.split(commaSplitRegex).map((s) => Number(s));
      res.send(helpers.search(comments, reqQueryIds));
    } else {
      res.send(comments);
    }
  })
  .post((req, res) => {
    res.send('Comment post');
  });

// console.log(JSON.stringify(DateTime.now().toUTC()));
// console.log(DateTime.fromISO(JSON.parse(JSON.stringify('2021-12-13T22:16:28.278Z'))));

module.exports = app;
