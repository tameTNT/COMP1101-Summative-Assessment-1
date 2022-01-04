const fs = require('fs');

const { DateTime } = require('luxon');

const express = require('express');
const app = express();

const helpers = require('./helperFunctions.js');

app.use(express.static('client'));
app.use(express.json());

app.route('/cards(/:id(\\d+))?')
  .get((req, res) => {
    const reqParamId = req.params.id;
    // noinspection JSUnresolvedVariable
    const reqQueryIds = req.query.ids;

    fs.readFile('./serverdb.json', 'utf8', async (err, fileData) => {
      if (err) {
        console.error(err);
      } else {
        const jsonData = JSON.parse(fileData);

        const reqCards = helpers.handleIdUrl(jsonData.cards, reqParamId, reqQueryIds);

        const refreshedCards = [];
        // update cards' reddit data while GETting
        for (const card of reqCards) {
          const redditData = await helpers.getRedditData(card.redditUrl);
          refreshedCards.push(await helpers.updateCardRedditData(card, redditData));
        }

        jsonData.cards = jsonData.cards.filter(card => !reqCards.includes(card)); // remove old cards
        jsonData.cards = jsonData.cards.concat(refreshedCards); // reinsert new data cards

        const jsonString = JSON.stringify(jsonData, null, 2);

        fs.writeFile('./serverdb.json', jsonString, 'utf-8', () => {
          res.status(200);
          res.send(refreshedCards);
        });
      }
    });
  })
  .post((req, res) => {
    fs.readFile('./serverdb.json', 'utf8', async (err, fileData) => {
      if (err) {
        console.error(err);
      } else {
        const jsonData = JSON.parse(fileData); // includes fields: title, language, code, redditUrl

        let newCard = req.body;

        if (jsonData.cards.length > 0) {
          const usedIds = jsonData.cards.map(card => card.id);
          newCard.id = Math.max(...usedIds) + 1; // new ID generated by adding 1 to max element in current cards list
        } else {
          newCard.id = 0;
        }
        newCard.likes = 0;
        newCard.time = DateTime.now().toUTC();

        const urlRegexp = /https:\/\/www.reddit.com\/r\/adventofcode\/comments\/(\w*)\/comment\/(\w*)/;
        newCard.redditUrl = newCard.redditUrl.match(urlRegexp)[0]; // first element of match array is whole url that matches regexp
        const redditData = await helpers.getRedditData(newCard.redditUrl);
        if (!redditData) {
          res.status(422);
          res.json({
            error: 'reddit-link-failed',
            message: "The provided Reddit link couldn't be resolved. Please check the link is correct."
          });
        } else {
          newCard = await helpers.updateCardRedditData(newCard, redditData);
          jsonData.cards.push(newCard);
          const jsonString = JSON.stringify(jsonData, null, 2);

          fs.writeFile('./serverdb.json', jsonString, 'utf-8', () => {
            res.status(201);
            res.json({ message: 'success' });
          });
        }
      }
    });
  });

app.get('/cards/:id(\\d+)/reddit', async (req, res) => {
  const reqParamId = req.params.id;
  const cards = require('./serverdb.json').cards;
  const reqCard = helpers.handleIdUrl(cards, reqParamId, '')[0];
  if (reqCard) {
    res.json(await helpers.getRedditData(reqCard.redditUrl));
  } else {
    res.status(404);
    res.json({
      error: 'card-not-found',
      message: `No card matching id ${reqParamId} was found to get Reddit data for`
    });
  }
});

app.route('/comments(/:id(\\d+))?')
  .get((req, res) => {
    const reqParamId = req.params.id;
    // noinspection JSUnresolvedVariable
    const reqQueryIds = req.query.ids;
    const comments = require('./serverdb.json').comments;
    res.send(helpers.handleIdUrl(comments, reqParamId, reqQueryIds));
  })
  .post((req, res) => {
    res.send('Comment POST');
  });

module.exports = app;
