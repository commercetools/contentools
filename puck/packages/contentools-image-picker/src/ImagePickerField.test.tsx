import '@testing-library/jest-dom/vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type {
  PuckFetcher,
  PuckRequest,
  PuckResponse,
} from '@commercetools-labs/contentools-types';
import { describe, expect, it } from 'vitest';
import { ImagePickerField } from './ImagePickerField';
import { ImagePickerProvider } from './context/ImagePickerProvider';

const BASE = 'http://svc.test/service';

const response = (status: number, body: unknown): PuckResponse => ({
  ok: status >= 200 && status < 300,
  status,
  statusText: '',
  headers: { get: (n) => (n.toLowerCase() === 'content-type' ? 'application/json' : null) },
  text: async () => JSON.stringify(body),
  json: async () => body,
});

const file = (name: string) => ({
  url: `http://svc.test/${name}`,
  name,
  isImage: true,
});

const setup = (respond: (r: PuckRequest) => PuckResponse) => {
  const requests: PuckRequest[] = [];
  const fetcher: PuckFetcher = async (request) => {
    requests.push(request);
    return respond(request);
  };
  render(
    <ImagePickerProvider
      baseURL={BASE}
      businessUnitKey="main-store"
      jwtToken="t"
      fetcher={fetcher}
    >
      <ImagePickerField value="" onChange={() => undefined} />
    </ImagePickerProvider>
  );
  return requests;
};

describe('ImagePickerField', () => {
  it('loads the library through the shared client with the bearer token', async () => {
    const requests = setup(() =>
      response(200, {
        files: [file('a.png')],
        pagination: { limit: 20, nextCursor: 'c1', hasMore: true },
      })
    );
    await userEvent.click(screen.getByText('Media Library'));
    await screen.findByAltText('a.png');

    expect(requests[0].method).toBe('GET');
    expect(requests[0].url).toBe(
      `${BASE}/main-store/media-library?extensions=jpg%2Cjpeg%2Cpng%2Cgif%2Cwebp%2Csvg&limit=20`
    );
    expect(requests[0].headers.Authorization).toBe('Bearer t');
  });

  it('enables Next only when more pages exist and sends the cursor', async () => {
    const requests = setup((r) =>
      r.url.includes('cursor=c1')
        ? response(200, {
            files: [file('b.png')],
            pagination: { limit: 20, nextCursor: null, hasMore: false },
          })
        : response(200, {
            files: [file('a.png')],
            pagination: { limit: 20, nextCursor: 'c1', hasMore: true },
          })
    );
    await userEvent.click(screen.getByText('Media Library'));
    await screen.findByAltText('a.png');
    const next = screen.getByRole('button', { name: /Next/ });
    const prev = screen.getByRole('button', { name: /Prev/ });
    expect(next).toBeEnabled();
    expect(prev).toBeDisabled();

    await userEvent.click(next);
    await screen.findByAltText('b.png');
    expect(requests[1].url).toContain('cursor=c1');
    expect(screen.getByRole('button', { name: /Next/ })).toBeDisabled();
    expect(screen.getByRole('button', { name: /Prev/ })).toBeEnabled();
  });

  it('explains that media storage is not configured and offers no upload', async () => {
    setup(() =>
      response(501, {
        message: 'Media storage is not configured',
        statusCode: 501,
        code: 'MEDIA_NOT_CONFIGURED',
      })
    );
    expect(screen.getByRole('button', { name: 'Upload' })).toBeInTheDocument();
    await userEvent.click(screen.getByText('Media Library'));
    await waitFor(() =>
      expect(screen.getByText(/Media storage is not configured/)).toBeInTheDocument()
    );
    expect(screen.queryByRole('button', { name: 'Upload' })).not.toBeInTheDocument();
  });
});
