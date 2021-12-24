const request = require('supertest');
const app = require('./app');

const testEntity = async function (entity) {
  const response = await request(app).get(`/${entity}/`);
  expect(response.statusCode).toBe(200);
  expect(response.headers['content-type']).toEqual(expect.stringContaining('json'));
  expect(JSON.parse(response.text)).toEqual(require('./serverdb.json')[entity]);
};

describe('Test GET methods', () => {
  test('GET / succeeds', async () => {
    const response = await request(app).get('/');
    expect(response.statusCode).toBe(200);
    expect(response.headers['content-type']).toEqual(expect.stringContaining('html'));
  });

  ['comments', 'cards'].forEach(
    (entity) => {
      test(`GET /${entity}/ returns all ${entity}`, () => testEntity(entity));
    }
  );
});
