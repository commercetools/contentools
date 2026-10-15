import type { Response } from 'supertest';

/** Connect checklist: errors are JSON with a `message`. */
export const expectErrorShape = (res: Response, status: number): void => {
  expect(res.status).toBe(status);
  expect(res.body).toEqual(expect.objectContaining({ message: expect.any(String) }));
};

/** Connect checklist: no stack trace, source path or host path leaks to the client. */
export const expectNoStackLeak = (res: Response): void => {
  const text = JSON.stringify(res.body) + String(res.text ?? '');
  expect(text).not.toMatch(/\n\s+at\s|\.ts:\d+|node_modules|\/Users\/|\/app\//);
};
