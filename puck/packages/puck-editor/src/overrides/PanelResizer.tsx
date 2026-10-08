import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useIntl } from 'react-intl';

/** Which sidebar this handle resizes. */
export type ResizerSide = 'left' | 'right';

export interface PanelResizerProps {
  /** Which sidebar to resize: the left components panel or the right properties panel. */
  side: ResizerSide;
  /** Smallest allowed width in px. */
  minWidth?: number;
  /** Largest allowed width in px. */
  maxWidth?: number;
}

interface HandleBox {
  top: number;
  left: number;
  height: number;
}

interface PanelSpec {
  /** localStorage key the chosen width persists under. */
  storageKey: string;
  /** CSS custom property (set on `.puck-editor-fill`) the grid override reads. */
  cssVar: string;
  /** Substring match for the sidebar's CSS-module class. The trailing `_`
   *  excludes the same-prefixed toggle button (`…SideBarToggle_…`). */
  sidebarSelector: string;
  /** i18n id for the handle's aria-label. */
  ariaLabelId: string;
}

const SPECS: Record<ResizerSide, PanelSpec> = {
  right: {
    storageKey: 'puck-properties-width',
    cssVar: '--puck-properties-width',
    sidebarSelector: '[class*="PuckLayout-rightSideBar_"]',
    ariaLabelId: 'Editor.resizePropertiesPanel',
  },
  left: {
    storageKey: 'puck-components-width',
    cssVar: '--puck-components-width',
    sidebarSelector: '[class*="PuckLayout-leftSideBar_"]',
    ariaLabelId: 'Editor.resizeComponentsPanel',
  },
};

const sameBox = (a: HandleBox | null, b: HandleBox | null) =>
  a === b ||
  (!!a && !!b && a.top === b.top && a.left === b.left && a.height === b.height);

/**
 * Draggable divider that resizes one of the Puck sidebars.
 *
 * Render it as a child of the `.puck-editor-fill` container (a sibling of the
 * Puck editor). It writes the chosen width to a CSS variable on that container
 * (`--puck-properties-width` for the right panel, `--puck-components-width` for
 * the left) — the grid-template override in ComponentListSearch's injected
 * `<style>` reads it to size only that column, leaving the other panel and the
 * canvas alone. The handle is positioned over the panel's inner edge (the left
 * sidebar's right edge, or the right sidebar's left edge) by measuring the live
 * sidebar, and hides itself when the panel is collapsed. The width persists in
 * localStorage.
 */
export const PanelResizer: React.FC<PanelResizerProps> = ({
  side,
  minWidth = 240,
  maxWidth = 680,
}) => {
  const intl = useIntl();
  const spec = SPECS[side];
  const ref = useRef<HTMLDivElement>(null);
  const boxRef = useRef<HandleBox | null>(null);
  const [box, setBox] = useState<HandleBox | null>(null);

  const els = useCallback(() => {
    const handle = ref.current;
    const fill = (handle?.closest('.puck-editor-fill') ?? null) as HTMLElement | null;
    const sidebar = (fill?.querySelector(spec.sidebarSelector) ??
      null) as HTMLElement | null;
    return { fill, sidebar };
  }, [spec.sidebarSelector]);

  const measure = useCallback(() => {
    const { fill, sidebar } = els();
    let next: HandleBox | null = null;
    if (fill && sidebar) {
      const fr = fill.getBoundingClientRect();
      const sr = sidebar.getBoundingClientRect();
      // width < 2 ⇒ the panel is collapsed (grid track is 0) — hide the handle.
      if (sr.width >= 2) {
        // Sit on the panel's inner edge: the left panel's right edge, or the
        // right panel's left edge.
        const edge = side === 'left' ? sr.right : sr.left;
        next = { top: sr.top - fr.top, left: edge - fr.left, height: sr.height };
      }
    }
    if (!sameBox(boxRef.current, next)) {
      boxRef.current = next;
      setBox(next);
    }
  }, [els, side]);

  useEffect(() => {
    const { fill, sidebar } = els();
    // Restore the persisted width.
    const saved = Number(localStorage.getItem(spec.storageKey));
    if (fill && saved >= minWidth && saved <= maxWidth) {
      fill.style.setProperty(spec.cssVar, `${saved}px`);
    }
    measure();
    const ro = new ResizeObserver(() => measure());
    if (fill) ro.observe(fill);
    if (sidebar) ro.observe(sidebar);
    window.addEventListener('resize', measure);
    // Re-measure periodically to track panel toggles / Puck remounts cheaply
    // (guarded setState means this only re-renders when geometry changes).
    const interval = window.setInterval(measure, 400);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', measure);
      window.clearInterval(interval);
    };
  }, [els, measure, minWidth, maxWidth, spec.storageKey, spec.cssVar]);

  const startDrag = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault();
      const handle = ref.current;
      const { fill } = els();
      if (!fill || !handle) return;

      // Capture the pointer to the handle. The Puck canvas is an <iframe>;
      // without capture, moving the cursor over it routes pointermove/pointerup
      // to the iframe's document and the drag never ends. Capture forces every
      // pointer event to the handle regardless of what's underneath.
      try {
        handle.setPointerCapture(e.pointerId);
      } catch {
        /* ignore — capture is best-effort */
      }
      // Belt-and-suspenders: stop the iframe(s) from swallowing events too.
      const iframes = Array.from(
        fill.querySelectorAll('iframe')
      ) as HTMLIFrameElement[];
      iframes.forEach((f) => (f.style.pointerEvents = 'none'));

      const onMove = (ev: PointerEvent) => {
        const fr = fill.getBoundingClientRect();
        // Left panel grows to the right of its left edge; right panel grows to
        // the left of its right edge.
        const raw =
          side === 'left' ? ev.clientX - fr.left : fr.right - ev.clientX;
        const w = Math.max(minWidth, Math.min(maxWidth, Math.round(raw)));
        fill.style.setProperty(spec.cssVar, `${w}px`);
        measure();
      };
      const onUp = (ev: PointerEvent) => {
        try {
          handle.releasePointerCapture(ev.pointerId);
        } catch {
          /* ignore */
        }
        iframes.forEach((f) => (f.style.pointerEvents = ''));
        const w = parseInt(fill.style.getPropertyValue(spec.cssVar), 10);
        if (w) localStorage.setItem(spec.storageKey, String(w));
        handle.removeEventListener('pointermove', onMove);
        handle.removeEventListener('pointerup', onUp);
        handle.removeEventListener('pointercancel', onUp);
        document.body.style.userSelect = '';
        document.body.style.cursor = '';
      };

      document.body.style.userSelect = 'none';
      document.body.style.cursor = 'col-resize';
      // With pointer capture these fire on the handle even over the iframe.
      handle.addEventListener('pointermove', onMove);
      handle.addEventListener('pointerup', onUp);
      handle.addEventListener('pointercancel', onUp);
    },
    [els, measure, minWidth, maxWidth, side, spec.cssVar, spec.storageKey]
  );

  return (
    <div
      ref={ref}
      className="puck-panel-resizer"
      onPointerDown={startDrag}
      role="separator"
      aria-orientation="vertical"
      aria-label={intl.formatMessage({ id: spec.ariaLabelId })}
      style={
        box
          ? {
              position: 'absolute',
              top: box.top,
              left: box.left - 3,
              height: box.height,
              width: 7,
              cursor: 'col-resize',
              zIndex: 20,
              touchAction: 'none',
            }
          : { display: 'none' }
      }
    />
  );
};
