import request from 'supertest';
import { createApp } from '../../src/app';
import { expectErrorShape, expectNoStackLeak } from '../support/assertions';

describe('app smoke', () => {
  it('answers 404 JSON for unknown paths', async () => {
    const res = await request(createApp()).get('/definitely-not-a-route');
    expectErrorShape(res, 404);
    expect(res.body.message).toBe('Path not found.');
    expectNoStackLeak(res);
  });
});
