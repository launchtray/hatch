import 'reflect-metadata';
import supertest from 'supertest';

describe('server', () => {
  let request: supertest.SuperTest<supertest.Test>;

  beforeAll(async () => {
    request = supertest.agent('http://localhost:3000');
  });

  test('test GET api/1', async () => {
    const response = await request.get('/api/example');
    expect(response.status).toBe(200);
    expect(response.text).toMatch(/Example GET.*/);
  });
});
