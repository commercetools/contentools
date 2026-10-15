import { setupServer } from 'msw/node';
import { handlers, resetStore } from './fake-ct';

export const server = setupServer(...handlers);

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => {
  server.resetHandlers();
  resetStore();
});
afterAll(() => server.close());
