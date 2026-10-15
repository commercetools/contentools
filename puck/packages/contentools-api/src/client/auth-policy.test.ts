import { describe, expect, it } from 'vitest';
import { PUCK_AUTH_POLICY } from './auth-policy';

describe('PUCK_AUTH_POLICY', () => {
  it('covers exactly the 35 raw API functions', () => {
    expect(Object.keys(PUCK_AUTH_POLICY)).toHaveLength(35);
    expect(Object.keys(PUCK_AUTH_POLICY).sort()).toMatchSnapshot();
  });

  it('marks published reads and configuration reads public, datasource resolve attach', () => {
    expect(PUCK_AUTH_POLICY.getPublishedPuckPageApi).toBe('public');
    expect(PUCK_AUTH_POLICY.getPublishedPuckContentApi).toBe('public');
    expect(PUCK_AUTH_POLICY.getThemeApi).toBe('public');
    expect(PUCK_AUTH_POLICY.resolveDatasourceApi).toBe('attach');
    expect(PUCK_AUTH_POLICY.searchProductsApi).toBe('protected');
    expect(PUCK_AUTH_POLICY.getPreviewPuckPageApi).toBe('protected');
  });
});
