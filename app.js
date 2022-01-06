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

        if (reqCards.length === 0) {
          res.status(404);
          res.json({
            error: 'cards-not-found',
            message: 'No card/s with that/those id/s were found in the database.'
          });
        } else {
          const refreshedCards = [];
          // update cards' reddit data while GETting
          for (const card of reqCards) {
            const redditData = await helpers.getRedditData(card.redditUrl);
            refreshedCards.push(await helpers.updateCardRedditData(card, redditData));
          }

          // todo: possible to do without removing and reinserting cards - i.e. just be editing objs instead?
          jsonData.cards = jsonData.cards.filter(card => !reqCards.includes(card)); // remove old cards
          jsonData.cards = jsonData.cards.concat(refreshedCards); // reinsert new data cards

          const jsonString = JSON.stringify(jsonData, null, 2);

          fs.writeFile('./serverdb.json', jsonString, 'utf-8', () => {
            res.status(200);
            if (reqParamId !== undefined) {
              res.send(refreshedCards[0]);
            } else {
              res.send(refreshedCards);
            }
          });
        }
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

        newCard.id = helpers.getNewValidId(jsonData.cards);
        newCard.likes = 0;
        newCard.time = DateTime.now().toUTC();
        newCard.comments = [];

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
            res.json({
              message: 'Added new card successfully.',
              id: newCard.id
            });
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
      error: 'cards-not-found',
      message: `No card matching id ${reqParamId} was found to get Reddit data for.`
    });
  }
});

app.route('/comments(/:id(\\d+))?')
  .get((req, res) => {
    const reqParamId = req.params.id;
    // noinspection JSUnresolvedVariable
    const reqQueryIds = req.query.ids;
    fs.readFile('./serverdb.json', 'utf8', async (err, fileData) => {
      if (err) {
        console.error(err);
      } else {
        const jsonData = JSON.parse(fileData);

        const reqComments = helpers.handleIdUrl(jsonData.comments, reqParamId, reqQueryIds);

        if (reqComments.length === 0) {
          res.status(404);
          res.json({
            error: 'comments-not-found',
            message: 'No comment/s with that/those id/s were found in the database.'
          });
        } else {
          res.status(200);
          if (reqParamId !== undefined) {
            res.send(reqComments[0]);
          } else {
            res.send(reqComments);
          }
        }
      }
    });
  })
  .post((req, res) => {
    fs.readFile('./serverdb.json', 'utf8', async (err, fileData) => {
      if (err) {
        console.error(err);
      } else {
        const jsonData = JSON.parse(fileData); // includes fields: content, parent

        const newComment = req.body;

        newComment.id = helpers.getNewValidId(jsonData.comments);
        newComment.time = DateTime.now().toUTC();

        // adds comment id to parent card's comment array property
        const parentCard = helpers.search(jsonData.cards, [newComment.parent])[0];
        parentCard.comments.push(newComment.id);

        jsonData.comments.push(newComment);
        const jsonString = JSON.stringify(jsonData, null, 2);

        fs.writeFile('./serverdb.json', jsonString, 'utf-8', () => {
          res.status(201);
          res.json({
            message: 'Added new comment successfully.',
            newTotalComments: parentCard.comments.length,
            id: newComment.id
          });
        });
      }
    });
  });

module.exports = app;
