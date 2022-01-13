const helpers = require('./helperFunctions.js'); // import helper functions that help do some repetitive tasks

const fs = require('fs');
const FILE_ERROR_MESSAGE = 'An internal server error occurred within the API while accessing the .json database file. Please try again later.';

const { DateTime } = require('luxon'); // Datetime logic for tracking initial entity creation

const express = require('express');
const app = express();

app.use(express.static('client')); // serve the user the ./client folder with all the .html and .js files for local rendering
app.use(express.json()); // parse request bodies (i.e. req.body) as JSON automatically using express's json middleware function

// == /cards endpoints ==
/**
 * @param req {express.Request} Incoming request to API
 * @param res {express.Response} Response to be sent to user from API
 * @param req.params.id {String | undefined} req id parameter
 * @param req.query.ids {String | undefined} req ids query string
 */
app.route('/cards(/:id(\\d+))?') // e.g. GET /cards; /cards/1; /cards/2; /cards?ids=1; /cards?ids=1,2
  .get((req, res) => {
    // capture id parameter and query string (?ids=...)
    const reqParamId = req.params.id;
    const reqQueryIds = req.query.ids;

    fs.readFile('./serverdb.json', 'utf8', async (err, fileData) => {
      if (err) { // if an error occurs while reading the file, return a 500 Internal Server Error and log it to the console for later reference
        console.log(err);
        res.status(500); // 500 Internal Server Error
        res.json({
          error: 'database-read-error',
          message: FILE_ERROR_MESSAGE
        });
      } else {
        /** @type {{cards: Object[], comments: Object[]}} fileJsonData */
        const fileJsonData = JSON.parse(fileData);

        // this helper function automatically returns the specified card/s from fileJsonData.cards using the provided request's parameters/queries
        const reqCards = helpers.handleIdUrl(fileJsonData.cards, reqParamId, reqQueryIds);

        if (reqCards.length === 0 && reqParamId !== undefined) {
          // we only want to return a 404 error if a non-existent card was requested specifically by parameter id
          // the API schema allows for using the ?ids query to return an empty array if no results were found matching provided id/s
          res.status(404); // 404 Not Found
          res.json({
            error: 'card(s)-not-found',
            message: 'No card/s with that/those id/s were found in the database.'
          });
        } else {
          // take this opportunity to update cards' associated reddit data
          for (const card of reqCards) {
            const redditData = await helpers.getRedditData(card.redditUrl);
            if (redditData) { // check redditData is not undefined here just in case the redditUrl associated with the card no longer exists (e.g. comment was deleted)
              helpers.updateCardRedditData(card, redditData);
            } // if it is indeed undefined, we just leave the data as it as a legacy record instead of removing the card entirely
          }

          // generate the string of the json data to write back to file using indentation of 2 spaces
          const jsonString = JSON.stringify(fileJsonData, null, 2);
          fs.writeFile('./serverdb.json', jsonString, 'utf-8', (err) => {
            if (err) { // if an error occurs while writing to the file, return a 500 Internal Server Error and log it to the console for later reference
              console.log(err);
              res.status(500);
              res.json({
                error: 'database-write-error',
                message: FILE_ERROR_MESSAGE
              });
            } else {
              res.status(200); // 200 OK
              if (reqParamId !== undefined) { // if a parameter was provided in the url, then the user wants just one specific card so return just the object and not an Array
                res.send(reqCards[0]);
              } else {
                res.send(reqCards); // return the updated array of cards that match the API request
              }
            }
          });
        }
      }
    });
  })
  .post((req, res) => { // POST /cards
    fs.readFile('./serverdb.json', 'utf8', async (err, fileData) => {
      if (err) {
        console.log(err);
        res.status(500);
        res.json({
          error: 'database-read-error',
          message: FILE_ERROR_MESSAGE
        });
      } else {
        const fileJsonData = JSON.parse(fileData);

        const newCard = req.body;
        // check that the request body provided is actually valid and contains all the expected and required properties
        if (!helpers.isRequestBodyValid(newCard, ['title', 'language', 'code', 'redditUrl'], res)) {
          return;
        }

        // initialise property values
        newCard.id = helpers.getNewId(fileJsonData.cards);
        newCard.likes = 0;
        newCard.time = DateTime.now().toUTC(); // uses current server datetime in UTC
        newCard.comments = [];

        const urlRegExp = /https:\/\/www.reddit.com\/r\/adventofcode\/comments\/\w+\/comment\/\w+/;
        const regExpMatch = newCard.redditUrl.match(urlRegExp); // check the provided redditUrl is in the expected form

        let redditData; // initialise to undefined in case no RegExp match
        if (regExpMatch) {
          newCard.redditUrl = regExpMatch[0]; // first element of match array is whole url that matches the RegExp
          redditData = await helpers.getRedditData(newCard.redditUrl);
        }

        if (!redditData) { // redditData does not exist (e.g. is undefined) - either because no regExpMatch or getRedditData(...) returned undefined
          res.status(422); // 422 Unprocessable Entity
          res.json({
            error: 'reddit-link-failed',
            message: "The provided Reddit link couldn't be resolved. Please check the link is correct."
          });
        } else {
          // add the newly retrieved (and now confirmed valid) Reddit data to the card object and push this card to the cards array
          helpers.updateCardRedditData(newCard, redditData);
          fileJsonData.cards.push(newCard);

          const jsonString = JSON.stringify(fileJsonData, null, 2);
          fs.writeFile('./serverdb.json', jsonString, 'utf-8', (err) => {
            if (err) {
              console.log(err);
              res.status(500);
              res.json({
                error: 'database-write-error',
                message: FILE_ERROR_MESSAGE
              });
            } else {
              res.status(201); // 201 Created
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

app.get('/cards/:id(\\d+)/reddit', async (req, res) => { // e.g. GET /cards/1/reddit; /cards/2/reddit
  const reqParamId = req.params.id;

  const cards = require('./serverdb.json').cards; // load cards from database
  const reqCard = helpers.handleIdUrl(cards, reqParamId, '')[0]; // find the one specific card
  if (reqCard) {
    // return Reddit data associated with card's redditUrl property
    res.json(await helpers.getRedditData(reqCard.redditUrl));
  } else { // handleIdUrl(...)[0] is undefined (because card with id reqParamId wasn't found in cards
    res.status(404);
    res.json({
      error: 'card(s)-not-found',
      message: `No card matching id ${reqParamId} was found to get Reddit data for.`
    });
  }
});

// == /comments endpoints ==
app.route('/comments(/:id(\\d+))?') // e.g. GET /comments; /comments/1; /comments/2 /comments?ids=1; /comments?ids=1,2
  .get((req, res) => { // many of the same comments as for the /cards endpoints apply for these functions since they provide essentially the same functionality for the different entity
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
        const fileJsonData = JSON.parse(fileData);

        const reqComments = helpers.handleIdUrl(fileJsonData.comments, reqParamId, reqQueryIds);

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
  .post((req, res) => { // POST /comments
    fs.readFile('./serverdb.json', 'utf8', async (err, fileData) => {
      if (err) {
        console.log(err);
        res.status(500);
        res.json({
          error: 'database-read-error',
          message: FILE_ERROR_MESSAGE
        });
      } else {
        const fileJsonData = JSON.parse(fileData);

        const newComment = req.body;
        if (!helpers.isRequestBodyValid(newComment, ['content', 'parent'], res)) {
          return;
        }

        newComment.id = helpers.getNewId(fileJsonData.comments);
        newComment.time = DateTime.now().toUTC();
        newComment.lastEdited = null; // lastEdited property initially set to null to be updated later

        // adds comment id to parent card's comments property
        const parentCard = helpers.searchId(fileJsonData.cards, [newComment.parent])[0];
        if (!parentCard) {
          res.status(404);
          res.json({
            error: 'parent-card-not-found',
            message: 'The parent card with specified id was not found in the database.'
          });
        } else {
          parentCard.comments.push(newComment.id);

          fileJsonData.comments.push(newComment);
          const jsonString = JSON.stringify(fileJsonData, null, 2);
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
                newTotalComments: parentCard.comments.length, // newTotalComments is used client side to update page labels
                id: newComment.id
              });
            }
          });
        }
      }
    });
  })
  .put((req, res) => { // e.g. PUT /cards/1; /cards/2
    // used to update comment content after initial creation
    fs.readFile('./serverdb.json', 'utf8', async (err, fileData) => {
      if (err) {
        console.log(err);
        res.status(500);
        res.json({
          error: 'database-read-error',
          message: FILE_ERROR_MESSAGE
        });
      } else {
        const fileJsonData = JSON.parse(fileData);

        const reqParamId = req.params.id;
        if (!reqParamId) {
          res.status(400); // 400 Bad Request
          res.json({
            error: 'no-comment-to-put',
            message: 'No comment id was provided.'
          });
        } else {
          const newContent = req.body.content;
          if (!helpers.isRequestBodyValid(req.body, ['content'], res)) {
            return;
          }

          // find relevant comment object that needs to be updated
          const targetComment = helpers.handleIdUrl(fileJsonData.comments, reqParamId, '')[0];
          if (!targetComment) { // if no comment with the given id is found, targetComment will be undefined
            res.status(404);
            res.json({
              error: 'comment(s)-not-found',
              message: 'No comment with that id was found in the database to update.'
            });
          } else {
            targetComment.content = newContent; // update comment's content to newly supplied content
            targetComment.lastEdited = DateTime.now().toUTC(); // lastEdited property updated to current server time

            const jsonString = JSON.stringify(fileJsonData, null, 2);
            fs.writeFile('./serverdb.json', jsonString, 'utf-8', (err) => {
              if (err) {
                console.log(err);
                res.status(500);
                res.json({
                  error: 'database-write-error',
                  message: FILE_ERROR_MESSAGE
                });
              } else {
                res.sendStatus(204); // 204 No Content
              }
            });
          }
        }
      }
    });
  });

module.exports = app;
