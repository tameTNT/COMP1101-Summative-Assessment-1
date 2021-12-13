const request = require('supertest');
const app = require('./app');

describe('Test basic GET methods', () => {
  test('GET / succeeds', async () => {
    return request(app)
        .get('/')
        .expect(200);
  });
});
