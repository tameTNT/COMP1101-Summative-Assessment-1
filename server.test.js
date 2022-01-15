const fs = require('fs');

const request = require('supertest'); // for testing express frameworks using JEST
const app = require('./app'); // express app to test

// see note below in testEndpointsSameResponse(...) to see why this extension of expect is required
const { toMatchCloseTo } = require('jest-matcher-deep-close-to');
expect.extend({ toMatchCloseTo });
// We use precision=-Math.log10(20)) since jest-matcher-deep-close-to uses this function to check precision:
// export function calculatePrecision(precision: number): number {
//   return 0.5 * Math.pow(10, -precision);
// }
const matchPrecision = -Math.log10(20); // will result in a match tolerance of ±10

// returns an Object containing the data currently stored in ./serverdb.json
const getDbData = function () {
  return JSON.parse(fs.readFileSync('./serverdb.json', 'utf8'));
};

let tempRealDbCache = {}; // a global variable to temporarily store the current contents of ./serverdb.json before testing
beforeAll(() => { // executed before any tests are started that could edit the db. Ensures tests are non destructive and repeatable
  tempRealDbCache = getDbData();

  // replace the contents of ./serverdb.json with that of ./serverdb.test.json for the duration of the testing
  // this is to ensure that the tests always test the expected data of the state of the live database
  // (e.g. that no card with id 10 exists already)
  const testDatabaseStr = fs.readFileSync('./serverdb.test.json', 'utf8');
  fs.writeFileSync('./serverdb.json', testDatabaseStr, 'utf-8');
});

// test that /entityName returns json, has status 200 and matches the test database
const testEntityBasic = async function (entityName) {
  const response = await request(app).get(`/${entityName}`);
  expect(response.status).toEqual(200);
  expect(response.headers['content-type']).toMatch(/json/);

  const jsonResponse = JSON.parse(response.text);
  expect(jsonResponse).toEqual(getDbData()[entityName]);
};

// test that /endpoint (endpoint can contain further /s) returns status 404
// and a json response with error property specifying entityName was not found
const testEndpoint404 = async function (endpoint, entityName) {
  const response = await request(app).get(`/${endpoint}`);
  expect(response.status).toEqual(404);
  expect(JSON.parse(response.text).error).toBe(`${entityName}(s)-not-found`);
};

// test that /endpoint (endpoint can contain further /s) returns status 200
// and a json response of length equal to expLength
const testEndpointArrayLength = async function (endpoint, expLength) {
  const response = await request(app).get(`/${endpoint}`);
  expect(response.status).toEqual(200);
  expect(response.headers['content-type']).toMatch(/json/);

  expect(JSON.parse(response.text).length).toEqual(expLength);
};

// test that /endpointA and /endpointB (endpoints can contain further /s) return the same response
// with some leeway offered for numerical values (±10)
const testEndpointsSameResponse = async function (endpointA, endpointB) {
  const responseA = await request(app).get(`/${endpointA}`);
  expect(responseA.headers['content-type']).toMatch(/json/);
  const resByQuery = JSON.parse(responseA.text);
  const responseB = await request(app).get(`/${endpointB}`);
  expect(responseA.headers['content-type']).toMatch(/json/);
  const resByParam = JSON.parse(responseB.text);
  // These requests invoke getRedditData() on the server side, so Reddit JSON data is fetched
  // The data Reddit returns can actually change between the two requests
  // (specifically 'score' - because of vote fuzzing: https://www.reddit.com/r/redditdev/comments/kgwai/reddit_api_confused_about_score/)
  // so we only check values are ±10 of each-other - they don't need to be exactly the same otherwise this test would inconsistently fail
  expect(resByQuery[0]).toMatchCloseTo(resByParam, matchPrecision);
};

// let the calling of actual tests begin!
describe('Test GET methods', () => {
  // just requesting the root url should make the server serve us html and a status 200
  test('GET / succeeds', async () => {
    const response = await request(app).get('/');
    expect(response.status).toEqual(200);
    expect(response.headers['content-type']).toMatch(/html/);
  });

  describe('Test /cards endpoints', () => {
    test('GET /cards returns all cards', () => testEntityBasic('cards'));
    test('GET /cards?ids=1 returns array of one card', () => testEndpointArrayLength('cards?ids=1', 1));
    // there is no card with id 10
    test('GET /cards?ids=10 returns empty array', () => testEndpointArrayLength('cards?ids=10', 0));
    test('GET /cards?ids=1,10 returns array of one card', () => testEndpointArrayLength('cards?ids=1,10', 1));
    test('GET /cards?ids=1,2 returns array of two cards', () => testEndpointArrayLength('cards?ids=1,2', 2));
    test('GET /cards?ids=1 returns same card object as /cards/1', () => testEndpointsSameResponse('cards?ids=1', 'cards/1'));
    test('GET /cards/10 returns status 404', () => testEndpoint404('cards/10', 'card'));

    describe('Test /reddit extending endpoint', () => {
      test('GET /cards/1/reddit returns Reddit json data', async () => {
        const response = await request(app).get('/cards/1/reddit');
        expect(response.status).toEqual(200);
        expect(response.headers['content-type']).toMatch(/json/);
      });
      test('GET /cards/10/reddit returns status 404', () => testEndpoint404('cards/10/reddit', 'card'));
    });
  });

  describe('Test /comments endpoints', () => {
    test('GET /comments returns all comments', () => testEntityBasic('comments'));
    test('GET /comments?ids=1 returns array of one comment', () => testEndpointArrayLength('comments?ids=1', 1));
    // there is no comment with id 10
    test('GET /comments?ids=10 returns empty array', () => testEndpointArrayLength('comments?ids=10', 0));
    test('GET /comments?ids=1,10 returns array of one comment', () => testEndpointArrayLength('comments?ids=1,10', 1));
    test('GET /comments?ids=1,2 returns array of two comments', () => testEndpointArrayLength('comments?ids=1,2', 2));
    test('GET /comments?ids=1 returns same card object as /comments/1', () => testEndpointsSameResponse('comments?ids=1', 'comments/1'));
    test('GET /comments/10 returns status 404', () => testEndpoint404('comments/10', 'comment'));
  });
});

describe('Test POST & PUT methods', () => {
  describe('Test /cards endpoints', () => {
    test('POST /cards succeeds and adds new card to database', async () => {
      const postBody = { // this is a completely valid POST body
        title: 'Test Title',
        language: 'Test Language',
        code: 'Test Code',
        redditUrl: 'https://www.reddit.com/r/adventofcode/comments/kjtg7y/comment/ggyvnnj/?utm_source=share&utm_medium=web2x&context=3'
      };
      const response = await request(app).post('/cards').send(postBody);
      expect(response.status).toBe(201); // 201 Created

      const jsonResponse = JSON.parse(response.text);
      expect(jsonResponse.message).toBe('Added new card successfully.');
      expect(jsonResponse.id).toBe(3); // 3 is the lowest id not yet taken
      // the final card in the array (at index -1) should be the one we just added
      expect(getDbData().cards.at(-1).title).toBe('Test Title');
    });

    test('POST /cards with invalid post body returns status 400', async () => {
      const postBody = {
        randomField: 'This is clearly missing required fields'
      };
      const response = await request(app).post('/cards').send(postBody);
      expect(response.status).toBe(400); // 400 Bad Request

      const jsonResponse = JSON.parse(response.text);
      expect(jsonResponse.error).toBe('request-body-field-error');
      // response message should include these four property names since they were all missing from the POST body
      expect(jsonResponse.message).toMatch(/(?=.*title)(?=.*language)(?=.*code)(?=.*redditUrl)/);
    });

    test('POST /cards with Reddit link invalid by RegExp returns status 422', async () => {
      const postBody = { // the redditUrl property is invalid since nothing follows the final /comment/
        title: 'Test Title',
        language: 'Test Language',
        code: 'Test Code',
        redditUrl: 'https://www.reddit.com/r/adventofcode/comments/kjtg7y/comment/'
      };
      const response = await request(app).post('/cards').send(postBody);
      expect(response.status).toBe(422); // 422 Unprocessable Entity
      const jsonResponse = JSON.parse(response.text);
      expect(jsonResponse.error).toBe('reddit-link-failed');
    });

    test('POST /cards with Reddit link invalid by non-existence returns status 422', async () => {
      const postBody = { // the redditUrl property is invalid since /comment/FFF doesn't exist online
        title: 'Test Title',
        language: 'Test Language',
        code: 'Test Code',
        redditUrl: 'https://www.reddit.com/r/adventofcode/comments/kjtg7y/comment/FFF'
      };
      const response = await request(app).post('/cards').send(postBody);
      expect(response.status).toBe(422);
      const jsonResponse = JSON.parse(response.text);
      expect(jsonResponse.error).toBe('reddit-link-failed');
    });
  });

  describe('Test /comments endpoints', () => {
    test('POST /comments succeeds, adds new comment to database and updates parent card', async () => {
      const postBody = { // this is a completely valid POST body
        content: 'Test Content',
        parent: 1
      };
      const response = await request(app).post('/comments').send(postBody);
      expect(response.status).toBe(201);

      const jsonResponse = JSON.parse(response.text);
      expect(jsonResponse.message).toBe('Added new comment successfully.');
      expect(jsonResponse.id).toBe(3);

      const dbData = getDbData();
      // the newTotalComments property returned should be equal to the comments attribute of card 1 (since parent: 1)
      expect(jsonResponse.newTotalComments).toBe(dbData.cards[1].comments.length);
      // the final comment in the array (at index -1) should be the one we just added
      expect(dbData.comments.at(-1).content).toBe('Test Content');
    });

    test('POST /comments with invalid post body properties returns status 400', async () => {
      const postBody = {
        randomField: 'This is clearly missing required fields'
      };
      const response = await request(app).post('/comments').send(postBody);
      expect(response.status).toBe(400);

      const jsonResponse = JSON.parse(response.text);
      expect(jsonResponse.error).toBe('request-body-field-error');
      expect(jsonResponse.message).toMatch(/(?=.*content)(?=.*parent)/);
    });

    test('POST /comments with invalid type of parent property returns status 422', async () => {
      const postBody = {
        content: 'Test Content',
        parent: 'Not a Number' // this should be a Number or String that can be converted to a Number (i.e. not NaN)
      };
      const response = await request(app).post('/comments').send(postBody);
      expect(response.status).toBe(422);

      const jsonResponse = JSON.parse(response.text);
      expect(jsonResponse.error).toBe('invalid-type-of-parent');
    });

    test('POST /comments with non-existent parent id returns status 404', async () => {
      const postBody = {
        content: 'Test Content',
        parent: 10 // this card doesn't exist in the database
      };
      const response = await request(app).post('/comments').send(postBody);
      expect(response.status).toBe(404); // 404 Not Found

      const jsonResponse = JSON.parse(response.text);
      expect(jsonResponse.error).toBe('parent-card-not-found');
    });

    test("PUT /comments/1 succeeds and updates comment's content", async () => {
      const putBody = { // this is a completely valid PUT body
        content: 'New Content!'
      };
      const response = await request(app).put('/comments/1').send(putBody);
      expect(response.status).toBe(204); // 204 No Content

      // the content of the second comment in the db should have been updated
      expect(getDbData().comments[1].content).toBe('New Content!');
    });

    test('PUT /comments/10 returns status 404', async () => {
      const putBody = {
        content: 'New Content!'
      };
      // there is no comment with id 10
      const response = await request(app).put('/comments/10').send(putBody);
      expect(response.status).toBe(404);

      const jsonResponse = JSON.parse(response.text);
      expect(jsonResponse.error).toBe('comment(s)-not-found');
    });

    test('PUT /comments/1 with invalid put body returns status 400', async () => {
      const putBody = {
        randomField: 'This is clearly missing required fields'
      };
      const response = await request(app).put('/comments/1').send(putBody);
      expect(response.status).toBe(400);

      const jsonResponse = JSON.parse(response.text);
      expect(jsonResponse.error).toBe('request-body-field-error');
      expect(jsonResponse.message).toMatch(/content/);
    });

    test('PUT /comments (i.e. missing parameter id in url) returns status 400', async () => {
      const putBody = {
        content: 'Test Content'
      };
      const response = await request(app).put('/comments').send(putBody);
      expect(response.status).toBe(400);

      const jsonResponse = JSON.parse(response.text);
      expect(jsonResponse.error).toBe('no-comment-to-put');
    });
  });
});

afterAll(() => { // once all the tests have been run, restore ./serverdb.json to its previous state from tempRealDbCache
  fs.writeFileSync('./serverdb.json', JSON.stringify(tempRealDbCache, null, 2), 'utf-8');
});
