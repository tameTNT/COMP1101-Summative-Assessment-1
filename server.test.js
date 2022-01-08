const request = require('supertest');
const app = require('./app');

// see note below in 'GET /cards?ids=1 returns same card object as /cards/1' to see why this function is required
const { toMatchCloseTo } = require('jest-matcher-deep-close-to');
expect.extend({ toMatchCloseTo });

const testEntityBasic = async function (entity) {
  const response = await request(app).get(`/${entity}`);
  expect(response.status).toEqual(200);
  expect(response.headers['content-type']).toMatch(/json/);

  const entityData = require('./serverdb.json');
  expect(JSON.parse(response.text)).toEqual(entityData[entity]);
};

const testEntityArrayLength = async function (endpoint, expLength) {
  const response = await request(app).get(`/${endpoint}`);
  expect(response.status).toEqual(200);
  expect(response.headers['content-type']).toMatch(/json/);

  expect(JSON.parse(response.text).length).toEqual(expLength);
};

describe('Test GET methods', () => {
  test('GET / succeeds', async () => {
    const response = await request(app).get('/');
    expect(response.status).toEqual(200);
  });

  describe('Test /cards endpoints', () => {
    test('GET /cards returns all cards', () => testEntityBasic('cards'));
    test('GET /cards?ids=1 returns array of one card', () => testEntityArrayLength('cards?ids=1', 1));
    test('GET /cards?ids=10000000 returns empty array', () => testEntityArrayLength('cards?ids=10000000', 0));
    test('GET /cards?ids=1,10000000 returns array of one card', () => testEntityArrayLength('cards?ids=1,10000000', 1));
    test('GET /cards?ids=1,2 returns array of two cards', () => testEntityArrayLength('cards?ids=1,2', 2));
    test('GET /cards?ids=1 returns same card object as /cards/1', async () => {
      let response = await request(app).get('/cards?ids=1');
      const byQuery = JSON.parse(response.text);
      response = await request(app).get('/cards/1');
      const byParam = JSON.parse(response.text);
      // These requests both invoke getRedditData() on the server side so Reddit JSON data is fetched
      // The data Reddit returns can actually change between the two requests
      // (specifically 'score' - because of vote fuzzing: https://www.reddit.com/r/redditdev/comments/kgwai/reddit_api_confused_about_score/)
      // so we only check values are ±10 of each-other
      // Hence precision -Math.log10(20)) since jest-matcher-deep-close-to uses this function to check precision:
      // export function calculatePrecision(precision: number): number {
      //   return 0.5 * Math.pow(10, -precision);
      // }
      expect(byQuery[0]).toMatchCloseTo(byParam, -Math.log10(20));
    });
    test('GET /cards/10000000 returns 404', async () => {
      const response = await request(app).get('/cards/10000000');
      expect(response.status).toEqual(404);
      expect(JSON.parse(response.text).error).toBe('card(s)-not-found');
    });

    describe('Test /reddit extending endpoint', () => {
      test('GET /cards/1/reddit returns Reddit json data', async () => {
        const response = await request(app).get('/cards/1/reddit');
        expect(response.status).toEqual(200);
        expect(response.headers['content-type']).toMatch(/json/);
      });
      test('GET /cards/10000000/reddit returns 404', async () => {
        const response = await request(app).get('/cards/10000000/reddit');
        expect(response.status).toEqual(404);
        expect(JSON.parse(response.text).error).toBe('card(s)-not-found');
      });
    });
  });
  describe('Test /comments endpoints', () => {
    test('GET /comments returns all cards', () => testEntityBasic('comments'));
    // todo: similar tests to above
  });
});

// todo: test /cards PUSH method (test with invalid reddit link)
// todo: test /comments PUSH & PUT methods
