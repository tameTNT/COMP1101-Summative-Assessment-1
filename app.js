const fs = require('fs');

const { DateTime } = require('luxon');

const express = require('express');
const app = express();

const helpers = require('./helperFunctions.js');

const FILE_ERROR_MESSAGE = 'An internal server error occurred within the API while accessing the .json database file. Please try again later.';

app.use(express.static('client'));
app.use(express.json());

/**
 * @param req {express.Request}
 * @param res {express.Response}
 * @param req.params.id {String | undefined}
 * @param req.query.ids {String | undefined}
 */
app.route('/cards(/:id(\\d+))?')
  .get((req, res) => {
    const reqParamId = req.params.id;
    const reqQueryIds = req.query.ids;

    fs.readFile('./serverdb.json', 'utf8', async (err, fileData) => {
      if (err) {
        console.log(err);
        res.status(500);
        res.json({
          error: 'database-read-error',
          message: FILE_ERROR_MESSAGE
        });
      } else {
        /** @type {{cards: Object[], comments: Object[]}} jsonData */
        const jsonData = JSON.parse(fileData);

        const reqCards = helpers.handleIdUrl(jsonData.cards, reqParamId, reqQueryIds);

        if (reqCards.length === 0 && reqParamId !== undefined) {
          res.status(404);
          res.json({
            error: 'card(s)-not-found',
            message: 'No card/s with that/those id/s were found in the database.'
          });
        } else {
          // update cards' reddit data while GETting
          for (const card of reqCards) {
            const redditData = await helpers.getRedditData(card.redditUrl);
            helpers.updateCardRedditData(card, redditData);
          }

          const jsonString = JSON.stringify(jsonData, null, 2);
          fs.writeFile('./serverdb.json', jsonString, 'utf-8', (err) => {
            if (err) {
              console.log(err);
              res.status(500);
              res.json({
                error: 'database-write-error',
                message: FILE_ERROR_MESSAGE
              });
            } else {
              res.status(200);
              if (reqParamId !== undefined) {
                res.send(reqCards[0]);
              } else {
                res.send(reqCards);
              }
            }
          });
        }
      }
    });
  })
  .post((req, res) => {
    fs.readFile('./serverdb.json', 'utf8', async (err, fileData) => {
      if (err) {
        console.log(err);
        res.status(500);
        res.json({
          error: 'database-read-error',
          message: FILE_ERROR_MESSAGE
        });
      } else {
        const jsonData = JSON.parse(fileData);

        const newCard = req.body; // includes fields: title, language, code, redditUrl

        newCard.id = helpers.getNewValidId(jsonData.cards);
        newCard.likes = 0;
        newCard.time = DateTime.now().toUTC();
        newCard.comments = [];

        const urlRegexp = /https:\/\/www.reddit.com\/r\/adventofcode\/comments\/\w+\/comment\/\w+/;
        const regExpMatch = newCard.redditUrl.match(urlRegexp);

        let redditData;
        if (regExpMatch) {
          newCard.redditUrl = regExpMatch[0]; // first element of match array is whole url that matches regexp
          redditData = await helpers.getRedditData(newCard.redditUrl);
        }

        if (!redditData) {
          res.status(422);
          res.json({
            error: 'reddit-link-failed',
            message: "The provided Reddit link couldn't be resolved. Please check the link is correct."
          });
        } else {
          helpers.updateCardRedditData(newCard, redditData);
          jsonData.cards.push(newCard);

          const jsonString = JSON.stringify(jsonData, null, 2);
          fs.writeFile('./serverdb.json', jsonString, 'utf-8', (err) => {
            if (err) {
              console.log(err);
              res.status(500);
              res.json({
                error: 'database-write-error',
                message: FILE_ERROR_MESSAGE
              });
            } else {
              res.status(201);
              res.json({
                message: 'Added new card successfully.',
                id: newCard.id
              });
            }
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
      error: 'card(s)-not-found',
      message: `No card matching id ${reqParamId} was found to get Reddit data for.`
    });
  }
});

app.route('/comments(/:id(\\d+))?')
  .get((req, res) => {
    const reqParamId = req.params.id;
    const reqQueryIds = req.query.ids;
    fs.readFile('./serverdb.json', 'utf8', async (err, fileData) => {
      if (err) {
        console.log(err);
        res.status(500);
        res.json({
          error: 'database-read-error',
          message: FILE_ERROR_MESSAGE
        });
      } else {
        const jsonData = JSON.parse(fileData);

        const reqComments = helpers.handleIdUrl(jsonData.comments, reqParamId, reqQueryIds);

        if (reqComments.length === 0 && reqParamId !== undefined) {
          res.status(404);
          res.json({
            error: 'comment(s)-not-found',
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
        console.log(err);
        res.status(500);
        res.json({
          error: 'database-read-error',
          message: FILE_ERROR_MESSAGE
        });
      } else {
        const jsonData = JSON.parse(fileData);

        const newComment = req.body; // includes fields: content, parent

        newComment.id = helpers.getNewValidId(jsonData.comments);
        newComment.time = DateTime.now().toUTC();
        newComment.lastEdited = null;

        // adds comment id to parent card's comment array property
        const parentCard = helpers.searchId(fileJsonData.cards, [newComment.parent])[0];
        if (!parentCard) {
          res.status(404);
          res.json({
            error: 'parent-card-not-found',
            message: 'The parent card with specified id was not found in the database.'
          });
        } else {
          parentCard.comments.push(newComment.id);

          jsonData.comments.push(newComment);
          const jsonString = JSON.stringify(jsonData, null, 2);
          fs.writeFile('./serverdb.json', jsonString, 'utf-8', (err) => {
            if (err) {
              console.log(err);
              res.status(500);
              res.json({
                error: 'database-write-error',
                message: FILE_ERROR_MESSAGE
              });
            } else {
              res.status(201);
              res.json({
                message: 'Added new comment successfully.',
                newTotalComments: parentCard.comments.length,
                id: newComment.id
              });
            }
          });
        }
      }
    });
  })
  .put((req, res) => {
    fs.readFile('./serverdb.json', 'utf8', async (err, fileData) => {
      if (err) {
        console.log(err);
        res.status(500);
        res.json({
          error: 'database-read-error',
          message: FILE_ERROR_MESSAGE
        });
      } else {
        const jsonData = JSON.parse(fileData);

        const reqParamId = req.params.id;
        if (!reqParamId) {
          res.status(400);
          res.json({
            error: 'no-comment-to-put',
            message: 'No comment id was provided.'
          });
        } else {
          const newCommentContent = req.body.content; // includes fields: content

          const targetComment = helpers.handleIdUrl(jsonData.comments, reqParamId, '')[0];
          targetComment.content = newCommentContent;
          targetComment.lastEdited = DateTime.now().toUTC();

          const jsonString = JSON.stringify(jsonData, null, 2);
          fs.writeFile('./serverdb.json', jsonString, 'utf-8', (err) => {
            if (err) {
              console.log(err);
              res.status(500);
              res.json({
                error: 'database-write-error',
                message: FILE_ERROR_MESSAGE
              });
            } else {
              res.sendStatus(204);
            }
          });
        }
      }
    });
  });

module.exports = app;
