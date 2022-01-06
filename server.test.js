const fs = require('fs');

const request = require('supertest');
const app = require('./app');

const testEntity = function (entity) {
  request(app).get(`/${entity}/`).then((response) => {
    expect(response.statusCode).toBe(200);
    expect(response.headers['content-type']).toEqual(expect.stringContaining('json'));
    fs.readFile('./serverdb.json', 'utf8', async (err, fileData) => {
      if (err) {
        console.error(err);
      } else {
        const entityData = JSON.parse(fileData)[entity];
        expect(JSON.parse(response.text)).toEqual(entityData);
      }
    });
  });
};

describe('Test GET methods', () => {
  test('GET / succeeds', async () => {
    const response = await request(app).get('/');
    expect(response.statusCode).toBe(200);
    expect(response.headers['content-type']).toEqual(expect.stringContaining('html'));
  });

  test('GET /cards/ returns all cards', () => testEntity('cards'));
  test('GET /comments/ returns all comments', () => testEntity('comments'));
});
