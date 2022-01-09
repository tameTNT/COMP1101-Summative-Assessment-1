const fs = require('fs');

const request = require('supertest');
const app = require('./app');

// see note below in 'GET /cards?ids=1 returns same card object as /cards/1' to see why this function is required
const { toMatchCloseTo } = require('jest-matcher-deep-close-to');
expect.extend({ toMatchCloseTo });
// We use precision=-Math.log10(20)) since jest-matcher-deep-close-to uses this function to check precision:
// export function calculatePrecision(precision: number): number {
//   return 0.5 * Math.pow(10, -precision);
// }
const matchPrecision = -Math.log10(20); // will result in a match tolerance of ±10

const getDbData = function () {
  return JSON.parse(fs.readFileSync('./serverdb.json', 'utf8'));
};

let realDatabaseData = {};
beforeAll(() => {
  realDatabaseData = getDbData();
  const testDatabaseStr = fs.readFileSync('./serverdb.test.json', 'utf8');
  fs.writeFileSync('./serverdb.json', testDatabaseStr, 'utf-8');
});

const testEntityBasic = async function (entityName) {
  const response = await request(app).get(`/${entityName}`);
  expect(response.status).toEqual(200);
  expect(response.headers['content-type']).toMatch(/json/);

  const fileData = getDbData();
  expect(JSON.parse(response.text)).toEqual(fileData[entityName]);
};

const testEndpoint404 = async function (endpoint, entityName) {
  const response = await request(app).get(`/${endpoint}`);
  expect(response.status).toEqual(404);
  expect(JSON.parse(response.text).error).toBe(`${entityName}(s)-not-found`);
};

const testEndpointArrayLength = async function (endpoint, expLength) {
  const response = await request(app).get(`/${endpoint}`);
  expect(response.status).toEqual(200);
  expect(response.headers['content-type']).toMatch(/json/);

  expect(JSON.parse(response.text).length).toEqual(expLength);
};

const testEndpointsSameResponse = async function (endpointA, endpointB) {
  const responseA = await request(app).get(`/${endpointA}`);
  const byQuery = JSON.parse(responseA.text);
  const responseB = await request(app).get(`/${endpointB}`);
  const byParam = JSON.parse(responseB.text);
  // These requests invoke getRedditData() on the server side so Reddit JSON data is fetched
  // The data Reddit returns can actually change between the two requests
  // (specifically 'score' - because of vote fuzzing: https://www.reddit.com/r/redditdev/comments/kgwai/reddit_api_confused_about_score/)
  // so we only check values are ±10 of each-other - they don't need to be exactly the same.
  expect(byQuery[0]).toMatchCloseTo(byParam, matchPrecision);
};

describe('Test GET methods', () => {
  test('GET / succeeds', async () => {
    const response = await request(app).get('/');
    expect(response.status).toEqual(200);
    expect(response.headers['content-type']).toMatch(/html/);
  });

  describe('Test /cards endpoints', () => {
    test('GET /cards returns all cards', () => testEntityBasic('cards'));
    test('GET /cards?ids=1 returns array of one card', () => testEndpointArrayLength('cards?ids=1', 1));
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
      const postBody = {
        title: 'Test Title',
        language: 'Test Language',
        code: 'Test Code',
        redditUrl: 'https://www.reddit.com/r/adventofcode/comments/kjtg7y/comment/ggyvnnj/?utm_source=share&utm_medium=web2x&context=3'
      };
      const response = await request(app).post('/cards').send(postBody);
      expect(response.status).toBe(201);

      const jsonResponse = JSON.parse(response.text);
      expect(jsonResponse.message).toBe('Added new card successfully.');
      expect(jsonResponse.id).toBe(3);
      expect(getDbData().cards.at(-1).title).toBe('Test Title');
    });

    test('POST /cards returns status 422 when Reddit link invalid by RegExp', async () => {
      const postBody = {
        title: 'Test Title',
        language: 'Test Language',
        code: 'Test Code',
        redditUrl: 'https://www.reddit.com/r/adventofcode/comments/kjtg7y/comment/'
      };
      const response = await request(app).post('/cards').send(postBody);
      expect(response.status).toBe(422);
      const jsonResponse = JSON.parse(response.text);
      expect(jsonResponse.error).toBe('reddit-link-failed');
    });

    test('POST /cards returns status 422 when Reddit link invalid by non-existence', async () => {
      const postBody = {
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
      const postBody = {
        content: 'Test Content',
        parent: 1
      };
      const response = await request(app).post('/comments').send(postBody);
      expect(response.status).toBe(201);

      const jsonResponse = JSON.parse(response.text);
      expect(jsonResponse.message).toBe('Added new comment successfully.');
      expect(jsonResponse.id).toBe(3);

      const dbData = getDbData();
      expect(jsonResponse.newTotalComments).toBe(dbData.cards.at(1).comments.length);
      expect(dbData.comments.at(-1).content).toBe('Test Content');
    });

    test('POST /comments returns status 404 with non-existent parent id', async () => {
      const postBody = {
        content: 'Test Content',
        parent: 10
      };
      const response = await request(app).post('/comments').send(postBody);
      expect(response.status).toBe(404);

      const jsonResponse = JSON.parse(response.text);
      expect(jsonResponse.error).toBe('parent-card-not-found');
    });

    test("PUT /comments/1 succeeds and updates comment's content", async () => {
      const putBody = {
        content: 'New Content!'
      };
      const response = await request(app).put('/comments/1').send(putBody);
      expect(response.status).toBe(204);

      expect(getDbData().comments.at(1).content).toBe('New Content!');
    });

    test('PUT /comments without parameter id returns status 400', async () => {
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

afterAll(() => {
  fs.writeFileSync('./serverdb.json', JSON.stringify(realDatabaseData, null, 2), 'utf-8');
});
