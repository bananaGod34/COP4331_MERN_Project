const request = require('supertest');

const BASE_URL = 'http://localhost:5000';

describe('Login Endpoint - POST /api/login', () => {

  test('missing login and password returns 400', async () => {
    const res = await request(BASE_URL)
      .post('/api/login')
      .send({});
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBe('All fields are required');
  });

  test('missing password returns 400', async () => {
    const res = await request(BASE_URL)
      .post('/api/login')
      .send({ login: 'testuser' });
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBe('All fields are required');
  });

  test('invalid credentials returns error message', async () => {
    const res = await request(BASE_URL)
      .post('/api/login')
      .send({ login: 'fakeuser', password: 'fakepass' });
    expect(res.statusCode).toBe(200);
    expect(res.body.error).toBe('Invalid username or password');
    expect(res.body.id).toBe(-1);
  });

});

describe('Signup Endpoint - POST /api/signup', () => {

  test('missing fields returns 400', async () => {
    const res = await request(BASE_URL)
      .post('/api/signup')
      .send({ firstName: 'John' });
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBe('All fields are required');
  });

  test('missing email returns 400', async () => {
    const res = await request(BASE_URL)
      .post('/api/signup')
      .send({ firstName: 'John', lastName: 'Doe', login: 'johndoe', password: 'pass123' });
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBe('All fields are required');
  });

  test('duplicate username returns 400', async () => {
    const res = await request(BASE_URL)
      .post('/api/signup')
      .send({
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        login: 'cmclallen1', //existing username
        password: 'pass123'
      });
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBe('Username already taken');
  });

});

describe('Verify Email Endpoint - POST /api/auth/verify-email', () => {

  test('missing token returns 400', async () => {
    const res = await request(BASE_URL)
      .post('/api/auth/verify-email')
      .send({});
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBe('Token is required.');
  });

  test('invalid token returns 400', async () => {
    const res = await request(BASE_URL)
      .post('/api/auth/verify-email')
      .send({ token: 'invalidtoken123' });
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBe('Invalid or already used verification token.');
  });

});

describe('Forgot Password Endpoint - POST /api/auth/forgot-password', () => {

  test('missing email returns 400', async () => {
    const res = await request(BASE_URL)
      .post('/api/auth/forgot-password')
      .send({});
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBe('Email is required.');
  });

  test('nonexistent email still returns success (security)', async () => {
    const res = await request(BASE_URL)
      .post('/api/auth/forgot-password')
      .send({ email: 'nobody@fake.com' });
    expect(res.statusCode).toBe(200);
    expect(res.body.message).toBe('If an account exists, a reset link has been sent.');
  });

  test('existing email returns success message', async () => {
    const res = await request(BASE_URL)
      .post('/api/auth/forgot-password')
      .send({ email: 'colinm1578@gmail.com' }); // replace with a real email in your DB
    expect(res.statusCode).toBe(200);
    expect(res.body.message).toBe('If an account exists, a reset link has been sent.');
  });

});

describe('Reset Password Endpoint - POST /api/auth/reset-password', () => {

  test('missing token and password returns 400', async () => {
    const res = await request(BASE_URL)
      .post('/api/auth/reset-password')
      .send({});
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBe('Token and new password are required.');
  });

  test('missing password returns 400', async () => {
    const res = await request(BASE_URL)
      .post('/api/auth/reset-password')
      .send({ token: 'sometoken' });
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBe('Token and new password are required.');
  });

  test('invalid token returns 400', async () => {
    const res = await request(BASE_URL)
      .post('/api/auth/reset-password')
      .send({ token: 'invalidtoken123', newPassword: 'newpass123' });
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBe('Invalid or expired reset token.');
  });

});

describe('Trips Endpoints', () => {

  const fakeUserId = '000000000000000000000000'; // invalid ObjectId

  test('GET /api/users/:userId/trips - invalid userId returns empty trips', async () => {
    const res = await request(BASE_URL)
      .get(`/api/users/${fakeUserId}/trips`);
    expect(res.statusCode).toBe(200);
    expect(res.body.trips).toEqual([]);
  });

  test('PUT /api/users/:userId/trips - trips must be array', async () => {
    const res = await request(BASE_URL)
      .put(`/api/users/${fakeUserId}/trips`)
      .send({ trips: 'not an array' });
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBe('trips must be array');
  });

  test('PUT /api/users/:userId/trips - invalid userId with valid array returns 200', async () => {
    const res = await request(BASE_URL)
      .put(`/api/users/${fakeUserId}/trips`)
      .send({ trips: [] });
    expect(res.statusCode).toBe(200);
    expect(res.body.error).toBe('');
  });
});
