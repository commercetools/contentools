import { deleteObject, getObject, putObject } from './support/ct-http';
import { e2e } from './support/gate';

e2e('sandbox smoke', () => {
  it('writes, reads back and deletes a custom object in a prefixed container', async () => {
    const container = process.env.PUCK_PAGE_CONTAINER as string;
    expect(container.startsWith('contentools-test-')).toBe(true);

    const put = await putObject(container, 'smoke', { ok: true });
    expect([200, 201]).toContain(put.status);

    const got = await getObject(container, 'smoke');
    expect(got.status).toBe(200);
    expect(got.body.value.ok).toBe(true);

    const del = await deleteObject(container, 'smoke');
    expect(del.status).toBe(200);
  });
});
