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

let realDatabaseData = {};
beforeAll(() => {
  realDatabaseData = JSON.parse(fs.readFileSync('./serverdb.json', 'utf8'));
  const testDatabaseStr = fs.readFileSync('./serverdb.test.json', 'utf8');
  fs.writeFileSync('./serverdb.json', testDatabaseStr, 'utf-8');
});

const testEntityBasic = async function (entityName) {
  const response = await request(app).get(`/${entityName}`);
  expect(response.status).toEqual(200);
  expect(response.headers['content-type']).toMatch(/json/);

  const fileData = JSON.parse(fs.readFileSync('./serverdb.json', 'utf8'));
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
  let response = await request(app).get(`/${endpointA}`);
  const byQuery = JSON.parse(response.text);
  response = await request(app).get(`/${endpointB}`);
  const byParam = JSON.parse(response.text);
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
    test('GET /cards/10 returns 404', () => testEndpoint404('cards/10', 'card'));

    describe('Test /reddit extending endpoint', () => {
      test('GET /cards/1/reddit returns Reddit json data', async () => {
        const response = await request(app).get('/cards/1/reddit');
        expect(response.status).toEqual(200);
        expect(response.headers['content-type']).toMatch(/json/);
      });
      test('GET /cards/10/reddit returns 404', () => testEndpoint404('cards/10/reddit', 'card'));
    });
  });

  describe('Test /comments endpoints', () => {
    test('GET /comments returns all comments', () => testEntityBasic('comments'));
    test('GET /comments?ids=1 returns array of one comment', () => testEndpointArrayLength('comments?ids=1', 1));
    test('GET /comments?ids=10 returns empty array', () => testEndpointArrayLength('comments?ids=10', 0));
    test('GET /comments?ids=1,10 returns array of one comment', () => testEndpointArrayLength('comments?ids=1,10', 1));
    test('GET /comments?ids=1,2 returns array of two comments', () => testEndpointArrayLength('comments?ids=1,2', 2));
    test('GET /comments?ids=1 returns same card object as /comments/1', () => testEndpointsSameResponse('comments?ids=1', 'comments/1'));
    test('GET /comments/10 returns 404', () => testEndpoint404('comments/10', 'comment'));
  });
});

describe('Test POST & PUT methods', () => {
  // todo: test /cards POST method (test with invalid reddit link)
  // todo: test /comments POST & PUT methods
});

afterAll(() => {
  fs.writeFileSync('./serverdb.json', JSON.stringify(realDatabaseData, null, 2), 'utf-8');
});
