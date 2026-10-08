import { useMemo } from 'react';
import type { PuckData } from '@commercetools-demo/puck-types';
import type { ComponentDiff, PuckDataDiff } from '../types';

function diffProps(
  oldProps: Record<string, unknown>,
  newProps: Record<string, unknown>
): string[] {
  const allKeys = new Set([...Object.keys(oldProps), ...Object.keys(newProps)]);
  const changed: string[] = [];
  for (const key of allKeys) {
    if (JSON.stringify(oldProps[key]) !== JSON.stringify(newProps[key])) {
      changed.push(key);
    }
  }
  return changed;
}

/**
 * Computes a structural diff between two PuckData snapshots.
 *
 * `versionData` is the historical snapshot; `currentData` is the live draft.
 * Returns null when either input is null (no version selected, or editor not loaded).
 *
 * Semantics:
 *   - "added"   → component exists in `currentData` but not in `versionData`
 *   - "removed" → component exists in `versionData` but not in `currentData`
 *   - "changed" → same id in both, but props differ
 */
export function useVersionDiff(
  versionData: PuckData | null,
  currentData: PuckData | null
): PuckDataDiff | null {
  return useMemo(() => {
    if (!versionData || !currentData) return null;

    const versionById = new Map(
      versionData.content.map((c) => [c.props.id as string, c])
    );
    const currentById = new Map(
      currentData.content.map((c) => [c.props.id as string, c])
    );

    const components: ComponentDiff[] = [];

    // Added in current (not in version)
    for (const [id, comp] of currentById) {
      if (!versionById.has(id)) {
        components.push({ id, type: comp.type, status: 'added', changedProps: [] });
      }
    }

    // Removed from version (not in current)
    for (const [id, comp] of versionById) {
      if (!currentById.has(id)) {
        components.push({ id, type: comp.type, status: 'removed', changedProps: [] });
      }
    }

    // Changed (same id, different props)
    for (const [id, vComp] of versionById) {
      const cComp = currentById.get(id);
      if (!cComp) continue;
      const changedProps = diffProps(
        vComp.props as Record<string, unknown>,
        cComp.props as Record<string, unknown>
      );
      if (changedProps.length > 0) {
        components.push({ id, type: cComp.type, status: 'changed', changedProps });
      }
    }

    // Root-level prop changes
    const rootChanges = diffProps(
      (versionData.root?.props ?? {}) as Record<string, unknown>,
      (currentData.root?.props ?? {}) as Record<string, unknown>
    );

    return {
      components,
      rootChanges,
      hasChanges: components.length > 0 || rootChanges.length > 0,
    };
  }, [versionData, currentData]);
}
