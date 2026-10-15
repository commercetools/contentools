import { CONTAINER_ENV, TEST_CONTAINER_PREFIX } from './containers';
import { ctFetch, type CtObject } from './ct-http';

/** Deletes every custom object in this run's containers (`contentools-test-<runId>-*`). Returns how many were deleted. */
export async function deleteRunObjects(runId: string): Promise<number> {
  let deleted = 0;
  for (const suffix of Object.values(CONTAINER_ENV)) {
    const container = `${TEST_CONTAINER_PREFIX}${runId}-${suffix}`;
    // Always read offset 0 again after deleting: the list shrinks as we go.
    for (;;) {
      const list = await ctFetch(`/custom-objects/${encodeURIComponent(container)}?limit=500`);
      const results: CtObject[] = list.body?.results ?? [];
      if (list.status !== 200 || results.length === 0) break;
      for (const o of results) {
        const del = await ctFetch(`/custom-objects/${encodeURIComponent(o.container)}/${encodeURIComponent(o.key)}`, { method: 'DELETE' });
        if (del.status === 200) deleted++;
      }
    }
  }
  return deleted;
}
