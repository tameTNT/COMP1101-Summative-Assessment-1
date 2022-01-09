const request = require('supertest');
const app = require('./app');

// see note below in 'GET /cards?ids=1 returns same card object as /cards/1' to see why this function is required
const { toMatchCloseTo } = require('jest-matcher-deep-close-to');
expect.extend({ toMatchCloseTo });

const testEntityBasic = async function (entityName) {
  const response = await request(app).get(`/${entityName}`);
  expect(response.status).toEqual(200);
  expect(response.headers['content-type']).toMatch(/json/);

  const entityData = require('./serverdb.json');
  expect(JSON.parse(response.text)).toEqual(entityData[entityName]);
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
  // These requests may both invoke getRedditData() on the server side so Reddit JSON data is fetched
  // The data Reddit returns can actually change between the two requests
  // (specifically 'score' - because of vote fuzzing: https://www.reddit.com/r/redditdev/comments/kgwai/reddit_api_confused_about_score/)
  // so we only check values are ±10 of each-other
  // Hence precision -Math.log10(20)) since jest-matcher-deep-close-to uses this function to check precision:
  // export function calculatePrecision(precision: number): number {
  //   return 0.5 * Math.pow(10, -precision);
  // }
  expect(byQuery[0]).toMatchCloseTo(byParam, -Math.log10(20));
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
    test('GET /cards?ids=10000000 returns empty array', () => testEndpointArrayLength('cards?ids=10000000', 0));
    test('GET /cards?ids=1,10000000 returns array of one card', () => testEndpointArrayLength('cards?ids=1,10000000', 1));
    test('GET /cards?ids=1,2 returns array of two cards', () => testEndpointArrayLength('cards?ids=1,2', 2));
    test('GET /cards?ids=1 returns same card object as /cards/1', () => testEndpointsSameResponse('cards?ids=1', 'cards/1'));
    test('GET /cards/10000000 returns 404', () => testEndpoint404('cards/10000000', 'card'));

    describe('Test /reddit extending endpoint', () => {
      test('GET /cards/1/reddit returns Reddit json data', async () => {
        const response = await request(app).get('/cards/1/reddit');
        expect(response.status).toEqual(200);
        expect(response.headers['content-type']).toMatch(/json/);
      });
      test('GET /cards/10000000/reddit returns 404', () => testEndpoint404('cards/10000000/reddit', 'card'));
    });
  });

  describe('Test /comments endpoints', () => {
    test('GET /comments returns all comments', () => testEntityBasic('comments'));
    test('GET /comments?ids=1 returns array of one comment', () => testEndpointArrayLength('comments?ids=1', 1));
    test('GET /comments?ids=10000000 returns empty array', () => testEndpointArrayLength('comments?ids=10000000', 0));
    test('GET /comments?ids=1,10000000 returns array of one comment', () => testEndpointArrayLength('comments?ids=1,10000000', 1));
    test('GET /comments?ids=1,2 returns array of two comments', () => testEndpointArrayLength('comments?ids=1,2', 2));
    test('GET /comments?ids=1 returns same card object as /comments/1', () => testEndpointsSameResponse('comments?ids=1', 'comments/1'));
    test('GET /comments/10000000 returns 404', () => testEndpoint404('comments/10000000', 'comment'));
  });
});

describe('Test POST & PUT methods', () => {
  // todo: test /cards POST method (test with invalid reddit link)
  // todo: test /comments POST & PUT methods
});
